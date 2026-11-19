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
      silver: { name: 'Silver', icon: '🥈', color: '#94a3b8', fee: 60, min: 3, target: 5 },
      gold: { name: 'Gold', icon: '🥇', color: '#f59e0b', fee: 80, min: 5, target: 5 },
      platinum: { name: 'Platinum', icon: '🏆', color: '#a78bfa', fee: 100, min: 7, target: 7, priority: true, radius: 5 } },
    by: {}, share: 0.6 };
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
    CFG = Object.assign(base, got || {}); CFG.tiers = Object.assign({}, base.tiers, (got && got.tiers) || {}); CFG.by = (got && got.by) || {};
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
  function weeks(instrId, n) {
    var p = pkgOf(instrId); if (!p) return []; var cur = wkKey(new Date()), out = [], startK = p.start ? firstFullWeek(p.start) : '0000';   // a package starting mid-week is only measured from the next Monday
    for (var i = 0; i <= n; i++) { var k = addWeeks(cur, -i); if (k < startK) break; var j = jobsInWeek(instrId, k), sf = i === 0 || !p.min ? 0 : Math.max(0, p.min - j); out.push({ k: k, jobs: j, min: p.min, current: i === 0, short: sf, credit: i === 0 || !p.min ? 0 : Math.round(p.fee * sf / p.min * 100) / 100 }); }
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
      '<div class="col-6 col-sm-1 d-flex align-items-end"><label style="font-size:.72rem;display:flex;gap:4px;align-items:center"><input type="checkbox" id="edit-pkg-on"' + (p.active === false ? '' : ' checked') + '>On</label></div></div>' +
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
    if (!sel.value) { if (CFG.by[id]) { delete CFG.by[id]; await save(); } return; }
    var fee = document.getElementById('edit-pkg-fee').value.trim(), min = document.getElementById('edit-pkg-min').value.trim(), start = document.getElementById('edit-pkg-start').value;
    CFG.by[id] = { tier: sel.value, fee: fee === '' ? null : Math.max(0, +fee), min: CFG.tiers[sel.value].noGuarantee || min === '' ? null : Math.max(1, parseInt(min, 10)), start: start || new Date().toISOString().slice(0, 10), active: document.getElementById('edit-pkg-on').checked };
    await save();
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
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.2rem;font-weight:700">📦 Instructor packages</div><button class="btn-s" onclick="document.getElementById(\'pkgOv\').remove()">Close</button></div>' +
      '<div style="border:1px solid ' + L[0] + ';background:' + L[0] + '14;border-radius:12px;padding:12px 14px;margin-bottom:12px"><div style="font-weight:800;color:' + L[0] + '">' + L[1] + '</div>' +
      '<div style="font-size:.8rem;margin-top:4px;line-height:1.6">You promise <b>' + s.committed + '</b> booked jobs a week across all packages. In the last 8 full weeks you got <b>' + s.supply.arr.join(', ') + '</b> confirmed or paid bookings (typical week <b>' + s.supply.median + '</b>, lowest <b>' + s.supply.low + '</b>). To stay safe, promise no more than about <b>' + s.max + '</b> jobs a week (' + Math.round((CFG.share || .6) * 100) + '% of a typical week) — that leaves room for quiet weeks.' +
      (s.costPer ? '<br>Your ads cost roughly <b>' + money(s.costPer) + '</b> per booked student (' + money(s.weeklySpend) + ' a week ÷ ' + s.supply.avg + ' bookings), against package income of ' + Object.keys(T).filter(function (k) { return T[k].min; }).map(function (k) { return T[k].name + ' ' + money(T[k].fee / T[k].min) + '/job'; }).join(', ') + '. Normal (£' + T.normal.feeMin + '–£' + T.normal.feeMax + ') has no guarantee, so it carries no risk.' : '') + '</div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px"><div style="flex:1;min-width:150px;background:var(--card-bg);border:1px solid var(--bdr);border-radius:12px;padding:10px 12px"><small style="color:var(--txt3)">Weekly package income</small><div style="font-family:\'Oswald\',sans-serif;font-size:1.3rem;font-weight:700">' + money(rev) + '</div></div><div style="flex:1;min-width:150px;background:var(--card-bg);border:1px solid var(--bdr);border-radius:12px;padding:10px 12px"><small style="color:var(--txt3)">Shortfall credit owed (last 4 weeks)</small><div style="font-family:\'Oswald\',sans-serif;font-size:1.3rem;font-weight:700;color:' + (tot ? '#f59e0b' : 'inherit') + '">' + money(tot) + '</div></div></div>' +
      (rows ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem"><thead><tr style="color:var(--txt3);text-align:left"><th style="padding:6px">Instructor</th><th style="padding:6px">Package</th><th style="padding:6px;text-align:right">£/wk</th><th style="padding:6px">This week booked</th><th style="padding:6px;text-align:right">Last week</th><th style="padding:6px;text-align:right">Credit owed</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div style="padding:16px;color:var(--txt3)">No instructor is on a package yet. Open an instructor → Edit → Package.</div>') +
      '<div style="font-size:.72rem;color:var(--txt4);margin-top:10px;line-height:1.5">A <b>booked job</b> is a student you have confirmed ✅ booked with that instructor, counted in the week they were referred. <b>Credit owed</b> = the package fee × the jobs short ÷ the minimum, for each completed week since the package started. Platinum instructors are offered first for students within 5 miles in Find &amp; Assign.</div></div>';
  }
  function detailHtml(id) {
    var p = pkgOf(id); if (!p) return ''; var w = weeks(id, 4), cur = w[0] || { jobs: 0 }, cr = w.reduce(function (a, x) { return a + x.credit; }, 0), need = Math.max(0, p.min - cur.jobs);
    if (!p.min) return '<span style="font-weight:800;color:' + p.color + '">' + p.icon + ' ' + E(p.name) + '</span> · <b>' + money(p.fee) + '</b> per week · no guaranteed jobs<br><span style="font-size:.76rem;color:var(--txt3)">This week: ' + cur.jobs + ' booked</span>';
    return '<span style="font-weight:800;color:' + p.color + '">' + p.icon + ' ' + E(p.name) + '</span> · <b>' + money(p.fee) + '</b> per week · guaranteed <b>' + p.min + '</b> booked jobs' + (p.priority ? ' · ⭐ priority within ' + p.radius + ' miles' : '') +
      '<br><span style="font-size:.76rem;color:' + (need ? '#f59e0b' : '#4ade80') + '">This week: ' + cur.jobs + ' of ' + p.min + ' booked' + (need ? ' (' + need + ' to go)' : ' ✓') + '</span>' + (cr ? ' <span style="font-size:.76rem;color:#f59e0b">· credit owed ' + money(cr) + '</span>' : '');
  }
  window.addEventListener('load', function () { var o = window._frFeeSave; if (typeof o === 'function' && !o.__pkg) { var w = async function (id) { await o.apply(this, arguments); try { await saveFromModal(id); } catch (e) { } }; w.__pkg = 1; window._frFeeSave = w; } });
  window.DSQPkg = { detailHtml: detailHtml, load: load, fill: fill, saveFromModal: saveFromModal, openOverview: openOverview, prioritise: prioritise, cardNote: cardNote, pkgOf: pkgOf, weeks: weeks, safety: safety, supply: supply, _cfg: function () { return CFG; } };
})();
