/* DriveSQ Auto-assign CONTROL CENTRE (admin). One screen to see and control everything auto-assign does.
   Tabs: Overview (what is happening right now) · Instructors (who is getting jobs) · Students booked (referral monitor) · Settings · Activity.
   It only READS and drives the pieces that already exist (admin-autoassign.js = settings/attention, admin-whatsapp.js = WhatsApp, the Supabase function = the engine). */
(function () {
  'use strict';
  var WANT_FN = '2026-11-23-read-chats', TAB = 'overview', IFILT = 'all', ISEARCH = '', TIMER = null, FILTER = 'all', DATA = {};
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var SBc = function () { return window.DSQ_ADMIN && DSQ_ADMIN.sb && DSQ_ADMIN.sb(); };
  var toast = function (m, t, ms) { try { window.showToast(m, t || '', ms); } catch (e) { } };
  var ago = function (d) { var t = new Date(d).getTime(); if (!d || isNaN(t)) return ''; var m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  var money = function (v) { return '£' + (Math.abs(v - Math.round(v)) < .005 ? Math.round(v) : v.toFixed(2)); };
  var londonHour = function () { return +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(new Date()) % 24; };
  var monday = function () { var m = new Date(); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m.getTime(); };
  var dayStart = function () { var m = new Date(); m.setHours(0, 0, 0, 0); return m.getTime(); };
  function bookedWhen(r) { var t = 0; String(r.admin_notes || '').split('\n').forEach(function (l) { if (/✅ Booked — confirmed/.test(l)) { var d = Date.parse(l.split(' · ')[0]); if (!isNaN(d)) t = d; } }); return t || new Date(r.paid_at || r.created_at).getTime(); }
  var isBooked = function (r) { try { return !r.is_cancelled && !r.is_credit && DSQ_ADMIN.booked(r); } catch (e) { return false; } };
  var isAuto = function (r) { return /Auto-assigned/i.test(String(r.notes || '')) || /🤖 Auto-assigned/.test(String(r.admin_notes || '')); };

  var CSS = '#aaHub{position:fixed;inset:0;z-index:99990;background:var(--dk,#0b0b0e);color:var(--txt,#eee);overflow:auto;font-family:Inter,system-ui,sans-serif}' +
    '#aaHub .hb{max-width:1180px;margin:0 auto;padding:14px 16px 60px}' +
    '#aaHub .hh{display:flex;align-items:center;gap:12px;flex-wrap:wrap;position:sticky;top:0;z-index:3;background:var(--dk,#0b0b0e);padding:10px 0;border-bottom:1px solid var(--bdr,#2a2a33)}' +
    '#aaHub h1{font-family:Oswald,sans-serif;font-size:1.35rem;margin:0;font-weight:700}' +
    '#aaHub .tabs{display:flex;gap:4px;flex-wrap:wrap;margin:12px 0}' +
    '#aaHub .tab{border:1px solid var(--bdr,#2a2a33);background:transparent;color:var(--txt3,#aaa);border-radius:99px;padding:6px 14px;font-size:.8rem;font-weight:700;cursor:pointer}' +
    '#aaHub .tab.on{background:#dc2626;border-color:#dc2626;color:#fff}' +
    '#aaHub .kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:6px 0 14px}' +
    '#aaHub .k{border:1px solid var(--bdr,#2a2a33);border-radius:12px;padding:10px 12px;background:var(--dk2,#14141a)}' +
    '#aaHub .k b{display:block;font-family:Oswald,sans-serif;font-size:1.7rem;line-height:1.1}' +
    '#aaHub .k span{font-size:.7rem;color:var(--txt3,#aaa);text-transform:uppercase;letter-spacing:.04em}' +
    '#aaHub .k small{display:block;font-size:.68rem;color:var(--txt4,#888);margin-top:2px}' +
    '#aaHub .cd{border:1px solid var(--bdr,#2a2a33);border-radius:14px;background:var(--dk2,#14141a);padding:12px 14px;margin-bottom:14px}' +
    '#aaHub .cd h3{margin:0 0 8px;font-size:.92rem;font-weight:800;display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
    '#aaHub .g2{display:grid;grid-template-columns:1.25fr 1fr;gap:14px}@media(max-width:900px){#aaHub .g2{grid-template-columns:1fr}}' +
    '#aaHub table{width:100%;border-collapse:collapse;font-size:.78rem}#aaHub th{text-align:left;font-size:.66rem;text-transform:uppercase;letter-spacing:.05em;color:var(--txt4,#888);padding:6px 8px;border-bottom:1px solid var(--bdr,#2a2a33)}' +
    '#aaHub td{padding:7px 8px;border-bottom:1px solid var(--bdr,#2a2a33);vertical-align:middle}#aaHub tr:last-child td{border-bottom:0}' +
    '#aaHub .pill{display:inline-block;border-radius:99px;padding:2px 9px;font-size:.68rem;font-weight:800;border:1px solid}' +
    '#aaHub .feed{max-height:430px;overflow:auto}#aaHub .fi{display:flex;gap:9px;padding:7px 0;border-bottom:1px solid var(--bdr,#2a2a33);font-size:.78rem;line-height:1.45}#aaHub .fi:last-child{border:0}' +
    '#aaHub .fi i{font-style:normal;width:20px;text-align:center;flex:none}#aaHub .fi time{color:var(--txt4,#888);font-size:.68rem;white-space:nowrap;margin-left:auto}' +
    '#aaHub .bar{height:7px;border-radius:5px;background:var(--bdr,#2a2a33);overflow:hidden;min-width:70px}#aaHub .bar>div{height:100%;background:#22c55e}' +
    '#aaHub .sw{position:relative;width:54px;height:30px;border-radius:99px;border:0;cursor:pointer;transition:.2s}#aaHub .sw::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:.2s}#aaHub .sw.on::after{left:27px}' +
    '#aaHub .empty{padding:18px;text-align:center;color:var(--txt4,#888);font-size:.8rem}' +
    '#aaHub .chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}#aaHub .chip{border:1px solid var(--bdr,#2a2a33);background:transparent;color:var(--txt3,#aaa);border-radius:99px;padding:3px 11px;font-size:.72rem;cursor:pointer}#aaHub .chip.on{background:rgba(220,38,38,.18);border-color:#dc2626;color:#fff}' +
    '#aaHub .scroll{overflow-x:auto}';

  /* ---------- data ---------- */
  async function load() {
    var sb = SBc(), cfg = (window.DSQAA && await DSQAA.load(true)) || {}, since3 = new Date(Date.now() - 3 * 864e5).toISOString(), since30 = new Date(Date.now() - 30 * 864e5).toISOString();
    var q = function (p) { return p.then(function (r) { return (r && r.data) || []; }, function () { return []; }); };
    var res = await Promise.all([
      q(sb.from('auto_assign_jobs').select('*').gte('updated_at', since3).order('updated_at', { ascending: false }).limit(80)),
      q(sb.from('waiting_list').select('id,student_name,postcode,notes,status,created_at').eq('status', 'waiting').order('created_at', { ascending: false }).limit(120)),
      q(sb.from('admin_activity_log').select('created_at,summary,action').eq('area', 'auto_assign').order('created_at', { ascending: false }).limit(60)),
      q(sb.from('wa_log').select('created_at,direction,template,status,error,student_name,to_phone,body').order('created_at', { ascending: false }).limit(40)),
      q(sb.from('growth_settings').select('key,value').in('key', ['auto_assign_last_run', 'instructor_traits', 'packages']))]);
    var fees = []; try { fees = await q(sb.from('instructor_weekly_fees').select('instructor_id,week_start,expected,status').eq('status', 'unpaid')); } catch (e) { }
    var gs = {}; res[4].forEach(function (x) { gs[x.key] = x.value; });
    var jobIds = res[0].map(function (j) { return j.waiting_id; }), names = {};
    if (jobIds.length) { var w = await q(sb.from('waiting_list').select('id,student_name,postcode,created_at').in('id', jobIds)); w.forEach(function (x) { names[String(x.id)] = x; }); }
    var refs = (DSQ_ADMIN.refs() || []); if (!refs.length) { try { await window.loadReferrals(); refs = DSQ_ADMIN.refs() || []; } catch (e) { } }
    var st = null; try { st = window.DSQWA && await DSQWA.status(false); } catch (e) { }
    DATA = { fees: fees, cfg: cfg, jobs: res[0], waiting: res[1], log: res[2], wa: res[3], last: gs.auto_assign_last_run, traits: gs.instructor_traits || {}, pk: gs.packages || {}, names: names, refs: refs, instrs: (DSQ_ADMIN.instrs() || []), att: (window.DSQAA ? DSQAA._att() : []), wast: st, at: Date.now() };
  }
  /* what is each instructor owed (same rule as the server): package minimum, else the franchise minimum, not before their start date */
  function owed(i) {
    var cfg = DATA.cfg, pk = DATA.pk || {}, p = (pk.by || {})[i.id], tiers = pk.tiers || {}, def = { normal: { noGuarantee: true }, silver: { min: 3 }, gold: { min: 5 }, platinum: { min: 7 } }, t = p && p.tier && p.active !== false ? (tiers[p.tier] || def[p.tier]) : null;
    var start = ((pk.frStart || {})[i.id]) || (p && p.start) || '', started = !start || start <= new Date().toISOString().slice(0, 10), min = 0, src = '';
    if (t && !t.noGuarantee) { min = p.min != null && p.min !== '' ? +p.min : (t.min || 0); src = 'package'; } else if ((!t || t.noGuarantee) && String(i.instructor_model || '').toLowerCase() === 'franchise' && cfg.franchiseMin > 0) { min = cfg.franchiseMin; src = 'franchise'; }
    return { min: min, start: start, started: started, src: src };
  }
  function stats(i) {
    var mon = monday(), d0 = dayStart(), s = { today: 0, week: 0, bookedWeek: 0, last: 0, unconfirmed: 0, unpaid: 0, unpaidAmt: 0, assigned30: 0, booked30: 0 }, t30 = Date.now() - 30 * 864e5;
    DATA.refs.forEach(function (r) {
      if (String(r.instructor_id) !== String(i.id) || r.is_cancelled || r.is_credit) return; var c = new Date(r.created_at).getTime(); if (c > s.last) s.last = c;
      if (c >= mon) s.week++; if (c >= d0) s.today++; var bk = isBooked(r); if (bk && c >= mon) s.bookedWeek++;
      if (c >= t30) { s.assigned30++; if (bk) s.booked30++; }
      if (!bk && !r.flag_color && !r.reply_status && !r.is_paid && (Date.now() - c) / 864e5 >= 3 && (Date.now() - c) / 864e5 < 45) s.unconfirmed++;
      if (bk && !r.is_paid && String(i.instructor_model || '').toLowerCase() === 'referral') { s.unpaid++; s.unpaidAmt += parseFloat(r.amount) || 0; }
    }); return s;
  }
  var JOB = { working: ['⏳', 'Working on it', '#60a5fa'], pending_accept: ['📲', 'Waiting for a reply', '#a78bfa'], assigned: ['✅', 'Assigned', '#22c55e'], attention: ['🚨', 'Needs you', '#ef4444'], closed: ['•', 'Closed', '#94a3b8'] };

  /* ---------- pieces ---------- */
  function strip() {
    var c = DATA.cfg, on = !!c.enabled, h = londonHour(), open = h >= c.hours[0] && h < c.hours[1], wa = DATA.wast && DATA.wast.ok && DATA.wast.ready && !DATA.wast.error;
    var age = DATA.last && DATA.last.at ? Math.round((Date.now() - new Date(DATA.last.at)) / 6e4) : null, run = age !== null && age <= 15;
    var pill = function (t, col) { return '<span class="pill" style="color:' + col + ';border-color:' + col + '66;background:' + col + '14">' + t + '</span>'; };
    return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 2px">' +
      pill(on ? (c.mode === 'suggest' ? '● ON · suggest only' : '● ON · assigning') : '○ OFF', on ? (c.mode === 'suggest' ? '#a78bfa' : '#22c55e') : '#94a3b8') +
      pill(wa ? '● WhatsApp connected' : '● WhatsApp not connected', wa ? '#22c55e' : '#ef4444') +
      pill(age === null ? '● Cron has not run yet' : run ? '● Running by itself · ' + (age < 1 ? 'just now' : age + ' min ago') : '● Cron stopped · ' + (age < 60 ? age + ' min' : Math.round(age / 60) + ' h') + ' ago', run ? '#22c55e' : (on ? '#f59e0b' : '#94a3b8')) +
      (c.anytime !== false ? pill('● Messaging 24/7', '#22c55e') : pill(open ? '● Offering now (' + c.hours[0] + ':00–' + c.hours[1] + ':00)' : '● Quiet hours until ' + c.hours[0] + ':00', open ? '#22c55e' : '#94a3b8')) + '</div>' +
      (on && !run ? '<div style="border:1px solid #f59e0b;background:rgba(245,158,11,.1);border-radius:10px;padding:8px 12px;font-size:.78rem;margin:8px 0">⚠️ It is switched on but the Cron job is not running, so bookings only move when you press <b>Run now</b>. Settings → "Make it run by itself".</div>' : '') +
      (on && !wa && c.mode === 'assign' ? '<div style="border:1px solid #ef4444;background:rgba(239,68,68,.1);border-radius:10px;padding:8px 12px;font-size:.78rem;margin:8px 0">🚫 WhatsApp is not connected, so assigning would fail. Use <b>Suggest only</b> until it is connected.</div>' : '');
  }
  function kpis() {
    var jobs = DATA.jobs, cfg = DATA.cfg, since = cfg.since ? new Date(cfg.since).getTime() : 0, mon = monday(), d0 = dayStart();
    var waiting = DATA.waiting.filter(function (w) { return /\[WEB\]/i.test(w.notes || '') && new Date(w.created_at).getTime() >= since && !jobs.some(function (j) { return String(j.waiting_id) === String(w.id); }); }).length;
    var offers = jobs.filter(function (j) { return j.state === 'pending_accept'; }).length, auto = DATA.refs.filter(isAuto), aToday = auto.filter(function (r) { return new Date(r.created_at).getTime() >= d0; }).length, aWeek = auto.filter(function (r) { return new Date(r.created_at).getTime() >= mon; }).length;
    var bookedWk = DATA.refs.filter(function (r) { return isBooked(r) && new Date(r.created_at).getTime() >= mon; }).length, old = auto.filter(function (r) { return Date.now() - new Date(r.created_at) > 7 * 864e5 && Date.now() - new Date(r.created_at) < 45 * 864e5 && !r.is_cancelled; }), conv = old.length ? Math.round(old.filter(isBooked).length / old.length * 100) : null;
    var k = function (n, t, s, col) { return '<div class="k"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + n + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>'; };
    return '<div class="kp">' + k(waiting, 'Waiting to be picked up', 'new website bookings', waiting ? '#60a5fa' : '') + k(offers, 'Offers awaiting reply', 'instructors asked', offers ? '#a78bfa' : '') + k(aToday, 'Auto-assigned today', aWeek + ' this week') + k(bookedWk, 'Students booked this week', 'confirmed (admin / instructor / student)', '#22c55e') + k(conv === null ? '–' : conv + '%', 'Turned into bookings', 'auto-assigned students older than a week') + k(DATA.att.length, 'Need your attention', '', DATA.att.length ? '#ef4444' : '#22c55e') + '</div>';
  }
  function queue() {
    var names = DATA.names, ins = {}; DATA.instrs.forEach(function (i) { ins[String(i.id)] = i; }); var rows = DATA.jobs.filter(function (j) { return j.state !== 'closed'; }).slice(0, 12);
    return '<div class="cd"><h3>📋 Bookings being handled <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">last 3 days</span>' + (rows.length ? '<button class="btn-s" style="font-size:.68rem;padding:1px 10px;margin-left:auto" title="Hide every finished or stuck row from this list" onclick="DSQHub.clearList()">🗑 Clear list</button>' : '') + '</h3>' + (rows.length ? '<div class="scroll"><table><thead><tr><th>Student</th><th>Status</th><th>Instructor</th><th>Since</th><th></th></tr></thead><tbody>' + rows.map(function (j) {
      var w = names[String(j.waiting_id)] || {}, st = JOB[j.state] || JOB.closed, i = ins[String(j.instructor_id)] || {}, note = String(j.note || '');
      return '<tr><td><b>' + E(w.student_name || 'Booking') + '</b><div style="font-size:.68rem;color:var(--txt4)">' + E(w.postcode || '') + '</div></td><td><span class="pill" style="color:' + st[2] + ';border-color:' + st[2] + '66">' + st[0] + ' ' + st[1] + '</span>' + (note ? '<div style="font-size:.66rem;color:var(--txt4);max-width:240px">' + E(note.slice(0, 110)) + '</div>' : '') + '</td><td>' + E(i.full_name || (j.instructor_id ? '…' : '–')) + (j.dist ? '<div style="font-size:.66rem;color:var(--txt4)">' + (Math.round(j.dist * 10) / 10) + ' mi</div>' : '') + '</td><td style="white-space:nowrap;color:var(--txt3)">' + ago(j.state === 'pending_accept' && j.expires_at ? j.expires_at : j.updated_at) + '</td><td style="text-align:right">' +
        (j.state === 'attention' ? '<button class="btn-p" style="font-size:.68rem;padding:2px 10px" onclick="DSQHub.openBooking(\'' + j.waiting_id + '\')">Open</button> <button class="btn-s" style="font-size:.68rem;padding:2px 10px" onclick="DSQHub.retry(\'' + j.waiting_id + '\')">Retry</button>' : '') + ' <button class="btn-s" style="font-size:.68rem;padding:2px 9px" title="Remove this booking from the list (it will not be picked up again)" onclick="DSQHub.removeJob(\'' + j.id + '\')">✕ Remove</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty">Nothing in the queue. New website bookings appear here the moment they are picked up.</div>') + '</div>';
  }
  var ICON = function (x) { var s = (x.action || '') + ' ' + (x.summary || ''); return /attention|⚠️|failed/i.test(s) ? '🚨' : /assigned/i.test(s) ? '✅' : /offer|asked|WhatsApp/i.test(s) ? '📲' : /settings|turned/i.test(s) ? '⚙️' : '•'; };
  function feedItems() {
    var items = DATA.log.map(function (x) { return { t: x.created_at, i: ICON(x), s: x.summary, k: /attention|⚠️|failed/i.test((x.action || '') + (x.summary || '')) ? 'attention' : /assigned/i.test(x.summary || '') ? 'assigned' : 'other' }; });
    DATA.wa.forEach(function (w) { var out = w.direction === 'out', lab = String(w.template || '').replace(/^dsq_/, '').replace(/_/g, ' '); items.push({ t: w.created_at, i: w.status === 'failed' ? '❌' : out ? '📤' : '📥', s: (out ? 'WhatsApp ' + (w.status === 'failed' ? 'FAILED' : 'sent') + ' · ' + lab + (w.student_name ? ' · ' + w.student_name : '') : 'WhatsApp reply received' + (w.body ? ': ' + String(w.body).slice(0, 60) : '')) + (w.error ? ' (' + w.error + ')' : ''), k: w.status === 'failed' ? 'attention' : 'messages' }); });
    return items.sort(function (a, b) { return new Date(b.t) - new Date(a.t); });
  }
  function feed(n, filter) {
    var it = feedItems().filter(function (x) { return !filter || filter === 'all' || x.k === filter; }).slice(0, n);
    return it.length ? it.map(function (x) { return '<div class="fi"><i>' + x.i + '</i><span>' + E(x.s) + '</span><time>' + ago(x.t) + '</time></div>'; }).join('') : '<div class="empty">Nothing yet. Once auto-assign picks up a booking, every step shows here live.</div>';
  }
  function attn() {
    var a = DATA.att.slice(0, 5); return '<div class="cd"><h3>🚨 Needs you <button class="btn-s" style="font-size:.68rem;padding:1px 10px;margin-left:auto" onclick="DSQAA.openAttention()">Open all (' + DATA.att.length + ')</button></h3>' + (a.length ? a.map(function (x) { return '<div class="fi"><i>⚠️</i><span><b>' + E(x.title) + '</b><br><span style="color:var(--txt3)">' + E((x.detail || '').slice(0, 140)) + '</span></span><time>' + ago(x.created_at) + '</time></div>'; }).join('') : '<div class="empty" style="color:#22c55e">✅ Nothing needs your attention</div>') + '</div>';
  }
  /* everything owed to DriveSQ right now: referral fees (booked, unpaid) and franchise weekly fees (unpaid, week started) */
  function money_() {
    var rows = [], now = Date.now();
    DATA.instrs.filter(function (i) { return i.status === 'approved'; }).forEach(function (i) {
      var s = stats(i), isRef = String(i.instructor_model || '').toLowerCase() === 'referral';
      var fr = (DATA.fees || []).filter(function (f) { return String(f.instructor_id) === String(i.id) && new Date(f.week_start + 'T00:00:00').getTime() <= now && parseFloat(f.expected) > 0; });
      var fa = fr.reduce(function (a, f) { return a + parseFloat(f.expected); }, 0);
      if (isRef && s.unpaidAmt > 0) rows.push({ n: i.full_name, what: s.unpaid + ' referral fee' + (s.unpaid === 1 ? '' : 's'), amt: s.unpaidAmt });
      if (fa > 0) rows.push({ n: i.full_name, what: fr.length + ' franchise week' + (fr.length === 1 ? '' : 's'), amt: fa });
    });
    rows.sort(function (a, b) { return b.amt - a.amt; }); var tot = rows.reduce(function (a, r) { return a + r.amt; }, 0);
    return '<div class="cd"><h3>💷 Money to collect <span style="margin-left:auto;font-weight:800;color:' + (tot ? '#f59e0b' : '#22c55e') + '">' + money(tot) + '</span></h3>' + (rows.length ? rows.slice(0, 8).map(function (r) { return '<div class="fi"><i>💷</i><span><b>' + E(r.n) + '</b> · ' + money(r.amt) + '<br><span style="color:var(--txt3)">' + E(r.what) + ' unpaid</span></span></div>'; }).join('') + (rows.length > 8 ? '<div style="font-size:.72rem;color:var(--txt4);padding:4px 2px">+ ' + (rows.length - 8) + ' more (see Finance / Referrals)</div>' : '') + '<div style="font-size:.7rem;color:var(--txt4);margin-top:6px">Every Monday you also get one summary in Needs you. Nothing is ever marked paid automatically.</div>' : '<div class="empty">Nobody owes anything. ✅</div>') + '</div>';
  }
  function overview() { return strip() + '<div style="height:10px"></div>' + kpis() + '<div class="g2"><div>' + queue() + attn() + money_() + '</div><div class="cd"><h3>🛰️ What is happening now <span style="font-weight:500;font-size:.7rem;color:#22c55e">● live</span></h3><div class="feed">' + feed(30) + '</div></div></div>'; }

  /* ---------- instructors ---------- */
  function instructorsTab() {
    var cfg = DATA.cfg, rows = DATA.instrs.filter(function (i) { return i.status === 'approved'; }).map(function (i) {
      var s = stats(i), o = owed(i), t = DATA.traits[i.id] || {}, idle = s.last ? Math.floor((Date.now() - s.last) / 864e5) : null, flags = [];
      if (!o.started) flags.push(['Starts ' + o.start, '#94a3b8']); else if (o.min && s.bookedWeek < o.min) flags.push(['Owed ' + (o.min - s.bookedWeek) + ' job' + (o.min - s.bookedWeek === 1 ? '' : 's'), '#f59e0b']);
      if (t.coveredOnly) flags.push(['Covered areas only', '#a78bfa']);
      if (t.only) flags.push([t.only === 'female' ? 'Women only' : 'Men only', '#a78bfa']); if (t.pausedUntil && t.pausedUntil >= new Date().toISOString().slice(0, 10)) flags.push(['Paused to ' + t.pausedUntil, '#94a3b8']);
      var own = ['maxMiles', 'maxDay', 'maxWeek', 'maxWeekHard', 'minWeek'].filter(function (k) { return t[k] !== undefined; }).length; if (own) flags.push(['Own limits', '#60a5fa']);
      if (t.noAuto) flags.push(['Ignored' + (t.noAutoNote ? ': ' + t.noAutoNote : ''), '#94a3b8']);
      if (cfg.dailyLimit > 0 && s.today >= cfg.dailyLimit) flags.push(['Over daily limit', '#ef4444']); if (cfg.weeklyLimit > 0 && s.bookedWeek >= cfg.weeklyLimit) flags.push(['Over weekly limit', '#ef4444']);
      if (cfg.unpaidLimit > 0 && s.unpaid >= cfg.unpaidLimit) flags.push(['Fees unpaid', '#ef4444']);
      if (idle === null || idle >= (cfg.droughtDays || 7)) flags.push(['No student ' + (idle === null ? 'yet' : idle + 'd'), '#f59e0b']);
      if (!flags.length) flags.push(['Available', '#22c55e']); return { i: i, s: s, o: o, t: t, idle: idle, flags: flags, rank: (!o.started ? 9 : o.min && s.bookedWeek < o.min ? 0 : 1) };
    }).sort(function (a, b) { return a.rank - b.rank || String(a.i.full_name).localeCompare(String(b.i.full_name)); });
    var nIgn = rows.filter(function (r) { return r.t.noAuto; }).length;
    var IF = { all: ['All', function () { return true; }], avail: ['Available', function (r) { return !r.t.noAuto && r.flags[0][0] === 'Available'; }], behind: ['Behind minimum', function (r) { return r.o.started && r.o.min && r.s.bookedWeek < r.o.min; }], fees: ['Fees unpaid', function (r) { return r.flags.some(function (f) { return f[0] === 'Fees unpaid'; }); }], ign: ['Ignored (' + nIgn + ')', function (r) { return !!r.t.noAuto; }] };
    var chips = '<div class="chips" style="margin:6px 0">' + Object.keys(IF).map(function (k) { return '<button class="chip' + (IFILT === k ? ' on' : '') + '" onclick="DSQHub.ifilter(\'' + k + '\')">' + E(IF[k][0]) + '</button>'; }).join('') + '<input class="dsq-inp" id="aaISearch" placeholder="Search name…" value="' + E(ISEARCH) + '" oninput="DSQHub.isearch(this.value)" style="width:150px;padding:3px 8px;font-size:.74rem;margin-left:auto"></div>';
    var banner = nIgn ? '<div style="background:rgba(148,163,184,.12);border:1px solid #94a3b8;border-radius:8px;padding:6px 10px;margin:6px 0;font-size:.76rem">🚫 ' + nIgn + ' instructor' + (nIgn === 1 ? ' is' : 's are') + ' being ignored: they get no automatic students until you press ↩ Include again.</div>' : '';
    rows = rows.filter(function (r) { return IF[IFILT][1](r) && (!ISEARCH || String(r.i.full_name).toLowerCase().indexOf(ISEARCH.toLowerCase()) >= 0); });
    var PR = [[2, 'Top'], [1, 'High'], [0, 'Equal'], [-1, 'Low'], [-2, 'Last']];
    return '<div class="cd"><h3>👥 Who is getting jobs <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">franchise instructors below their weekly minimum are offered the next student first</span></h3>' + banner + chips + (rows.length ? '<div class="scroll"><table><thead><tr><th>Instructor</th><th>Booked this week</th><th>Given today / week</th><th>Last student</th><th>Status</th><th>Priority</th><th>Auto-assign</th></tr></thead><tbody>' + rows.map(function (r) {
      var pct = r.o.min ? Math.min(100, Math.round(r.s.bookedWeek / r.o.min * 100)) : 0;
      return '<tr style="' + (r.t.noAuto ? 'opacity:.55' : '') + '"><td><b>' + E(r.i.full_name) + '</b><div style="font-size:.66rem;color:var(--txt4)">' + E(String(r.i.instructor_model || 'referral')) + (r.o.src ? ' · ' + r.o.src + ' min ' + r.o.min : '') + '</div></td><td>' + r.s.bookedWeek + (r.o.min ? ' of ' + r.o.min + '<div class="bar"><div style="width:' + pct + '%;background:' + (pct >= 100 ? '#22c55e' : '#f59e0b') + '"></div></div>' : '') + '</td><td>' + r.s.today + ' / ' + r.s.week + '</td><td style="color:var(--txt3)">' + (r.idle === null ? 'never' : r.idle === 0 ? 'today' : r.idle + ' d ago') + '</td><td>' + r.flags.map(function (f) { return '<span class="pill" style="color:' + f[1] + ';border-color:' + f[1] + '66;margin:1px">' + E(f[0]) + '</span>'; }).join('') + '</td><td><select class="dsq-inp" style="width:auto;padding:2px 6px;font-size:.74rem" onchange="DSQHub.prio(\'' + r.i.id + '\',this.value)">' + PR.map(function (p) { return '<option value="' + p[0] + '"' + ((r.t.priority || 0) === p[0] ? ' selected' : '') + '>' + (p[0] === 0 ? 'Equal (default)' : p[1]) + '</option>'; }).join('') + '</select></td><td>' + (r.t.noAuto ? '<button class="btn-p" style="font-size:.7rem;padding:2px 10px;white-space:nowrap" title="Include this instructor in auto-assign again" onclick="DSQHub.ignore(\'' + r.i.id + '\',false)">↩ Include again</button>' : '<button class="btn-s" style="font-size:.7rem;padding:2px 10px;white-space:nowrap" title="Auto-assign will skip this instructor (you can still assign them by hand) until you include them again" onclick="DSQHub.ignore(\'' + r.i.id + '\',true)">🚫 Ignore</button>') + ' <button class="btn-s" style="font-size:.7rem;padding:2px 10px;white-space:nowrap" title="This instructor\'s own auto-assign settings" onclick="DSQHub.instrSettings(\'' + r.i.id + '\')">⚙ Settings</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty">No approved instructors loaded yet.</div>') + '</div>';
  }

  /* ---------- students booked (referral monitor) ---------- */
  function booked() {
    var mon = monday(), m0 = new Date(); m0.setHours(0, 0, 0, 0); m0.setDate(1); m0 = m0.getTime(); var t30 = Date.now() - 30 * 864e5;
    var all = DATA.refs.filter(function (r) { return !r.is_cancelled && !r.is_credit; }), bk = all.filter(isBooked), n = function (f, t) { return bk.filter(function (r) { return bookedWhen(r) >= f; }).length; };
    var unconf = all.filter(function (r) { var a = (Date.now() - new Date(r.created_at)) / 864e5; return !isBooked(r) && !r.flag_color && !r.reply_status && !r.is_paid && a >= 3 && a < 45; });
    var k = function (v, t, s, c) { return '<div class="k"><span>' + t + '</span><b' + (c ? ' style="color:' + c + '"' : '') + '>' + v + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>'; };
    var per = DATA.instrs.filter(function (i) { return i.status === 'approved'; }).map(function (i) { var s = stats(i); return { i: i, s: s }; }).sort(function (a, b) { return b.s.bookedWeek - a.s.bookedWeek || b.s.booked30 - a.s.booked30; });
    return '<div class="kp">' + k(n(mon), 'Booked this week', 'confirmed ✅', '#22c55e') + k(n(m0), 'Booked this month', '') + k(n(t30), 'Booked, last 30 days', '') + k(bk.length, 'Booked, all time', 'counted from Referrals') + k(unconf.length, 'Not confirmed yet', 'given 3+ days ago, nothing marked', unconf.length ? '#f59e0b' : '') + '</div>' +
      '<div class="cd"><h3>📈 By instructor <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">a student counts as booked once admin, the instructor or the student confirmed ✅ (or the fee is paid)</span></h3><div class="scroll"><table><thead><tr><th>Instructor</th><th>Given (30 days)</th><th>Booked (30 days)</th><th>Rate</th><th>Not confirmed</th><th>Unpaid fees</th><th></th></tr></thead><tbody>' + per.map(function (r) {
        var rate = r.s.assigned30 >= 3 ? Math.round(r.s.booked30 / r.s.assigned30 * 100) : null; return '<tr><td><b>' + E(r.i.full_name) + '</b></td><td>' + r.s.assigned30 + '</td><td><b>' + r.s.booked30 + '</b> <span style="color:var(--txt4)">(' + r.s.bookedWeek + ' this week)</span></td><td>' + (rate === null ? '–' : '<span style="color:' + (rate >= 60 ? '#22c55e' : rate >= 35 ? '#f59e0b' : '#ef4444') + '">' + rate + '%</span>') + '</td><td>' + (r.s.unconfirmed ? '<span class="pill" style="color:#f59e0b;border-color:#f59e0b66">' + r.s.unconfirmed + ' to chase</span>' : '–') + '</td><td>' + (r.s.unpaid ? r.s.unpaid + ' · ' + money(r.s.unpaidAmt) : '–') + '</td><td style="text-align:right"><button class="btn-s" style="font-size:.68rem;padding:1px 10px" onclick="try{openRefDetail(\'' + r.i.id + '\')}catch(e){}">Referrals</button></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      (unconf.length ? '<div class="cd"><h3>🕵️ Students nobody has confirmed <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">the follow-up WhatsApps chase these, or mark them in Referrals</span></h3>' + unconf.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); }).slice(0, 12).map(function (r) { var i = DATA.instrs.filter(function (x) { return String(x.id) === String(r.instructor_id); })[0] || {}; return '<div class="fi"><i>•</i><span><b>' + E(r.student_name || 'Student') + '</b> · ' + E(i.full_name || '') + '</span><time>' + ago(r.created_at) + '</time></div>'; }).join('') + '</div>' : '');
  }

  /* ---------- tabs + shell ---------- */
  function body() {
    if (TAB === 'overview') return overview(); if (TAB === 'instructors') return instructorsTab(); if (TAB === 'booked') return booked();
    if (TAB === 'activity') return '<div class="cd"><h3>📜 Everything auto-assign has done</h3><div class="chips">' + [['all', 'All'], ['assigned', 'Assigned'], ['messages', 'WhatsApp'], ['attention', 'Problems']].map(function (f) { return '<button class="chip' + (FILTER === f[0] ? ' on' : '') + '" onclick="DSQHub.filter(\'' + f[0] + '\')">' + f[1] + '</button>'; }).join('') + '</div><div class="feed" style="max-height:none">' + feed(100, FILTER) + '</div></div>';
    if (TAB === 'ready') return readyTab();
    return '<div id="aaHolder"></div>';
  }
  /* ---------- test & readiness ---------- */
  var TPLS = null;
  function readyTab() {
    return '<div class="cd"><h3>✅ Is it ready to run for real? <button class="btn-s" style="font-size:.7rem;padding:1px 10px;margin-left:auto" onclick="DSQHub.recheck()">↻ Check again</button></h3><div id="hubReady"><div class="empty">Checking…</div></div></div>' +
      '<div class="cd"><h3>🔧 WhatsApp templates <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">fixes "Template name does not exist" errors</span></h3><div style="font-size:.78rem;color:var(--txt3);margin-bottom:8px">Finds which WhatsApp account owns your number and which message templates it is missing, then creates them for you in the right account. They still need Meta\'s approval (usually a few hours).</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-s" onclick="DSQHub.diagnoseWa()">🔍 Diagnose</button><button class="btn-p" onclick="DSQHub.createTpls()">➕ Create the missing templates in Meta</button><button class="btn-s" onclick="DSQHub.webhookCheck(false)">📥 Check incoming messages</button><button class="btn-p" onclick="DSQHub.webhookCheck(true)">🔗 Connect incoming messages</button><button class="btn-p" onclick="DSQHub.readChats()">📥 Read recent WhatsApp chats now</button></div><div id="waDiag" style="font-size:.78rem;margin-top:10px"></div></div>' +
      '<div class="cd"><h3>🧪 Test a booking <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">nothing is saved or sent: see who it would go to, and why</span></h3>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:8px"><label style="font-size:.72rem">Student postcode<input id="simPc" class="dsq-inp" placeholder="e.g. M14 5AB" style="margin-top:2px"></label>' +
      '<label style="font-size:.72rem">Lessons<select id="simType" class="dsq-inp" style="margin-top:2px"><option>Manual</option><option>Automatic</option></select></label>' +
      '<label style="font-size:.72rem">Female instructor<select id="simFem" class="dsq-inp" style="margin-top:2px"><option value="">Not asked</option><option value="require">Required</option><option value="prefer">Preferred</option></select></label>' +
      '<div style="display:flex;align-items:flex-end"><button class="btn-p" onclick="DSQHub.simulate()">Run the test</button></div></div><div id="simOut" style="font-size:.78rem"></div></div>';
  }
  async function readiness() {
    var c = DATA.cfg, items = [], add = function (level, title, detail, fix) { items.push({ level: level, title: title, detail: detail, fix: fix || '' }); };
    var fnv = DATA.wast && DATA.wast.version;
    add(fnv === WANT_FN ? 'ok' : 'bad', 'The WhatsApp function in Supabase is up to date', fnv === WANT_FN ? 'Version ' + fnv : (fnv ? 'Deployed version ' + fnv + ', latest is ' + WANT_FN : 'It has no version number, so it is an OLD copy'), fnv === WANT_FN ? '' : 'Open Supabase → Edge Functions → whatsapp, select all, paste the LATEST whatsapp file I sent, and press Deploy. Until then Diagnose and Create templates show "Unknown action".');
    var wa = DATA.wast && DATA.wast.ok && DATA.wast.ready && !DATA.wast.error;
    add(wa ? 'ok' : 'bad', 'WhatsApp is connected', wa ? ((DATA.wast.phone && (DATA.wast.phone.display_phone_number || '')) + ' ' + ((DATA.wast.phone && DATA.wast.phone.verified_name) || '')).trim() : (DATA.wast && DATA.wast.error) || 'Not connected', wa ? '' : 'Open the WhatsApp settings and follow the set-up steps (token and phone number ID in Supabase secrets).');
    var tp = null; try { tp = await DSQWA.call({ action: 'templates' }); } catch (e) { } TPLS = tp;
    if (!tp || !tp.ok) add('warn', 'Message templates', (tp && tp.error) || 'Could not check', 'Check the WhatsApp token has permission to read templates.');
    else if (tp.needWaba) add('warn', 'Message templates', 'I could not read your WhatsApp accounts with the current token.', 'Press Diagnose below for the reason, or add the optional Supabase secret WHATSAPP_WABA_ID (your WhatsApp Business Account ID).');
    else if (tp.notInAccount) add('bad', 'Message templates', 'Your number is not in any account this token can read.', (tp.advice || [])[0] || 'The token or phone number ID belongs to a different account.');
    else if (tp.needToken) add('bad', 'Message templates', 'No WhatsApp token', 'Add WHATSAPP_TOKEN.');
    else { var need = ['dsq_student_offer', 'dsq_new_student'], bad = tp.templates.filter(function (t) { return t.status !== 'APPROVED'; }), core = bad.filter(function (t) { return need.indexOf(t.name) >= 0; });
      add(core.length ? 'bad' : bad.length ? 'warn' : 'ok', 'Message templates approved', bad.length ? bad.map(function (t) { return t.name + ': ' + t.status + (t.reason ? ' (' + t.reason + ')' : ''); }).join(' · ') : 'All ' + tp.templates.length + ' are Active', bad.length ? ((tp.missing && tp.missing.length ? tp.missing.length + ' do not exist in your number\'s account: press "Create the missing templates in Meta" below. ' : '') + 'Templates that are In review cannot send yet. The instructor offer templates must be Active before you use Assign mode.') : ''); }
    var age = DATA.last && DATA.last.at ? Math.round((Date.now() - new Date(DATA.last.at)) / 6e4) : null;
    add(age !== null && age <= 15 ? 'ok' : (c.enabled ? 'bad' : 'warn'), 'Runs by itself (Cron job)', age === null ? 'It has never run by itself' : 'Last run ' + (age < 1 ? 'just now' : age + ' min ago'), age !== null && age <= 15 ? '' : 'Supabase → Integrations → Cron → every 2 minutes → whatsapp, body {"action":"auto_assign","cron":true}, header x-admin-key. See Settings → "Make it run by itself".');
    var ins = DATA.instrs.filter(function (i) { return i.status === 'approved'; }), noLoc = ins.filter(function (i) { return !(String(i.postcode || '').trim() || /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(String(i.area || '') + ' ' + String(i.address || '')) || /\b[A-Z]{1,2}\d{1,2}[A-Z]?\b/i.test(String(i.area || '') + ' ' + String(i.coverage_postcodes || ''))); }), noPh = ins.filter(function (i) { return String(i.phone || '').replace(/\D/g, '').length < 10; }), noCov = ins.filter(function (i) { return !String(i.coverage_postcodes || '').trim(); });
    add(!ins.length ? 'bad' : (noLoc.length || noPh.length) ? 'warn' : 'ok', 'Instructors have a location and mobile number', ins.length ? (ins.length - Math.max(noLoc.length, noPh.length)) + ' of ' + ins.length + ' ready' + (noLoc.length ? ' · no location: ' + noLoc.map(function (i) { return i.full_name; }).join(', ') : '') + (noPh.length ? ' · no mobile: ' + noPh.map(function (i) { return i.full_name; }).join(', ') : '') : 'No approved instructors', (noLoc.length || noPh.length) ? 'Add the missing postcode / mobile number on their profile (Settings → 🩺 Check my data lists them).' : '');
    if (noCov.length) add('warn', 'Covered postcodes', noCov.length + ' instructor(s) have none set: ' + noCov.slice(0, 6).map(function (i) { return i.full_name; }).join(', '), 'They still get offers by distance, but the "no reply after 35 minutes, assign anyway" rule only works for postcodes they cover.');
    var nF = ins.filter(function (i) { return (DATA.traits[i.id] || {}).female; }).length; add(nF ? 'ok' : 'warn', 'Female instructors marked', nF ? nF + ' marked' : 'None marked', nF ? '' : 'Tick "Female instructor" on each female instructor\'s profile, or bookings that ask for one will always come to you.');
    add(c.adminPhone && c.adminAlerts ? 'ok' : 'warn', 'You get alerts on WhatsApp', c.adminPhone ? (c.adminAlerts ? 'To ' + c.adminPhone : 'Alerts are switched off') : 'No number set', 'Settings → Alerts to you → your WhatsApp number.');
    var old = null; try { old = typeof window.getAutoAssign === 'function' ? await window.getAutoAssign() : null; } catch (e) { } add(old ? 'bad' : 'ok', 'Old autopilot is off', old ? 'The old autopilot is still ON and can assign students too' : 'Off', old ? 'Switch it off (Settings shows a button) so the two do not both assign.' : '');
    var wb = DATA.waiting.filter(function (w) { return /\[WEB\]/i.test(w.notes || ''); })[0]; add('info', 'Website bookings arriving', wb ? 'Latest waiting booking: ' + ago(wb.created_at) : 'No waiting website bookings right now', '');
    return items;
  }
  async function fillReady() {
    var el = document.getElementById('hubReady'); if (!el) return; var items = await readiness(); el = document.getElementById('hubReady'); if (!el) return;
    var bad = items.filter(function (x) { return x.level === 'bad'; }).length, warn = items.filter(function (x) { return x.level === 'warn'; }).length, ICO = { ok: ['✅', '#22c55e'], warn: ['⚠️', '#f59e0b'], bad: ['❌', '#ef4444'], info: ['ℹ️', '#60a5fa'] };
    el.innerHTML = '<div style="border:1px solid ' + (bad ? '#ef4444' : warn ? '#f59e0b' : '#22c55e') + '66;background:' + (bad ? 'rgba(239,68,68,.08)' : warn ? 'rgba(245,158,11,.08)' : 'rgba(34,197,94,.08)') + ';border-radius:10px;padding:9px 12px;margin-bottom:8px;font-weight:800">' + (bad ? '❌ Not ready: ' + bad + ' thing' + (bad === 1 ? '' : 's') + ' to fix before using Assign mode' : warn ? '⚠️ Nearly ready: ' + warn + ' thing' + (warn === 1 ? '' : 's') + ' worth checking' : '✅ Everything checks out') + '</div>' +
      items.map(function (x) { var i = ICO[x.level]; return '<div class="fi"><i>' + i[0] + '</i><span><b>' + E(x.title) + '</b><br><span style="color:var(--txt3)">' + E(x.detail) + '</span>' + (x.fix ? '<br><span style="color:' + i[1] + ';font-size:.72rem">' + E(x.fix) + '</span>' : '') + '</span></div>'; }).join('');
    return items;
  }
  function recheck() { fillReady(); }
  async function diagnoseWa() {
    var o = document.getElementById('waDiag'); if (!o) return; o.textContent = 'Looking at your WhatsApp accounts…'; var r = await DSQWA.call({ action: 'diagnose' });
    if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; return; }
    o.innerHTML = (r.advice || []).map(function (a) { return '<div class="fi"><i>' + (/not exist|not in any|another account|mismatch|could not read/i.test(a) ? '⚠️' : /All templates exist/.test(a) ? '✅' : 'ℹ️') + '</i><span>' + E(a) + '</span></div>'; }).join('') +
      (r.templates ? '<div class="scroll" style="margin-top:6px"><table><thead><tr><th>Template</th><th>Status in your number\'s account</th></tr></thead><tbody>' + r.templates.map(function (t) { var col = t.status === 'APPROVED' ? '#22c55e' : t.status === 'MISSING' ? '#ef4444' : '#f59e0b'; return '<tr><td>' + E(t.name) + '</td><td><span class="pill" style="color:' + col + ';border-color:' + col + '66">' + E(t.status) + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '');
  }
  /* are Meta's incoming messages (replies, button taps, new chats) reaching this system? fix = subscribe the app to your WhatsApp account */
  async function webhookCheck(fix) {
    var o = document.getElementById('waDiag'); if (!o) return; o.textContent = 'Asking Meta…'; var r = await DSQWA.call({ action: 'webhook_check', fix: !!fix });
    if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; return; }
    o.innerHTML = (r.advice || []).map(function (a) { return '<div class="fi"><i>' + (/^✅/.test(a) ? '✅' : '⚠️') + '</i><span>' + E(a.replace(/^[✅❌⚠️]+\s*/, '')) + '</span></div>'; }).join('') + '<div style="font-size:.72rem;color:var(--txt4);margin-top:6px">Also check in Meta (Use cases → Customize → Production setup) that the callback URL ends in /functions/v1/whatsapp and that <b>messages</b> is Subscribed.</div>';
  }
  async function readChats() {
    var o = document.getElementById('waDiag'); if (!o) return; o.textContent = 'Claude is reading the last 24 hours of WhatsApp chats… (about a minute)'; var r = await DSQWA.call({ action: 'read_chats' });
    if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; return; }
    var T = { saved: '✅ booking saved', updated: '📎 details added to their booking', duplicate: 'already had their booking', incomplete: '⚠️ still missing something', none: 'nothing to read', error: '❌ Claude could not read it' };
    o.innerHTML = '<div class="fi"><i>📥</i><span><b>' + r.chats + ' chat(s) read, ' + r.saved + ' booking(s) saved.</b> Nothing was sent to anyone.</span></div>' + (r.results || []).map(function (x) { return '<div class="fi"><i>•</i><span>' + E(x.number) + ': ' + E(T[x.result] || x.result) + (x.missing && x.missing.length ? ' (missing ' + E(x.missing.join(', ')) + ')' : '') + '</span></div>'; }).join('');
  }
  async function createTpls() {
    var o = document.getElementById('waDiag'); if (!o) return;
    if (!confirm('Create the missing WhatsApp message templates in the account that owns your number?\n\nThey are submitted to Meta for review (usually a few hours). Templates that already exist are left alone.')) return;
    o.textContent = 'Submitting to Meta…'; var r = await DSQWA.call({ action: 'create_templates' });
    if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>' + ((r.advice || []).map(function (a) { return '<div class="fi"><i>⚠️</i><span>' + E(a) + '</span></div>'; }).join('')); return; }
    o.innerHTML = '<div style="border:1px solid #22c55e66;background:rgba(34,197,94,.08);border-radius:10px;padding:8px 12px;margin-bottom:6px"><b>' + r.created + ' submitted</b>' + (r.failed ? ', <b style="color:#f87171">' + r.failed + ' refused</b>' : '') + '. ' + E(r.note || '') + '</div>' +
      (r.results || []).map(function (x) { return '<div class="fi"><i>' + (x.ok ? '✅' : '❌') + '</i><span><b>' + E(x.name) + '</b> · ' + (x.ok ? E(x.status || 'submitted') : '<span style="color:#f87171">' + E(x.error || 'refused') + '</span>') + '</span></div>'; }).join('');
    fillReady();
  }
  async function simulate() {
    var pc = (document.getElementById('simPc') || {}).value || '', o = document.getElementById('simOut'); if (!o) return; if (!pc.trim()) { o.innerHTML = '<span style="color:#f59e0b">Enter a postcode first.</span>'; return; } o.textContent = 'Working it out…';
    var r = await DSQWA.call({ action: 'simulate', postcode: pc, type: document.getElementById('simType').value, female: document.getElementById('simFem').value });
    if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; return; } if (r.error) { o.innerHTML = '<span style="color:#f87171">' + E(r.error) + '</span>'; return; }
    var head = r.best ? '<div style="border:1px solid #22c55e66;background:rgba(34,197,94,.08);border-radius:10px;padding:9px 12px;margin-bottom:8px">➡️ <b>' + E(r.best.name) + '</b> (' + r.best.dist + ' mi) would be ' + (r.best.direct ? 'assigned straight away' : 'asked to accept') + (r.best.covered ? ' · covers this postcode' : '') + '<br><span style="color:var(--txt3)">' + E(r.best.why || '') + '</span></div>' : '<div style="border:1px solid #f59e0b66;background:rgba(245,158,11,.08);border-radius:10px;padding:9px 12px;margin-bottom:8px">⚠️ Nobody within ' + r.limit + ' miles: this would come to <b>you</b>' + (r.nearestOver ? ' (nearest: ' + E(r.nearestOver.name) + ', ' + r.nearestOver.dist + ' mi)' : '') + '</div>';
    o.innerHTML = head + '<div class="scroll"><table><thead><tr><th>#</th><th>Instructor</th><th>Miles</th><th>Given today / booked this week</th><th>Notes</th></tr></thead><tbody>' + r.list.map(function (x) { var n = []; if (x.owed) n.push('owed ' + x.short + ' this week (min ' + x.min + ')'); if (x.prio) n.push('priority ' + (x.prio > 0 ? '+' : '') + x.prio); if (x.boost) n.push('idle ' + x.idle + ' d → −' + x.boost + ' mi'); (x.over || []).forEach(function (v) { n.push('asked last: ' + v); }); if (!x.within) n.push('over your ' + r.limit + ' mile limit'); return '<tr style="' + (x.within ? '' : 'opacity:.5') + '"><td>' + x.order + '</td><td><b>' + E(x.name) + '</b></td><td>' + x.dist + '</td><td>' + x.today + ' / ' + x.bookedWeek + '</td><td style="font-size:.72rem;color:var(--txt3)">' + E(n.join(' · ')) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (r.skipped.length ? '<div style="margin-top:8px;font-weight:800;font-size:.76rem">Left out</div>' + r.skipped.map(function (x) { return '<div class="fi"><i>🚫</i><span><b>' + E(x.name) + '</b> · ' + E(x.why) + '</span></div>'; }).join('') : '');
  }
  function shell() {
    var c = DATA.cfg || {}, on = !!c.enabled, h = document.getElementById('aaHub'); if (!h) return;
    var tabs = [['overview', '📊 Overview'], ['instructors', '👥 Instructors'], ['booked', '🎯 Students booked'], ['ready', '🧪 Test & readiness'], ['settings', '⚙️ Settings'], ['activity', '📜 Activity']];
    h.innerHTML = '<style>' + CSS + '</style><div class="hb"><div class="hh"><h1>🤖 Auto-assign control centre</h1><div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<span style="font-size:.78rem;font-weight:700">' + (on ? 'ON' : 'OFF') + '</span><button class="sw' + (on ? ' on' : '') + '" style="background:' + (on ? '#22c55e' : '#475569') + '" title="Turn auto-assign ' + (on ? 'off' : 'on') + '" onclick="DSQHub.toggle()"></button>' +
      '<select class="dsq-inp" id="hubMode" style="width:auto;padding:4px 8px;font-size:.76rem" onchange="DSQHub.mode(this.value)"><option value="suggest"' + (c.mode === 'suggest' ? ' selected' : '') + '>Suggest only (safe)</option><option value="assign"' + (c.mode === 'assign' ? ' selected' : '') + '>Assign + WhatsApp</option></select>' +
      '<select class="dsq-inp" id="hubAi" title="WhatsApp booking assistant (Claude)" style="width:auto;padding:4px 8px;font-size:.76rem" onchange="DSQHub.aiMode(this.value)"><option value="off"' + (!c.aiAssistant ? ' selected' : '') + '>🤖 Claude: off</option><option value="read"' + (c.aiAssistant && c.aiSend === false ? ' selected' : '') + '>🤖 Claude: read only</option><option value="reply"' + (c.aiAssistant && c.aiSend !== false ? ' selected' : '') + '>🤖 Claude: read + send</option></select>' +
      '<button class="btn-s" onclick="DSQHub.preview()">👀 Preview</button><button class="btn-p" onclick="DSQHub.run()">▶ Run now</button><button class="btn-s" onclick="DSQHub.close()">✕ Close</button></div></div>' +
      '<div class="tabs">' + tabs.map(function (t) { return '<button class="tab' + (TAB === t[0] ? ' on' : '') + '" onclick="DSQHub.tab(\'' + t[0] + '\')">' + t[1] + (t[0] === 'overview' && DATA.att && DATA.att.length ? ' <span style="background:#fff;color:#dc2626;border-radius:99px;padding:0 6px;font-size:.66rem">' + DATA.att.length + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<div id="hubOut" style="font-size:.78rem;margin:0 0 10px"></div><div id="hubBody">' + body() + '</div></div>';
    if (TAB === 'settings' && window.DSQAA) DSQAA.mount(); if (TAB === 'ready') fillReady();
  }
  async function refresh(full) {
    var h = document.getElementById('aaHub'); if (!h) return;
    if ((TAB === 'settings' || TAB === 'ready') && !full) return;   // do not redraw the form while you are typing in it
    try { await load(); } catch (e) { var o = document.getElementById('hubOut'); if (o) o.innerHTML = '<span style="color:#f87171">Could not load: ' + E(e.message || e) + '</span>'; return; }
    var scrollY = h.scrollTop, keep = (document.getElementById('hubOut') || {}).innerHTML || ''; shell(); var ho = document.getElementById('hubOut'); if (ho && keep) ho.innerHTML = keep; h.scrollTop = scrollY;
  }
  async function open(tab) {
    if (tab) TAB = tab; var h = document.getElementById('aaHub'); if (h) h.remove(); h = document.createElement('div'); h.id = 'aaHub'; h.innerHTML = '<div class="hb"><div class="empty">Loading…</div></div>'; document.body.appendChild(h); document.body.style.overflow = 'hidden';
    await refresh(true); clearInterval(TIMER); TIMER = setInterval(function () { if (document.getElementById('aaHub') && !document.hidden) refresh(false); else if (!document.getElementById('aaHub')) clearInterval(TIMER); }, 15000);
    document.addEventListener('keydown', esc);
  }
  function esc(e) { if (e.key === 'Escape') close(); }
  function close() { var h = document.getElementById('aaHub'); if (h) h.remove(); document.body.style.overflow = ''; clearInterval(TIMER); document.removeEventListener('keydown', esc); try { window.refreshAutoAssignBtn(); } catch (e) { } }
  async function saveCfg(patch, msg) {
    var c = await DSQAA.load(true); Object.assign(c, patch); var r = await SBc().from('growth_settings').upsert({ key: 'auto_assign_cfg', value: c, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 6000); return false; } try { DSQLog.add(SBc(), { area: 'auto_assign', action: 'settings', summary: msg, role: 'admin', actor: 'Admin' }); } catch (e) { } return true;
  }
  async function toggle() {
    var c = DATA.cfg, turningOn = !c.enabled, warn = '';
    if (turningOn && c.mode === 'assign') { try { var its = await readiness(); var bad = its.filter(function (x) { return x.level === 'bad'; }); if (bad.length) warn = '\n\n❌ NOT READY:\n' + bad.map(function (x) { return '• ' + x.title + ': ' + x.detail; }).join('\n') + '\n\nSwitching on now may fail or send nothing. Use "Suggest only" until these are fixed.'; } catch (e) { } }
    if (turningOn && !confirm('Turn auto-assign ON in "' + (c.mode === 'suggest' ? 'suggest only' : 'assign + WhatsApp') + '" mode?\n\nOnly website bookings from now on are handled.' + (c.mode === 'assign' ? '\nInstructors and students will be messaged for real.' : '\nNothing is sent or assigned in suggest mode.') + warn)) return;
    if (await saveCfg({ enabled: turningOn, since: turningOn && !c.enabled ? new Date().toISOString() : c.since }, 'Auto-assign turned ' + (turningOn ? 'ON (' + c.mode + ')' : 'OFF'))) { toast(turningOn ? '🤖 Auto-assign is ON' : 'Auto-assign is OFF', 'success', 2500); refresh(true); }
  }
  /* Claude on WhatsApp: off / read only (reads chats, extracts and saves bookings, sends NOTHING) / read + send (also replies to students) */
  async function aiMode(v) {
    var c = DATA.cfg || {};
    if (v === 'reply' && !confirm('Let Claude SEND messages?\n\nIt will reply to ' + (c.aiTestOnly !== false ? 'your own phone only (Test mode is on)' : 'real students who WhatsApp the number') + ': ask for their details and confirm bookings. Make sure the Meta AI is not also answering.')) { refresh(true); return; }
    if (v === 'read' && !confirm('Read only: Claude will read WhatsApp chats and save bookings it finds, but will NEVER send a message.\n\nContinue?')) { refresh(true); return; }
    var patch = v === 'off' ? { aiAssistant: false } : { aiAssistant: true, aiSend: v === 'reply' };
    if (await saveCfg(patch, 'WhatsApp assistant set to: ' + (v === 'off' ? 'off' : v === 'read' ? 'read only (sends nothing)' : 'read + send messages'))) { toast(v === 'off' ? 'Claude is off' : v === 'read' ? 'Claude can only read and extract' : 'Claude can read and send messages', 'success', 3000); }
    refresh(true);
  }
  async function mode(v) { if (v === 'assign' && !confirm('Switch to ASSIGN + WhatsApp?\n\nStudents will be assigned and real WhatsApp messages sent. Use Preview first if unsure.')) { refresh(true); return; } if (await saveCfg({ mode: v }, 'Auto-assign mode set to ' + v)) { toast('Mode: ' + (v === 'suggest' ? 'suggest only' : 'assign + WhatsApp'), 'success', 2500); refresh(true); } }
  async function preview() { var o = document.getElementById('hubOut'); if (!o) return; o.textContent = 'Working it out…'; var r = await DSQWA.call({ action: 'auto_assign', dry: true }); if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; return; }
    o.innerHTML = '<div class="cd"><h3>👀 Preview <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">nothing has been sent or changed</span></h3>' + (r.results.length ? r.results.map(function (x) { var col = { assign: '#22c55e', offer: '#60a5fa', suggest: '#a78bfa', duplicate: '#94a3b8' }[x.action] || '#f59e0b', lab = { assign: 'Assign now', offer: 'Ask to accept', suggest: 'Suggest', duplicate: 'Duplicate (held)', attention: 'Needs you' }[x.action] || x.action; return '<div class="fi"><i>•</i><span><b>' + E(x.student) + '</b> ' + E(x.postcode || '') + ' → <span style="color:' + col + ';font-weight:700">' + lab + '</span>' + (x.instructor ? ' · ' + E(x.instructor) + (x.dist != null ? ' (' + x.dist + ' mi)' : '') : '') + (x.why ? '<br><span style="color:var(--txt3)">' + E(x.why) + '</span>' : '') + (x.reason ? '<br><span style="color:var(--txt3)">' + E(x.reason) + '</span>' : '') + '</span></div>'; }).join('') : '<div class="empty">No waiting website bookings to handle.</div>') + '</div>'; }
  async function run() { var c = DATA.cfg; if (!c.enabled) { toast('Switch auto-assign ON first.', 'warn', 3500); return; } if (!confirm('Run auto-assign now? It will ' + (c.mode === 'suggest' ? 'only add suggestions to the attention list.' : 'assign and WhatsApp for real.'))) return; var o = document.getElementById('hubOut'); if (o) o.textContent = 'Running…'; var r = await DSQWA.call({ action: 'auto_assign' });
    if (o) o.innerHTML = r.ok ? (r.off ? 'It is switched off.' : r.waiting ? E(r.waiting) : '✅ Done: ' + (r.summary.assigned || 0) + ' assigned, ' + (r.summary.offered || 0) + ' asked to accept, ' + (r.summary.attention || 0) + ' need attention.') : '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; setTimeout(function () { refresh(true); }, 800); }
  /* Ignore = the "Never auto-assign" mark: auto-assign skips this instructor (offers, direct assigns, follow-ups) until you include them again. You can still assign them by hand in Find & Assign. */
  async function ignore(id, on) {
    var i = DATA.instrs.filter(function (x) { return String(x.id) === String(id); })[0] || {};
    if (on && !confirm('Ignore ' + (i.full_name || 'this instructor') + ' for auto-assign?\n\nThey will not be offered any new students automatically. You can still assign them by hand, and you can include them again at any time.')) return;
    var note = ''; if (on) { note = (prompt('Reason (optional, only you see it), e.g. holiday until 5 Dec:', '') || '').trim(); }
    if (window.DSQAA) { await DSQAA.setTrait(id, 'noAuto', !!on); if (DSQAA.setTraitVal) await DSQAA.setTraitVal(id, 'noAutoNote', on ? note : ''); refresh(true); }
  }
  /* one instructor's own auto-assign settings: leave a box empty to use the general setting */
  async function instrSettings(id) {
    if (!window.DSQAA) return; await DSQAA.loadTraits();
    var i = DATA.instrs.filter(function (x) { return String(x.id) === String(id); })[0] || {}, t = DSQAA.getTraits(id), old = document.getElementById('aaInstrDlg'); if (old) old.remove();
    var inp = function (k, label, hint, step) { return '<label style="font-size:.72rem;display:block"><span style="color:var(--txt3)">' + label + '</span><input type="number" min="0" step="' + (step || 1) + '" data-k="' + k + '" class="dsq-inp" value="' + E(t[k] === undefined ? '' : t[k]) + '" placeholder="general" style="margin-top:2px;width:100%"><span style="color:var(--txt4);font-size:.64rem">' + hint + '</span></label>'; };
    var d = document.createElement('div'); d.id = 'aaInstrDlg'; d.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:12px';
    d.innerHTML = '<div style="background:var(--dk2,#16161c);border:1px solid var(--bdr,#2a2a33);border-radius:14px;max-width:560px;width:100%;max-height:92vh;overflow:auto;padding:16px">' +
      '<div style="display:flex;align-items:center"><b style="font-size:1rem">⚙️ Auto-assign settings · ' + E(i.full_name || '') + '</b><button class="btn-s" style="margin-left:auto" onclick="document.getElementById(\'aaInstrDlg\').remove()">✕</button></div>' +
      '<div style="font-size:.72rem;color:var(--txt4);margin:4px 0 10px">Only for this instructor. Empty boxes use the general settings. Every change is recorded in Activity.</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">' +
      '<label style="font-size:.72rem;display:block"><span style="color:var(--txt3)">Which students</span><select data-k="only" class="dsq-inp" style="margin-top:2px;width:100%"><option value="">Anyone</option><option value="female"' + (t.only === 'female' ? ' selected' : '') + '>Women only</option><option value="male"' + (t.only === 'male' ? ' selected' : '') + '>Men only</option></select><span style="color:var(--txt4);font-size:.64rem">Judged from the student name, title or what they wrote. If it is unclear they are not offered, and you get the usual alert</span></label>' +
      '<label style="font-size:.72rem;display:block"><span style="color:var(--txt3)">Priority for jobs</span><select data-k="priority" class="dsq-inp" style="margin-top:2px;width:100%">' + [[2, 'Top'], [1, 'High'], [0, 'Equal (default)'], [-1, 'Low'], [-2, 'Last']].map(function (p) { return '<option value="' + p[0] + '"' + ((t.priority || 0) === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></label>' +
      inp('maxMiles', 'Furthest they will travel (miles)', 'Over the general limit is allowed', 0.5) + inp('maxDay', 'Most students given in a day', 'Over this they are asked last') + inp('maxWeek', 'Most booked in a week', 'Over this they are asked last') + inp('maxWeekHard', 'Hard cap: new students a week', 'Never more than this') + inp('minWeek', 'Weekly minimum owed', 'Offered first until reached') +
      '<label style="font-size:.72rem;display:block"><span style="color:var(--txt3)">Pause until (date)</span><input type="date" data-k="pausedUntil" class="dsq-inp" value="' + E(t.pausedUntil || '') + '" style="margin-top:2px;width:100%"><span style="color:var(--txt4);font-size:.64rem">Holiday: nothing automatic until this day, then back by itself</span></label></div>' +
      '<label style="display:flex;gap:7px;align-items:flex-start;font-size:.78rem;margin-top:10px"><input type="checkbox" data-k="coveredOnly"' + (t.coveredOnly ? ' checked' : '') + ' style="margin-top:3px"> <span><b>📍 Only students in the postcodes they cover</b>: nobody is offered to them unless the student\'s postcode is in their list.<br><span style="color:var(--txt4)">Their covered postcodes: <b>' + E(i.coverage_postcodes || 'none set yet') + '</b> (change them on their profile)</span></span></label>' +
      '<label style="display:flex;gap:7px;align-items:center;font-size:.78rem;margin-top:6px"><input type="checkbox" data-k="female"' + (t.female ? ' checked' : '') + '> Female instructor (for students who ask for a woman)</label>' +
      '<label style="display:flex;gap:7px;align-items:center;font-size:.78rem;margin-top:6px"><input type="checkbox" data-k="noAuto"' + (t.noAuto ? ' checked' : '') + '> 🚫 Ignore: give them no students until I change this back</label>' +
      '<label style="font-size:.72rem;display:block;margin-top:4px"><span style="color:var(--txt3)">Reason (only you see it)</span><input type="text" data-k="noAutoNote" class="dsq-inp" maxlength="60" value="' + E(t.noAutoNote || '') + '" style="margin-top:2px;width:100%"></label>' +
      '<div style="display:flex;gap:8px;margin-top:14px"><button class="btn-p" onclick="DSQHub.saveInstr(\'' + E(String(id)) + '\')">💾 Save</button><button class="btn-s" onclick="document.getElementById(\'aaInstrDlg\').remove()">Cancel</button></div></div>';
    document.body.appendChild(d);
  }
  async function saveInstr(id) {
    var d = document.getElementById('aaInstrDlg'); if (!d) return; var o = {};
    d.querySelectorAll('[data-k]').forEach(function (el) { var k = el.getAttribute('data-k'), v = el.type === 'checkbox' ? el.checked : el.value; if (el.type === 'number') { if (v === '') return; v = +v; if (isNaN(v) || v < 0) return; } if (k === 'priority') { v = parseInt(v, 10) || 0; if (!v) return; } o[k] = v; });
    if (o.noAutoNote && !o.noAuto) delete o.noAutoNote;
    if (await DSQAA.saveInstr(id, o)) { d.remove(); refresh(true); }
  }
  async function prio(id, v) { if (window.DSQAA) { await DSQAA.setPrio(id, v); refresh(true); } }
  /* take a booking off the list: its job is CLOSED (not deleted), so auto-assign never picks it up again and a late Accept gets "already dealt with". Any alert about it is cleared too. */
  async function closeJob(j, why) {
    await SBc().from('auto_assign_jobs').update({ state: 'closed', note: why, updated_at: new Date().toISOString() }).eq('id', j.id);
    try { await SBc().from('admin_attention').update({ resolved: true, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('waiting_id', String(j.waiting_id)).eq('resolved', false); } catch (e) { }
  }
  async function removeJob(id) {
    var j = DATA.jobs.filter(function (x) { return String(x.id) === String(id); })[0]; if (!j) return;
    if (j.state === 'pending_accept' && !confirm('This offer is still waiting for the instructor\'s reply. Remove it anyway? The instructor will be told it has already been dealt with if they tap Accept.')) return;
    await closeJob(j, 'removed by admin'); try { DSQLog.add(SBc(), { area: 'auto_assign', action: 'removed', summary: 'Booking removed from the auto-assign list by admin', role: 'admin', actor: 'Admin' }); } catch (e) { }
    toast('Removed from the list', 'success', 1800); refresh(true);
  }
  async function clearList() {
    var rows = DATA.jobs.filter(function (j) { return j.state !== 'closed'; }), live = rows.filter(function (j) { return j.state === 'pending_accept' || j.state === 'working'; }), done = rows.filter(function (j) { return j.state !== 'pending_accept' && j.state !== 'working'; });
    if (!rows.length) return;
    var all = live.length && confirm(done.length + ' finished or needs-you row' + (done.length === 1 ? '' : 's') + ' will be cleared.\n\n' + live.length + ' booking' + (live.length === 1 ? ' is' : 's are') + ' still waiting for an instructor to reply.\n\nOK = clear those too (the offers are abandoned)\nCancel = keep the waiting ones');
    if (!live.length && !confirm('Clear ' + done.length + ' row' + (done.length === 1 ? '' : 's') + ' from the list? They will not be picked up again.')) return;
    var target = done.concat(all ? live : []); for (var k = 0; k < target.length; k++) await closeJob(target[k], 'removed by admin');
    try { DSQLog.add(SBc(), { area: 'auto_assign', action: 'removed', summary: target.length + ' booking(s) cleared from the auto-assign list by admin', role: 'admin', actor: 'Admin' }); } catch (e) { }
    toast('Cleared ' + target.length + ' row' + (target.length === 1 ? '' : 's'), 'success', 2200); refresh(true);
  }
  async function retry(wid) { try { await SBc().from('auto_assign_jobs').delete().eq('waiting_id', String(wid)); await SBc().from('admin_attention').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('waiting_id', String(wid)).eq('resolved', false); } catch (e) { } toast('It will try this booking again on the next run.', 'success', 3500); refresh(true); }
  function openBooking(wid) { close(); if (window.DSQAA) DSQAA.openBooking(wid, ''); }
  function tab(t) { TAB = t; refresh(true); }
  function ifilter(f) { IFILT = f; refresh(true); }
  function isearch(v) { ISEARCH = v; refresh(true); setTimeout(function () { var n = document.getElementById('aaISearch'); if (n) { n.focus(); n.setSelectionRange(v.length, v.length); } }, 0); }
  function filter(f) { FILTER = f; refresh(true); }

  /* the old Auto-assign button and the top-bar button now open this screen */
  function takeOver() { window.toggleAutoAssign = function () { open('overview'); }; }
  /* a button in the top bar, next to the WhatsApp button */
  function topBtn() { var host = document.getElementById('waApiBtn'); if (!host || document.getElementById('hubBtn')) return; var b = document.createElement('button'); b.id = 'hubBtn'; b.type = 'button'; b.onclick = function () { open('overview'); }; b.title = 'Auto-assign control centre'; b.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:rgba(124,58,237,.18);color:#c4b5fd;border:1px solid rgba(124,58,237,.5);border-radius:99px;padding:4px 12px;font-size:.78rem;font-weight:700;cursor:pointer;margin-left:6px'; b.innerHTML = '🤖 <span>Auto-assign</span>'; host.insertAdjacentElement('afterend', b); }
  takeOver(); window.addEventListener('load', function () { takeOver(); topBtn(); setTimeout(function () { takeOver(); topBtn(); }, 1800); }); setInterval(topBtn, 3000);
  window.DSQHub = { aiMode: aiMode, instrSettings: instrSettings, saveInstr: saveInstr, diagnoseWa: diagnoseWa, webhookCheck: webhookCheck, readChats: readChats, createTpls: createTpls, ignore: ignore, removeJob: removeJob, clearList: clearList, recheck: recheck, simulate: simulate, open: open, close: close, tab: tab, toggle: toggle, mode: mode, preview: preview, run: run, prio: prio, retry: retry, openBooking: openBooking, filter: filter, ifilter: ifilter, isearch: isearch, refresh: refresh, _data: function () { return DATA; } };
})();
