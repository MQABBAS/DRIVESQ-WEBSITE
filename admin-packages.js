/* DriveSQ instructor packages (admin).
   Silver / Gold / Platinum weekly packages with a guaranteed number of BOOKED jobs a week.
   - Settings live in growth_settings key "packages" (copy kept in this browser too)
   - A "booked job" = a referral the admin has confirmed ✅ booked, counted in the week the student was referred to the instructor
   - Platinum gets first priority in Find & Assign for students within 5 miles
   - A safety check compares what you promise with how many bookings you really get each week */
(function () {
  'use strict';
  var DEF = { tiers: {
      normal: { name: 'Normal', icon: '🚗', color: '#60a5fa', fee: 45, min: 0, target: 0, noGuarantee: true, feeMin: 40, feeMax: 50 },
      silver: { name: 'Silver', icon: '🥈', color: '#94a3b8', fee: 60, min: 3, target: 5, rule: 'A' },
      gold: { name: 'Gold', icon: '🥇', color: '#f59e0b', fee: 80, min: 5, target: 5, rule: 'B' },
      platinum: { name: 'Platinum', icon: '🏆', color: '#a78bfa', fee: 100, min: 7, target: 7, priority: true, radius: 5, rule: 'B' } },
    by: {}, share: 0.6, floor: 40 };
  var CFG = null, E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (v) { v = +v || 0; return '£' + (Math.abs(v - Math.round(v)) < .005 ? Math.round(v) : v.toFixed(2)); };
  var toast = function (m, t, ms) { try { window.showToast(m, t || '', ms); } catch (e) { } };
  var refs = function () { return (window.DSQ_ADMIN && DSQ_ADMIN.refs()) || []; };
  var instrs = function () { return (window.DSQ_ADMIN && DSQ_ADMIN.instrs()) || []; };
  var SB = function () { return window.DSQ_ADMIN ? DSQ_ADMIN.sb() : window.sb; };
  var booked = function (r) { try { return !r.is_cancelled && !r.is_credit && window._refAdminBooked(r); } catch (e) { return false; } };

  async function load(force) {
    if (CFG && !force) return CFG;
    var base = JSON.parse(JSON.stringify(DEF)), got = null;
    try { var r = await SB().from('growth_settings').select('value').eq('key', 'packages').maybeSingle(); if (r && r.data && r.data.value) got = r.data.value; } catch (e) { }
    if (!got) { try { got = JSON.parse(localStorage.getItem('dsq_packages') || 'null'); } catch (e) { } }
    var defTiers = JSON.parse(JSON.stringify(DEF.tiers)); CFG = Object.assign(base, got || {}); CFG.tiers = Object.assign({}, defTiers, (got && got.tiers) || {});   // new tiers added later always exist even in older saved settings CFG.by = (got && got.by) || {};
    return CFG;
  }
  async function save() {
    try { localStorage.setItem('dsq_packages', JSON.stringify(CFG)); } catch (e) { }
    try { var r = await SB().from('growth_settings').upsert({ key: 'packages', value: CFG, updated_at: new Date().toISOString() }, { onConflict: 'key' }); if (r.error) throw r.error; return true; }
    catch (e) { toast('Saved on this device only — run the growth tools SQL (20261110_growth_tools_core.sql) so it is stored for everyone.', 'warn', 7000); return false; }
  }
  var pkgOf = function (id) { var p = CFG && CFG.by[id]; if (!p || !p.tier || p.active === false || !CFG.tiers[p.tier]) return null; var t = CFG.tiers[p.tier]; return { tier: p.tier, name: t.name, icon: t.icon, color: t.color, fee: p.fee != null && p.fee !== '' ? +p.fee : t.fee, min: t.noGuarantee ? 0 : (p.min != null && p.min !== '' ? +p.min : t.min), target: t.target || t.min, noGuarantee: !!t.noGuarantee, priority: !!t.priority, radius: t.radius || 5, start: p.start || '' }; };
  var wkKey = function (d) { var m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0') + '-' + String(m.getDate()).padStart(2, '0'); };
  var addWeeks = function (k, n) { var d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + 7 * n); return wkKey(d); };
  function firstFullWeek(startDay) { var k = wkKey(startDay + 'T12:00:00'); return k === startDay ? k : addWeeks(k, 1); }
  function jobsInWeek(instrId, k) { return refs().filter(function (r) { return String(r.instructor_id) === String(instrId) && booked(r) && wkKey(r.created_at) === k; }).length; }
  /* weeks of a package: this week (in progress) + the previous N completed weeks, never before the package start */
  /* shortfall discount (admin only): the fee for a week when fewer students than guaranteed were delivered.
     Never below the floor (£40). Rule B (Gold, Platinum): only the part of the fee above the floor shrinks, in proportion.
     Rule A (Silver): the whole fee shrinks in proportion, never below the floor. Result is rounded DOWN to the nearest £5 so the numbers stay simple. */
  function feeFor(p, delivered) {
    if (!p || !p.min || delivered >= p.min) return p ? p.fee : 0;
    var fl = CFG && CFG.floor != null ? +CFG.floor : 40, fee = p.fee, d = Math.max(0, delivered); if (fee <= fl) return fee;
    var rule = (CFG.tiers[p.tier] || {}).rule || 'B', raw = rule === 'A' ? Math.max(fl, fee * d / p.min) : fl + (fee - fl) * d / p.min;
    return Math.min(fee, Math.max(fl, Math.floor(raw / 5 + 1e-9) * 5));
  }
  var wkNote = function (id, k) { var b = CFG && CFG.by[id]; return (b && b.wk && b.wk[k]) || {}; };
  function weeks(instrId, n) {
    var p = pkgOf(instrId); if (!p) return []; var cur = wkKey(new Date()), out = [], startK = p.start ? firstFullWeek(p.start) : '0000';   // a package starting mid-week is only measured from the next Monday
    for (var i = 0; i <= n; i++) {
      var k = addWeeks(cur, -i); if (k < startK) break; var w = wkNote(instrId, k), raw = jobsInWeek(instrId, k), j = raw + (+w.adj || 0), done = i > 0 && p.min;
      var sf = !done ? 0 : Math.max(0, p.min - j), due = done ? feeFor(p, j) : p.fee, excused = !!w.excused, cr = !done || excused ? 0 : Math.round((p.fee - due) * 100) / 100;
      out.push({ k: k, jobs: j, raw: raw, adj: +w.adj || 0, min: p.min, current: i === 0, short: sf, due: excused ? p.fee : due, credit: cr, excused: excused, why: w.why || '', applied: !!w.applied });
    }
    return out;
  }
  /* what the business actually delivers: confirmed-booked or paid referrals per full week, all instructors */
  function supply() {
    var cur = wkKey(new Date()), c = {}; refs().forEach(function (r) { if (r.is_cancelled || r.is_credit) return; if (booked(r) || r.is_paid) { var k = wkKey(r.created_at); c[k] = (c[k] || 0) + 1; } });
    var arr = []; for (var i = 1; i <= 8; i++) arr.push(c[addWeeks(cur, -i)] || 0);
    var s = arr.slice().sort(function (a, b) { return a - b; }), med = (s[3] + s[4]) / 2, avg = arr.reduce(function (a, b) { return a + b; }, 0) / 8;
    return { arr: arr, avg: Math.round(avg * 10) / 10, median: med, low: s[0] };
  }
  function committed(extra) { var t = 0; Object.keys(CFG.by).forEach(function (id) { var p = pkgOf(id); if (p) t += p.min; }); return t + (extra || 0); }
  function safety(extraMin) {
    var sp = supply(), c = committed(extraMin), base = sp.median, ratio = c ? base / c : Infinity, max = Math.floor(base * (CFG.share || .6));
    var lvl = !c ? 'none' : ratio >= 1 / (CFG.share || .6) ? 'safe' : ratio >= 1.25 ? 'tight' : 'over';
    var cfg = {}; try { cfg = JSON.parse(localStorage.getItem('dsqe_cc_cfg') || '{}'); } catch (e) { }
    var weekly = 7 * ((+cfg.g || 0) + (+cfg.ig || 0)), costPer = weekly && sp.avg ? weekly / sp.avg : null;
    return { supply: sp, committed: c, ratio: ratio, max: max, level: lvl, costPer: costPer, weeklySpend: weekly };
  }
  var LVL = { safe: ['#22c55e', '✅ Comfortable margin'], tight: ['#f59e0b', '⚠️ Tight — little room if a week is quiet'], over: ['#ef4444', '🚨 Over-committed — you promise more than you usually get'], none: ['#94a3b8', 'No packages yet'] };

  /* ---------- Find & Assign ---------- */
  function prioritise(ranked) {
    if (!CFG) return ranked; var top = [], rest = [];
    ranked.forEach(function (r) { var p = pkgOf(r.instr.id); if (p && p.priority && r.dist != null && r.dist <= p.radius) top.push(r); else rest.push(r); });
    return top.concat(rest);
  }
  function cardNote(r) {
    if (!CFG) return ''; var id = r.instr.id, p = pkgOf(id); if (!p) return '';
    var w = weeks(id, 0)[0] || { jobs: 0, min: p.min }, need = Math.max(0, p.min - w.jobs), pr = p.priority && r.dist != null && r.dist <= p.radius;
    if (!p.min) return '<div style="margin-top:4px"><span style="font-size:.66rem;font-weight:800;padding:2px 8px;border-radius:99px;background:' + p.color + '26;color:' + p.color + ';border:1px solid ' + p.color + '66">' + p.icon + ' ' + E(p.name) + '</span> <span style="font-size:.68rem;color:var(--txt3)">' + w.jobs + ' booked this week · no guarantee</span></div>';
    return '<div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-size:.66rem;font-weight:800;padding:2px 8px;border-radius:99px;background:' + p.color + '26;color:' + p.color + ';border:1px solid ' + p.color + '66">' + p.icon + ' ' + E(p.name) + '</span>' +
      '<span style="font-size:.68rem;font-weight:700;color:' + (need ? '#f59e0b' : '#4ade80') + '">' + w.jobs + ' of ' + p.min + ' guaranteed jobs booked this week' + (need ? ' · needs ' + need + ' more' : ' ✓') + '</span>' + (pr ? '<span style="font-size:.66rem;font-weight:800;color:' + p.color + '">⭐ priority (within ' + p.radius + ' miles)</span>' : '') + '</div>';
  }

  /* ---------- the Package block in the instructor edit window ---------- */
  async function fill(instr) {
    await load(); var host = document.getElementById('edit-frfee-wrap'); if (!host) return;
    var box = document.getElementById('edit-pkg-box');
    if (!box) { box = document.createElement('div'); box.id = 'edit-pkg-box'; box.className = 'col-12'; host.parentNode.insertBefore(box, host.nextSibling); }
    var p = CFG.by[instr.id] || {}, T = CFG.tiers;
    box.innerHTML = '<div style="border:1px solid var(--bdr);border-radius:12px;padding:12px;background:var(--dk3)"><div style="font-family:\'Oswald\',sans-serif;font-weight:700;margin-bottom:6px">📦 Package <span style="font-weight:400;font-size:.72rem;color:var(--txt4)">(weekly plan with guaranteed booked jobs)</span></div>' +
      '<div class="row g-2"><div class="col-12 col-sm-4"><label class="dsq-lbl">Package</label><select class="dsq-inp" id="edit-pkg"><option value="">No package</option>' + Object.keys(T).map(function (k) { return '<option value="' + k + '"' + (p.tier === k ? ' selected' : '') + '>' + T[k].icon + ' ' + T[k].name + ' — ' + (T[k].noGuarantee ? '£' + T[k].feeMin + '–£' + T[k].feeMax + '/wk · no guarantee' : money(T[k].fee) + '/wk · ' + T[k].min + '+ jobs') + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-6 col-sm-2"><label class="dsq-lbl">£ / week</label><input type="number" min="0" step="1" class="dsq-inp" id="edit-pkg-fee" value="' + E(p.fee != null ? p.fee : '') + '" placeholder="default"></div>' +
      '<div class="col-6 col-sm-2"><label class="dsq-lbl">Min jobs</label><input type="number" min="1" step="1" class="dsq-inp" id="edit-pkg-min" value="' + E(p.min != null ? p.min : '') + '" placeholder="default"></div>' +
      '<div class="col-6 col-sm-3"><label class="dsq-lbl">Starts</label><input type="date" class="dsq-inp" id="edit-pkg-start" value="' + E(p.start || '') + '"></div>' +
      '<div class="col-6 col-sm-1 d-flex align-items-end"><label style="font-size:.72rem;display:flex;gap:4px;align-items:center"><input type="checkbox" id="edit-pkg-on"' + (p.active === false ? '' : ' checked') + '>On</label></div>' +
      '<div class="col-6 col-sm-4"><label class="dsq-lbl">Franchise / package began <span style="font-weight:400;color:var(--txt4)">(start of full history)</span></label><input type="date" class="dsq-inp" id="edit-fr-start" value="' + E((CFG.frStart && CFG.frStart[instr.id]) || '') + '"></div>' +
      '<div class="col-12"><label class="dsq-lbl">Note about this change <span style="font-weight:400;color:var(--txt4)">(optional, saved in the package history)</span></label><input class="dsq-inp" id="edit-pkg-note" placeholder="e.g. Moved up to Gold from 1 Dec at the instructor\'s request"></div>' +
      '<div class="col-12"><label style="font-size:.76rem;display:flex;gap:6px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="edit-pkg-show"' + (p.showProgress === false ? '' : ' checked') + ' style="margin-top:2px"><span><b>Show the instructor their weekly progress</b><br><span style="color:var(--txt4)">Untick to show only the package name on their home screen (no progress bar or job counts).</span></span></label></div>' +
      '<div class="col-12"><label style="font-size:.76rem;display:flex;gap:6px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="edit-pkg-disc"' + (p.showDiscount === true ? ' checked' : '') + ' style="margin-top:2px"><span><b>Let this instructor see the shortfall discounts you apply to their fee</b><br><span style="color:var(--txt4)">Off by default. Discounts and the discount history are always visible to you only, until you tick this.</span></span></label></div></div>' +
      '<div id="edit-pkg-safe" style="font-size:.74rem;margin-top:8px"></div></div>';
    var upd = function () {
      var t = document.getElementById('edit-pkg').value, el = document.getElementById('edit-pkg-safe'); if (!t) { el.innerHTML = ''; return; }
      var mi = document.getElementById('edit-pkg-min'); mi.disabled = !!T[t].noGuarantee; if (T[t].noGuarantee) mi.value = '';
      var fee = parseFloat(document.getElementById('edit-pkg-fee').value); fee = isNaN(fee) ? T[t].fee : fee;
      if (T[t].noGuarantee) { el.innerHTML = '<span style="color:#22c55e;font-weight:700">✅ No guaranteed jobs, so no extra commitment.</span>' + (fee < T[t].feeMin || fee > T[t].feeMax ? ' <span style="color:#f59e0b">The usual fee is £' + T[t].feeMin + '–£' + T[t].feeMax + ' a week.</span>' : ''); return; }
      var minV = parseInt(mi.value, 10) || T[t].min, had = pkgOf(instr.id), s = safety(minV - (had ? had.min : 0)), L = LVL[s.level];
      el.innerHTML = '<span style="color:' + L[0] + ';font-weight:700">' + L[1] + '</span> — with this package you would promise <b>' + s.committed + '</b> booked jobs a week; you typically get <b>' + s.supply.median + '</b> (lowest recent week ' + s.supply.low + '). Recommended maximum: <b>' + s.max + '</b>.<br><span style="color:var(--txt4)">This package earns ' + money(fee / minV) + ' per guaranteed job' + (s.costPer ? ' · your ads cost about ' + money(s.costPer) + ' per booked student' : '') + '.</span>';
    };
    ['edit-pkg', 'edit-pkg-fee', 'edit-pkg-min'].forEach(function (id) { document.getElementById(id).oninput = upd; document.getElementById(id).onchange = upd; }); upd();
  }
  async function saveFromModal(id) {
    var sel = document.getElementById('edit-pkg'); if (!sel) return; await load();
    var fsEl = document.getElementById('edit-fr-start'); if (fsEl) { var fv = fsEl.value || ''; if (((CFG.frStart || {})[id] || '') !== fv) await setFrStart(id, fv); }
    var prev = CFG.by[id] || null, note = ((document.getElementById('edit-pkg-note') || {}).value || '').trim(), keep = (prev && prev.history) || [];
    var desc = function (p) { if (!p || !p.tier) return 'No package'; var t = CFG.tiers[p.tier] || { name: p.tier, fee: 0 }; return t.name + ' ' + money(p.fee != null && p.fee !== '' ? p.fee : t.fee) + '/wk' + (p.active === false ? ' (paused)' : ''); };
    if (!sel.value) { if (CFG.by[id]) { var ent0 = { at: new Date().toISOString(), from: desc(prev), to: 'No package', note: note, by: 'Admin' }; CFG.removed = CFG.removed || {}; CFG.removed[id] = (keep.concat([ent0])).slice(-50); delete CFG.by[id]; await save(); logChange(id, ent0); } return; }
    var fee = document.getElementById('edit-pkg-fee').value.trim(), min = document.getElementById('edit-pkg-min').value.trim(), start = document.getElementById('edit-pkg-start').value;
    CFG.by[id] = { tier: sel.value, fee: fee === '' ? null : Math.max(0, +fee), min: CFG.tiers[sel.value].noGuarantee || min === '' ? null : Math.max(1, parseInt(min, 10)), start: start || new Date().toISOString().slice(0, 10), active: document.getElementById('edit-pkg-on').checked, showProgress: document.getElementById('edit-pkg-show').checked, showDiscount: !!(document.getElementById('edit-pkg-disc') || {}).checked, wk: (prev && prev.wk) || (CFG.removed && CFG.removed[id] ? undefined : undefined) };
    if (!CFG.by[id].wk) delete CFG.by[id].wk;
    var ent = { at: new Date().toISOString(), from: desc(prev || (CFG.removed && CFG.removed[id] ? { tier: '' } : null)), to: desc(CFG.by[id]), note: note, by: 'Admin' };
    var hist = keep.length ? keep : ((CFG.removed && CFG.removed[id]) || []); if (CFG.removed) delete CFG.removed[id];
    if (!prev || ent.from !== ent.to || note) { hist = hist.concat([ent]).slice(-50); logChange(id, ent); }
    CFG.by[id].history = hist; await save();
  }
  function logChange(id, ent) { try { var ins = instrs().find(function (i) { return String(i.id) === String(id); }) || {}; DSQLog.add(SB(), { area: 'package', action: 'package_changed', summary: 'Package for ' + (ins.full_name || 'instructor') + ': ' + ent.from + ' → ' + ent.to + (ent.note ? ' — ' + ent.note : ''), role: 'admin', actor: 'Admin', instrId: id, before: { package: ent.from }, after: { package: ent.to } }); } catch (e) { } }
  /* weekly discount history for one instructor — shown on the admin instructor profile only */
  function discountHistoryHtml(id) {
    var b = CFG && CFG.by[id], wk = (b && b.wk) || {}, ks = Object.keys(wk).filter(function (k) { var w = wk[k]; return w.applied || w.excused || w.adj; }).sort().reverse();
    var nice = function (k) { return new Date(k + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }); };
    var tot = ks.reduce(function (a, k) { return a + (wk[k].applied ? (+wk[k].off || 0) : 0); }, 0);
    return '<div style="margin:8px 0 4px;font-size:.74rem;font-weight:800">🎯 Shortfall discounts <span style="font-weight:600;color:var(--txt4)">(only you can see this' + (b && b.showDiscount ? ' — currently <span style="color:#f59e0b">also shown to the instructor</span>' : '') + ')</span>' + (tot ? ' · total ' + money(tot) : '') + '</div>' +
      (ks.length ? ks.map(function (k) { var w = wk[k]; return '<div style="display:flex;gap:8px;padding:4px 0;border-top:1px solid var(--bdr);font-size:.74rem"><span style="min-width:88px;color:var(--txt4)">w/c ' + nice(k) + '</span><span style="flex:1">' + (w.applied ? '<b style="color:#16a34a">' + money(w.off) + ' discount applied</b>' : '') + (w.excused ? 'No discount — ' + E(w.why || '') : '') + (w.adj ? ' · ' + w.adj + ' extra student' + (w.adj === 1 ? '' : 's') + ' counted' : '') + '</span></div>'; }).join('') : '<div style="font-size:.74rem;color:var(--txt4)">No discounts or adjustments yet.</div>');
  }
  function historyHtml(id) {
    if (!CFG) return ''; var h = ((CFG.by[id] && CFG.by[id].history) || (CFG.removed && CFG.removed[id]) || []).slice().reverse(), p = pkgOf(id);
    return (p ? '<div style="font-size:.78rem;margin-bottom:4px">Now: <b style="color:' + p.color + '">' + p.icon + ' ' + E(p.name) + '</b> · ' + money(p.fee) + '/wk' + (p.start ? ' · since ' + new Date(p.start + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + '</div>' : '<div style="font-size:.78rem;color:var(--txt3);margin-bottom:4px">No package now.</div>') +
      (h.length ? h.map(function (x) { return '<div style="display:flex;gap:8px;padding:4px 0;border-top:1px solid var(--bdr);font-size:.74rem"><span style="min-width:88px;color:var(--txt4)">' + new Date(x.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) + '</span><span style="flex:1">' + E(x.from) + ' → <b>' + E(x.to) + '</b>' + (x.note ? ' <span style="color:var(--txt4)">— ' + E(x.note) + '</span>' : '') + '</span></div>'; }).join('') : '<div style="font-size:.72rem;color:var(--txt4)">No changes recorded yet. Every package switch you save is recorded here.</div>') + discountHistoryHtml(id);
  }

  /* ---------- the Packages overview ---------- */
  async function openOverview() {
    await load(); var m = document.getElementById('pkgOv'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'pkgOv'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99998;display:flex;align-items:center;justify-content:center;padding:14px';
    m.onclick = function (e) { if (e.target === m) m.remove(); }; document.body.appendChild(m);
    var ids = Object.keys(CFG.by).filter(function (id) { return CFG.by[id].tier; }), s = safety(0), L = LVL[s.level], T = CFG.tiers;
    var rows = ids.map(function (id) {
      var p = pkgOf(id) || { name: CFG.tiers[CFG.by[id].tier].name, icon: CFG.tiers[CFG.by[id].tier].icon, color: '#64748b', fee: 0, min: 0, paused: true }, ins = instrs().find(function (i) { return String(i.id) === String(id); }) || {}, w = weeks(id, 4), cur = w[0] || { jobs: 0 }, last = w[1], cr = w.reduce(function (a, x) { return a + x.credit; }, 0), pct = p.min ? Math.min(100, Math.round(cur.jobs / p.min * 100)) : 0;
      return '<tr style="border-top:1px solid var(--bdr)"><td style="padding:8px 6px;font-weight:700">' + E(ins.full_name || '—') + (p.paused ? ' <span style="font-size:.6rem;color:var(--txt4)">(paused)</span>' : '') + '</td><td style="padding:8px 6px"><span style="font-weight:800;color:' + p.color + '">' + p.icon + ' ' + E(p.name) + '</span></td><td style="padding:8px 6px;text-align:right">' + money(p.fee) + '</td>' +
        (p.min ? '<td style="padding:8px 6px;min-width:140px"><div style="font-weight:700">' + cur.jobs + ' / ' + p.min + '</div><div style="height:6px;border-radius:4px;background:rgba(128,128,128,.25);margin-top:3px;overflow:hidden"><i style="display:block;height:100%;width:' + pct + '%;background:' + (cur.jobs >= p.min ? '#22c55e' : '#f59e0b') + '"></i></div></td>' : '<td style="padding:8px 6px;color:var(--txt3)">' + cur.jobs + ' booked <span style="font-size:.68rem">(no guarantee)</span></td>') +
        '<td style="padding:8px 6px;text-align:right">' + (last ? last.jobs + (p.min ? ' / ' + last.min : '') : '—') + '</td><td style="padding:8px 6px;text-align:right;font-weight:700;color:' + (cr ? '#f59e0b' : 'var(--txt4)') + '">' + (cr ? money(cr) : '—') + '</td><td style="padding:8px 6px"><button class="btn-s" style="font-size:.68rem;padding:3px 9px" onclick="document.getElementById(\'pkgOv\').remove();viewInstr(\'' + id + '\')">Open</button></td></tr>';
    }).join('');
    var rev = ids.reduce(function (a, id) { var p = pkgOf(id); return a + (p ? p.fee : 0); }, 0), tot = ids.reduce(function (a, id) { return a + weeks(id, 4).reduce(function (x, w) { return x + w.credit; }, 0); }, 0);
    m.innerHTML = '<div style="background:var(--dk2);border:1px solid var(--bdr);border-radius:16px;width:100%;max-width:960px;max-height:92vh;overflow:auto;padding:18px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.2rem;font-weight:700">📦 Instructor packages</div><span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn-s" onclick="DSQPkg.copyPolicy()">📋 Copy terms for WhatsApp</button><a class="btn-s" href="/instructor-package-terms.html" target="_blank" rel="noopener" style="text-decoration:none">📄 Terms page</a><button class="btn-s" onclick="document.getElementById(\'pkgOv\').remove()">Close</button></span></div>' +
      '<div style="border:1px solid ' + L[0] + ';background:' + L[0] + '14;border-radius:12px;padding:12px 14px;margin-bottom:12px"><div style="font-weight:800;color:' + L[0] + '">' + L[1] + '</div>' +
      '<div style="font-size:.8rem;margin-top:4px;line-height:1.6">You promise <b>' + s.committed + '</b> booked jobs a week across all packages. In the last 8 full weeks you got <b>' + s.supply.arr.join(', ') + '</b> confirmed or paid bookings (typical week <b>' + s.supply.median + '</b>, lowest <b>' + s.supply.low + '</b>). To stay safe, promise no more than about <b>' + s.max + '</b> jobs a week (' + Math.round((CFG.share || .6) * 100) + '% of a typical week) — that leaves room for quiet weeks.' +
      (s.costPer ? '<br>Your ads cost roughly <b>' + money(s.costPer) + '</b> per booked student (' + money(s.weeklySpend) + ' a week ÷ ' + s.supply.avg + ' bookings), against package income of ' + Object.keys(T).filter(function (k) { return T[k].min; }).map(function (k) { return T[k].name + ' ' + money(T[k].fee / T[k].min) + '/job'; }).join(', ') + '. Normal (£' + T.normal.feeMin + '–£' + T.normal.feeMax + ') has no guarantee, so it carries no risk.' : '') + '</div></div>' +
      '<label style="display:flex;gap:6px;align-items:center;font-size:.76rem;margin:0 0 10px;cursor:pointer"><input type="checkbox" id="pkgShowLabel"' + (CFG.showLabel === false ? '' : ' checked') + ' onchange="DSQPkg.setShowLabel(this.checked)"> Show a small “Referral” / “Franchise” label on the home screen of instructors who have no package</label>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px"><div style="flex:1;min-width:150px;background:var(--card-bg);border:1px solid var(--bdr);border-radius:12px;padding:10px 12px"><small style="color:var(--txt3)">Weekly package income</small><div style="font-family:\'Oswald\',sans-serif;font-size:1.3rem;font-weight:700">' + money(rev) + '</div></div><div style="flex:1;min-width:150px;background:var(--card-bg);border:1px solid var(--bdr);border-radius:12px;padding:10px 12px"><small style="color:var(--txt3)">Shortfall credit owed (last 4 weeks)</small><div style="font-family:\'Oswald\',sans-serif;font-size:1.3rem;font-weight:700;color:' + (tot ? '#f59e0b' : 'inherit') + '">' + money(tot) + '</div></div></div>' +
      (rows ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem"><thead><tr style="color:var(--txt3);text-align:left"><th style="padding:6px">Instructor</th><th style="padding:6px">Package</th><th style="padding:6px;text-align:right">£/wk</th><th style="padding:6px">This week booked</th><th style="padding:6px;text-align:right">Last week</th><th style="padding:6px;text-align:right">Credit owed</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div style="padding:16px;color:var(--txt3)">No instructor is on a package yet. Open an instructor → Edit → Package.</div>') +
      '<div style="font-size:.72rem;color:var(--txt4);margin-top:10px;line-height:1.5">A <b>booked job</b> is a student you have confirmed ✅ booked with that instructor, counted in the week they were referred. <b>Credit owed</b> = the discount under your package terms (never below the £40 floor) for each completed week since the package started. Platinum instructors are offered first for students within 5 miles in Find &amp; Assign.</div></div>';
  }
  function detailHtml(id) {
    var p = pkgOf(id); if (!p) return ''; var w = weeks(id, 4), cur = w[0] || { jobs: 0 }, cr = w.reduce(function (a, x) { return a + x.credit; }, 0), need = Math.max(0, p.min - cur.jobs);
    if (!p.min) return '<span style="font-weight:800;color:' + p.color + '">' + p.icon + ' ' + E(p.name) + '</span> · <b>' + money(p.fee) + '</b> per week · no guaranteed jobs<br><span style="font-size:.76rem;color:var(--txt3)">This week: ' + cur.jobs + ' booked</span>';
    return '<span style="font-weight:800;color:' + p.color + '">' + p.icon + ' ' + E(p.name) + '</span> · <b>' + money(p.fee) + '</b> per week · guaranteed <b>' + p.min + '</b> booked jobs' + (p.priority ? ' · ⭐ priority within ' + p.radius + ' miles' : '') +
      '<br><span style="font-size:.7rem;color:var(--txt4)">' + (CFG.by[id] && CFG.by[id].showProgress === false ? '🙈 Instructor sees only the package name' : '👁 Instructor sees weekly progress') + '</span><br><span style="font-size:.76rem;color:' + (need ? '#f59e0b' : '#4ade80') + '">This week: ' + cur.jobs + ' of ' + p.min + ' booked' + (need ? ' (' + need + ' to go)' : ' ✓') + '</span>' + (cr ? ' <span style="font-size:.76rem;color:#f59e0b">· credit owed ' + money(cr) + '</span>' : '');
  }

  /* ---------- start date + terms agreement (admin only) ---------- */
  var TERMS_V = '1';
  function startOf(id) {   // when this instructor's franchise / package began — the start of their full history
    var fs = (CFG && CFG.frStart && CFG.frStart[id]) || '', ps = (CFG && CFG.by[id] && CFG.by[id].start) || '', ins = instrs().find(function (i) { return String(i.id) === String(id); }) || {};
    return fs || ps || String(ins.created_at || '').slice(0, 10) || '';
  }
  var hasFrStart = function (id) { return !!(CFG && CFG.frStart && CFG.frStart[id]); };
  var termsOf = function (id) { return (CFG && CFG.terms && CFG.terms[id]) || null; };
  async function setTerms(id, on, via, when) {
    await load(); CFG.terms = CFG.terms || {}; var ins = instrs().find(function (i) { return String(i.id) === String(id); }) || {};
    if (on) CFG.terms[id] = { at: when || new Date().toISOString().slice(0, 10), v: TERMS_V, via: via || 'WhatsApp reply' }; else delete CFG.terms[id];
    var ok = await save(); try { DSQLog.add(SB(), { area: 'package', action: 'terms', summary: (on ? 'Package terms v' + TERMS_V + ' agreed by ' : 'Package terms agreement removed for ') + (ins.full_name || 'instructor') + (on ? ' (' + CFG.terms[id].via + ', ' + CFG.terms[id].at + ')' : ''), role: 'admin', actor: 'Admin', instrId: id }); } catch (e) { }
    return ok;
  }
  async function sendTermsWhatsApp(id) {
    await load(); var ins = instrs().find(function (i) { return String(i.id) === String(id); }) || {}, t = policyText(ins.full_name), ph = String(ins.phone || '').replace(/\D/g, ''); ph = ph.startsWith('0') ? '44' + ph.slice(1) : ph;
    try { await navigator.clipboard.writeText(t); } catch (e) { }
    if (ph) window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(t), '_blank'); else toast('📋 Terms copied — this instructor has no phone number, paste it into WhatsApp by hand.', 'warn', 5000);
  }
  async function setFrStart(id, date) { await load(); CFG.frStart = CFG.frStart || {}; if (date) CFG.frStart[id] = date; else delete CFG.frStart[id]; return save(); }

  /* ---------- weekly shortfall review (admin only — instructors never see discounts) ---------- */
  var lastWeekKey = function () { return addWeeks(wkKey(new Date()), -1); };
  /* every package instructor with a guarantee, for one completed week */
  function shortfalls(k) {
    if (!CFG) return []; k = k || lastWeekKey(); var out = [];
    Object.keys(CFG.by).forEach(function (id) {
      var p = pkgOf(id); if (!p || !p.min) return; var w = weeks(id, 12).filter(function (x) { return x.k === k && !x.current; })[0]; if (!w) return;
      var ins = instrs().find(function (i) { return String(i.id) === String(id); }) || {};
      out.push({ id: id, name: ins.full_name || 'Instructor', p: p, k: k, delivered: w.jobs, raw: w.raw, adj: w.adj, min: p.min, due: w.due, discount: Math.round((p.fee - feeFor(p, w.jobs)) * 100) / 100, excused: w.excused, why: w.why, applied: w.applied, status: w.excused ? 'excused' : w.applied ? 'applied' : (w.jobs >= p.min ? 'met' : 'open') });
    });
    return out.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  async function setWeek(id, k, patch) {
    await load(); var b = CFG.by[id]; if (!b) return false; b.wk = b.wk || {}; b.wk[k] = Object.assign({}, b.wk[k] || {}, patch);
    Object.keys(b.wk[k]).forEach(function (f) { if (b.wk[k][f] === null) delete b.wk[k][f]; }); return save();
  }
  /* alert: one toast per day while there are completed weeks with an unreviewed shortfall, plus a small button */
  async function checkShortfalls(quiet) {
    try {
      await load(); var k = lastWeekKey(), open = shortfalls(k).filter(function (x) { return x.status === 'open'; });
      var btn = document.getElementById('pkgShortBtn');
      if (!open.length) { if (btn) btn.remove(); return open; }
      if (!btn) { btn = document.createElement('button'); btn.id = 'pkgShortBtn'; btn.type = 'button'; btn.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9990;background:#b45309;color:#fff;border:0;border-radius:99px;padding:9px 15px;font-weight:800;font-size:.78rem;box-shadow:0 8px 22px rgba(0,0,0,.35);cursor:pointer'; btn.onclick = function () { try { window.switchTab('expenses'); setTimeout(function () { window.setAccTab('fees'); }, 150); } catch (e) { } }; document.body.appendChild(btn); }
      btn.textContent = '🎯 ' + open.length + ' package shortfall' + (open.length === 1 ? '' : 's') + ' to review';
      var day = new Date().toISOString().slice(0, 10), seen = ''; try { seen = localStorage.getItem('dsq_pkg_short_alert') || ''; } catch (e) { }
      if (!quiet && seen !== day + k) { try { localStorage.setItem('dsq_pkg_short_alert', day + k); } catch (e) { } toast('🎯 ' + open.length + ' instructor' + (open.length === 1 ? '' : 's') + ' missed their guaranteed students last week — review the discounts in Accounting → Weekly fees', 'warn', 12000); }
      return open;
    } catch (e) { return []; }
  }
  (function waitThenCheck() { var n = 0, t = setInterval(function () { n++; if (n > 40) return clearInterval(t); try { if (window.DSQ_ADMIN && DSQ_ADMIN.refs().length && DSQ_ADMIN.instrs().length) { clearInterval(t); checkShortfalls(); } } catch (e) { } }, 1500); })();

  /* the WhatsApp version of the package terms, for the admin to copy */
  function policyText(name) {
    var T = (CFG && CFG.tiers) || DEF.tiers, fl = (CFG && CFG.floor != null) ? +CFG.floor : 40;
    var tbl = function (t) { var p = { tier: t, fee: T[t].fee, min: T[t].min }, o = []; for (var d = p.min; d >= 0; d--) o.push((d === p.min ? d + ' students' : d) + ': ' + money(feeFor(p, d))); return o.join('\n'); };
    var silver = 'Silver (' + money(T.silver.fee) + ', ' + T.silver.min + ' students)\n' + T.silver.min + ' students: ' + money(T.silver.fee) + '\nLess than that: ' + money(fl);
    return '*DriveSQ Instructor Packages: how it works* 🚗\n\nHi ' + (name ? String(name).split(' ')[0] : '[name]') + ', here are our package terms so everything is clear from day one.\n\n*The packages*\n🏆 *Platinum:* ' + money(T.platinum.fee) + '/week, ' + T.platinum.min + ' students guaranteed, priority for new students\n🥇 *Gold:* ' + money(T.gold.fee) + '/week, ' + T.gold.min + ' students guaranteed\n🥈 *Silver:* ' + money(T.silver.fee) + '/week, ' + T.silver.min + ' students guaranteed (we aim for ' + T.silver.target + ')\n🚗 *Normal:* £40–£50/week, no guarantee\n\n' +
      '*How a week works*\n• A week is Monday to Sunday\n• We start counting on the first full Monday after your package starts\n• A student counts once, in the week we send them to you\n\n*What counts as a delivered student*\n✅ They book a first lesson with you, or\n✅ We sent them to you and you didn\'t contact them within 24 hours, or didn\'t follow up after they replied\n\n' +
      '*If we don\'t send enough students*\nYour fee for that week goes down. It never goes below *' + money(fl) + '*.\n\n*Platinum (' + money(T.platinum.fee) + ', ' + T.platinum.min + ' students)*\n' + tbl('platinum') + '\n\n*Gold (' + money(T.gold.fee) + ', ' + T.gold.min + ' students)*\n' + tbl('gold') + '\n\n*' + silver + '*\n\n' +
      '*No discount if*\n• You told us you were unavailable or on holiday that week\n• You turned a student down, or didn\'t reply to them\n• Your account was suspended\n\nThe discount comes off that week\'s fee or your next one. It is never paid as cash.\n\n*Reviews and cancelling*\nWe review packages monthly. You can cancel your package at any time, but if you do you may not be able to rejoin unless we approve it.\n\nFull terms (version 1): https://www.drivesq.co.uk/instructor-package-terms.html\n\n*To agree, please reply: I AGREE* ✅\nWe keep a record of your reply.\n\nThanks for being part of DriveSQ! 🙌';
  }
  async function copyPolicy() { await load(); var t = policyText(); try { await navigator.clipboard.writeText(t); toast('📋 Package terms copied — paste into WhatsApp', 'success', 3000); } catch (e) { window.prompt('Copy this message:', t); } }
  window.addEventListener('load', function () { var o = window._frFeeSave; if (typeof o === 'function' && !o.__pkg) { var w = async function (id) { await o.apply(this, arguments); try { await saveFromModal(id); } catch (e) { } }; w.__pkg = 1; window._frFeeSave = w; } });
  async function setShowLabel(on) { await load(); CFG.showLabel = !!on; await save(); toast(on ? 'Referral / Franchise label is shown to instructors' : 'Label hidden', 'success', 2200); }
  window.DSQPkg = { startOf: startOf, hasFrStart: hasFrStart, termsOf: termsOf, setTerms: setTerms, sendTermsWhatsApp: sendTermsWhatsApp, setFrStart: setFrStart, TERMS_V: TERMS_V, feeFor: feeFor, shortfalls: shortfalls, setWeek: setWeek, checkShortfalls: checkShortfalls, policyText: policyText, copyPolicy: copyPolicy, lastWeekKey: lastWeekKey, save: save, historyHtml: historyHtml, setShowLabel: setShowLabel, detailHtml: detailHtml, load: load, fill: fill, saveFromModal: saveFromModal, openOverview: openOverview, prioritise: prioritise, cardNote: cardNote, pkgOf: pkgOf, weeks: weeks, safety: safety, supply: supply, _cfg: function () { return CFG; } };
})();
