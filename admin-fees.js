/* DriveSQ weekly fees — franchise instructors and package instructors (admin → Accounting → 💼 Weekly fees).
   One row per instructor per week in instructor_weekly_fees. Paid rows are income (cash basis, on the day paid).
   Organised by package / amount so you can see exactly what each plan brings in. */
(function () {
  'use strict';
  var ROWS = [], CFGV = { from: '' }, missing = false, loaded = false, weekK = null, busy = false;
  var A = function () { return window.DSQ_ADMIN || {}; }, SB = function () { return A().sb && A().sb(); };
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (v) { v = +v || 0; return '£' + (Math.abs(v - Math.round(v)) < .005 ? Math.round(v) : v.toFixed(2)); };
  var ymd = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var wk = function (d) { var m = new Date(d); m.setHours(12, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return ymd(m); };
  var addW = function (k, n) { var d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + 7 * n); return ymd(d); };
  var niceW = function (k) { return new Date(k + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  var toast = function (m, t, ms) { try { window.showToast(m, t || '', ms); } catch (e) { } };
  var instrs = function () { return (A().instrs && A().instrs()) || []; };
  var nameOf = function (id) { return (instrs().find(function (i) { return String(i.id) === String(id); }) || {}).full_name || 'Instructor'; };

  async function load() {
    if (!SB()) return; missing = false;
    try {
      var out = []; for (var from = 0; from < 50000; from += 1000) { var r = await SB().from('instructor_weekly_fees').select('*').order('week_start', { ascending: false }).range(from, from + 999); if (r.error) throw r.error; out = out.concat(r.data || []); if (!r.data || r.data.length < 1000) break; }
      ROWS = out;
      var c = await SB().from('growth_settings').select('value').eq('key', 'weekly_fees_cfg').maybeSingle(); if (c && c.data && c.data.value) CFGV = Object.assign(CFGV, c.data.value);
    } catch (e) { missing = /does not exist|relation|schema cache/i.test(String((e && e.message) || e)); ROWS = []; }
    loaded = true;
  }
  /* what each instructor should pay per week: a package fee if they have an active package, otherwise the franchise fee */
  async function plans() {
    try { if (window._frCfg) await window._frCfg(); } catch (e) { }
    try { if (window.DSQPkg) await DSQPkg.load(); } catch (e) { }
    var out = [];
    instrs().forEach(function (i) {
      if (i.status !== 'approved') return; var p = window.DSQPkg && DSQPkg.pkgOf(i.id);
      if (p && p.fee > 0) out.push({ id: i.id, plan: p.name + ' package', fee: p.fee, kind: 'package', start: p.start || '' });
      else if (String(i.instructor_model || '').toLowerCase() === 'franchise') { var f = window._frFeeOf ? window._frFeeOf(i.id) : null; if (f > 0) out.push({ id: i.id, plan: 'Franchise', fee: f, kind: 'franchise', start: '' }); }
    });
    return out;
  }
  /* make sure every eligible instructor has a row for each week from "track from" to this week */
  async function ensure() {
    if (missing || busy) return; busy = true;
    try {
      /* a package starting mid-week is charged and measured from the next Monday */
      var cur = wk(new Date()), from = CFGV.from ? wk(CFGV.from + 'T12:00:00') : cur, list = await plans(), have = {}, ins = [];
      ROWS.forEach(function (r) { have[r.instructor_id + '|' + r.week_start] = 1; });
      list.forEach(function (p) { var startK = p.start ? (p.kind === 'package' && wk(p.start + 'T12:00:00') !== p.start ? addW(wk(p.start + 'T12:00:00'), 1) : wk(p.start + 'T12:00:00')) : from; var k = from > startK ? from : startK; for (; k <= cur; k = addW(k, 1)) { if (!have[p.id + '|' + k]) ins.push({ instructor_id: p.id, week_start: k, plan: p.plan, expected: p.fee, amount_paid: 0, status: 'unpaid' }); } });
      for (var i = 0; i < ins.length; i += 100) { var r = await SB().from('instructor_weekly_fees').insert(ins.slice(i, i + 100)); if (r.error && !/duplicate|23505|unique/i.test(r.error.message || '')) { toast('Could not create weekly fees: ' + r.error.message, 'error', 6000); break; } }
      if (ins.length) await load();
    } finally { busy = false; }
  }
  function paidRows() { return ROWS.filter(function (r) { return r.status === 'paid' && (+r.amount_paid || 0) > 0; }).map(function (r) { return { d: new Date((r.paid_at || r.week_start) + 'T00:00:00'), amt: +r.amount_paid, kind: 'weekly', r: r }; }); }
  function outstandingTotal() { return ROWS.filter(function (r) { return r.status === 'unpaid'; }).reduce(function (a, r) { return a + (+r.expected || 0); }, 0); }

  function logFee(row, summary) { try { DSQLog.add(SB(), { area: 'weekly_fee', action: 'weekly_fee', summary: summary, role: 'admin', actor: 'Admin', instrId: row && row.instructor_id }); } catch (e) { } }
  async function upd(id, patch) { var r = await SB().from('instructor_weekly_fees').update(patch).eq('id', id); if (r.error) { toast('Not saved: ' + r.error.message, 'error', 5000); return false; } var row = ROWS.find(function (x) { return String(x.id) === String(id); }); if (row) Object.assign(row, patch); return true; }
  async function markPaid(id, ask) {
    var row = ROWS.find(function (x) { return String(x.id) === String(id); }); if (!row) return; var amt = +row.expected || 0;
    if (ask) { var v = prompt('Amount received from ' + nameOf(row.instructor_id) + ' for the week of ' + niceW(row.week_start) + ' (£)', amt.toFixed(2)); if (v === null) return; amt = parseFloat(v); if (isNaN(amt) || amt < 0) { toast('Enter an amount in pounds.', 'error'); return; } }
    if (await upd(id, { status: 'paid', amount_paid: amt, paid_at: ymd(new Date()) })) { logFee(row, 'Weekly fee ' + money(amt) + ' received from ' + nameOf(row.instructor_id) + ' (' + (row.plan || '') + ', week of ' + niceW(row.week_start) + ')'); toast('💷 ' + money(amt) + ' recorded from ' + nameOf(row.instructor_id), 'success', 2200); refresh(); }
  }
  async function undo(id) { if (!confirm('Mark this week as NOT paid?')) return; var row = ROWS.find(function (x) { return String(x.id) === String(id); }); if (await upd(id, { status: 'unpaid', amount_paid: 0, paid_at: null })) { logFee(row, 'Weekly fee payment undone for ' + nameOf(row && row.instructor_id) + ' (week of ' + niceW(row && row.week_start) + ')'); refresh(); } }
  async function waive(id) { var n = prompt('Reason for waiving this week (optional)', ''); if (n === null) return; var row = ROWS.find(function (x) { return String(x.id) === String(id); }); if (await upd(id, { status: 'waived', amount_paid: 0, paid_at: null, note: n })) { logFee(row, 'Weekly fee waived for ' + nameOf(row && row.instructor_id) + ' (week of ' + niceW(row && row.week_start) + ')' + (n ? ' — ' + n : '')); refresh(); } }
  async function markAll() {
    var k = weekK || wk(new Date()), list = ROWS.filter(function (r) { return r.week_start === k && r.status === 'unpaid'; }); if (!list.length) return;
    if (!confirm('Mark ' + list.length + ' unpaid fee' + (list.length === 1 ? '' : 's') + ' for the week of ' + niceW(k) + ' as paid in full (' + money(list.reduce(function (a, r) { return a + (+r.expected || 0); }, 0)) + ')?')) return;
    for (var i = 0; i < list.length; i++) await upd(list[i].id, { status: 'paid', amount_paid: +list[i].expected || 0, paid_at: ymd(new Date()) });
    toast('✅ All marked paid', 'success'); refresh();
  }
  async function setFrom(v) { CFGV.from = v || ''; try { await SB().from('growth_settings').upsert({ key: 'weekly_fees_cfg', value: CFGV, updated_at: new Date().toISOString() }, { onConflict: 'key' }); } catch (e) { } await ensure(); refresh(); }
  function go(n) { weekK = addW(weekK || wk(new Date()), n); if (weekK > wk(new Date())) weekK = wk(new Date()); render(); }
  async function refresh() { await load(); render(); try { if (window.renderAccounting) renderAccounting(); } catch (e) { } }


  /* ---------- package shortfall review (admin only) ---------- */
  var rowFor = function (id, k) { return ROWS.find(function (r) { return String(r.instructor_id) === String(id) && r.week_start === k; }); };
  var logShort = function (id, summary) { try { DSQLog.add(SB(), { area: 'package', action: 'package_discount', summary: summary, role: 'admin', actor: 'Admin', instrId: id }); } catch (e) { } };
  async function applyShort(id, k) {
    await DSQPkg.load(); var x = DSQPkg.shortfalls(k).find(function (y) { return String(y.id) === String(id); }); if (!x || !(x.discount > 0)) return;
    var own = rowFor(id, k), tgt = own && own.status === 'unpaid' ? own : rowFor(id, addW(k, 1)), note = 'Shortfall discount −' + money(x.discount) + ' (' + x.delivered + ' of ' + x.min + ' students, w/c ' + niceW(k) + ')';
    if (!tgt || tgt.status !== 'unpaid') { toast('There is no unpaid fee to take the discount off. Open Weekly fees for the next week first, or waive a week by hand.', 'warn', 6000); return; }
    var next = Math.max(0, (+tgt.expected || 0) - x.discount);
    if (!confirm(nameOf(id) + ': ' + x.delivered + ' of ' + x.min + ' students for the week of ' + niceW(k) + '.\n\nTake ' + money(x.discount) + ' off the fee for the week of ' + niceW(tgt.week_start) + ' (' + money(tgt.expected) + ' → ' + money(next) + ')?')) return;
    if (!(await upd(tgt.id, { expected: next, note: ((tgt.note ? tgt.note + ' · ' : '') + note).slice(0, 400) }))) return;
    await DSQPkg.setWeek(id, k, { applied: true, off: x.discount, rowId: tgt.id, rowWeek: tgt.week_start });
    logShort(id, note + ' for ' + nameOf(id) + ', taken off the fee for the week of ' + niceW(tgt.week_start)); toast('✅ ' + money(x.discount) + ' discount applied for ' + nameOf(id), 'success', 3000); refresh();
  }
  async function undoShort(id, k) {
    var w = (((DSQPkg._cfg() || {}).by || {})[id] || {}).wk; w = w && w[k]; if (!w || !w.applied) return; if (!confirm('Undo this discount and put the fee back?')) return;
    var tgt = ROWS.find(function (r) { return String(r.id) === String(w.rowId); });
    if (tgt && !(await upd(tgt.id, { expected: (+tgt.expected || 0) + (+w.off || 0), note: ((tgt.note || '').replace(/(^| · )Shortfall discount −[^·]*\(\d+ of \d+ students, w\/c [^)]*\)/, '') || null) }))) return;
    await DSQPkg.setWeek(id, k, { applied: null, off: null, rowId: null, rowWeek: null }); logShort(id, 'Shortfall discount undone for ' + nameOf(id) + ' (w/c ' + niceW(k) + ')'); refresh();
  }
  async function excuseShort(id, k) {
    var why = prompt('Why no discount for ' + nameOf(id) + ' this week? (e.g. on holiday, unavailable, turned students down)', ''); if (why === null) return; if (!why.trim()) { toast('Please add a short reason so there is a record.', 'warn'); return; }
    await DSQPkg.setWeek(id, k, { excused: true, why: why.trim() }); logShort(id, 'No shortfall discount for ' + nameOf(id) + ' (w/c ' + niceW(k) + '): ' + why.trim()); refresh();
  }
  async function unexcuseShort(id, k) { await DSQPkg.setWeek(id, k, { excused: null, why: null }); refresh(); }
  async function addStudents(id, k) {
    var cur = ((((DSQPkg._cfg() || {}).by || {})[id] || {}).wk || {})[k] || {}, v = prompt('Count extra students for ' + nameOf(id) + ' this week? These are students we sent who the instructor did not respond to (they still count as delivered). Enter a number; 0 clears it.', cur.adj || 0); if (v === null) return;
    var n = parseInt(v, 10); if (isNaN(n) || n < 0 || n > 20) { toast('Enter a number from 0 to 20.', 'error'); return; }
    await DSQPkg.setWeek(id, k, { adj: n || null }); logShort(id, 'Counted ' + n + ' extra student' + (n === 1 ? '' : 's') + ' for ' + nameOf(id) + ' (w/c ' + niceW(k) + ', sent but not followed up)'); refresh();
  }
  function shortCard(k, cur) {
    if (!window.DSQPkg || !DSQPkg._cfg() || k >= cur) return '';
    var list = DSQPkg.shortfalls(k); if (!list.length) return '';
    var open = list.filter(function (x) { return x.status === 'open'; }), btn = 'class="btn-s" style="font-size:.7rem;padding:3px 9px;';
    var chip = function (x) { return x.status === 'applied' ? '<span style="color:#16a34a;font-weight:800">✓ ' + money(x.discount) + ' discount applied</span>' : x.status === 'excused' ? '<span style="color:#94a3b8;font-weight:800">No discount — ' + E(x.why) + '</span>' : x.status === 'met' ? '<span style="color:#16a34a;font-weight:800">✓ Guarantee met</span>' : '<span style="color:#f59e0b;font-weight:800">Short by ' + (x.min - x.delivered) + ' → fee ' + money(x.due) + ' <span style="font-weight:600;color:var(--txt3)">(discount ' + money(x.discount) + ')</span></span>'; };
    return '<div style="background:var(--card-bg);border:1px solid ' + (open.length ? '#f59e0b' : 'var(--bdr)') + ';border-radius:14px;padding:14px 16px;margin-bottom:14px"><div style="font-weight:700;margin-bottom:2px">🎯 Package guarantees — week of ' + niceW(k) + (open.length ? ' <span style="background:#f59e0b;color:#1a1100;border-radius:99px;padding:1px 9px;font-size:.7rem">' + open.length + ' to review</span>' : '') + '</div>' +
      '<div style="font-size:.7rem;color:var(--txt4);margin-bottom:6px">Only you can see this. Students delivered = confirmed ✅ booked that week' + '. Fees never drop below £40.</div>' +
      list.map(function (x) {
        return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:7px 0;border-top:1px solid var(--bdr);font-size:.8rem"><span style="flex:1;min-width:150px"><b>' + E(x.name) + '</b> <span style="color:' + x.p.color + '">' + x.p.icon + ' ' + E(x.p.name) + ' ' + money(x.p.fee) + '</span><div style="font-size:.72rem;color:var(--txt3)">' + x.delivered + ' of ' + x.min + ' students' + (x.adj ? ' (incl. ' + x.adj + ' counted by you)' : '') + '</div></span><span>' + chip(x) + '</span>' +
          (x.status === 'open' ? '<button ' + btn + 'border-color:rgba(245,158,11,.6);color:#d97706" onclick="DSQFees.applyShort(\'' + x.id + '\',\'' + k + '\')">Apply ' + money(x.discount) + ' discount</button><button ' + btn + '" title="Students we sent who did not reply still count" onclick="DSQFees.addStudents(\'' + x.id + '\',\'' + k + '\')">+ students</button><button ' + btn + '" title="Holiday, unavailable, turned students down" onclick="DSQFees.excuseShort(\'' + x.id + '\',\'' + k + '\')">No discount…</button>' : '') +
          (x.status === 'applied' ? '<button ' + btn + '" onclick="DSQFees.undoShort(\'' + x.id + '\',\'' + k + '\')">Undo</button>' : '') + (x.status === 'excused' ? '<button ' + btn + '" onclick="DSQFees.unexcuseShort(\'' + x.id + '\',\'' + k + '\')">Undo</button>' : '') + '</div>'; }).join('') + '</div>';
  }


  /* fill in the missing completed weeks from the start date (history). asPaid = they were already collected. */
  async function backfill(id, asPaid, start) {
    if (missing) return 0; await load(); var list = await plans(), pl = list.find(function (p) { return String(p.id) === String(id); }); if (!pl) { toast('This instructor has no franchise fee or package fee set.', 'warn', 5000); return 0; }
    var cur = wk(new Date()), have = {}; ROWS.forEach(function (r) { if (String(r.instructor_id) === String(id)) have[r.week_start] = 1; });
    var ins = []; for (var k = wk(start + 'T12:00:00'); k < cur; k = addW(k, 1)) if (!have[k]) ins.push({ instructor_id: id, week_start: k, plan: pl.plan, expected: pl.fee, amount_paid: asPaid ? pl.fee : 0, status: asPaid ? 'paid' : 'unpaid', paid_at: asPaid ? ymd(new Date(new Date(k + 'T12:00:00').getTime() + 6 * 864e5)) : null, note: 'Recorded from start date (history)' });
    for (var i = 0; i < ins.length; i += 100) { var r = await SB().from('instructor_weekly_fees').insert(ins.slice(i, i + 100)); if (r.error) { toast('Could not record history: ' + r.error.message, 'error', 6000); return 0; } }
    if (ins.length) { logFee({ instructor_id: id }, 'History filled in for ' + nameOf(id) + ': ' + ins.length + ' week(s) from ' + niceW(wk(start + 'T12:00:00')) + ' recorded as ' + (asPaid ? 'paid' : 'unpaid')); await load(); try { if (window.renderAccounting) renderAccounting(); } catch (e) { } }
    return ins.length;
  }

  function render() {
    var el = document.getElementById('accFeesBody'); if (!el) return;
    if (!loaded) { el.innerHTML = '<div style="padding:14px;color:var(--txt4)">Loading…</div>'; load().then(function () { return ensure(); }).then(render); return; }
    if (missing) { el.innerHTML = '<div style="padding:16px;border:1px solid #f59e0b;border-radius:12px;font-size:.82rem;line-height:1.6"><b>One-time setup:</b> weekly fees need a database table. Run <code>supabase/migrations/20261124_weekly_fees.sql</code> in Supabase → SQL Editor, then reopen this tab.</div>'; return; }
    var cur = wk(new Date()); weekK = weekK || cur;
    var paid = ROWS.filter(function (r) { return r.status === 'paid'; }), unpaid = ROWS.filter(function (r) { return r.status === 'unpaid'; });
    var thisW = ROWS.filter(function (r) { return r.week_start === cur && r.status !== 'waived'; }), sum = function (l, f) { return l.reduce(function (a, r) { return a + (+r[f] || 0); }, 0); };
    var monthStart = new Date(); monthStart = ymd(new Date(monthStart.getFullYear(), monthStart.getMonth(), 1));
    var collMonth = paid.filter(function (r) { return (r.paid_at || r.week_start) >= monthStart; });
    var card = function (l, v, c, sub) { return '<div style="flex:1;min-width:150px;background:var(--card-bg);border:1px solid var(--bdr);border-radius:12px;padding:10px 12px"><small style="color:var(--txt3)">' + l + '</small><div style="font-family:\'Oswald\',sans-serif;font-size:1.3rem;font-weight:700;color:' + (c || 'inherit') + '">' + v + '</div>' + (sub ? '<div style="font-size:.66rem;color:var(--txt4)">' + sub + '</div>' : '') + '</div>'; };
    // group by plan + amount
    var groups = {}; ROWS.forEach(function (r) { if (r.status === 'waived') return; var key = (r.plan || 'Plan') + '|' + (+r.expected || 0); var g = groups[key] = groups[key] || { plan: r.plan || 'Plan', fee: +r.expected || 0, ins: {}, paid: 0, due: 0, weeks: 0 }; g.ins[r.instructor_id] = 1; g.weeks++; if (r.status === 'paid') g.paid += +r.amount_paid || 0; else g.due += +r.expected || 0; });
    var gl = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.fee - a.fee; });
    var weekRows = ROWS.filter(function (r) { return r.week_start === weekK; }).sort(function (a, b) { return nameOf(a.instructor_id).localeCompare(nameOf(b.instructor_id)); });
    var chip = function (r) { return r.status === 'paid' ? '<span style="background:rgba(34,197,94,.18);color:#16a34a;border-radius:99px;padding:2px 9px;font-size:.68rem;font-weight:800">✓ Paid ' + money(r.amount_paid) + (r.paid_at ? ' · ' + niceW(r.paid_at) : '') + '</span>' : r.status === 'waived' ? '<span style="background:rgba(148,163,184,.2);color:#94a3b8;border-radius:99px;padding:2px 9px;font-size:.68rem;font-weight:800">Waived</span>' : '<span style="background:rgba(245,158,11,.18);color:#d97706;border-radius:99px;padding:2px 9px;font-size:.68rem;font-weight:800">⏳ Unpaid</span>'; };
    var late = unpaid.filter(function (r) { return r.week_start < cur; }).sort(function (a, b) { return a.week_start < b.week_start ? -1 : 1; });
    el.innerHTML = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.05rem;font-weight:700">💼 Franchise &amp; package income</div>' +
      '<label style="margin-left:auto;font-size:.74rem;color:var(--txt3);display:flex;gap:6px;align-items:center">Track fees from <input type="date" class="dsq-inp" id="feesFrom" value="' + E(CFGV.from || cur) + '" style="width:auto;padding:4px 8px;font-size:.78rem" onchange="DSQFees.setFrom(this.value)"></label></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' + card('Due this week', money(sum(thisW, 'expected')), '', thisW.length + ' instructors') + card('Collected this week', money(sum(thisW.filter(function (r) { return r.status === 'paid'; }), 'amount_paid')), '#16a34a') + card('Still to collect this week', money(sum(thisW.filter(function (r) { return r.status === 'unpaid'; }), 'expected')), '#d97706') +
      card('Overdue (earlier weeks)', money(sum(late, 'expected')), late.length ? '#ef4444' : 'inherit', late.length + ' week-fees') + card('Collected this month', money(sum(collMonth, 'amount_paid')), '', 'counts as income') + '</div>' +
      '<div style="background:var(--card-bg);border:1px solid var(--bdr);border-radius:14px;padding:14px 16px;margin-bottom:14px"><div style="font-weight:700;margin-bottom:6px">📦 By package / amount</div>' +
      (gl.length ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem"><thead><tr style="color:var(--txt3);text-align:left"><th style="padding:5px">Package</th><th style="padding:5px;text-align:right">£ / week</th><th style="padding:5px;text-align:right">Instructors</th><th style="padding:5px;text-align:right">Collected</th><th style="padding:5px;text-align:right">Outstanding</th></tr></thead><tbody>' +
        gl.map(function (g) { return '<tr style="border-top:1px solid var(--bdr)"><td style="padding:6px 5px;font-weight:700">' + E(g.plan) + '</td><td style="padding:6px 5px;text-align:right">' + money(g.fee) + '</td><td style="padding:6px 5px;text-align:right">' + Object.keys(g.ins).length + '</td><td style="padding:6px 5px;text-align:right;color:#16a34a;font-weight:700">' + money(g.paid) + '</td><td style="padding:6px 5px;text-align:right;color:' + (g.due ? '#d97706' : 'var(--txt4)') + ';font-weight:700">' + (g.due ? money(g.due) : '—') + '</td></tr>'; }).join('') +
        '<tr style="border-top:2px solid var(--bdr);font-weight:800"><td style="padding:6px 5px" colspan="3">Total</td><td style="padding:6px 5px;text-align:right;color:#16a34a">' + money(gl.reduce(function (a, g) { return a + g.paid; }, 0)) + '</td><td style="padding:6px 5px;text-align:right;color:#d97706">' + money(gl.reduce(function (a, g) { return a + g.due; }, 0)) + '</td></tr></tbody></table></div>' : '<div style="color:var(--txt3);font-size:.8rem">No franchise or package instructors yet. Set a franchise model or a package on an instructor\'s profile.</div>') + '</div>' +
      '<div style="background:var(--card-bg);border:1px solid var(--bdr);border-radius:14px;padding:14px 16px;margin-bottom:14px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><b>Week of ' + niceW(weekK) + (weekK === cur ? ' <span style="color:var(--gold);font-size:.72rem">(this week)</span>' : '') + '</b><button class="btn-s" style="font-size:.72rem;padding:3px 10px" onclick="DSQFees.go(-1)">‹ Earlier</button><button class="btn-s" style="font-size:.72rem;padding:3px 10px" onclick="DSQFees.go(1)"' + (weekK >= cur ? ' disabled' : '') + '>Later ›</button>' +
      '<button class="btn-s" style="margin-left:auto;font-size:.74rem;border-color:rgba(34,197,94,.5);color:#16a34a" onclick="DSQFees.markAll()">✓ Mark all paid</button></div>' +
      (weekRows.length ? weekRows.map(function (r) { return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:7px 0;border-top:1px solid var(--bdr);font-size:.8rem"><span style="flex:1;min-width:140px"><b>' + E(nameOf(r.instructor_id)) + '</b> <span style="color:var(--txt4)">' + E(r.plan || '') + '</span>' + (r.note ? '<div style="font-size:.7rem;color:var(--txt4)">' + E(r.note) + '</div>' : '') + '</span><span style="min-width:60px;text-align:right">' + money(r.expected) + '</span>' + chip(r) +
        (r.status === 'unpaid' ? '<button class="btn-s" style="font-size:.7rem;padding:3px 10px;border-color:rgba(34,197,94,.5);color:#16a34a" onclick="DSQFees.markPaid(\'' + r.id + '\')">Paid</button><button class="btn-s" style="font-size:.7rem;padding:3px 8px" title="Paid a different amount" onclick="DSQFees.markPaid(\'' + r.id + '\',true)">£…</button><button class="btn-s" style="font-size:.7rem;padding:3px 8px" title="Waive this week" onclick="DSQFees.waive(\'' + r.id + '\')">Waive</button>' : '<button class="btn-s" style="font-size:.7rem;padding:3px 8px" onclick="DSQFees.undo(\'' + r.id + '\')">↺</button>') + '</div>'; }).join('') : '<div style="color:var(--txt3);font-size:.8rem;padding:8px 0">No fees recorded for this week.</div>') + '</div>' +
      shortCard(weekK < cur ? weekK : addW(cur, -1), cur) +
      (late.length ? '<div style="background:var(--card-bg);border:1px solid #ef444466;border-radius:14px;padding:14px 16px;margin-bottom:14px"><b style="color:#ef4444">⚠️ Overdue from earlier weeks (' + late.length + ')</b>' + late.slice(0, 15).map(function (r) { return '<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--bdr);font-size:.78rem"><span style="flex:1"><b>' + E(nameOf(r.instructor_id)) + '</b> <span style="color:var(--txt4)">' + E(r.plan || '') + ' · week of ' + niceW(r.week_start) + '</span></span><span>' + money(r.expected) + '</span><button class="btn-s" style="font-size:.7rem;padding:3px 10px;border-color:rgba(34,197,94,.5);color:#16a34a" onclick="DSQFees.markPaid(\'' + r.id + '\')">Paid</button></div>'; }).join('') + (late.length > 15 ? '<div style="font-size:.72rem;color:var(--txt4);padding-top:6px">…and ' + (late.length - 15) + ' more</div>' : '') + '</div>' : '') +
      '<div style="font-size:.7rem;color:var(--txt4);line-height:1.5">Each week, every franchise instructor and every instructor on a package gets a fee line (package fee if they have one, otherwise their franchise fee). When you mark it paid it is counted as income in Accounting on the day you paid it. Change "Track fees from" to include earlier weeks.</div>';
  }
  async function open() { if (!loaded) await load(); render(); await ensure(); render(); }   // draw at once, then create any missing weekly lines and redraw
  window.DSQFees = { backfill: backfill, applyShort: applyShort, undoShort: undoShort, excuseShort: excuseShort, unexcuseShort: unexcuseShort, addStudents: addStudents, open: open, load: load, ensure: ensure, render: render, paidRows: paidRows, outstandingTotal: outstandingTotal, markPaid: markPaid, undo: undo, waive: waive, markAll: markAll, setFrom: setFrom, go: go, _rows: function () { return ROWS; }, plans: plans };
})();
