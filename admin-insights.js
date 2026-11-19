/* DriveSQ admin → Graphs (press G).
   - Monthly financial graph (from September) and monthly booking graph, both from the same numbers as Accounting
   - Booking rules:  ✅ booked (you confirmed it) = a booking.  Unsure, not booked, waiting for a reply and left = NO booking.
                     No flag for 30+ days is marked Unsure automatically.
   - Things to do:   1) To confirm  2) Contacted — waiting for reply  3) Student left (2+ weeks with no answer)
                     Everything you do here is saved on the referral (admin note) and shows in the Referrals section.
   - Save the graphs as a picture, or import a photo / pasted list of bookings, adjust it, then apply. */
(function () {
  'use strict';
  var DAY = 864e5, CH = {}, S = { month: null, filter: 'all', loaded: false };
  var A = function () { return window.DSQ_ADMIN || {}; };
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (v) { v = +v || 0; return (v < 0 ? '−' : '') + '£' + Math.abs(Math.round(v * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: Math.abs(v - Math.round(v)) < .005 ? 0 : 2, maximumFractionDigits: 2 }); };
  var toast = function (m, t, ms) { try { window.showToast(m, t || '', ms); } catch (e) { } };
  var ymd = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var instrs = function () { return (A().instrs && A().instrs()) || []; };
  var refs = function () { return (A().refs && A().refs()) || []; };
  var iName = function (id) { return (instrs().find(function (i) { return String(i.id) === String(id); }) || {}).full_name || 'No instructor'; };
  var iPhone = function (id) { return (instrs().find(function (i) { return String(i.id) === String(id); }) || {}).phone || ''; };
  var p10 = function (v) { return String(v || '').replace(/\D/g, '').slice(-10); };
  var first = function (n) { return String(n || '').trim().split(/\s+/)[0] || 'there'; };

  /* ---------- the one status rule ---------- */
  function contactedAt(r) { var m = String(r.admin_notes || '').match(/\[c:(\d{4}-\d{2}-\d{2})\]/g); return m ? new Date(m[m.length - 1].slice(3, 13) + 'T12:00:00') : null; }
  function status(r, now) {
    now = now || Date.now();
    if (!r || r.is_cancelled || r.is_credit) return 'excluded';
    if (A().booked(r)) return 'booked';
    if (r.reply_status === 'left') return 'left';   // the instructor said the student left
    if (r.flag_color === 'red') return 'notbooked';
    var age = (now - new Date(r.created_at)) / DAY, c = contactedAt(r);
    if (c) return (now - c) / DAY > 14 ? 'left' : 'waiting';
    if (r.flag_color === 'purple') return 'unsure';
    return age >= 30 ? 'unsure' : 'pending';      // no flag for 30+ days counts as unsure
  }
  var LABEL = { booked: ['✅ Booked', '#22c55e'], notbooked: ['🚩 Not booked', '#ef4444'], unsure: ['🟣 Unsure', '#a855f7'], waiting: ['📨 Waiting for reply', '#f59e0b'], left: ['👋 Student left', '#94a3b8'], pending: ['🕓 New (no update yet)', '#60a5fa'] };

  /* ---------- saving a decision (also shows in Referrals) ---------- */
  var today = function () { return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  async function patchRef(r, patch, noteLine) {
    var up = Object.assign({}, patch); if (noteLine) up.admin_notes = [r.admin_notes || '', today() + ' · ' + noteLine].filter(Boolean).join('\n');
    var res = await A().sb().from('referrals').update(up).eq('id', r.id);
    if (res.error && /is_contacted/i.test(res.error.message || '')) { delete up.is_contacted; res = await A().sb().from('referrals').update(up).eq('id', r.id); }
    if (res.error) { toast('Not saved: ' + res.error.message, 'error', 5000); return false; }
    Object.assign(r, up); return true;
  }
  function logRef(action, r, summary) { try { DSQLog.add(A().sb(), { area: 'referral', action: action, summary: summary, role: 'admin', actor: 'Admin', instrId: r.instructor_id, student: r.student_name, refId: r.id }); } catch (e) { } }
  var MK_BOOK = '✅ Booked — confirmed by admin', MK_UN = '↩️ Booked mark removed by admin';
  async function setBooked(id, via) { var r = refs().find(function (x) { return String(x.id) === String(id); }); if (!r) return false; if (await patchRef(r, { flag_color: 'green' }, MK_BOOK + ' (' + (via || 'via Graph') + ')')) { logRef('marked_booked', r, 'Admin marked ' + (r.student_name || 'a student') + ' booked (' + (via || 'via Graph') + ')'); toast('✅ ' + (r.student_name || 'Student') + ' marked booked', 'success', 2200); return true; } return false; }
  async function setNotBooked(id, via) { var r = refs().find(function (x) { return String(x.id) === String(id); }); if (!r) return false; var was = r.flag_color === 'green'; if (await patchRef(r, { flag_color: 'red' }, (was ? MK_UN + ' · ' : '') + '🚩 Marked not booked (' + (via || 'via Graph') + ')')) { logRef('marked_not_booked', r, 'Admin marked ' + (r.student_name || 'a student') + ' not booked (' + (via || 'via Graph') + ')'); toast('🚩 ' + (r.student_name || 'Student') + ' marked not booked', 'success', 2200); return true; } return false; }
  async function setUnsure(id, via) { var r = refs().find(function (x) { return String(x.id) === String(id); }); if (!r) return false; var ok = await patchRef(r, { flag_color: 'purple' }, '🟣 Marked unsure (' + (via || 'via Graph') + ')'); if (ok) logRef('marked_unsure', r, 'Admin marked ' + (r.student_name || 'a student') + ' unsure (' + (via || 'via Graph') + ')'); return ok; }
  async function markContacted(id, note, daysAgo) {
    var r = refs().find(function (x) { return String(x.id) === String(id); }); if (!r) return false; var d = new Date(Date.now() - (daysAgo || 0) * DAY), tag = '[c:' + ymd(d) + ']';
    var patch = { is_contacted: true }; if (!r.flag_color) patch.flag_color = 'purple';
    var ok = await patchRef(r, patch, '📨 ' + (note || 'Message sent to student and instructor') + ' ' + tag); if (ok) logRef('contacted', r, 'Admin contacted the student and instructor about ' + (r.student_name || 'a student')); return ok;
  }
  /* no flag for 30+ days → saved as unsure, so Referrals and the graph agree */
  async function autoUnsure() {
    var now = Date.now(), list = refs().filter(function (r) { return !r.is_cancelled && !r.is_credit && !r.is_paid && !r.flag_color && (now - new Date(r.created_at)) / DAY >= 30; }).slice(0, 300), n = 0;
    for (var i = 0; i < list.length; i++) { if (await patchRef(list[i], { flag_color: 'purple' }, '🟣 Auto-marked unsure — no update for 30 days (counted as no booking)')) n++; }
    if (n) toast('🟣 ' + n + ' referral' + (n === 1 ? '' : 's') + ' with no flag for 30+ days marked unsure', 'info', 4500);
    return n;
  }

  /* ---------- data for the graphs ---------- */
  function startMonth() { var n = new Date(), y = n.getMonth() >= 8 ? n.getFullYear() : n.getFullYear() - 1; return new Date(y, 8, 1); }
  function months() { var out = [], c = startMonth(), n = new Date(); while (c <= n) { out.push({ y: c.getFullYear(), m: c.getMonth(), k: c.getFullYear() + '-' + String(c.getMonth() + 1).padStart(2, '0'), label: MN[c.getMonth()] + ' ' + String(c.getFullYear()).slice(2) }); c = new Date(c.getFullYear(), c.getMonth() + 1, 1); } return out; }
  function monthData() {
    var tx = A().tx(), ms = months(), now = Date.now();
    ms.forEach(function (m) {
      m.cnt = { booked: 0, notbooked: 0, unsure: 0, waiting: 0, left: 0, pending: 0 }; m.rows = [];
      refs().forEach(function (r) { var d = new Date(r.created_at); if (d.getFullYear() !== m.y || d.getMonth() !== m.m) return; var s = status(r, now); if (s === 'excluded') return; m.cnt[s]++; m.rows.push({ r: r, s: s }); });
      m.referred = Object.keys(m.cnt).reduce(function (a, k) { return a + m.cnt[k]; }, 0);
      m.noBooking = m.cnt.notbooked + m.cnt.unsure + m.cnt.waiting + m.cnt.left;
      var decided = m.cnt.booked + m.noBooking; m.rate = decided ? Math.round(m.cnt.booked / decided * 100) : null;
      m.income = A().month(tx.inc, m.y, m.m); m.expenses = A().month(tx.exp, m.y, m.m); m.profit = m.income - m.expenses;
      m.outstanding = tx.out.filter(function (x) { return x.d.getFullYear() === m.y && x.d.getMonth() === m.m; }).reduce(function (a, x) { return a + x.amt; }, 0);
    });
    return ms;
  }
  function groups() {
    var now = Date.now(), out = { confirm: [], waiting: [], left: [], hiddenOld: 0 };
    refs().forEach(function (r) {
      var s = status(r, now), age = (now - new Date(r.created_at)) / DAY;
      /* referrals older than 30 days are not listed here (they still count as no booking in the graphs); “waiting” ones stay because you are expecting a reply */
      if (!S.showOld && age > 30 && s !== 'waiting' && s !== 'booked' && s !== 'notbooked' && s !== 'excluded' && s !== 'pending') { out.hiddenOld++; return; }
      if (s === 'unsure' || (s === 'pending' && age >= 2)) out.confirm.push({ r: r, s: s, age: Math.floor(age) });
      else if (s === 'waiting') out.waiting.push({ r: r, s: s, age: Math.floor(age) });
      else if (s === 'left') out.left.push({ r: r, s: s, age: Math.floor(age) });
    });
    ['confirm', 'waiting', 'left'].forEach(function (k) { out[k].sort(function (a, b) { return b.age - a.age; }); });
    return out;
  }

  /* ---------- messages ---------- */
  var waLink = function (ph, txt) { var d = String(ph || '').replace(/\D/g, ''); if (!d) return ''; if (d[0] === '0') d = '44' + d.slice(1); return 'https://wa.me/' + d + '?text=' + encodeURIComponent(txt); };
  function openMessage(id) {
    var r = refs().find(function (x) { return String(x.id) === String(id); }); if (!r) return; var ins = iName(r.instructor_id), sf = first(r.student_name);
    var stu = 'Hi ' + sf + ', it\'s DriveSQ 👋 Could you let us know if you have booked a driving lesson with your instructor ' + ins + '? Please reply YES or NO. Thank you!';
    var inst = 'Hi ' + first(ins) + ', quick check from DriveSQ: has ' + (r.student_name || 'your student') + ' (' + (r.student_phone || 'no number') + ') booked a lesson with you? Please reply BOOKED, NOT YET or CAN\'T REACH. Thanks!';
    var m = document.getElementById('gfMsg'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'gfMsg'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px';
    m.onclick = function (e) { if (e.target === m) m.remove(); };
    var ta = function (idn, v) { return '<textarea class="dsq-inp" id="' + idn + '" rows="3" style="width:100%;font-size:.8rem">' + E(v) + '</textarea>'; };
    m.innerHTML = '<div style="background:var(--dk2);border:1px solid var(--bdr);border-radius:16px;width:100%;max-width:600px;max-height:92vh;overflow:auto;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.1rem;font-weight:700">💬 Confirm booking: ' + E(r.student_name || 'Student') + '</div><button class="btn-s" data-x>✕</button></div>' +
      '<div style="font-size:.76rem;color:var(--txt3);margin-bottom:10px">' + E(r.student_phone || 'no phone') + ' · instructor ' + E(ins) + ' · referred ' + new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</div>' +
      '<label class="dsq-lbl">Message to the student</label>' + ta('gfS', stu) + '<div style="margin:6px 0 10px"><button class="btn-p" style="font-size:.78rem" data-wa="s"' + (r.student_phone ? '' : ' disabled') + '><i class="bi bi-whatsapp me-1"></i>Open WhatsApp to student</button></div>' +
      '<label class="dsq-lbl">Message to the instructor</label>' + ta('gfI', inst) + '<div style="margin:6px 0 10px"><button class="btn-p" style="font-size:.78rem" data-wa="i"' + (iPhone(r.instructor_id) ? '' : ' disabled') + '><i class="bi bi-whatsapp me-1"></i>Open WhatsApp to instructor</button></div>' +
      '<label class="dsq-lbl">Note (saved on the referral — edit if you like)</label><input class="dsq-inp" id="gfN" value="Message sent to student and instructor" style="width:100%">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn-gold" data-save>💾 Save note &amp; move to “Contacted — waiting for reply”</button><button class="btn-s" data-x>Cancel</button></div>' +
      '<div style="font-size:.7rem;color:var(--txt4);margin-top:8px">Nothing is sent from here: WhatsApp opens with the message ready for you to send. If there is no reply for 2 weeks the student moves to “Student left”.</div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-x')) return m.remove();
      if (b.getAttribute('data-wa') === 's') { var u = waLink(r.student_phone, document.getElementById('gfS').value); if (u) window.open(u, '_blank', 'noopener'); }
      if (b.getAttribute('data-wa') === 'i') { var u2 = waLink(iPhone(r.instructor_id), document.getElementById('gfI').value); if (u2) window.open(u2, '_blank', 'noopener'); }
      if (b.hasAttribute('data-save')) { b.disabled = true; if (await markContacted(id, document.getElementById('gfN').value.trim() || 'Message sent to student and instructor')) { m.remove(); toast('📨 Moved to “Contacted — waiting for reply”', 'success', 3000); await refreshAll(); } else b.disabled = false; }
    });
  }

  /* ---------- screen ---------- */
  async function ensureData() {
    try { if (!refs().length && window.loadReferrals) await window.loadReferrals(); } catch (e) { }
    try { if (window.loadExpenses) await window.loadExpenses(); } catch (e) { }
  }
  async function open() { var el = document.getElementById('graphBody'); if (el) el.innerHTML = '<div style="padding:30px;color:var(--txt3)"><i class="bi bi-hourglass-split me-2"></i>Loading the numbers…</div>'; await ensureData(); await autoUnsure(); S.loaded = true; render(); }
  async function refreshAll() { try { if (window.loadReferrals) await window.loadReferrals(); } catch (e) { } try { if (window.renderReferrals) window.renderReferrals(); } catch (e) { } render(); }

  function render() {
    var el = document.getElementById('graphBody'); if (!el) return; var ms = monthData(), cur = ms[ms.length - 1] || { cnt: {}, referred: 0, income: 0, expenses: 0, profit: 0 }, G = groups();
    var tot = ms.reduce(function (a, m) { a.i += m.income; a.e += m.expenses; a.b += m.cnt.booked; a.r += m.referred; a.nb += m.noBooking; return a; }, { i: 0, e: 0, b: 0, r: 0, nb: 0 });
    var kpi = function (l, v, c, s) { return '<div style="flex:1;min-width:140px;background:var(--card-bg);border:1px solid var(--bdr);border-radius:14px;padding:10px 14px"><small style="color:var(--txt3);text-transform:uppercase;letter-spacing:.05em;font-size:.6rem">' + l + '</small><div style="font-family:\'Oswald\',sans-serif;font-size:1.45rem;font-weight:700;color:' + (c || 'inherit') + '">' + v + '</div>' + (s ? '<div style="font-size:.66rem;color:var(--txt4)">' + s + '</div>' : '') + '</div>'; };
    var btn = function (icon, label, fn, key) { return '<button class="btn-s" style="font-size:.78rem" onclick="' + fn + '"><i class="bi ' + icon + ' me-1"></i>' + label + (key ? ' <kbd style="font-size:.6rem;opacity:.7">' + key + '</kbd>' : '') + '</button>'; };
    el.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.25rem;font-weight:700"><i class="bi bi-graph-up-arrow me-2" style="color:var(--gold)"></i>Graphs</div><span style="font-size:.74rem;color:var(--txt3)">September to now · same numbers as Accounting</span><span style="flex:1"></span>' +
      btn('bi-cash-coin', 'Referrals', "switchTab('referrals')", 'R') + btn('bi-geo-alt-fill', 'Find &amp; Assign', "switchTab('find')", 'F') + btn('bi-person-plus-fill', 'Add instructor', "switchTab('add')") + btn('bi-bar-chart-line-fill', 'Accounting', "switchTab('expenses')", 'A') + btn('bi-card-image', 'Save as picture', 'DSQInsights.savePicture()') + btn('bi-cloud-arrow-up', 'Import photo / list', 'DSQInsights.openImport()') + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">' + kpi('This month · referred', cur.referred, '', MN[(ms[ms.length - 1] || {}).m] || '') + kpi('This month · booked', cur.cnt.booked || 0, '#22c55e', (cur.rate == null ? '—' : cur.rate + '% of decided')) + kpi('This month · no booking', cur.noBooking || 0, '#ef4444', 'not booked, unsure, waiting, left') + kpi('This month · income', money(cur.income), '#22c55e', 'expenses ' + money(cur.expenses)) + kpi('This month · profit', money(cur.profit), cur.profit >= 0 ? 'var(--gold)' : '#ef4444', 'cash basis') + kpi('Since September', money(tot.i - tot.e), tot.i - tot.e >= 0 ? 'var(--gold)' : '#ef4444', tot.b + ' booked of ' + tot.r + ' referred') + '</div>' +
      '<div class="row g-3"><div class="col-12 col-lg-6"><div class="dsq-card p-3"><div class="section-label">💷 Money by month</div><div style="height:260px"><canvas id="gfFin"></canvas></div></div></div><div class="col-12 col-lg-6"><div class="dsq-card p-3"><div class="section-label">📊 Student bookings by month</div><div style="height:260px"><canvas id="gfBook"></canvas></div></div></div></div>' +
      '<div class="dsq-card p-3 mt-3"><div class="section-label">📅 Month by month</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem"><thead><tr style="color:var(--txt3);text-align:right"><th style="padding:6px;text-align:left">Month</th><th style="padding:6px">Referred</th><th style="padding:6px">Booked</th><th style="padding:6px">No booking</th><th style="padding:6px">Booking rate</th><th style="padding:6px">Income</th><th style="padding:6px">Expenses</th><th style="padding:6px">Profit</th><th style="padding:6px">Still owed</th></tr></thead><tbody>' +
      ms.slice().reverse().map(function (m) { return '<tr style="border-top:1px solid var(--bdr);text-align:right"><td style="padding:7px 6px;text-align:left;font-weight:700">' + MN[m.m] + ' ' + m.y + '</td><td style="padding:7px 6px">' + m.referred + '</td><td style="padding:7px 6px;color:#22c55e;font-weight:700">' + m.cnt.booked + '</td><td style="padding:7px 6px;color:#ef4444">' + m.noBooking + (m.cnt.pending ? ' <span style="color:var(--txt4)">(+' + m.cnt.pending + ' new)</span>' : '') + '</td><td style="padding:7px 6px">' + (m.rate == null ? '—' : m.rate + '%') + '</td><td style="padding:7px 6px">' + money(m.income) + '</td><td style="padding:7px 6px">' + money(m.expenses) + '</td><td style="padding:7px 6px;font-weight:700;color:' + (m.profit >= 0 ? 'var(--gold)' : '#ef4444') + '">' + money(m.profit) + '</td><td style="padding:7px 6px;color:var(--txt3)">' + money(m.outstanding) + '</td></tr>'; }).join('') + '</tbody></table></div><div style="font-size:.7rem;color:var(--txt4);margin-top:8px;line-height:1.5">Booked = you confirmed ✅ it. Not booked, unsure, waiting for a reply and student left all count as <b>no booking</b>. A referral with no flag for 30 days becomes unsure. Money is on a cash basis (referral fees on the day paid, plus weekly fees, block payments, manual income, minus expenses and instructor payouts).</div></div>' +
      '<div class="dsq-card p-3 mt-3"><div class="section-label">🧾 Income &amp; expenses</div>' + moneyListHtml() + '</div>' +
      '<div class="dsq-card p-3 mt-3"><div class="section-label">✅ Things to do</div>' + todoHtml(G) + '</div>' +
      '<div class="dsq-card p-3 mt-3"><div class="section-label">🗂️ Activity log</div><div id="gfLog" style="font-size:.78rem;color:var(--txt3)">Loading…</div></div>';
    draw(ms); fillLog();
  }
  async function fillLog() { var el = document.getElementById('gfLog'); if (!el) return; var L = await DSQLog.list(A().sb(), { limit: 40 }); el = document.getElementById('gfLog'); if (!el) return; el.innerHTML = L.missing ? '<span style="color:#f59e0b">The activity log needs a one-time database setup: run <code>supabase/migrations/20261126_activity_log.sql</code> in Supabase → SQL Editor.</span>' : (L.rows.length ? L.rows.map(function (x) { var inst = x.actor_role === 'instructor'; return '<div style="display:flex;gap:8px;padding:5px 0;border-top:1px solid var(--bdr)"><span style="min-width:104px;color:var(--txt4)">' + new Date(x.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</span><span style="flex:1;color:' + (inst ? '#38bdf8' : 'var(--txt2)') + ';' + (inst ? 'font-weight:700' : '') + '">' + (inst ? '👨‍🏫 ' : '') + E(x.summary || x.action) + '</span></div>'; }).join('') : 'Nothing logged yet. Everything you and your instructors do will appear here.'); }
  function todoHtml(G) {
    var tabs = [['confirm', '1 · To confirm', '#a855f7', G.confirm], ['waiting', '2 · Contacted — waiting for reply', '#f59e0b', G.waiting], ['left', '3 · Student left', '#94a3b8', G.left]];
    var head = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' + tabs.map(function (t) { return '<button class="btn-s" data-g="' + t[0] + '" style="font-size:.8rem;border-color:' + (S.tab === t[0] || (!S.tab && t[0] === 'confirm') ? t[2] : 'var(--bdr)') + ';color:' + t[2] + ';font-weight:700">' + t[1] + ' <span style="background:' + t[2] + '33;border-radius:99px;padding:0 8px;margin-left:4px">' + t[3].length + '</span></button>'; }).join('') + '</div>';
    var oldChip = (G.hiddenOld || S.showOld) ? '<div style="font-size:.74rem;color:var(--txt3);margin-bottom:8px">' + (S.showOld ? 'Showing students referred more than 30 days ago as well. ' : '<b>' + G.hiddenOld + '</b> student' + (G.hiddenOld === 1 ? '' : 's') + ' referred more than 30 days ago are hidden here (they still count as no booking in the graphs). ') + '<a href="javascript:void(0)" data-old="1" style="color:#60a5fa">' + (S.showOld ? 'Hide them' : 'Show them') + '</a></div>' : '';
    var key = S.tab || 'confirm', list = G[key] || [], hint = { confirm: 'No label or marked unsure. Confirm the booking, or send a message to the student and instructor.', waiting: 'You sent a message and are waiting. Mark them booked / not booked when you hear back. After 2 weeks with no answer they move to Student left.', left: 'No answer for 2+ weeks, so they are counted as left (no booking). You can still message them or mark them booked.' }[key];
    var body = list.length ? list.slice(0, 40).map(function (x) {
      var r = x.r, L = LABEL[x.s], note = String(r.admin_notes || '').split('\n').filter(Boolean).pop() || '';
      return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--bdr)"><div style="flex:1;min-width:200px"><b>' + E(r.student_name || 'Student') + '</b> <span style="font-size:.66rem;font-weight:800;color:' + L[1] + ';background:' + L[1] + '22;border-radius:99px;padding:1px 8px">' + L[0] + '</span><div style="font-size:.72rem;color:var(--txt4)">' + E(r.student_phone || 'no phone') + ' · ' + E(iName(r.instructor_id)) + ' · referred ' + x.age + ' days ago' + (contactedAt(r) ? ' · contacted ' + Math.floor((Date.now() - contactedAt(r)) / DAY) + ' days ago' : '') + '</div>' + (note ? '<div style="font-size:.68rem;color:var(--txt4);font-style:italic;margin-top:2px">' + E(note.slice(0, 120)) + '</div>' : '') + '</div>' +
        '<button class="btn-s" style="font-size:.72rem;border-color:rgba(34,197,94,.5);color:#16a34a" data-do="book" data-id="' + E(r.id) + '">✅ Booked</button><button class="btn-s" style="font-size:.72rem;border-color:rgba(239,68,68,.5);color:#ef4444" data-do="nobook" data-id="' + E(r.id) + '">🚩 Not booked</button><button class="btn-s" style="font-size:.72rem" data-do="msg" data-id="' + E(r.id) + '">💬 Message</button><button class="btn-s" style="font-size:.72rem" data-do="open" data-id="' + E(r.instructor_id) + '">Referral</button></div>'; }).join('') + (list.length > 40 ? '<div style="font-size:.72rem;color:var(--txt4);padding-top:8px">…and ' + (list.length - 40) + ' more (do these first)</div>' : '') : '<div style="padding:16px 0;color:var(--txt3);font-size:.84rem">✅ Nothing here.</div>';
    return head + oldChip + '<div style="font-size:.74rem;color:var(--txt3);margin-bottom:6px">' + hint + '</div><div id="gfTodo">' + body + '</div>';
  }
  function draw(ms) {
    if (!window.Chart) return; var txt = getComputedStyle(document.body).getPropertyValue('--txt3') || '#888';
    ['fin', 'book'].forEach(function (k) { if (CH[k]) { try { CH[k].destroy(); } catch (e) { } CH[k] = null; } });
    var labels = ms.map(function (m) { return m.label; }), opt = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: txt, boxWidth: 12 } } }, scales: { x: { ticks: { color: txt }, grid: { display: false } }, y: { ticks: { color: txt }, grid: { color: 'rgba(128,128,128,.15)' } } } };
    var f = document.getElementById('gfFin'), b = document.getElementById('gfBook');
    if (f) CH.fin = new Chart(f, { data: { labels: labels, datasets: [{ type: 'bar', label: 'Income', data: ms.map(function (m) { return Math.round(m.income * 100) / 100; }), backgroundColor: '#22c55e', borderRadius: 4 }, { type: 'bar', label: 'Expenses', data: ms.map(function (m) { return Math.round(m.expenses * 100) / 100; }), backgroundColor: '#ef4444', borderRadius: 4 }, { type: 'line', label: 'Profit', data: ms.map(function (m) { return Math.round(m.profit * 100) / 100; }), borderColor: '#f5c518', backgroundColor: '#f5c518', tension: .25, pointRadius: 4 }] }, options: opt });
    if (b) { var o2 = JSON.parse(JSON.stringify(opt)); o2.scales.x.stacked = true; o2.scales.y.stacked = true; o2.scales.y2 = { position: 'right', min: 0, max: 100, ticks: { color: txt, callback: function (v) { return v + '%'; } }, grid: { display: false } }; o2.plugins.legend.labels.color = txt;
      var ds = function (k, l, c) { return { type: 'bar', label: l, data: ms.map(function (m) { return m.cnt[k]; }), backgroundColor: c, stack: 's', borderRadius: 2 }; };
      CH.book = new Chart(b, { data: { labels: labels, datasets: [ds('booked', 'Booked', '#22c55e'), ds('notbooked', 'Not booked', '#ef4444'), ds('unsure', 'Unsure', '#a855f7'), ds('waiting', 'Waiting for reply', '#f59e0b'), ds('left', 'Student left', '#94a3b8'), ds('pending', 'New', '#60a5fa'), { type: 'line', label: 'Booking rate %', yAxisID: 'y2', data: ms.map(function (m) { return m.rate; }), borderColor: '#fff', backgroundColor: '#fff', tension: .25, pointRadius: 3, spanGaps: true }] }, options: o2 }); }
  }

  /* clicks inside the screen */
  document.addEventListener('click', async function (e) {
    var panel = document.getElementById('graphBody'); if (!panel || !panel.contains(e.target)) return;
    var o = e.target.closest('[data-old]'); if (o) { S.showOld = !S.showOld; render(); return; }
    var t = e.target.closest('[data-g]'); if (t) { S.tab = t.getAttribute('data-g'); render(); return; }
    var d = e.target.closest('[data-do]'); if (!d) return; var id = d.getAttribute('data-id'), a = d.getAttribute('data-do');
    if (a === 'msg') return openMessage(id);
    if (a === 'open') { try { window.openRefDetail(id, true); } catch (x) { } return; }
    d.disabled = true;
    var ok = a === 'book' ? await setBooked(id) : await setNotBooked(id);
    if (ok) { try { if (window.renderReferrals) window.renderReferrals(); } catch (x) { } render(); } else d.disabled = false;
  });

  /* ---------- save as picture ---------- */
  function savePicture() {
    var f = CH.fin && CH.fin.canvas, b = CH.book && CH.book.canvas; if (!f || !b) { toast('Open the graphs first.', 'warn'); return; }
    var W = 1400, pad = 30, cw = (W - pad * 3) / 2, ch = Math.round(cw * f.height / f.width), ms = monthData(), cur = ms[ms.length - 1] || { cnt: {}, referred: 0, income: 0, expenses: 0, profit: 0 }, H = 130 + ch + 60 + ms.length * 26 + 80, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var g = cv.getContext('2d');
    g.fillStyle = '#0f0f12'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = '700 30px Oswald, Arial'; g.fillText('DriveSQ — bookings & money', pad, 46); g.font = '16px Arial'; g.fillStyle = '#aaa'; g.fillText('Generated ' + new Date().toLocaleString('en-GB') + ' · September to now · cash basis', pad, 72);
    g.fillStyle = '#22c55e'; g.font = '700 20px Arial'; g.fillText('This month: ' + (cur.cnt.booked || 0) + ' booked of ' + cur.referred + ' referred · income ' + money(cur.income) + ' · expenses ' + money(cur.expenses) + ' · profit ' + money(cur.profit), pad, 108);
    g.drawImage(f, pad, 130, cw, ch); g.drawImage(b, pad * 2 + cw, 130, cw, ch);
    var y = 130 + ch + 40; g.font = '700 15px Arial'; g.fillStyle = '#f5c518'; ['Month', 'Referred', 'Booked', 'No booking', 'Rate', 'Income', 'Expenses', 'Profit'].forEach(function (h, i) { g.fillText(h, pad + i * 160, y); }); g.font = '15px Arial'; g.fillStyle = '#ddd';
    ms.slice().reverse().forEach(function (m, r) { var row = [MN[m.m] + ' ' + m.y, m.referred, m.cnt.booked, m.noBooking, m.rate == null ? '—' : m.rate + '%', money(m.income), money(m.expenses), money(m.profit)]; row.forEach(function (v, i) { g.fillText(String(v), pad + i * 160, y + 26 * (r + 1)); }); });
    var a = document.createElement('a'); a.download = 'drivesq-graphs-' + ymd(new Date()) + '.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); toast('🖼️ Picture saved', 'success', 2500);
  }

  /* ---------- import from a photo / screenshot / pasted list ---------- */
  function parseList(text) {
    var out = [], re = /(?:\+?44\s?7|07)[\d\s\-]{8,12}/;
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var m = line.match(re); if (!m) return; var ph = p10(m[0]); if (ph.length < 9) return;
      var name = line.slice(0, m.index).replace(/[|•\-–—:,;]+\s*$/, '').replace(/^\W+/, '').trim(), rest = (line.slice(0, m.index) + ' ' + line.slice(m.index + m[0].length)).toLowerCase(), act = '';
      if (/\bnot\s*booked|no\s*booking|cancel|not going/.test(rest)) act = 'notbooked'; else if (/\bunsure|maybe|not sure|pending/.test(rest)) act = 'unsure'; else if (/\bleft\b|no reply|gone/.test(rest)) act = 'left'; else if (/\bbooked|✅|yes\b|confirmed/.test(rest)) act = 'booked';
      out.push({ name: name, phone: ph, act: act });
    });
    return out;
  }
  function openImport() {
    var m = document.getElementById('gfImp'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'gfImp'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px';
    m.onclick = function (e) { if (e.target === m) m.remove(); };
    m.innerHTML = '<div style="background:var(--dk2);border:1px solid var(--bdr);border-radius:16px;width:100%;max-width:760px;max-height:92vh;overflow:auto;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.1rem;font-weight:700">📥 Import bookings from a photo or list</div><button class="btn-s" data-x>✕</button></div>' +
      '<div style="font-size:.76rem;color:var(--txt3);margin-bottom:8px;line-height:1.5">Choose a picture of a list (name, phone number, booked / not booked). The text is read on your device, then you check and change it before anything is saved. You can also paste a list instead.</div>' +
      '<input type="file" id="gfImgIn" accept="image/*" class="dsq-inp" style="margin-bottom:8px"><div id="gfOcrState" style="font-size:.74rem;color:var(--txt3);margin-bottom:6px"></div>' +
      '<textarea class="dsq-inp" id="gfPaste" rows="6" placeholder="One per line, for example:&#10;Sara Ahmed 07700 900123 booked&#10;Bilal Khan 07700 900456 not booked" style="width:100%;font-size:.8rem"></textarea>' +
      '<div style="margin:8px 0"><button class="btn-p" style="font-size:.78rem" data-parse>Read the list</button></div><div id="gfImpTable"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-x')) return m.remove();
      if (b.hasAttribute('data-parse')) return showParsed(parseList(document.getElementById('gfPaste').value));
      if (b.hasAttribute('data-apply')) return applyParsed(b);
    });
    document.getElementById('gfImgIn').addEventListener('change', async function () { var f = this.files && this.files[0]; if (!f) return; var st = document.getElementById('gfOcrState'); st.textContent = '⏳ Reading the picture (first time can take a minute)…'; try { var t = await ocr(f); document.getElementById('gfPaste').value = t; st.textContent = '✅ Text read — check it below, fix anything wrong, then press “Read the list”.'; showParsed(parseList(t)); } catch (err) { st.innerHTML = '<span style="color:#f59e0b">Could not read the picture (' + E((err && err.message) || err) + '). Type or paste the list instead.</span>'; } });
  }
  async function ocr(file) {
    if (!window.Tesseract) await new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js'; s.onload = res; s.onerror = function () { rej(new Error('the reader could not be loaded')); }; document.head.appendChild(s); });
    var r = await window.Tesseract.recognize(file, 'eng'); return (r && r.data && r.data.text) || '';
  }
  var PARSED = [];
  function showParsed(rows) {
    PARSED = rows.map(function (x) { var hit = refs().filter(function (r) { return p10(r.student_phone) === x.phone && !r.is_cancelled && !r.is_credit; }).sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })[0]; return Object.assign({}, x, { ref: hit || null }); });
    var el = document.getElementById('gfImpTable'); if (!el) return; if (!PARSED.length) { el.innerHTML = '<div style="color:#f59e0b;font-size:.8rem">No phone numbers found. Each line needs a UK mobile number.</div>'; return; }
    var sel = function (i, v) { return '<select class="dsq-inp" data-i="' + i + '" style="padding:3px 6px;font-size:.76rem;width:auto">' + [['', 'Do nothing'], ['booked', '✅ Booked'], ['notbooked', '🚩 Not booked'], ['unsure', '🟣 Unsure'], ['left', '👋 Student left']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
    el.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.78rem"><thead><tr style="color:var(--txt3);text-align:left"><th style="padding:5px">Name in list</th><th style="padding:5px">Phone</th><th style="padding:5px">Found in Referrals</th><th style="padding:5px">Now</th><th style="padding:5px">Set to</th></tr></thead><tbody>' +
      PARSED.map(function (x, i) { var r = x.ref, s = r ? status(r) : ''; return '<tr style="border-top:1px solid var(--bdr)"><td style="padding:6px 5px">' + E(x.name || '—') + '</td><td style="padding:6px 5px">0' + E(x.phone.slice(-10)) + '</td><td style="padding:6px 5px">' + (r ? '<b>' + E(r.student_name || '') + '</b> · ' + E(iName(r.instructor_id)) : '<span style="color:#f59e0b">no referral with this number</span>') + '</td><td style="padding:6px 5px">' + (r ? '<span style="color:' + (LABEL[s] || ['', '#888'])[1] + '">' + ((LABEL[s] || [s])[0]) + '</span>' : '') + '</td><td style="padding:6px 5px">' + (r ? sel(i, x.act) : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div style="margin-top:10px"><button class="btn-gold" data-apply>Apply the changes</button> <span style="font-size:.72rem;color:var(--txt4)">Saved as notes on each referral (“via photo import”).</span></div>';
    el.querySelectorAll('select[data-i]').forEach(function (s) { s.onchange = function () { PARSED[+s.getAttribute('data-i')].act = s.value; }; });
  }
  async function applyParsed(btn) {
    var todo = PARSED.filter(function (x) { return x.ref && x.act; }); if (!todo.length) { toast('Nothing to change.', 'info'); return; }
    btn.disabled = true; var n = 0;
    for (var i = 0; i < todo.length; i++) { var x = todo[i], id = x.ref.id, ok = false;
      if (x.act === 'booked') ok = await setBooked(id, 'via photo import'); else if (x.act === 'notbooked') ok = await setNotBooked(id, 'via photo import'); else if (x.act === 'unsure') ok = await setUnsure(id, 'via photo import'); else if (x.act === 'left') ok = await markContacted(id, 'Student left — from photo import', 15);
      if (ok) n++; }
    toast('✅ ' + n + ' referral' + (n === 1 ? '' : 's') + ' updated', 'success', 3500); var m = document.getElementById('gfImp'); if (m) m.remove(); await refreshAll();
  }

  /* ---------- add income / expenses (saved in Accounting, logged, shown in the graphs) ---------- */
  function openMoney(kind) {
    var cats = Object.keys((kind === 'income' ? A().incCats() : A().expCats()) || {}), m = document.getElementById('gfMoney'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'gfMoney'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px'; m.onclick = function (e) { if (e.target === m) m.remove(); };
    m.innerHTML = '<div style="background:var(--dk2);border:1px solid var(--bdr);border-radius:16px;width:100%;max-width:440px;padding:18px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.1rem;font-weight:700;margin-bottom:10px">' + (kind === 'income' ? '💷 Add income' : '🧾 Add expense') + '</div>' +
      '<div class="row g-2"><div class="col-6"><label class="dsq-lbl">Date</label><input type="date" class="dsq-inp" id="gmD" value="' + ymd(new Date()) + '"></div><div class="col-6"><label class="dsq-lbl">Amount £</label><input type="number" min="0" step="0.01" class="dsq-inp" id="gmA" placeholder="0.00"></div>' +
      '<div class="col-12"><label class="dsq-lbl">Category</label><select class="dsq-inp" id="gmC">' + cats.map(function (c) { return '<option>' + E(c) + '</option>'; }).join('') + '</select></div><div class="col-12"><label class="dsq-lbl">What was it for? (optional)</label><input class="dsq-inp" id="gmN" placeholder="e.g. Fuel for the week"></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn-gold" data-s>Save</button><button class="btn-s" data-x>Cancel</button></div><div style="font-size:.7rem;color:var(--txt4);margin-top:8px">It is saved in Accounting, added to this month in the graphs, and recorded in the activity log.</div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-x')) return m.remove();
      var amt = parseFloat(document.getElementById('gmA').value), d = document.getElementById('gmD').value, c = document.getElementById('gmC').value, n = document.getElementById('gmN').value.trim();
      if (!(amt > 0) || !d) { toast('Enter the date and an amount.', 'error'); return; } b.disabled = true;
      var row = kind === 'income' ? { category: c, amount: amt.toFixed(2), income_date: d, description: n } : { category: c, amount: amt.toFixed(2), expense_date: d, description: n };
      var r = await A().sb().from(kind === 'income' ? 'income_entries' : 'expenses').insert([row]).select().maybeSingle();
      if (r.error) { toast('Not saved: ' + r.error.message, 'error', 6000); b.disabled = false; return; }
      try { DSQLog.add(A().sb(), { area: kind, action: kind + '_added', summary: 'Admin added ' + kind + ' ' + money(amt) + ' · ' + c + (n ? ' · ' + n : '') + ' (' + d + ')', role: 'admin', actor: 'Admin', after: row }); } catch (x) { }
      m.remove(); toast((kind === 'income' ? '💷 Income' : '🧾 Expense') + ' ' + money(amt) + ' added', 'success', 2500); await ensureData(); render();
    });
  }
  async function deleteMoney(kind, id) {
    var list = kind === 'income' ? A().incData() : A().expData(), row = list.find(function (x) { return String(x.id) === String(id); }); if (!row || !confirm('Delete this ' + kind + ' entry (' + money(row.amount) + ' · ' + row.category + ')?')) return;
    var r = await A().sb().from(kind === 'income' ? 'income_entries' : 'expenses').delete().eq('id', id); if (r.error) { toast('Not deleted: ' + r.error.message, 'error'); return; }
    try { DSQLog.add(A().sb(), { area: kind, action: kind + '_deleted', summary: 'Admin deleted ' + kind + ' ' + money(row.amount) + ' · ' + row.category, role: 'admin', actor: 'Admin', before: row }); } catch (x) { }
    toast('Deleted', 'success', 1800); await ensureData(); render();
  }
  function moneyListHtml() {
    var rows = [].concat((A().incData() || []).map(function (x) { return { k: 'income', id: x.id, d: x.income_date, c: x.category, a: +x.amount, n: x.description }; }), (A().expData() || []).map(function (x) { return { k: 'expense', id: x.id, d: x.expense_date, c: x.category, a: +x.amount, n: x.description }; })).sort(function (a, b) { return a.d < b.d ? 1 : -1; }).slice(0, 15);
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button class="btn-gold" style="font-size:.8rem" onclick="DSQInsights.openMoney(\'income\')">＋ Add income</button><button class="btn-s" style="font-size:.8rem;border-color:rgba(239,68,68,.5);color:#ef4444" onclick="DSQInsights.openMoney(\'expense\')">＋ Add expense</button><span style="font-size:.72rem;color:var(--txt4)">Latest entries (everything is also in Accounting)</span></div>' +
      (rows.length ? rows.map(function (x) { return '<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--bdr);font-size:.78rem"><span style="min-width:74px;color:var(--txt4)">' + E(new Date(x.d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + '</span><span style="flex:1">' + (x.k === 'income' ? '💷' : '🧾') + ' <b>' + E(x.c) + '</b> <span style="color:var(--txt4)">' + E(x.n || '') + '</span></span><b style="color:' + (x.k === 'income' ? '#22c55e' : '#ef4444') + '">' + (x.k === 'income' ? '+' : '−') + money(x.a) + '</b><button class="btn-s" style="font-size:.66rem;padding:2px 8px" onclick="DSQInsights.deleteMoney(\'' + x.k + '\',\'' + x.id + '\')">✕</button></div>'; }).join('') : '<div style="color:var(--txt3);font-size:.8rem;padding:8px 0">No manual income or expenses yet.</div>');
  }

  /* ---------- on an instructor's admin profile: bookings tracker, package history, activity log ---------- */
  var TR = {};   // per instructor: { p: period, from, to }
  function trackRange(id) {
    var t = TR[id] || { p: 'all' }, now = new Date(), FAR = new Date(8.64e15);
    if (t.p === 'week') { var m = new Date(now); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return { s: m, e: FAR, label: 'This week' }; }
    if (t.p === 'month') return { s: new Date(now.getFullYear(), now.getMonth(), 1), e: FAR, label: 'This month' };
    if (t.p === 'pick' && /^\d{4}-\d{2}$/.test(t.pick || '')) { var y = +t.pick.slice(0, 4), mo = +t.pick.slice(5) - 1; return { s: new Date(y, mo, 1), e: new Date(new Date(y, mo + 1, 1).getTime() - 1), label: MN[mo] + ' ' + y }; }
    if (t.p === 'custom') { var a = t.from ? new Date(t.from + 'T00:00:00') : new Date(0), z = t.to ? new Date(t.to + 'T23:59:59') : FAR; return { s: a, e: z, label: (t.from ? new Date(t.from + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'the start') + ' → ' + (t.to ? new Date(t.to + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'now') }; }
    return { s: new Date(0), e: FAR, label: 'All time' };
  }
  function trackerHtml(id) {
    var t = TR[id] || (TR[id] = { p: 'all' }), g = trackRange(id), now = Date.now(), c = { booked: 0, notbooked: 0, unsure: 0, waiting: 0, left: 0, pending: 0 }, rows = [];
    refs().forEach(function (r) { if (String(r.instructor_id) !== String(id)) return; var d = new Date(r.created_at); if (d < g.s || d > g.e) return; var s = status(r, now); if (s === 'excluded') return; c[s]++; rows.push({ r: r, s: s }); });
    var total = rows.length, no = c.notbooked + c.unsure + c.waiting + c.left, dec = c.booked + no;
    var sel = function (v, l) { return '<option value="' + v + '"' + (t.p === v ? ' selected' : '') + '>' + l + '</option>'; };
    var cell = function (l, v, col) { return '<div style="flex:1;min-width:84px;background:rgba(128,128,128,.1);border-radius:10px;padding:7px 9px"><small style="display:block;font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:var(--txt3)">' + l + '</small><b style="font-family:Oswald,sans-serif;font-size:1.15rem;color:' + (col || 'inherit') + '">' + v + '</b></div>'; };
    return '<div id="instrTrack-' + id + '"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><select class="dsq-inp" style="width:auto;padding:4px 8px;font-size:.78rem" onchange="DSQInsights.trackSet(\'' + id + '\',\'p\',this.value)">' + sel('all', 'All time') + sel('week', 'This week') + sel('month', 'This month') + sel('pick', 'A specific month') + sel('custom', 'Custom dates') + '</select>' +
      (t.p === 'pick' ? '<input type="month" class="dsq-inp" style="width:auto;padding:4px 8px;font-size:.78rem" value="' + E(t.pick || '') + '" onchange="DSQInsights.trackSet(\'' + id + '\',\'pick\',this.value)">' : '') + (t.p === 'custom' ? '<input type="date" class="dsq-inp" style="width:auto;padding:4px 8px;font-size:.78rem" value="' + E(t.from || '') + '" onchange="DSQInsights.trackSet(\'' + id + '\',\'from\',this.value)"> to <input type="date" class="dsq-inp" style="width:auto;padding:4px 8px;font-size:.78rem" value="' + E(t.to || '') + '" onchange="DSQInsights.trackSet(\'' + id + '\',\'to\',this.value)">' : '') + '<span style="font-size:.74rem;color:var(--txt3)">' + E(g.label) + '</span></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' + cell('Active students', c.booked, '#22c55e') + cell('Referred', total) + cell('No booking', no, '#ef4444') + cell('Booking rate', dec ? Math.round(c.booked / dec * 100) + '%' : '—') + '</div>' +
      '<div style="font-size:.72rem;color:var(--txt3);margin-top:6px;line-height:1.55">Active students = students confirmed booked in this period. No booking = not booked ' + c.notbooked + ' · unsure ' + c.unsure + ' · waiting for reply ' + c.waiting + ' · student left ' + c.left + (c.pending ? ' · new ' + c.pending : '') + '.</div>' +
      (rows.length ? '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:.76rem;font-weight:700">Show the ' + rows.length + ' student' + (rows.length === 1 ? '' : 's') + '</summary>' + rows.slice().sort(function (a, b) { return new Date(b.r.created_at) - new Date(a.r.created_at); }).slice(0, 80).map(function (x) { var L = LABEL[x.s]; return '<div style="display:flex;gap:8px;padding:4px 0;border-top:1px solid var(--bdr);font-size:.76rem"><span style="flex:1">' + E(x.r.student_name || 'Student') + '</span><span style="color:var(--txt4)">' + new Date(x.r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span><span style="color:' + L[1] + ';font-weight:700">' + L[0] + '</span></div>'; }).join('') + '</details>' : '') + '</div>';
  }
  function trackSet(id, k, v) { var t = TR[id] || (TR[id] = { p: 'all' }); t[k] = v; var el = document.getElementById('instrTrack-' + id); if (el) el.outerHTML = trackerHtml(id); }
  function trackHolder(id) { return '<div id="instrTrack-' + id + '" style="color:var(--txt4);font-size:.8rem">Loading…</div>'; }
  async function fillProfile(id) {
    try { await ensureRefs(); var el = document.getElementById('instrTrack-' + id); if (el) el.outerHTML = trackerHtml(id); } catch (e) { }
    try { var ph = document.getElementById('instrPkgHist-' + id); if (ph && window.DSQPkg) { await DSQPkg.load(); ph.innerHTML = DSQPkg.historyHtml(id); } } catch (e) { }
    try {
      var lg = document.getElementById('instrLog-' + id); if (!lg) return; var L = await DSQLog.list(A().sb(), { instrId: id, limit: 40 });
      lg.innerHTML = L.missing ? '<span style="color:#f59e0b">The activity log needs a one-time database setup (run <code>20261126_activity_log.sql</code>).</span>' : (L.rows.length ? L.rows.map(function (x) { var inst = x.actor_role === 'instructor', c = inst ? '#38bdf8' : x.actor_role === 'system' ? '#94a3b8' : 'var(--txt2)'; return '<div style="display:flex;gap:8px;padding:4px 0;border-top:1px solid var(--bdr);font-size:.74rem"><span style="min-width:96px;color:var(--txt4)">' + new Date(x.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</span><span style="flex:1;color:' + c + ';' + (inst ? 'font-weight:700' : '') + '">' + (inst ? '👨‍🏫 ' : '') + E(x.summary || x.action) + '</span></div>'; }).join('') : '<span style="color:var(--txt4)">Nothing logged for this instructor yet.</span>');
    } catch (e) { }
  }
  async function ensureRefs() { try { if (!refs().length && window.loadReferrals) await window.loadReferrals(); } catch (e) { } }

  /* ---------- admin note on an instructor (only shown on their admin profile and in Find & Assign) ---------- */
  var NOTES = null;
  async function loadNotes(force) {
    if (NOTES && !force) return NOTES; NOTES = {};
    try { var r = await A().sb().from('growth_settings').select('value').eq('key', 'instructor_notes').maybeSingle(); if (r && r.data && r.data.value) NOTES = r.data.value; } catch (e) { }
    try { var l = JSON.parse(localStorage.getItem('dsq_instr_notes') || '{}'); Object.keys(l).forEach(function (k) { if (!NOTES[k]) NOTES[k] = l[k]; }); } catch (e) { }
    return NOTES;
  }
  var noteOf = function (id) { return (NOTES && NOTES[id] && NOTES[id].text) || ''; };
  function noteLine(id) { var t = noteOf(id); return t ? '<div style="margin-top:5px;font-size:.72rem;color:#f59e0b;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);border-radius:8px;padding:4px 9px"><i class="bi bi-sticky-fill me-1"></i><b>Note:</b> ' + E(t) + '</div>' : ''; }
  function profileNoteHtml(id) { var t = noteOf(id); return '<div id="instrNote-' + id + '" style="font-size:.8rem">' + (t ? '<div style="white-space:pre-wrap;color:var(--txt)">' + E(t) + '</div><div style="font-size:.66rem;color:var(--txt4);margin-top:2px">Only you see this · also shown in Find &amp; Assign' + (NOTES[id] && NOTES[id].at ? ' · updated ' + new Date(NOTES[id].at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '') + '</div>' : '<span style="color:var(--txt4)">No note yet.</span>') + ' <button class="btn-s" style="font-size:.7rem;padding:2px 9px;margin-left:6px" onclick="DSQInsights.editNote(\'' + id + '\')">' + (t ? 'Edit' : '＋ Add note') + '</button></div>'; }
  async function editNote(id) {
    await loadNotes(); var m = document.getElementById('gfNote'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'gfNote'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px'; m.onclick = function (e) { if (e.target === m) m.remove(); };
    m.innerHTML = '<div style="background:var(--dk2);border:1px solid var(--bdr);border-radius:16px;width:100%;max-width:480px;padding:18px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.05rem;font-weight:700;margin-bottom:6px">📝 Note about ' + E(iName(id)) + '</div><div style="font-size:.74rem;color:var(--txt3);margin-bottom:8px">Only you see this. It shows on their profile and on their card in Find &amp; Assign, for example “only takes automatics” or “not before 10am”.</div><textarea class="dsq-inp" id="gfNoteT" rows="4" style="width:100%">' + E(noteOf(id)) + '</textarea><div style="display:flex;gap:8px;margin-top:10px"><button class="btn-gold" data-s>Save note</button><button class="btn-s" data-x>Cancel</button>' + (noteOf(id) ? '<button class="btn-s" style="margin-left:auto;color:#ef4444" data-d>Delete</button>' : '') + '</div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-x')) return m.remove();
      var txt = b.hasAttribute('data-d') ? '' : document.getElementById('gfNoteT').value.trim();
      if (txt) NOTES[id] = { text: txt, at: new Date().toISOString() }; else delete NOTES[id];
      try { localStorage.setItem('dsq_instr_notes', JSON.stringify(NOTES)); } catch (x) { }
      try { var r = await A().sb().from('growth_settings').upsert({ key: 'instructor_notes', value: NOTES, updated_at: new Date().toISOString() }, { onConflict: 'key' }); if (r.error) throw r.error; } catch (x) { toast('Saved on this device only — run the growth tools SQL so it is saved for everyone.', 'warn', 6000); }
      m.remove(); var el = document.getElementById('instrNote-' + id); if (el) el.outerHTML = profileNoteHtml(id); toast(txt ? '📝 Note saved' : 'Note removed', 'success', 2000);
    });
  }
  window.DSQInsights = { openMoney: openMoney, deleteMoney: deleteMoney, trackerHtml: trackerHtml, trackHolder: trackHolder, trackSet: trackSet, fillProfile: fillProfile, loadNotes: loadNotes, noteLine: noteLine, profileNoteHtml: profileNoteHtml, editNote: editNote, noteOf: noteOf, open: open, render: render, status: status, groups: groups, monthData: monthData, autoUnsure: autoUnsure, setBooked: setBooked, setNotBooked: setNotBooked, markContacted: markContacted, openMessage: openMessage, savePicture: savePicture, openImport: openImport, parseList: parseList, _S: S, contactedAt: contactedAt };
})();
