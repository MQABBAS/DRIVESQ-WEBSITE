/* DriveSQ instructor health check + full history (admin only — shown on the instructor profile).
   - Health check: one place that tells you whether everything is working for this instructor, with a button for each thing to fix.
   - Full history: week by week from the franchise / package start date (set it on the instructor's edit window).
   - Package terms: record that the instructor agreed (by WhatsApp reply) and send them the message. */
(function () {
  'use strict';
  var A = function () { return window.DSQ_ADMIN || {}; };
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (v) { v = +v || 0; return '£' + (Math.abs(v - Math.round(v)) < .005 ? Math.round(v) : v.toFixed(2)); };
  var DAY = 864e5, toast = function (m, t, ms) { try { window.showToast(m, t || '', ms); } catch (e) { } };
  var ymd = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var mon = function (d) { var m = new Date(d); m.setHours(12, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return ymd(m); };
  var addW = function (k, n) { var d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + 7 * n); return ymd(d); };
  var nice = function (k, y) { return new Date(k + 'T12:00:00').toLocaleDateString('en-GB', y ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }); };
  var instr = function (id) { return (A().instrs && A().instrs() || []).find(function (i) { return String(i.id) === String(id); }) || {}; };
  var refsOf = function (id) { return (A().refs && A().refs() || []).filter(function (r) { return String(r.instructor_id) === String(id) && !r.is_cancelled && !r.is_credit; }); };
  var status = function (r) { try { return window.DSQInsights.status(r, Date.now()); } catch (e) { return 'pending'; } };
  var AV = {};   // availability per instructor (loaded once)

  async function loadAll(id) {
    try { if (!(A().refs && A().refs().length) && window.loadReferrals) await window.loadReferrals(); } catch (e) { }
    try { if (window.DSQPkg) await DSQPkg.load(); } catch (e) { }
    try { if (window.DSQFees) await DSQFees.load(); } catch (e) { }
    try { if (window._frCfg) await window._frCfg(); } catch (e) { }
    try { var r = await A().sb().from('instructor_availability').select('is_available').eq('instructor_id', id); AV[id] = (r.data || []).some(function (x) { return x.is_available; }); } catch (e) { AV[id] = null; }
  }
  var feeRows = function (id) { return (window.DSQFees ? DSQFees._rows() : []).filter(function (r) { return String(r.instructor_id) === String(id); }); };

  /* ---------- the health check ---------- */
  function checks(id) {
    var ins = instr(id), out = [], now = Date.now(), cfg = window.DSQPkg && DSQPkg._cfg(), pk = cfg && DSQPkg.pkgOf(id), model = String(ins.instructor_model || '').toLowerCase();
    var add = function (lvl, msg, btn) { out.push({ lvl: lvl, msg: msg, btn: btn || '' }); };
    var b = function (label, js) { return '<button class="btn-s" style="font-size:.7rem;padding:3px 10px;margin-left:6px" onclick="' + js + '">' + label + '</button>'; };
    var rs = refsOf(id), st = rs.map(function (r) { return { r: r, s: status(r) }; });

    if (ins.status !== 'approved') add('bad', 'This instructor is <b>' + E(ins.status || 'not approved') + '</b>, so they get no new students.');
    if (!model) add('warn', 'No model set (franchise or referral).');

    /* students: the thing to act on first */
    var unsure = st.filter(function (x) { return x.s === 'unsure'; }), await_ = st.filter(function (x) { return !x.r.is_paid && x.r.reply_status === 'booked' && x.s !== 'booked'; }), waiting = st.filter(function (x) { return x.s === 'pending' && (now - new Date(x.r.created_at)) / DAY >= 7; });
    if (unsure.length) add('bad', '<b>' + unsure.length + ' student' + (unsure.length === 1 ? ' is' : 's are') + ' marked unsure.</b> Go to the Referrals section and confirm whether each one booked (✅ Booked) or not. Unsure students do not count as bookings or as owed fees.', b('Open Referrals', "DSQHealth.openReferrals('" + id + "')"));
    if (await_.length) add('bad', '<b>' + await_.length + ' student' + (await_.length === 1 ? '' : 's') + ' the instructor says booked</b> but you have not confirmed. Confirm in Referrals so it counts and the fee is recorded.', b('Open Referrals', "DSQHealth.openReferrals('" + id + "')"));
    if (waiting.length) add('warn', waiting.length + ' student' + (waiting.length === 1 ? ' has' : 's have') + ' had no update for 7+ days. Ask the instructor, or mark them.', b('Open Referrals', "DSQHealth.openReferrals('" + id + "')"));

    var iv = window._invStats ? window._invStats(true).find(function (x) { return String(x.id) === String(id); }) : null;
    if (iv) add(iv.level === 'investigate' ? 'bad' : 'warn', '<b>' + (iv.level === 'investigate' ? 'Investigate:' : 'Watch:') + ' ' + iv.unmarked + ' of the ' + iv.total + ' students you gave them have no update</b> (oldest ' + iv.oldest + ' days). Ask them to mark each one, or check the students yourself in Referrals.', b('Review students', "DSQHealth.openReferrals('" + id + "')"));

    /* money */
    var rows = feeRows(id), unpaid = rows.filter(function (r) { return r.status === 'unpaid' && r.week_start < mon(new Date()); });
    var plan = pk ? pk.name + ' package' : (model === 'franchise' ? 'franchise' : '');
    if (plan) {
      var fee = pk ? pk.fee : (window._frFeeOf ? window._frFeeOf(id) : 0);
      if (!(fee > 0)) add('bad', 'No weekly fee is set, so nothing is being charged.');
      var start = DSQPkg.startOf(id), sk = start ? mon(start + 'T12:00:00') : '', cur = mon(new Date());
      if (!(cfg && DSQPkg.hasFrStart(id))) add('warn', 'No franchise / package start date set, so history starts from the day they joined (' + (start ? nice(start, 1) : 'unknown') + '). Add the real start date in Edit.', b('Edit instructor', "DSQHealth.edit('" + id + "')"));
      var have = {}; rows.forEach(function (r) { have[r.week_start] = 1; }); var gaps = 0; for (var k = sk; sk && k < cur; k = addW(k, 1)) if (!have[k]) gaps++;
      if (gaps) add('warn', gaps + ' week' + (gaps === 1 ? '' : 's') + ' since the start ha' + (gaps === 1 ? 's' : 've') + ' no fee recorded. Fill in the history below so the money is complete.', b('Fill in history', "DSQHealth.backfillAsk('" + id + "')"));
      if (unpaid.length) add('warn', unpaid.length + ' earlier week' + (unpaid.length === 1 ? '' : 's') + ' unpaid, ' + money(unpaid.reduce(function (a, r) { return a + (+r.expected || 0); }, 0)) + ' to collect.', b('Weekly fees', "DSQHealth.openFees()"));
    }
    if (model === 'referral') { var owed = rs.filter(function (r) { return !r.is_paid && window._refAdminBooked && window._refAdminBooked(r); }); if (owed.length) add('warn', owed.length + ' booked student' + (owed.length === 1 ? '' : 's') + ' not yet paid for (' + money(owed.reduce(function (a, r) { return a + (parseFloat(r.amount) || 0); }, 0)) + ' owed to you).', b('Open Referrals', "DSQHealth.openReferrals('" + id + "')")); }

    /* package guarantee + terms */
    if (pk && pk.min) {
      var open = DSQPkg.shortfalls().filter(function (x) { return String(x.id) === String(id) && x.status === 'open'; });
      if (open.length) add('warn', 'Fell short of their guarantee last week (' + open[0].delivered + ' of ' + open[0].min + '). Review the discount in Weekly fees.', b('Weekly fees', "DSQHealth.openFees()"));
      var tm = DSQPkg.termsOf(id);
      if (!tm) add('warn', 'Has not agreed the package terms yet. Send them on WhatsApp, then press <i>Mark as agreed</i> when they reply.', b('Send terms', "DSQPkg.sendTermsWhatsApp('" + id + "')"));
    }

    /* profile basics */
    if (!ins.email) add('warn', 'No email, so no fee or weekly emails reach them.');
    if (!ins.phone) add('warn', 'No phone number.');
    if (AV[id] === false) add('warn', 'Has not added their availability, so Find &amp; Assign cannot match them by time.');
    if (ins.badge_expiry) { var dd = Math.round((new Date(ins.badge_expiry) - new Date().setHours(0, 0, 0, 0)) / DAY); if (dd < 0) add('bad', 'ADI badge expired ' + (-dd) + ' days ago.'); else if (dd <= 30) add('warn', 'ADI badge expires in ' + dd + ' days.'); }
    else add('warn', 'No ADI badge expiry date recorded.');
    if (ins.last_login) { var ld = Math.round((now - new Date(ins.last_login)) / DAY); if (ld > 14) add('warn', 'Has not logged in for ' + ld + ' days.'); } else add('warn', 'Has never logged in.');
    return out;
  }
  function healthHtml(id) {
    if (!window.DSQPkg || !DSQPkg._cfg()) return '<div id="instrHealth-' + id + '" style="color:var(--txt4);font-size:.8rem">Checking…</div>';
    var c = checks(id), bad = c.filter(function (x) { return x.lvl === 'bad'; }).length, warn = c.length - bad;
    var head = !c.length ? '<div style="font-weight:800;color:#16a34a">✅ Everything is working correctly</div><div style="font-size:.72rem;color:var(--txt3);margin-top:2px">Students confirmed, fees recorded, profile complete.</div>'
      : '<div style="font-weight:800;color:' + (bad ? '#ef4444' : '#f59e0b') + '">' + (bad ? '🚨' : '⚠️') + ' ' + c.length + ' thing' + (c.length === 1 ? '' : 's') + ' to look at' + (bad ? ' (' + bad + ' important)' : '') + '</div>';
    return '<div id="instrHealth-' + id + '">' + head + c.map(function (x) { return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:1px solid var(--bdr);font-size:.78rem;line-height:1.45"><span style="flex:0 0 auto">' + (x.lvl === 'bad' ? '🔴' : '🟠') + '</span><span style="flex:1">' + x.msg + x.btn + '</span></div>'; }).join('') + '</div>';
  }
  function openReferrals(id) {
    try { window.switchTab('referrals'); setTimeout(function () { try { window.setRefPeriod('all'); } catch (e) { } var i = document.getElementById('refSearch'); if (i) { i.value = instr(id).full_name || ''; try { window.renderReferrals(); } catch (e) { } try { i.scrollIntoView({ block: 'center' }); } catch (e) { } } try { window.openRefDetail(id, true); } catch (e) { } }, 300); } catch (e) { }
  }
  function openFees() { try { window.switchTab('expenses'); setTimeout(function () { window.setAccTab('fees'); }, 200); } catch (e) { } }
  function edit(id) { try { window.openEditForId(id); } catch (e) { } }

  /* ---------- full history from the start date ---------- */
  function historyHtml(id) {
    if (!window.DSQPkg || !DSQPkg._cfg()) return '';
    var start = DSQPkg.startOf(id); if (!start) return '<div style="font-size:.78rem;color:var(--txt4)">Set the franchise / package start date in Edit to see the history.</div>';
    var cur = mon(new Date()), sk = mon(start + 'T12:00:00'), rs = refsOf(id), rows = feeRows(id), by = {}; rows.forEach(function (r) { by[r.week_start] = r; });
    var wkly = {}, pcfg = DSQPkg._cfg(), wk = ((pcfg.by[id] || {}).wk) || {};
    rs.forEach(function (r) { var k = mon(r.created_at); var o = wkly[k] = wkly[k] || { n: 0, b: 0, u: 0 }; o.n++; var s = status(r); if (s === 'booked') o.b++; else if (s === 'unsure') o.u++; });
    var list = [], tot = { n: 0, b: 0, due: 0, paid: 0, off: 0 };
    for (var k = cur; k >= sk; k = addW(k, -1)) {
      var w = wkly[k] || { n: 0, b: 0, u: 0 }, f = by[k], d = wk[k] && wk[k].applied ? (+wk[k].off || 0) : 0; tot.n += w.n; tot.b += w.b; tot.off += d; if (f && f.status !== 'waived') { tot.due += +f.expected || 0; tot.paid += f.status === 'paid' ? (+f.amount_paid || 0) : 0; }
      list.push('<tr style="border-top:1px solid var(--bdr)"><td style="padding:5px 6px;white-space:nowrap">' + nice(k) + (k === cur ? ' <span style="color:var(--gold);font-size:.6rem">now</span>' : '') + '</td><td style="padding:5px 6px;text-align:right">' + w.n + '</td><td style="padding:5px 6px;text-align:right;color:#16a34a;font-weight:700">' + w.b + '</td><td style="padding:5px 6px;text-align:right;color:' + (w.u ? '#a855f7' : 'var(--txt4)') + '">' + (w.u || '—') + '</td>' +
        '<td style="padding:5px 6px;text-align:right">' + (f ? money(f.expected) : '—') + '</td><td style="padding:5px 6px;text-align:right">' + (d ? '−' + money(d) : '—') + '</td><td style="padding:5px 6px">' + (f ? (f.status === 'paid' ? '<span style="color:#16a34a;font-weight:700">Paid ' + money(f.amount_paid) + '</span>' : f.status === 'waived' ? '<span style="color:#94a3b8">Waived</span>' : '<span style="color:#f59e0b;font-weight:700">Unpaid</span>') : '<span style="color:var(--txt4)">not recorded</span>') + '</td></tr>');
    }
    return '<div style="font-size:.74rem;color:var(--txt3);margin-bottom:6px">From <b>' + nice(start, 1) + '</b> · ' + tot.n + ' students referred, ' + tot.b + ' confirmed booked · fees due ' + money(tot.due) + ', paid ' + money(tot.paid) + (tot.off ? ', discounts ' + money(tot.off) : '') + '</div>' +
      '<div style="max-height:260px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.74rem"><thead style="position:sticky;top:0;background:var(--dk2)"><tr style="color:var(--txt3);text-align:left"><th style="padding:4px 6px">Week</th><th style="padding:4px 6px;text-align:right">Referred</th><th style="padding:4px 6px;text-align:right">Booked</th><th style="padding:4px 6px;text-align:right">Unsure</th><th style="padding:4px 6px;text-align:right">Fee</th><th style="padding:4px 6px;text-align:right">Discount</th><th style="padding:4px 6px">Payment</th></tr></thead><tbody>' + list.join('') + '</tbody></table></div>' +
      '<div style="font-size:.68rem;color:var(--txt4);margin-top:5px">Only you see this. Weeks marked “not recorded” have no fee line yet — use Fill in history.</div>';
  }
  async function backfillAsk(id) {
    await loadAll(id); var start = DSQPkg.startOf(id); if (!start) { toast('Set the start date first (Edit instructor).', 'warn'); return; }
    var how = prompt('Fill in the missing weeks since ' + nice(start, 1) + ' for ' + (instr(id).full_name || 'this instructor') + '.\n\nType PAID if these earlier weeks were already paid in full (they will be counted as income on the last day of each week), or UNPAID if they are still owed.\n\nChoose carefully: PAID adds income to your accounts.', 'PAID');
    if (how === null) return; how = how.trim().toUpperCase(); if (how !== 'PAID' && how !== 'UNPAID') { toast('Type PAID or UNPAID.', 'warn'); return; }
    var n = await DSQFees.backfill(id, how === 'PAID', start); toast('✅ ' + n + ' week' + (n === 1 ? '' : 's') + ' recorded as ' + how.toLowerCase(), 'success', 4000); refresh(id);
  }

  /* ---------- package terms row ---------- */
  function termsHtml(id) {
    if (!window.DSQPkg || !DSQPkg._cfg()) return '';
    var t = DSQPkg.termsOf(id), p = DSQPkg.pkgOf(id), btn = function (l, js, extra) { return '<button class="btn-s" style="font-size:.72rem;padding:4px 11px;margin:2px 4px 2px 0;' + (extra || '') + '" onclick="' + js + '">' + l + '</button>'; };
    return '<div id="instrTerms-' + id + '" style="font-size:.78rem">' + (t ? '<div style="color:#16a34a;font-weight:800">✅ Agreed ' + nice(t.at, 1) + ' · version ' + E(t.v) + ' · ' + E(t.via) + '</div>' : '<div style="color:#f59e0b;font-weight:800">Not agreed yet</div>') +
      '<div style="margin-top:4px">' + btn('📲 Send terms on WhatsApp', "DSQPkg.sendTermsWhatsApp('" + id + "')") + (t ? btn('Remove', "DSQHealth.setTerms('" + id + "',false)") : btn('✓ Mark as agreed (they replied)', "DSQHealth.setTerms('" + id + "',true)", 'border-color:rgba(34,197,94,.5);color:#16a34a')) + '</div>' +
      '<div style="font-size:.68rem;color:var(--txt4);margin-top:3px">Send the message, they reply “I agree”, then press Mark as agreed. Keep the WhatsApp chat as proof.' + (p ? '' : ' (No package yet.)') + '</div></div>';
  }
  async function setTerms(id, on) {
    var when = new Date().toISOString().slice(0, 10);
    if (on) { var d = prompt('Date they agreed (YYYY-MM-DD)', when); if (d === null) return; when = /^\d{4}-\d{2}-\d{2}$/.test(d.trim()) ? d.trim() : when; } else if (!confirm('Remove the record that they agreed?')) return;
    await DSQPkg.setTerms(id, on, 'WhatsApp reply', when); refresh(id);
  }

  function refresh(id) {
    var set = function (pre, html) { var el = document.getElementById(pre + id); if (el) el.outerHTML = html; };
    set('instrHealth-', healthHtml(id)); set('instrHist-', '<div id="instrHist-' + id + '">' + historyHtml(id) + '</div>'); set('instrTerms-', termsHtml(id));
  }
  async function fill(id) {
    var ids = ['instrHealth-', 'instrHist-', 'instrTerms-'].map(function (p) { return document.getElementById(p + id); }); if (!ids[0] && !ids[1] && !ids[2]) return;
    await loadAll(id); refresh(id);
  }
  function holders(id) { return { health: '<div id="instrHealth-' + id + '" style="color:var(--txt4);font-size:.8rem">Checking…</div>', hist: '<div id="instrHist-' + id + '" style="color:var(--txt4);font-size:.8rem">Loading…</div>', terms: '<div id="instrTerms-' + id + '" style="color:var(--txt4);font-size:.8rem">Loading…</div>' }; }
  window.DSQHealth = { fill: fill, holders: holders, checks: checks, healthHtml: healthHtml, historyHtml: historyHtml, termsHtml: termsHtml, openReferrals: openReferrals, openFees: openFees, edit: edit, backfillAsk: backfillAsk, setTerms: setTerms, refresh: refresh };
})();
