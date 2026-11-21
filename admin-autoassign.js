/* DriveSQ auto-assign of website bookings (admin side). The engine itself runs on the server (Supabase function "whatsapp").
   - Settings, Preview (what WOULD happen, nothing is sent) and Run now live inside Admin → WhatsApp.
   - "Attention required": a red button in the top bar lists everything that needs you (an instructor can't cover, nobody replied, no match, a message failed…).
   - Instructor traits: "Female instructor" and "Don't auto-assign" on each instructor's profile. */
(function () {
  'use strict';
  var DEF = { enabled: false, mode: 'assign', since: '', sources: ['[WEB]'], autoMiles: 5, confirmMiles: 8, dailyLimit: 2, weeklyLimit: 4, unpaidLimit: 2, femaleRule: 'require', hours: [8, 21], replyHours: 5, retries: 2, maxPerWeek: 0,
    messageInstructor: true, messageStudent: true, adminPhone: '', adminAlerts: true, refFee: 25, followups: { enabled: true, acceptWaitHours: 24, checkinDays: 3, instructorAfterDays: 1, repeatDays: 5, rounds: 4 } };
  var CFG = JSON.parse(JSON.stringify(DEF)), loaded = false, ATT = [], seen = null;
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m, t, ms) { try { window.showToast(m, t || '', ms); } catch (e) { } };
  var SBc = function () { return window.DSQ_ADMIN && DSQ_ADMIN.sb && DSQ_ADMIN.sb(); };
  var ago = function (d) { var m = Math.round((Date.now() - new Date(d)) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
  var log = function (summary) { try { DSQLog.add(SBc(), { area: 'auto_assign', action: 'settings', summary: summary, role: 'admin', actor: 'Admin' }); } catch (e) { } };

  async function load(force) {
    if (loaded && !force) return CFG; var got = null;
    try { var r = await SBc().from('growth_settings').select('value').eq('key', 'auto_assign_cfg').maybeSingle(); if (r && r.data && r.data.value) got = r.data.value; } catch (e) { }
    CFG = Object.assign(JSON.parse(JSON.stringify(DEF)), got || {}); CFG.followups = Object.assign({}, DEF.followups, (got && got.followups) || {}); loaded = true; return CFG;
  }
  async function save() {
    var r = await SBc().from('growth_settings').upsert({ key: 'auto_assign_cfg', value: CFG, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (r.error) { toast('Not saved: ' + r.error.message + ' (run the growth tools SQL so settings can be stored).', 'error', 7000); return false; } return true;
  }

  /* ---------- settings block inside Admin → WhatsApp ---------- */
  var num = function (id, label, val, hint, step) { return '<label style="font-size:.72rem;display:block"><span style="color:var(--txt3)">' + label + '</span><input type="number" id="' + id + '" class="dsq-inp" value="' + E(val) + '" step="' + (step || 1) + '" style="margin-top:2px"' + (hint ? ' title="' + E(hint) + '"' : '') + '></label>'; };
  async function mount() {
    var h = document.getElementById('aaHolder'); if (!h) return; await load();
    var fu = CFG.followups, oldOn = null; try { oldOn = typeof window.getAutoAssign === 'function' ? await window.getAutoAssign() : null; } catch (e) { }
    h.innerHTML = '<div style="border:1px solid ' + (CFG.enabled ? 'rgba(34,197,94,.5)' : 'var(--bdr)') + ';border-radius:12px;padding:12px;margin:10px 0">' +
      '<div style="font-weight:800;font-size:.95rem">🤖 Auto-assign website bookings <span style="font-weight:700;font-size:.7rem;padding:2px 8px;border-radius:99px;background:' + (CFG.enabled ? 'rgba(34,197,94,.2);color:#22c55e' : 'rgba(148,163,184,.2);color:#94a3b8') + '">' + (CFG.enabled ? 'ON' : 'OFF') + '</span></div>' +
      '<div style="font-size:.74rem;color:var(--txt3);margin:4px 0 8px">The server watches new website bookings (every few minutes, 24/7, even when admin is closed), picks the best instructor, and either assigns straight away or asks the instructor to accept first. Then it WhatsApps the instructor and the student. If anything goes wrong, it tells you: <b>attention required</b>.</div>' +
      (oldOn ? '<div style="border:1px solid #ef4444;background:rgba(239,68,68,.1);border-radius:8px;padding:8px 10px;font-size:.74rem;margin-bottom:8px">⚠️ The <b>old autopilot</b> is still switched on, and it can assign students on its own. Switch it off so the two do not both assign. <button class="btn-s" style="font-size:.7rem;margin-left:6px" onclick="DSQAA.oldOff()">Switch the old one off</button> Also stop its cron-job.org job, if you set one up.</div>' : '') +
      '<label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;padding:6px 0"><input type="checkbox" id="aaOn"' + (CFG.enabled ? ' checked' : '') + ' style="margin-top:3px;width:18px;height:18px"><span><b>Turn auto-assign ON</b> <span style="font-size:.72rem;color:var(--txt4)">(tick, then press Save)</span><br><span style="font-size:.72rem;color:var(--txt3)">Untick = OFF: nothing happens by itself and you assign in Find &amp; Assign, exactly as now.</span></span></label>' +
      '<label style="font-size:.74rem;display:block;margin:4px 0"><span style="color:var(--txt3)">What should it do?</span><select id="aaMode" class="dsq-inp" style="margin-top:2px"><option value="assign"' + (CFG.mode === 'assign' ? ' selected' : '') + '>Assign and send WhatsApp messages</option><option value="suggest"' + (CFG.mode === 'suggest' ? ' selected' : '') + '>Only suggest: tell me who it would pick (no assigning, no messages)</option></select></label>' +
      '<label style="display:flex;gap:6px;align-items:center;font-size:.74rem;margin:4px 0"><input type="checkbox" id="aaOlder"> When I switch it on, also include bookings that are already waiting (otherwise only new ones from now)</label>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:8px 0">' +
        num('aaAuto', 'Assign straight away if within (miles)', CFG.autoMiles, 'Up to this distance the instructor is assigned without asking first') + num('aaConf', 'Distance limit (miles)', CFG.confirmMiles, 'Up to this distance, the instructor is asked to accept first. Over this: attention required') + num('aaDay', 'Soft limit: students given today', CFG.dailyLimit, 'Over this, the instructor is asked LAST (closest first among the others)') + num('aaWeek', 'Soft limit: booked this week', CFG.weeklyLimit, 'Over this, the instructor is asked LAST') + num('aaUnpaid', 'Soft limit: booked but unpaid (referral instructors)', CFG.unpaidLimit, 'At this many booked students with unpaid fees, the instructor is asked LAST and you get an alert. 0 = off') +
        num('aaReply', 'Hours to wait for a reply', CFG.replyHours) + num('aaRetry', 'Other instructors to try', CFG.retries, 'After a "can\'t take" or no reply') + num('aaCap', 'Max new students per instructor a week (0 = no limit)', CFG.maxPerWeek) + num('aaFee', 'Referral fee to record (£)', CFG.refFee, 'Recorded for referral instructors. Franchise = £0') +
        num('aaH1', 'Run from (UK hour)', CFG.hours[0]) + num('aaH2', 'Run until (UK hour)', CFG.hours[1]) + '</div>' +
      '<label style="font-size:.74rem;display:block;margin:4px 0"><span style="color:var(--txt3)">Booking asks for a female instructor</span><select id="aaFem" class="dsq-inp" style="margin-top:2px"><option value="require"' + (CFG.femaleRule === 'require' ? ' selected' : '') + '>Only female instructors (tick "Female instructor" on their profile)</option><option value="prefer"' + (CFG.femaleRule === 'prefer' ? ' selected' : '') + '>Prefer female, but anyone is allowed</option></select></label>' +
      '<div style="font-size:.72rem;color:var(--txt3);margin:6px 0">How it chooses: the <b>closest</b> instructor within the distance limit. Anyone over a soft limit is asked <b>last</b> (still closest first). If everyone nearby declines or is over a limit, the closest gets it anyway.</div>' +
      '<details style="margin:6px 0"' + (fu.enabled ? '' : '') + '><summary style="cursor:pointer;font-weight:700;font-size:.78rem">Checking the student booked (WhatsApp follow-ups)</summary>' +
        '<label style="display:flex;gap:6px;align-items:center;font-size:.74rem;margin:6px 0"><input type="checkbox" id="aaFuOn"' + (fu.enabled ? ' checked' : '') + '> Ask students and instructors whether a lesson is booked, and update Referrals from their answers</label>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">' + num('aaFuAcc', 'Hours to wait for the instructor to accept', fu.acceptWaitHours) + num('aaFuDays', 'Ask the student this many days after the instructor accepts', fu.checkinDays) + num('aaFuIns', 'Ask the instructor if the student has not replied after (days)', fu.instructorAfterDays) + num('aaFuRep', 'Repeat every (days)', fu.repeatDays) + num('aaFuRounds', 'Rounds before it comes to you', fu.rounds) + '</div>' +
        '<div style="font-size:.7rem;color:var(--txt4);margin-top:4px">Student answers: <b>Yes, booked</b> → green flag; <b>Not yet</b> → note + waiting; <b>Gone elsewhere</b> → red, student left. If the student does not reply, the instructor is asked: <b>Booked / Not yet / Student left</b>.</div></details>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin:6px 0"><label style="font-size:.72rem"><span style="color:var(--txt3)">Your WhatsApp number for alerts</span><input id="aaPhone" class="dsq-inp" value="' + E(CFG.adminPhone) + '" placeholder="07700 900123" style="margin-top:2px"></label>' +
        '<label style="display:flex;gap:6px;align-items:center;font-size:.74rem;margin-top:16px"><input type="checkbox" id="aaAlert"' + (CFG.adminAlerts ? ' checked' : '') + '> WhatsApp me when attention is needed</label></div>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:.74rem;margin:4px 0"><label><input type="checkbox" id="aaMi"' + (CFG.messageInstructor ? ' checked' : '') + '> Message the instructor</label><label><input type="checkbox" id="aaMs"' + (CFG.messageStudent ? ' checked' : '') + '> Message the student (only after the instructor accepts)</label></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn-p" onclick="DSQAA.saveForm()">Save auto-assign</button><button class="btn-s" onclick="DSQAA.preview()">👀 Preview what it would do</button><button class="btn-s" onclick="DSQAA.readiness()">🩺 Check my data</button><button class="btn-s" onclick="DSQAA.runNow()">▶ Run now</button></div>' +
      '<div id="aaOut" style="font-size:.76rem;margin-top:8px"></div>' +
      '<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;font-size:.78rem">Make it run by itself (one-time, 2 minutes)</summary><div style="font-size:.74rem;line-height:1.6;color:var(--txt3);margin-top:4px">Supabase → Integrations → Cron → new job → every <b>2 minutes</b> (<code>*/2 * * * *</code>) → Supabase Edge Function → <b>whatsapp</b> → POST, body <code>{"action":"auto_assign","cron":true}</code>, header <code>x-admin-key</code> = your email admin key. It only works between the hours above and only on bookings created after you switched it on.</div></details>' +
      '</div>';
  }
  var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; }, n = function (id, d) { var x = parseFloat(v(id)); return isNaN(x) ? d : x; };
  async function saveForm() {
    await load(); var was = CFG.enabled, on = !!document.getElementById('aaOn').checked;
    CFG.enabled = on; CFG.mode = v('aaMode'); CFG.autoMiles = n('aaAuto', 5); CFG.confirmMiles = Math.max(CFG.autoMiles, n('aaConf', 8)); CFG.replyHours = n('aaReply', 5); CFG.retries = Math.max(0, n('aaRetry', 2)); CFG.maxPerWeek = Math.max(0, n('aaCap', 0)); CFG.refFee = Math.max(0, n('aaFee', 25));
    CFG.hours = [Math.max(0, Math.min(23, n('aaH1', 8))), Math.max(1, Math.min(24, n('aaH2', 21)))]; CFG.femaleRule = v('aaFem'); CFG.adminPhone = v('aaPhone').trim(); CFG.adminAlerts = !!document.getElementById('aaAlert').checked;
    CFG.messageInstructor = !!document.getElementById('aaMi').checked; CFG.messageStudent = !!document.getElementById('aaMs').checked;
    CFG.dailyLimit = Math.max(0, n('aaDay', 2)); CFG.weeklyLimit = Math.max(0, n('aaWeek', 4)); CFG.unpaidLimit = Math.max(0, n('aaUnpaid', 2)); CFG.followups = { enabled: !!document.getElementById('aaFuOn').checked, acceptWaitHours: Math.max(1, n('aaFuAcc', 24)), checkinDays: Math.max(0, n('aaFuDays', 3)), instructorAfterDays: Math.max(0, n('aaFuIns', 1)), repeatDays: Math.max(1, n('aaFuRep', 5)), rounds: Math.max(1, Math.round(n('aaFuRounds', 4))) };
    if (on && !was) CFG.since = document.getElementById('aaOlder').checked ? '' : new Date().toISOString();   // only bookings from now on, unless you say otherwise
    if (!(await save())) return; log('Auto-assign turned ' + (on ? 'ON (' + CFG.mode + ')' : 'OFF'));
    toast(on ? '🤖 Auto-assign is ON' + (CFG.mode === 'suggest' ? ' (suggest only)' : '') : 'Auto-assign is OFF', 'success', 3500); mount(); try { window.refreshAutoAssignBtn(); } catch (e) { }
  }
  async function preview() {
    var o = document.getElementById('aaOut'); if (!o) return; o.textContent = 'Working it out…';
    if (!window.DSQWA) return; var r = await DSQWA.call({ action: 'auto_assign', dry: true });
    if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; return; }
    var since = CFG.since ? ' (only bookings since ' + new Date(CFG.since).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ')' : '';
    o.innerHTML = (r.results.length ? '<div style="color:var(--txt3);margin-bottom:4px">Nothing has been sent or changed. This is what it would do now' + since + ':</div>' + r.results.map(function (x) {
      var col = x.action === 'assign' ? '#22c55e' : x.action === 'offer' ? '#60a5fa' : x.action === 'suggest' ? '#a78bfa' : '#f59e0b', lab = { assign: 'Assign now', offer: 'Ask to accept', suggest: 'Suggest', attention: 'Attention' }[x.action] || x.action;
      return '<div style="padding:6px 0;border-top:1px solid var(--bdr)"><b>' + E(x.student) + '</b> <span style="color:var(--txt4)">' + E(x.postcode || '') + (x.female ? ' · female ' + (x.female === 'require' ? 'required' : 'preferred') : '') + '</span> → <b style="color:' + col + '">' + lab + '</b>' + (x.instructor ? ' ' + E(x.instructor) + ' · ' + x.dist + ' miles' : '') + (x.why ? '<div style="font-size:.7rem;color:#60a5fa">Why: ' + E(x.why) + '</div>' : '') + (x.reason ? ' <span style="color:#f59e0b">' + E(x.reason) + '</span>' : '') +
        ((x.top || []).length > 1 ? '<div style="font-size:.68rem;color:var(--txt4)">Next best: ' + x.top.slice(1).map(function (t) { return E(t.name) + ' (' + t.dist + ' mi' + ((t.over || []).length ? ', ' + E(t.over.join(' and ')) : '') + ')'; }).join(' · ') + '</div>' : '') + '</div>';
    }).join('') : '<div style="color:var(--txt3)">No waiting website bookings to handle' + since + '.</div>');
  }
  async function runNow() {
    if (!CFG.enabled) { toast('Switch auto-assign ON and Save first.', 'warn', 4000); return; }
    if (!confirm('Run auto-assign now? It will ' + (CFG.mode === 'suggest' ? 'only add suggestions to the attention list.' : 'assign and WhatsApp for real.'))) return;
    var o = document.getElementById('aaOut'); if (o) o.textContent = 'Running…'; var r = await DSQWA.call({ action: 'auto_assign' });
    if (o) o.innerHTML = r.ok ? (r.off ? 'It is switched off.' : r.waiting ? E(r.waiting) : '✅ Done: ' + (r.summary.assigned || 0) + ' assigned, ' + (r.summary.offered || 0) + ' asked to accept, ' + (r.summary.attention || 0) + ' need attention.') : '<span style="color:#f87171">' + E(r.error) + '</span>';
    poll(true);
  }
  async function oldOff() { try { await SBc().from('app_settings').update({ value: 'false', updated_at: new Date().toISOString() }).eq('key', 'autopilot_enabled'); toast('Old autopilot switched off', 'success', 3000); } catch (e) { toast('Could not: ' + e.message, 'error'); } mount(); try { window.refreshAutoAssignBtn(); } catch (e) { } }

  /* ---------- attention required ---------- */
  var KIND = { no_match: '🔍 No match', declined: '🚫 Declined', declined_after: '🚫 Can\'t cover', no_reply: '⏰ No reply', postcode: '📍 Postcode', suggest: '💡 Suggestion', assign_failed: '⚠️ Failed', msg_failed: '💬 Message failed', no_accept: '⏳ Not accepted', no_confirm: '❓ No confirmation', not_contacted: '📵 Not contacted', unpaid_fees: '💷 Unpaid fees' };
  function badge() {
    var b = document.getElementById('attnBtn'), host = document.getElementById('waApiBtn');
    if (!b && host) { b = document.createElement('button'); b.id = 'attnBtn'; b.type = 'button'; b.onclick = openAttention; b.style.cssText = 'display:none;align-items:center;gap:6px;background:#dc2626;color:#fff;border:0;border-radius:9px;padding:6px 11px;font-size:.76rem;font-weight:800;cursor:pointer;white-space:nowrap;animation:attnPulse 2s infinite'; host.parentNode.insertBefore(b, host); var st = document.createElement('style'); st.textContent = '@keyframes attnPulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.5)}50%{box-shadow:0 0 0 7px rgba(220,38,38,0)}}'; document.head.appendChild(st); }
    if (!b) return; b.style.display = ATT.length ? 'inline-flex' : 'none'; b.innerHTML = '🚨 <span>' + ATT.length + ' need' + (ATT.length === 1 ? 's' : '') + ' attention</span>';
  }
  async function poll(quiet) {
    try {
      var r = await SBc().from('admin_attention').select('*').eq('resolved', false).order('created_at', { ascending: false }).limit(60); if (r.error) return;
      ATT = r.data || []; badge();
      if (seen === null) { try { seen = JSON.parse(localStorage.getItem('dsq_attn_seen') || '[]'); } catch (e) { seen = []; } }
      var fresh = ATT.filter(function (a) { return seen.indexOf(a.id) < 0; });
      if (fresh.length && !quiet) toast('🚨 Attention required: ' + fresh[0].title + (fresh.length > 1 ? ' (+' + (fresh.length - 1) + ' more)' : ''), 'warn', 12000);
      if (fresh.length) { seen = seen.concat(fresh.map(function (a) { return a.id; })).slice(-200); try { localStorage.setItem('dsq_attn_seen', JSON.stringify(seen)); } catch (e) { } }
      var m = document.getElementById('attnModal'); if (m) renderAttention();
    } catch (e) { }
  }

  /* "send the balance only": the amount, no student names */
  function unpaidOf(id) { var n = 0, amt = 0; (window.DSQ_ADMIN.refs() || []).forEach(function (r) { if (String(r.instructor_id) !== String(id) || r.is_paid || r.is_cancelled || r.is_credit) return; try { if (window._refAdminBooked(r)) { n++; amt += parseFloat(r.amount) || 0; } } catch (e) { } }); return { n: n, amt: amt }; }
  function balanceMsg(id) {
    var i = (window.DSQ_ADMIN.instrs() || []).find(function (x) { return String(x.id) === String(id); }) || {}, u = unpaidOf(id);
    return 'Hi ' + String(i.full_name || '').split(' ')[0] + ', you have ' + u.n + ' booked student' + (u.n === 1 ? '' : 's') + ' with £' + u.amt.toFixed(0) + ' in referral fees outstanding. Please pay and let us know, and we will keep sending you students. Thank you! DriveSQ';
  }
  function balanceButtons(id) {
    var i = (window.DSQ_ADMIN.instrs() || []).find(function (x) { return String(x.id) === String(id); }) || {}, ph = String(i.phone || '').replace(/\D/g, ''); ph = ph.indexOf('44') === 0 ? ph : ph.replace(/^0/, '44');
    return '<button class="btn-s" style="font-size:.72rem" onclick="DSQAA.copyBalance(\'' + id + '\')">📋 Copy balance message</button>' + (ph ? '<a class="btn-s" style="font-size:.72rem;text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/' + ph + '?text=' + encodeURIComponent(balanceMsg(id)) + '">💬 WhatsApp the balance</a>' : '');
  }
  async function copyBalance(id) { var m = balanceMsg(id); try { await navigator.clipboard.writeText(m); toast('Balance message copied', 'success', 2000); } catch (e) { window.prompt('Copy this message:', m); } }
  function renderAttention() {
    var m = document.getElementById('attnModal'); if (!m) return;
    m.firstChild.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.2rem;font-weight:700">🚨 Attention required</div><button class="btn-s" onclick="document.getElementById(\'attnModal\').remove()">Close</button></div>' +
      (ATT.length ? ATT.map(function (a) {
        return '<div style="border:1px solid #dc262666;background:rgba(220,38,38,.06);border-radius:12px;padding:10px 12px;margin-bottom:8px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="font-size:.64rem;font-weight:800;padding:2px 8px;border-radius:99px;background:rgba(220,38,38,.18);color:#f87171">' + (KIND[a.kind] || E(a.kind)) + '</span><b style="font-size:.84rem">' + E(a.title) + '</b><span style="margin-left:auto;font-size:.68rem;color:var(--txt4)">' + ago(a.created_at) + '</span></div>' +
          (a.detail ? '<div style="font-size:.76rem;color:var(--txt3);margin:5px 0">' + E(a.detail) + '</div>' : '') + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
          (a.waiting_id && !/-stu$/.test(a.waiting_id) && a.kind !== 'unpaid_fees' ? '<button class="btn-p" style="font-size:.72rem;padding:4px 12px" onclick="DSQAA.openBooking(\'' + a.waiting_id + '\',\'' + a.id + '\')">Open in Find &amp; Assign</button><button class="btn-s" style="font-size:.72rem" title="Let auto-assign try this booking again" onclick="DSQAA.retry(\'' + a.waiting_id + '\',\'' + a.id + '\')">Try again</button>' : '') +
          (a.kind === 'unpaid_fees' && a.instructor_id ? balanceButtons(a.instructor_id) : '') + (a.instructor_id ? '<button class="btn-s" style="font-size:.72rem" onclick="document.getElementById(\'attnModal\').remove();openRefDetail(\'' + a.instructor_id + '\',true)">Instructor\'s students</button>' : '') +
          '<button class="btn-s" style="font-size:.72rem;margin-left:auto" onclick="DSQAA.resolve(\'' + a.id + '\')">✓ Done</button></div></div>';
      }).join('') : '<div style="padding:18px;text-align:center;color:#22c55e;font-weight:700">✅ Nothing needs your attention</div>');
  }
  async function openAttention() {
    var m = document.getElementById('attnModal'); if (m) m.remove(); m = document.createElement('div'); m.id = 'attnModal'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99998;display:flex;align-items:center;justify-content:center;padding:14px'; m.onclick = function (e) { if (e.target === m) m.remove(); };
    document.body.appendChild(m); m.innerHTML = '<div style="background:var(--dk2);border:1px solid var(--bdr);border-radius:16px;width:100%;max-width:680px;max-height:90vh;overflow:auto;padding:16px"></div>'; await poll(true); renderAttention();
  }
  async function resolve(id) { await SBc().from('admin_attention').update({ resolved: true, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id); ATT = ATT.filter(function (a) { return a.id !== id; }); badge(); renderAttention(); }
  async function retry(wid, aid) {
    try { await SBc().from('auto_assign_jobs').delete().eq('waiting_id', String(wid)); } catch (e) { }
    await resolve(aid); toast('Auto-assign will try this booking again on its next run (or press Run now).', 'success', 4500);
  }
  async function openBooking(wid, aid) {
    var r = await SBc().from('waiting_list').select('*').eq('id', wid).maybeSingle(); var w = r && r.data; if (!w) { toast('That booking is no longer waiting.', 'info'); return; }
    if (w.status !== 'waiting') { toast('That booking has already been dealt with (' + w.status + ').', 'info'); await resolve(aid); return; }
    var m = document.getElementById('attnModal'); if (m) m.remove(); try { window.closeModal('webBookingsModal'); } catch (e) { }
    try { window.waitlistAssign(w.id, w.student_name, w.postcode || '', w.lesson_type || 'Manual', w.student_phone || '', w.notes || '', w.area || ''); } catch (e) { toast('Could not open Find & Assign: ' + e.message, 'error'); }
  }

  /* ---------- instructor traits: Female / Don't auto-assign ---------- */
  var TR = null;
  async function loadTraits() { if (TR) return TR; TR = {}; try { var r = await SBc().from('growth_settings').select('value').eq('key', 'instructor_traits').maybeSingle(); if (r && r.data && r.data.value) TR = r.data.value; } catch (e) { } return TR; }
  var traitsHolder = function (id) { return '<div id="instrTraits-' + id + '" style="font-size:.78rem;color:var(--txt4)">Loading…</div>'; };
  async function fillTraits(id) {
    var el = document.getElementById('instrTraits-' + id); if (!el) return; await loadTraits(); var t = TR[id] || {};
    el.innerHTML = '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:2px 0"><input type="checkbox" ' + (t.female ? 'checked' : '') + ' onchange="DSQAA.setTrait(\'' + id + '\',\'female\',this.checked)"> <b>Female instructor</b> <span style="color:var(--txt4)">(used when a booking asks for a female instructor)</span></label>' +
      '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:2px 0"><input type="checkbox" ' + (t.noAuto ? 'checked' : '') + ' onchange="DSQAA.setTrait(\'' + id + '\',\'noAuto\',this.checked)"> <b>Never auto-assign</b> <span style="color:var(--txt4)">(you still assign them by hand)</span></label>';
  }
  async function setTrait(id, k, on) {
    await loadTraits(); TR[id] = TR[id] || {}; if (on) TR[id][k] = true; else delete TR[id][k]; if (!Object.keys(TR[id]).length) delete TR[id];
    var r = await SBc().from('growth_settings').upsert({ key: 'instructor_traits', value: TR, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (r.error) toast('Not saved: ' + r.error.message, 'error', 5000); else { toast('Saved', 'success', 1500); var nm = ((window.DSQ_ADMIN.instrs() || []).find(function (i) { return String(i.id) === String(id); }) || {}).full_name || 'instructor'; log((on ? 'Set ' : 'Cleared ') + (k === 'female' ? 'female instructor' : 'never auto-assign') + ' for ' + nm); }
  }

    /* Is the data good enough for auto-assign? Every approved instructor needs a location, a phone number and a lesson type. */
  var instrLoc = function (i) {
    var up = function (v) { return String(v || '').toUpperCase(); }, full = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/, out = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\b/;
    if (String(i.postcode || '').trim()) return i.postcode; var f = up(i.area).match(full) || up(i.address).match(full); if (f) return f[0];
    var o = up(i.area).match(out) || up(i.coverage_postcodes).match(out); return o ? o[0] : '';
  };
  var phoneOk = function (p) { var d = String(p || '').replace(/\(0\)/g, '').replace(/\D/g, ''); if (d.indexOf('0044') === 0) d = d.slice(2); else if (d.indexOf('0') === 0) d = '44' + d.slice(1); return d.length >= 10 && d.length <= 15; };
  async function readiness() {
    var o = document.getElementById('aaOut'); if (!o) return; o.textContent = 'Checking…'; await load(); await loadTraits();
    var ins = (window.DSQ_ADMIN.instrs() || []).filter(function (i) { return i.status === 'approved'; }), rows = [], nF = 0;
    ins.forEach(function (i) {
      var iss = [], loc = instrLoc(i), t = TR[i.id] || {}; if (t.female) nF++;
      if (!loc) iss.push('no postcode or area, so it can never be matched by distance'); else if (!/\d[A-Z]{2}\s*$/i.test(String(loc).trim())) iss.push('only an area code (' + loc + '), distances will be approximate. Add a full postcode');
      if (!phoneOk(i.phone)) iss.push('no valid mobile number, so WhatsApp cannot reach them');
      if (!i.car_type) iss.push('no lesson type (manual / automatic / both)');
      if (!String(i.coverage_postcodes || '').trim()) iss.push('no covered postcodes (they miss the coverage bonus)');
      if (!String(i.instructor_model || '').trim()) iss.push('no model set (franchise or referral)');
      rows.push({ i: i, iss: iss, t: t });
    });
    var bad = rows.filter(function (r) { return r.iss.length; }), ok = rows.length - bad.length, wl = 0;
    try { var since = new Date(Date.now() - 30 * 864e5).toISOString(); var r = await SBc().from('waiting_list').select('id,postcode,notes,status,created_at').gte('created_at', since).limit(500); (r.data || []).forEach(function (w) { if (/\[WEB\]/i.test(w.notes || '') && !(w.postcode || /Postcode:\s*\S/i.test(w.notes || ''))) wl++; }); } catch (e) { }
    o.innerHTML = '<div style="margin-bottom:6px"><b style="color:' + (bad.length ? '#f59e0b' : '#22c55e') + '">' + (bad.length ? bad.length + ' of ' + rows.length + ' instructors need attention' : '✅ All ' + rows.length + ' instructors are ready') + '</b> · ' + ok + ' ready · ' + nF + ' marked female</div>' +
      (nF === 0 && CFG.femaleRule === 'require' ? '<div style="color:#f59e0b;margin-bottom:6px">⚠️ No instructor is marked <b>Female instructor</b>, so bookings that ask for a female instructor will always go to your attention list. Tick it on each female instructor\'s profile.</div>' : '') +
      (wl ? '<div style="color:#f59e0b;margin-bottom:6px">⚠️ ' + wl + ' recent website booking' + (wl === 1 ? '' : 's') + ' have no postcode, so they cannot be matched.</div>' : '') +
      bad.map(function (r) { return '<div style="padding:5px 0;border-top:1px solid var(--bdr)"><b>' + E(r.i.full_name) + '</b> <button class="btn-s" style="font-size:.66rem;padding:1px 8px;margin-left:6px" onclick="document.getElementById(\'waSet\').remove();viewInstr(\'' + r.i.id + '\')">Open profile</button><ul style="margin:2px 0 0 18px;padding:0;font-size:.72rem;color:var(--txt3)">' + r.iss.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></div>'; }).join('');
  }

  /* ---------- the old "Auto-assign" button in Website Bookings now opens the new settings ---------- */
  function takeOver() {
    window.toggleAutoAssign = function () { if (window.DSQWA) DSQWA.openSettings('auto'); };
    window.refreshAutoAssignBtn = async function () {
      var b = document.getElementById('wbAutoBtn'); if (!b) return; await load(); var on = CFG.enabled;
      b.innerHTML = '<i class="bi bi-robot me-1"></i>Auto-assign: ' + (on ? '<span style="color:#4ade80">ON' + (CFG.mode === 'suggest' ? ' (suggest)' : '') + '</span> · settings' : '<span style="color:#94a3b8">OFF</span> · settings');
      b.title = 'Automatic assigning of website bookings: settings, preview and attention list'; b.style.borderColor = on ? 'rgba(74,222,128,.6)' : 'rgba(100,116,139,.35)'; b.style.background = on ? 'rgba(74,222,128,.1)' : 'rgba(100,116,139,.12)';
    };
  }
  takeOver(); window.addEventListener('load', function () { takeOver(); setTimeout(takeOver, 1500); });   // the page's own script defines these after this file loads, so take over again once everything is ready
  (function init() { var t0 = 0, t = setInterval(function () { t0++; if (t0 > 40) return clearInterval(t); if (window.DSQ_ADMIN && DSQ_ADMIN.sb && DSQ_ADMIN.sb() && document.getElementById('waApiBtn')) { clearInterval(t); load().then(function () { poll(); setInterval(poll, 60000); }); } }, 1000); })();
  window.DSQAA = { copyBalance: copyBalance, readiness: readiness, mount: mount, saveForm: saveForm, preview: preview, runNow: runNow, oldOff: oldOff, poll: poll, openAttention: openAttention, resolve: resolve, retry: retry, openBooking: openBooking, traitsHolder: traitsHolder, fillTraits: fillTraits, setTrait: setTrait, load: load, _cfg: function () { return CFG; }, _att: function () { return ATT; } };
})();
