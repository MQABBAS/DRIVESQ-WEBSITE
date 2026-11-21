/* DriveSQ Auto-assign CONTROL CENTRE (admin). One screen to see and control everything auto-assign does.
   Tabs: Overview (what is happening right now) · Instructors (who is getting jobs) · Students booked (referral monitor) · Settings · Activity.
   It only READS and drives the pieces that already exist (admin-autoassign.js = settings/attention, admin-whatsapp.js = WhatsApp, the Supabase function = the engine). */
(function () {
  'use strict';
  var TAB = 'overview', TIMER = null, FILTER = 'all', DATA = {};
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
    var gs = {}; res[4].forEach(function (x) { gs[x.key] = x.value; });
    var jobIds = res[0].map(function (j) { return j.waiting_id; }), names = {};
    if (jobIds.length) { var w = await q(sb.from('waiting_list').select('id,student_name,postcode,created_at').in('id', jobIds)); w.forEach(function (x) { names[String(x.id)] = x; }); }
    var refs = (DSQ_ADMIN.refs() || []); if (!refs.length) { try { await window.loadReferrals(); refs = DSQ_ADMIN.refs() || []; } catch (e) { } }
    var st = null; try { st = window.DSQWA && await DSQWA.status(false); } catch (e) { }
    DATA = { cfg: cfg, jobs: res[0], waiting: res[1], log: res[2], wa: res[3], last: gs.auto_assign_last_run, traits: gs.instructor_traits || {}, pk: gs.packages || {}, names: names, refs: refs, instrs: (DSQ_ADMIN.instrs() || []), att: (window.DSQAA ? DSQAA._att() : []), wast: st, at: Date.now() };
  }
  /* what is each instructor owed (same rule as the server): package minimum, else the franchise minimum, not before their start date */
  function owed(i) {
    var cfg = DATA.cfg, pk = DATA.pk || {}, p = (pk.by || {})[i.id], tiers = pk.tiers || {}, def = { normal: { noGuarantee: true }, silver: { min: 3 }, gold: { min: 5 }, platinum: { min: 7 } }, t = p && p.tier && p.active !== false ? (tiers[p.tier] || def[p.tier]) : null;
    var start = ((pk.frStart || {})[i.id]) || (p && p.start) || '', started = !start || start <= new Date().toISOString().slice(0, 10), min = 0, src = '';
    if (t && !t.noGuarantee) { min = p.min != null && p.min !== '' ? +p.min : (t.min || 0); src = 'package'; } else if (!t && String(i.instructor_model || '').toLowerCase() === 'franchise' && cfg.franchiseMin > 0) { min = cfg.franchiseMin; src = 'franchise'; }
    return { min: min, start: start, started: started, src: src };
  }
  function stats(i) {
    var mon = monday(), d0 = dayStart(), s = { today: 0, week: 0, bookedWeek: 0, last: 0, unconfirmed: 0, unpaid: 0, unpaidAmt: 0, assigned30: 0, booked30: 0 }, t30 = Date.now() - 30 * 864e5;
    DATA.refs.forEach(function (r) {
      if (String(r.instructor_id) !== String(i.id) || r.is_cancelled || r.is_credit) return; var c = new Date(r.created_at).getTime(); if (c > s.last) s.last = c;
      if (c >= mon) s.week++; if (c >= d0) s.today++; var bk = isBooked(r); if (bk && bookedWhen(r) >= mon) s.bookedWeek++;
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
      pill(open ? '● Offering now (' + c.hours[0] + ':00–' + c.hours[1] + ':00)' : '● Quiet hours until ' + c.hours[0] + ':00', open ? '#22c55e' : '#94a3b8') + '</div>' +
      (on && !run ? '<div style="border:1px solid #f59e0b;background:rgba(245,158,11,.1);border-radius:10px;padding:8px 12px;font-size:.78rem;margin:8px 0">⚠️ It is switched on but the Cron job is not running, so bookings only move when you press <b>Run now</b>. Settings → "Make it run by itself".</div>' : '') +
      (on && !wa && c.mode === 'assign' ? '<div style="border:1px solid #ef4444;background:rgba(239,68,68,.1);border-radius:10px;padding:8px 12px;font-size:.78rem;margin:8px 0">🚫 WhatsApp is not connected, so assigning would fail. Use <b>Suggest only</b> until it is connected.</div>' : '');
  }
  function kpis() {
    var jobs = DATA.jobs, cfg = DATA.cfg, since = cfg.since ? new Date(cfg.since).getTime() : 0, mon = monday(), d0 = dayStart();
    var waiting = DATA.waiting.filter(function (w) { return /\[WEB\]/i.test(w.notes || '') && new Date(w.created_at).getTime() >= since && !jobs.some(function (j) { return String(j.waiting_id) === String(w.id); }); }).length;
    var offers = jobs.filter(function (j) { return j.state === 'pending_accept'; }).length, auto = DATA.refs.filter(isAuto), aToday = auto.filter(function (r) { return new Date(r.created_at).getTime() >= d0; }).length, aWeek = auto.filter(function (r) { return new Date(r.created_at).getTime() >= mon; }).length;
    var bookedWk = DATA.refs.filter(function (r) { return isBooked(r) && bookedWhen(r) >= mon; }).length, old = auto.filter(function (r) { return Date.now() - new Date(r.created_at) > 7 * 864e5 && Date.now() - new Date(r.created_at) < 45 * 864e5 && !r.is_cancelled; }), conv = old.length ? Math.round(old.filter(isBooked).length / old.length * 100) : null;
    var k = function (n, t, s, col) { return '<div class="k"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + n + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>'; };
    return '<div class="kp">' + k(waiting, 'Waiting to be picked up', 'new website bookings', waiting ? '#60a5fa' : '') + k(offers, 'Offers awaiting reply', 'instructors asked', offers ? '#a78bfa' : '') + k(aToday, 'Auto-assigned today', aWeek + ' this week') + k(bookedWk, 'Students booked this week', 'confirmed (admin / instructor / student)', '#22c55e') + k(conv === null ? '–' : conv + '%', 'Turned into bookings', 'auto-assigned students older than a week') + k(DATA.att.length, 'Need your attention', '', DATA.att.length ? '#ef4444' : '#22c55e') + '</div>';
  }
  function queue() {
    var names = DATA.names, ins = {}; DATA.instrs.forEach(function (i) { ins[String(i.id)] = i; }); var rows = DATA.jobs.filter(function (j) { return j.state !== 'closed'; }).slice(0, 12);
    return '<div class="cd"><h3>📋 Bookings being handled <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">last 3 days</span></h3>' + (rows.length ? '<div class="scroll"><table><thead><tr><th>Student</th><th>Status</th><th>Instructor</th><th>Since</th><th></th></tr></thead><tbody>' + rows.map(function (j) {
      var w = names[String(j.waiting_id)] || {}, st = JOB[j.state] || JOB.closed, i = ins[String(j.instructor_id)] || {}, note = String(j.note || '');
      return '<tr><td><b>' + E(w.student_name || 'Booking') + '</b><div style="font-size:.68rem;color:var(--txt4)">' + E(w.postcode || '') + '</div></td><td><span class="pill" style="color:' + st[2] + ';border-color:' + st[2] + '66">' + st[0] + ' ' + st[1] + '</span>' + (note ? '<div style="font-size:.66rem;color:var(--txt4);max-width:240px">' + E(note.slice(0, 110)) + '</div>' : '') + '</td><td>' + E(i.full_name || (j.instructor_id ? '…' : '–')) + (j.dist ? '<div style="font-size:.66rem;color:var(--txt4)">' + (Math.round(j.dist * 10) / 10) + ' mi</div>' : '') + '</td><td style="white-space:nowrap;color:var(--txt3)">' + ago(j.state === 'pending_accept' && j.expires_at ? j.expires_at : j.updated_at) + '</td><td style="text-align:right">' +
        (j.state === 'attention' ? '<button class="btn-p" style="font-size:.68rem;padding:2px 10px" onclick="DSQHub.openBooking(\'' + j.waiting_id + '\')">Open</button> <button class="btn-s" style="font-size:.68rem;padding:2px 10px" onclick="DSQHub.retry(\'' + j.waiting_id + '\')">Retry</button>' : '') + '</td></tr>';
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
  function overview() { return strip() + '<div style="height:10px"></div>' + kpis() + '<div class="g2"><div>' + queue() + attn() + '</div><div class="cd"><h3>🛰️ What is happening now <span style="font-weight:500;font-size:.7rem;color:#22c55e">● live</span></h3><div class="feed">' + feed(30) + '</div></div></div>'; }

  /* ---------- instructors ---------- */
  function instructorsTab() {
    var cfg = DATA.cfg, rows = DATA.instrs.filter(function (i) { return i.status === 'approved'; }).map(function (i) {
      var s = stats(i), o = owed(i), t = DATA.traits[i.id] || {}, idle = s.last ? Math.floor((Date.now() - s.last) / 864e5) : null, flags = [];
      if (!o.started) flags.push(['Starts ' + o.start, '#94a3b8']); else if (o.min && s.bookedWeek < o.min) flags.push(['Owed ' + (o.min - s.bookedWeek) + ' job' + (o.min - s.bookedWeek === 1 ? '' : 's'), '#f59e0b']);
      if (t.noAuto) flags.push(['Never auto-assign', '#94a3b8']);
      if (cfg.dailyLimit > 0 && s.today >= cfg.dailyLimit) flags.push(['Over daily limit', '#ef4444']); if (cfg.weeklyLimit > 0 && s.bookedWeek >= cfg.weeklyLimit) flags.push(['Over weekly limit', '#ef4444']);
      if (cfg.unpaidLimit > 0 && s.unpaid >= cfg.unpaidLimit) flags.push(['Fees unpaid', '#ef4444']);
      if (idle === null || idle >= (cfg.droughtDays || 7)) flags.push(['No student ' + (idle === null ? 'yet' : idle + 'd'), '#f59e0b']);
      if (!flags.length) flags.push(['Available', '#22c55e']); return { i: i, s: s, o: o, t: t, idle: idle, flags: flags, rank: (!o.started ? 9 : o.min && s.bookedWeek < o.min ? 0 : 1) };
    }).sort(function (a, b) { return a.rank - b.rank || String(a.i.full_name).localeCompare(String(b.i.full_name)); });
    var PR = [[2, 'Top'], [1, 'High'], [0, 'Equal'], [-1, 'Low'], [-2, 'Last']];
    return '<div class="cd"><h3>👥 Who is getting jobs <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">franchise instructors below their weekly minimum are offered the next student first</span></h3>' + (rows.length ? '<div class="scroll"><table><thead><tr><th>Instructor</th><th>Booked this week</th><th>Given today / week</th><th>Last student</th><th>Status</th><th>Priority</th></tr></thead><tbody>' + rows.map(function (r) {
      var pct = r.o.min ? Math.min(100, Math.round(r.s.bookedWeek / r.o.min * 100)) : 0;
      return '<tr><td><b>' + E(r.i.full_name) + '</b><div style="font-size:.66rem;color:var(--txt4)">' + E(String(r.i.instructor_model || 'referral')) + (r.o.src ? ' · ' + r.o.src + ' min ' + r.o.min : '') + '</div></td><td>' + r.s.bookedWeek + (r.o.min ? ' of ' + r.o.min + '<div class="bar"><div style="width:' + pct + '%;background:' + (pct >= 100 ? '#22c55e' : '#f59e0b') + '"></div></div>' : '') + '</td><td>' + r.s.today + ' / ' + r.s.week + '</td><td style="color:var(--txt3)">' + (r.idle === null ? 'never' : r.idle === 0 ? 'today' : r.idle + ' d ago') + '</td><td>' + r.flags.map(function (f) { return '<span class="pill" style="color:' + f[1] + ';border-color:' + f[1] + '66;margin:1px">' + E(f[0]) + '</span>'; }).join('') + '</td><td><select class="dsq-inp" style="width:auto;padding:2px 6px;font-size:.74rem" onchange="DSQHub.prio(\'' + r.i.id + '\',this.value)">' + PR.map(function (p) { return '<option value="' + p[0] + '"' + ((r.t.priority || 0) === p[0] ? ' selected' : '') + '>' + (p[0] === 0 ? 'Equal (default)' : p[1]) + '</option>'; }).join('') + '</select></td></tr>';
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
    return '<div id="aaHolder"></div>';
  }
  function shell() {
    var c = DATA.cfg || {}, on = !!c.enabled, h = document.getElementById('aaHub'); if (!h) return;
    var tabs = [['overview', '📊 Overview'], ['instructors', '👥 Instructors'], ['booked', '🎯 Students booked'], ['settings', '⚙️ Settings'], ['activity', '📜 Activity']];
    h.innerHTML = '<style>' + CSS + '</style><div class="hb"><div class="hh"><h1>🤖 Auto-assign control centre</h1><div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<span style="font-size:.78rem;font-weight:700">' + (on ? 'ON' : 'OFF') + '</span><button class="sw' + (on ? ' on' : '') + '" style="background:' + (on ? '#22c55e' : '#475569') + '" title="Turn auto-assign ' + (on ? 'off' : 'on') + '" onclick="DSQHub.toggle()"></button>' +
      '<select class="dsq-inp" id="hubMode" style="width:auto;padding:4px 8px;font-size:.76rem" onchange="DSQHub.mode(this.value)"><option value="suggest"' + (c.mode === 'suggest' ? ' selected' : '') + '>Suggest only (safe)</option><option value="assign"' + (c.mode === 'assign' ? ' selected' : '') + '>Assign + WhatsApp</option></select>' +
      '<button class="btn-s" onclick="DSQHub.preview()">👀 Preview</button><button class="btn-p" onclick="DSQHub.run()">▶ Run now</button><button class="btn-s" onclick="DSQHub.close()">✕ Close</button></div></div>' +
      '<div class="tabs">' + tabs.map(function (t) { return '<button class="tab' + (TAB === t[0] ? ' on' : '') + '" onclick="DSQHub.tab(\'' + t[0] + '\')">' + t[1] + (t[0] === 'overview' && DATA.att && DATA.att.length ? ' <span style="background:#fff;color:#dc2626;border-radius:99px;padding:0 6px;font-size:.66rem">' + DATA.att.length + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<div id="hubOut" style="font-size:.78rem;margin:0 0 10px"></div><div id="hubBody">' + body() + '</div></div>';
    if (TAB === 'settings' && window.DSQAA) DSQAA.mount();
  }
  async function refresh(full) {
    var h = document.getElementById('aaHub'); if (!h) return;
    if (TAB === 'settings' && !full) return;   // do not redraw the form while you are typing in it
    try { await load(); } catch (e) { var o = document.getElementById('hubOut'); if (o) o.innerHTML = '<span style="color:#f87171">Could not load: ' + E(e.message || e) + '</span>'; return; }
    var scrollY = h.scrollTop; shell(); h.scrollTop = scrollY;
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
    var c = DATA.cfg, turningOn = !c.enabled;
    if (turningOn && !confirm('Turn auto-assign ON in "' + (c.mode === 'suggest' ? 'suggest only' : 'assign + WhatsApp') + '" mode?\n\nOnly website bookings from now on are handled.' + (c.mode === 'assign' ? '\nInstructors and students will be messaged for real.' : '\nNothing is sent or assigned in suggest mode.'))) return;
    if (await saveCfg({ enabled: turningOn, since: turningOn && !c.enabled ? new Date().toISOString() : c.since }, 'Auto-assign turned ' + (turningOn ? 'ON (' + c.mode + ')' : 'OFF'))) { toast(turningOn ? '🤖 Auto-assign is ON' : 'Auto-assign is OFF', 'success', 2500); refresh(true); }
  }
  async function mode(v) { if (v === 'assign' && !confirm('Switch to ASSIGN + WhatsApp?\n\nStudents will be assigned and real WhatsApp messages sent. Use Preview first if unsure.')) { refresh(true); return; } if (await saveCfg({ mode: v }, 'Auto-assign mode set to ' + v)) { toast('Mode: ' + (v === 'suggest' ? 'suggest only' : 'assign + WhatsApp'), 'success', 2500); refresh(true); } }
  async function preview() { var o = document.getElementById('hubOut'); if (!o) return; o.textContent = 'Working it out…'; var r = await DSQWA.call({ action: 'auto_assign', dry: true }); if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; return; }
    o.innerHTML = '<div class="cd"><h3>👀 Preview <span style="font-weight:500;font-size:.72rem;color:var(--txt4)">nothing has been sent or changed</span></h3>' + (r.results.length ? r.results.map(function (x) { var col = { assign: '#22c55e', offer: '#60a5fa', suggest: '#a78bfa', duplicate: '#94a3b8' }[x.action] || '#f59e0b', lab = { assign: 'Assign now', offer: 'Ask to accept', suggest: 'Suggest', duplicate: 'Duplicate (held)', attention: 'Needs you' }[x.action] || x.action; return '<div class="fi"><i>•</i><span><b>' + E(x.student) + '</b> ' + E(x.postcode || '') + ' → <span style="color:' + col + ';font-weight:700">' + lab + '</span>' + (x.instructor ? ' · ' + E(x.instructor) + (x.dist != null ? ' (' + x.dist + ' mi)' : '') : '') + (x.why ? '<br><span style="color:var(--txt3)">' + E(x.why) + '</span>' : '') + (x.reason ? '<br><span style="color:var(--txt3)">' + E(x.reason) + '</span>' : '') + '</span></div>'; }).join('') : '<div class="empty">No waiting website bookings to handle.</div>') + '</div>'; }
  async function run() { var c = DATA.cfg; if (!c.enabled) { toast('Switch auto-assign ON first.', 'warn', 3500); return; } if (!confirm('Run auto-assign now? It will ' + (c.mode === 'suggest' ? 'only add suggestions to the attention list.' : 'assign and WhatsApp for real.'))) return; var o = document.getElementById('hubOut'); if (o) o.textContent = 'Running…'; var r = await DSQWA.call({ action: 'auto_assign' });
    if (o) o.innerHTML = r.ok ? (r.off ? 'It is switched off.' : r.waiting ? E(r.waiting) : '✅ Done: ' + (r.summary.assigned || 0) + ' assigned, ' + (r.summary.offered || 0) + ' asked to accept, ' + (r.summary.attention || 0) + ' need attention.') : '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; setTimeout(function () { refresh(true); }, 800); }
  async function prio(id, v) { if (window.DSQAA) { await DSQAA.setPrio(id, v); refresh(true); } }
  async function retry(wid) { try { await SBc().from('auto_assign_jobs').delete().eq('waiting_id', String(wid)); await SBc().from('admin_attention').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('waiting_id', String(wid)).eq('resolved', false); } catch (e) { } toast('It will try this booking again on the next run.', 'success', 3500); refresh(true); }
  function openBooking(wid) { close(); if (window.DSQAA) DSQAA.openBooking(wid, ''); }
  function tab(t) { TAB = t; refresh(true); }
  function filter(f) { FILTER = f; refresh(true); }

  /* the old Auto-assign button and the top-bar button now open this screen */
  function takeOver() { window.toggleAutoAssign = function () { open('overview'); }; }
  /* a button in the top bar, next to the WhatsApp button */
  function topBtn() { var host = document.getElementById('waApiBtn'); if (!host || document.getElementById('hubBtn')) return; var b = document.createElement('button'); b.id = 'hubBtn'; b.type = 'button'; b.onclick = function () { open('overview'); }; b.title = 'Auto-assign control centre'; b.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:rgba(124,58,237,.18);color:#c4b5fd;border:1px solid rgba(124,58,237,.5);border-radius:99px;padding:4px 12px;font-size:.78rem;font-weight:700;cursor:pointer;margin-left:6px'; b.innerHTML = '🤖 <span>Auto-assign</span>'; host.insertAdjacentElement('afterend', b); }
  takeOver(); window.addEventListener('load', function () { takeOver(); topBtn(); setTimeout(function () { takeOver(); topBtn(); }, 1800); }); setInterval(topBtn, 3000);
  window.DSQHub = { open: open, close: close, tab: tab, toggle: toggle, mode: mode, preview: preview, run: run, prio: prio, retry: retry, openBooking: openBooking, filter: filter, refresh: refresh, _data: function () { return DATA; } };
})();
