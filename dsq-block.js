/* DriveSQ block bookings — instructor side (dashboard.html).
   A block = hours the student paid for up front (e.g. 10 hours £330). Each lesson done takes hours off it.
   Instructors can add a block, tick hours done, edit amounts and see the full history. Every change is written to
   student_credit_history and reported to admin ("Block booking edited by instructor").
   Admin controls visibility (student_credit_settings.show_to_instructor / show_on_portal). The admin-only private note
   and what DriveSQ pays the instructor are never read here. */
(function () {
  'use strict';
  var C = { sb: null, instr: null, toast: null, roster: null, report: null }, S = { rows: [], hist: [], sets: {}, loaded: false, missing: false, busy: false };
  var $ = function (id) { return document.getElementById(id); };
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (v) { v = +v || 0; return (v < 0 ? '−' : '') + '£' + Math.abs(v).toFixed(2).replace(/\.00$/, ''); };
  var hrs = function (v) { v = Math.round((+v || 0) * 100) / 100; return (Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')) + 'h'; };
  var today = function () { return new Date().toISOString().slice(0, 10); };
  var nameKey = function (n) { return String(n || '').trim().toLowerCase(); };
  var toast = function (m, t, ms) { try { (C.toast || window.showToast)(m, t || '', ms); } catch (e) { } };
  var who = function () { return (C.instr && (C.instr.full_name || C.instr.name)) || 'Instructor'; };

  function init(o) { C.sb = o.sb; C.instr = o.instr; C.toast = o.toast; C.roster = o.roster; C.report = o.report; }

  /* ---------- data ---------- */
  function rosterList() { try { return (C.roster && C.roster()) || []; } catch (e) { return []; } }
  function stuKey(st) { return st.accId || (st.profId ? 'p:' + st.profId : 'n:' + nameKey(st.name)); }
  function matches(row, st) {
    if (st.accId && row.student_account_id && String(row.student_account_id) === String(st.accId)) return true;
    if (st.profId && row.student_profile_id && String(row.student_profile_id) === String(st.profId)) return true;
    return !!row.student_name && nameKey(row.student_name) === nameKey(st.name) && !(row.student_account_id && st.accId && String(row.student_account_id) !== String(st.accId));
  }
  function setOf(st) { var a = S.sets[st.accId || ''], b = S.sets['p:' + st.profId]; return a || b || null; }
  function canSee(st) { var s = setOf(st); return !s || s.show_to_instructor !== false; }
  function sumOf(rows) {
    rows = rows.slice().sort(function (a, b) { return String(a.entry_date || a.created_at).localeCompare(String(b.entry_date || b.created_at)) || String(a.created_at).localeCompare(String(b.created_at)); });
    var bh = 0, bm = 0, uh = 0, um = 0, th = 0, tm = 0;
    rows.forEach(function (r) { var h = +r.hours || 0, m = +r.amount || 0; th += h; tm += m; if (r.kind === 'purchase' && h > 0) { bh += h; bm += m; } else if (h < 0) { uh += -h; um += -m; } });
    return { rows: rows, boughtH: bh, paid: bm, usedH: uh, usedM: um, leftH: Math.round(th * 100) / 100, leftM: Math.round(tm * 100) / 100, rate: bh > 0 ? bm / bh : 35, any: rows.length > 0 };
  }
  async function load() {
    S.missing = false;
    try {
      var ids = rosterList().map(function (s) { return s.profId; }).filter(Boolean);
      var a = await C.sb.from('student_credit_ledger').select('id,student_account_id,student_profile_id,student_name,instructor_id,kind,hours,amount,method,reference,public_note,entry_date,created_at,created_by_role,created_by_name,edited_by_role,edited_by_name,edited_at').eq('instructor_id', C.instr.id).order('created_at', { ascending: true });
      if (a.error) throw a.error;
      var rows = a.data || [];
      if (ids.length) { var b = await C.sb.from('student_credit_ledger').select('id,student_account_id,student_profile_id,student_name,instructor_id,kind,hours,amount,method,reference,public_note,entry_date,created_at,created_by_role,created_by_name,edited_by_role,edited_by_name,edited_at').in('student_profile_id', ids); if (!b.error) { var have = {}; rows.forEach(function (r) { have[r.id] = 1; }); (b.data || []).forEach(function (r) { if (!have[r.id]) rows.push(r); }); } }
      S.rows = rows;
      var st = await C.sb.from('student_credit_settings').select('*'); S.sets = {}; (st.data || []).forEach(function (x) { S.sets[x.student_key] = x; });
      var h = await C.sb.from('student_credit_history').select('*').eq('instructor_id', C.instr.id).order('created_at', { ascending: false }).limit(400); S.hist = h.data || [];
    } catch (e) { var m = String((e && e.message) || e); S.missing = /does not exist|relation|schema cache|column|student_credit/i.test(m); S.err = m; }
    S.loaded = true;
  }
  function studentsWithBlocks() {
    var out = [], seen = {};
    rosterList().forEach(function (st) {
      var rows = S.rows.filter(function (r) { return matches(r, st); });
      if (!rows.length || !canSee(st)) return;
      var k = stuKey(st); if (seen[k]) return; seen[k] = 1;
      out.push(Object.assign({}, st, { sum: sumOf(rows) }));
    });
    out.sort(function (a, b) { return (a.sum.leftH <= 0 ? 1 : 0) - (b.sum.leftH <= 0 ? 1 : 0) || a.sum.leftH - b.sum.leftH; });
    return out;
  }

  /* ---------- writes (every one logged + reported to admin) ---------- */
  async function log(st, action, summary, before, after, ledgerId) {
    var row = { ledger_id: ledgerId || null, student_key: stuKey(st), student_account_id: st.accId || null, student_profile_id: st.profId || null, student_name: st.name, instructor_id: C.instr.id, action: action, actor_role: 'instructor', actor_name: who(), summary: summary, before: before || null, after: after || null };
    try { await C.sb.from('student_credit_history').insert(row); S.hist.unshift(Object.assign({ created_at: new Date().toISOString() }, row)); } catch (e) { }
    try { if (C.report) C.report('block_booking', '📦 Block booking edited by instructor: ' + st.name, who() + ' ' + summary + '\nStudent: ' + st.name, '📦 Block booking edited'); } catch (e) { }
  }
  async function ensureSetting(st) {
    var k = st.accId || 'p:' + st.profId;
    if (S.sets[k] || S.sets['p:' + st.profId]) return;
    var row = { student_key: k, student_name: st.name, instructor_id: C.instr.id, show_to_instructor: true, show_on_portal: false, updated_at: new Date().toISOString() };
    try { await C.sb.from('student_credit_settings').insert(row); S.sets[k] = row; } catch (e) { }
  }
  function baseRow(st) { return { student_account_id: st.accId || null, student_profile_id: st.profId || null, student_name: st.name, instructor_id: C.instr.id, created_by_role: 'instructor', created_by_name: who() }; }
  async function addBlock(st, f) {
    var h = parseFloat(f.hours) || 0, m = parseFloat(f.amount) || 0;
    if (h <= 0 || m <= 0) { toast('Enter the hours and the amount the student paid.', 'error'); return false; }
    var row = Object.assign(baseRow(st), { kind: 'purchase', hours: h, amount: m, method: f.method || null, reference: (f.reference || '').trim() || null, public_note: (f.note || '').trim() || null, entry_date: f.date || today() });
    var r = await C.sb.from('student_credit_ledger').insert(row).select().maybeSingle();
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 6000); return false; }
    var saved = r.data || row; S.rows.push(saved);
    await ensureSetting(st);
    await log(st, 'added', 'added a block for ' + st.name + ': ' + hrs(h) + ' · ' + money(m), null, { hours: h, amount: m }, saved.id);
    toast('✅ Block added: ' + hrs(h) + ' · ' + money(m), 'success'); return true;
  }
  async function useHours(st, h, note, date) {
    h = parseFloat(h) || 0; if (h <= 0) { toast('Enter the hours done.', 'error'); return false; }
    var sum = sumOf(S.rows.filter(function (r) { return matches(r, st); }));
    if (h > sum.leftH + 0.001 && !confirm('That is more than the ' + hrs(sum.leftH) + ' left on the block. Record it anyway?')) return false;
    var row = Object.assign(baseRow(st), { kind: 'lesson', hours: -h, amount: -Math.round(h * sum.rate * 100) / 100, public_note: (note || '').trim() || null, entry_date: date || today() });
    var r = await C.sb.from('student_credit_ledger').insert(row).select().maybeSingle();
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 6000); return false; }
    var saved = r.data || row; S.rows.push(saved);
    var left = Math.round((sum.leftH - h) * 100) / 100;
    await log(st, 'used', 'ticked off ' + hrs(h) + ' for ' + st.name + ' (' + hrs(left) + ' left)', null, { hours: -h, left: left }, saved.id);
    toast('✅ ' + hrs(h) + ' ticked off · ' + hrs(left) + ' left', 'success'); return true;
  }
  async function editEntry(row, st, f) {
    var sign = row.kind === 'purchase' ? 1 : -1, h = parseFloat(f.hours) || 0, m = parseFloat(f.amount) || 0;
    if (h <= 0) { toast('Enter the hours.', 'error'); return false; }
    var patch = { hours: sign * h, amount: sign * m, method: f.method || row.method || null, reference: (f.reference || '').trim() || null, public_note: (f.note || '').trim() || null, entry_date: f.date || row.entry_date, edited_by_role: 'instructor', edited_by_name: who(), edited_at: new Date().toISOString() };
    var r = await C.sb.from('student_credit_ledger').update(patch).eq('id', row.id);
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 6000); return false; }
    var before = { hours: row.hours, amount: row.amount, date: row.entry_date, note: row.public_note }; Object.assign(row, patch);
    await log(st, 'edited', 'changed a ' + (row.kind === 'purchase' ? 'block' : 'lesson entry') + ' for ' + st.name + ': ' + hrs(Math.abs(before.hours)) + ' · ' + money(Math.abs(before.amount)) + ' → ' + hrs(h) + ' · ' + money(m), before, { hours: patch.hours, amount: patch.amount }, row.id);
    toast('Saved', 'success'); return true;
  }
  async function deleteEntry(row, st) {
    if (!confirm('Delete this entry? The student\'s hours left will change.')) return false;
    var r = await C.sb.from('student_credit_ledger').delete().eq('id', row.id);
    if (r.error) { toast('Not deleted: ' + r.error.message, 'error'); return false; }
    S.rows = S.rows.filter(function (x) { return x.id !== row.id; });
    await log(st, 'deleted', 'deleted a ' + (row.kind === 'purchase' ? 'block' : 'lesson entry') + ' for ' + st.name + ' (' + hrs(Math.abs(row.hours)) + ' · ' + money(Math.abs(row.amount)) + ')', { hours: row.hours, amount: row.amount }, null, row.id);
    return true;
  }

  /* ---------- UI ---------- */
  var CSS = '.dqb-card{background:var(--card-bg,#16161b);border:1px solid var(--bdr,#2a2a32);border-radius:16px;padding:16px;margin-bottom:12px}' +
    '.dqb-top{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.dqb-ring{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto}' +
    '.dqb-ring>div{width:66px;height:66px;border-radius:50%;background:var(--card-bg,#16161b);display:grid;place-items:center;text-align:center;line-height:1}' +
    '.dqb-ring b{font-family:Oswald,sans-serif;font-size:1.35rem}.dqb-ring small{display:block;font-size:.55rem;letter-spacing:.08em;text-transform:uppercase;color:var(--txt2,#9a9aa5);margin-top:2px}' +
    '.dqb-name{font-family:Oswald,sans-serif;font-size:1.02rem;font-weight:700;color:var(--txt,#fff)}.dqb-sub{font-size:.74rem;color:var(--txt2,#9a9aa5);margin-top:2px}' +
    '.dqb-bar{height:8px;border-radius:6px;background:rgba(128,128,128,.2);overflow:hidden;margin:12px 0 6px}.dqb-bar i{display:block;height:100%;border-radius:6px}' +
    '.dqb-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.dqb-stats div{flex:1;min-width:88px;background:rgba(128,128,128,.12);border-radius:10px;padding:8px 10px}' +
    '.dqb-stats small{display:block;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;color:var(--txt2,#9a9aa5)}.dqb-stats b{font-family:Oswald,sans-serif;font-size:1.05rem}' +
    '.dqb-btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.dqb-btn{border:1px solid var(--bdr,#2a2a32);background:rgba(128,128,128,.14);color:var(--txt,#fff);border-radius:10px;padding:8px 12px;font-size:.78rem;font-weight:700;cursor:pointer}' +
    '.dqb-btn.p{background:#d10a11;border-color:#d10a11;color:#fff}.dqb-btn.g{background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.45);color:#4ade80}.dqb-btn:disabled{opacity:.45}' +
    '.dqb-hist{margin-top:10px;font-size:.75rem}.dqb-hist>div{display:flex;gap:10px;padding:7px 0;border-top:1px solid var(--bdr,#2a2a32);align-items:flex-start}.dqb-hist .d{min-width:62px;color:var(--txt3,#6f6f7a);white-space:nowrap}' +
    '.dqb-tag{display:inline-block;font-size:.58rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:1px 6px;border-radius:99px;margin-left:5px;vertical-align:middle}' +
    '.dqb-ov{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:flex-end;justify-content:center;padding:0}.dqb-md{background:var(--card-bg,#16161b);border:1px solid var(--bdr,#2a2a32);border-radius:18px 18px 0 0;width:100%;max-width:520px;max-height:92vh;overflow:auto;padding:18px}' +
    '@media(min-width:600px){.dqb-ov{align-items:center}.dqb-md{border-radius:18px}}.dqb-f{display:block;margin-top:10px}.dqb-f span{display:block;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--txt2,#9a9aa5);margin-bottom:3px}' +
    '.dqb-f input,.dqb-f select{width:100%;background:var(--input-bg,#1d1d24);border:1px solid var(--bdr,#2a2a32);color:var(--txt,#fff);border-radius:9px;padding:9px 10px;font-size:.9rem}.dqb-row{display:flex;gap:8px}.dqb-row>*{flex:1}';
  function css() { if ($('dqbCss')) return; var s = document.createElement('style'); s.id = 'dqbCss'; s.textContent = CSS; document.head.appendChild(s); }
  function tone(left) { return left <= 0 ? ['#f87171', 'Block used up'] : left <= 2 ? ['#f59e0b', 'Running low'] : ['#4ade80', 'Hours left']; }
  function cardHTML(st, opts) {
    opts = opts || {}; var s = st.sum, t = tone(s.leftH), pct = s.boughtH > 0 ? Math.max(0, Math.min(100, Math.round(s.usedH / s.boughtH * 100))) : 0, deg = Math.round(pct * 3.6);
    var shown = (setOf(st) || {}).show_on_portal;
    return '<div class="dqb-card" data-k="' + E(stuKey(st)) + '"><div class="dqb-top"><div class="dqb-ring" style="background:conic-gradient(' + t[0] + ' ' + deg + 'deg,rgba(128,128,128,.22) 0)"><div><span><b style="color:' + t[0] + '">' + hrs(s.leftH).replace('h', '') + '</b><small>hrs left</small></span></div></div>' +
      '<div style="flex:1;min-width:150px"><div class="dqb-name">' + E(st.name) + '</div><div class="dqb-sub">' + hrs(s.boughtH) + ' block · ' + money(s.paid) + ' paid · ' + hrs(s.usedH) + ' done</div>' +
      '<div class="dqb-sub" style="color:' + t[0] + ';font-weight:700">' + t[1] + (shown ? '' : ' <span style="color:var(--txt3,#6f6f7a);font-weight:400">· student can\'t see it yet</span>') + '</div></div></div>' +
      '<div class="dqb-bar"><i style="width:' + pct + '%;background:' + t[0] + '"></i></div>' +
      '<div class="dqb-stats"><div><small>Paid</small><b>' + money(s.paid) + '</b></div><div><small>Hours done</small><b>' + hrs(s.usedH) + '</b></div><div><small>Hours left</small><b style="color:' + t[0] + '">' + hrs(s.leftH) + '</b></div><div><small>Credit left</small><b>' + money(s.leftM) + '</b></div></div>' +
      '<div class="dqb-btns"><button class="dqb-btn g" data-a="use" data-n="1">−1 hr done</button><button class="dqb-btn g" data-a="use" data-n="2">−2 hrs done</button><button class="dqb-btn" data-a="use" data-n="0">Other…</button><button class="dqb-btn" data-a="add">+ New block</button><button class="dqb-btn" data-a="hist">History</button></div></div>';
  }
  function histHTML(st) {
    var rows = sumOf(S.rows.filter(function (r) { return matches(r, st); })).rows, run = 0;
    var lines = rows.map(function (r) { run += +r.hours || 0; var d = new Date((r.entry_date || r.created_at) + (r.entry_date ? 'T12:00:00' : '')), isIn = (+r.hours || 0) > 0;
      var by = r.created_by_role === 'instructor' ? 'added by you' : 'added by DriveSQ', ed = r.edited_at ? ' · edited by ' + E(r.edited_by_role === 'admin' ? 'DriveSQ' : (r.edited_by_name || 'instructor')) : '';
      return '<div><span class="d">' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span><span style="flex:1"><b style="color:' + (isIn ? '#4ade80' : '#f59e0b') + '">' + (r.kind === 'purchase' ? 'Block' : 'Lesson done') + ' ' + (isIn ? '+' : '') + hrs(r.hours) + ' · ' + money(r.amount) + '</b>' + (r.public_note ? '<div style="color:var(--txt2,#9a9aa5)">' + E(r.public_note) + '</div>' : '') + '<div style="color:var(--txt3,#6f6f7a)">' + by + ed + '</div></span><span style="text-align:right;color:var(--txt2,#9a9aa5)">' + hrs(run) + '<br><button class="dqb-btn" style="padding:2px 8px;margin-top:4px;font-size:.68rem" data-a="edit" data-id="' + E(r.id) + '">Edit</button></span></div>'; }).join('');
    var h = S.hist.filter(function (x) { return x.student_key === stuKey(st) || x.student_profile_id === st.profId || (x.student_account_id && x.student_account_id === st.accId); });
    return '<div class="dqb-hist"><b>Entries</b>' + (lines || '<div style="color:var(--txt3,#6f6f7a)">None yet.</div>') + '</div><div class="dqb-hist" style="margin-top:14px"><b>Full change history</b>' + (h.length ? h.map(function (x) { return '<div><span class="d">' + new Date(x.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span><span style="flex:1">' + E((x.actor_role === 'admin' ? 'DriveSQ' : x.actor_name || x.actor_role) + ' ' + x.summary) + '</span></div>'; }).join('') : '<div style="color:var(--txt3,#6f6f7a)">No changes logged yet.</div>') + '</div>';
  }
  function modal(html, onReady) {
    css(); closeModal(); var o = document.createElement('div'); o.className = 'dqb-ov'; o.id = 'dqbOv'; o.innerHTML = '<div class="dqb-md">' + html + '</div>'; o.addEventListener('click', function (e) { if (e.target === o) closeModal(); }); document.body.appendChild(o); if (onReady) onReady(o);
  }
  function closeModal() { var o = $('dqbOv'); if (o) o.remove(); }
  var CTX = { host: null, st: null };
  function formHTML(title, f, extra) {
    return '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:Oswald,sans-serif;font-size:1.1rem;font-weight:700">' + title + '</div><button class="dqb-btn" data-x="close">✕</button></div>' + (extra || '') +
      '<div class="dqb-row"><label class="dqb-f"><span>Hours</span><input id="dqbH" type="number" step="0.5" min="0.5" value="' + E(f.hours) + '"></label>' + (f.noAmount ? '' : '<label class="dqb-f"><span>Amount £</span><input id="dqbA" type="number" step="0.01" min="0" value="' + E(f.amount) + '"></label>') + '<label class="dqb-f"><span>Date</span><input id="dqbD" type="date" value="' + E(f.date) + '"></label></div>' +
      (f.method === false ? '' : '<div class="dqb-row"><label class="dqb-f"><span>Paid via</span><select id="dqbM">' + [['bank_transfer', 'Bank transfer'], ['cash', 'Cash'], ['card', 'Card'], ['other', 'Other']].map(function (m) { return '<option value="' + m[0] + '"' + (f.method === m[0] ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') + '</select></label><label class="dqb-f"><span>Reference</span><input id="dqbR" value="' + E(f.reference || '') + '" placeholder="optional"></label></div>') +
      '<label class="dqb-f"><span>Comment (student and admin can see)</span><input id="dqbN" value="' + E(f.note || '') + '" placeholder="e.g. Lesson 3 — roundabouts"></label>' +
      '<div class="dqb-btns"><button class="dqb-btn p" data-x="save">Save</button><button class="dqb-btn" data-x="close">Cancel</button>' + (f.del ? '<button class="dqb-btn" style="margin-left:auto;color:#f87171" data-x="del">Delete</button>' : '') + '</div>';
  }
  function val() { var g = function (i) { var e = $(i); return e ? e.value : ''; }; return { hours: g('dqbH'), amount: g('dqbA'), date: g('dqbD'), method: g('dqbM'), reference: g('dqbR'), note: g('dqbN') }; }
  function openAdd(st) {
    modal(formHTML('New block for ' + E(st.name), { hours: 10, amount: 330, date: today(), method: 'bank_transfer' }), function (o) {
      o.addEventListener('click', async function (e) { var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'close') return closeModal(); if (b.dataset.x === 'save') { b.disabled = true; if (await addBlock(st, val())) { closeModal(); await refresh(); } else b.disabled = false; } });
    });
  }
  function openUse(st, n) {
    var quick = async function (h) { if (await useHours(st, h, '', today())) await refresh(); };
    if (n > 0) return quick(n);
    modal(formHTML('Hours done for ' + E(st.name), { hours: 1, date: today(), noAmount: true, method: false }), function (o) {
      o.addEventListener('click', async function (e) { var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'close') return closeModal(); if (b.dataset.x === 'save') { var v = val(); b.disabled = true; if (await useHours(st, v.hours, v.note, v.date)) { closeModal(); await refresh(); } else b.disabled = false; } });
    });
  }
  function openEdit(st, row) {
    modal(formHTML('Edit ' + (row.kind === 'purchase' ? 'block' : 'lesson entry'), { hours: Math.abs(row.hours), amount: Math.abs(row.amount), date: row.entry_date || today(), method: row.method || 'bank_transfer', reference: row.reference, note: row.public_note, del: true, noAmount: false, method_: 1 }), function (o) {
      o.addEventListener('click', async function (e) { var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'close') return closeModal(); if (b.dataset.x === 'del') { if (await deleteEntry(row, st)) { closeModal(); await refresh(); } return; } if (b.dataset.x === 'save') { b.disabled = true; if (await editEntry(row, st, val())) { closeModal(); await refresh(); } else b.disabled = false; } });
    });
  }
  function openHist(st) {
    var sum = sumOf(S.rows.filter(function (r) { return matches(r, st); }));
    modal('<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:Oswald,sans-serif;font-size:1.1rem;font-weight:700">' + E(st.name) + ' — history</div><button class="dqb-btn" data-x="close">✕</button></div>' + cardHTML(Object.assign({}, st, { sum: sum })) + histHTML(st), function (o) {
      o.addEventListener('click', function (e) { var b = e.target.closest('[data-x],[data-a]'); if (!b) return; if (b.dataset.x === 'close') return closeModal(); handle(b, st); });
    });
  }
  function handle(b, st) {
    var a = b.dataset.a; if (!a) return;
    if (a === 'use') return openUse(st, parseFloat(b.dataset.n) || 0);
    if (a === 'add') return openAdd(st);
    if (a === 'hist') return openHist(st);
    if (a === 'edit') { var row = S.rows.find(function (r) { return String(r.id) === b.dataset.id; }); if (row) openEdit(st, row); }
  }
  async function refresh() { await load(); if (CTX.host === 'tab') renderTab(); else if (CTX.host) renderStudent(CTX.host, CTX.st); }

  /* the student's own Block tab inside their profile */
  async function renderStudent(hostId, st) {
    css(); var host = $(hostId); if (!host) return; CTX.host = hostId; CTX.st = st;
    host.innerHTML = '<div style="padding:12px;color:var(--txt2,#9a9aa5);font-size:.8rem">Loading block booking…</div>';
    if (!S.loaded) await load();
    if (S.missing) { host.innerHTML = '<div class="dqb-card">Block bookings need a one-time database update by DriveSQ admin. Please let admin know.</div>'; return; }
    var rows = S.rows.filter(function (r) { return matches(r, st); });
    if (!canSee(st)) { host.innerHTML = '<div class="dqb-card"><div class="dqb-sub">Block bookings are switched off for this student by DriveSQ admin.</div></div>'; return; }
    if (!rows.length) { host.innerHTML = '<div class="dqb-card"><div class="dqb-name">No block booking yet</div><div class="dqb-sub">When ' + E(st.name.split(' ')[0]) + ' pays for a block of lessons (for example 10 hours, £330), add it here and tick hours off after each lesson.</div><div class="dqb-btns"><button class="dqb-btn p" data-a="add">+ Add block</button></div></div>'; }
    else host.innerHTML = cardHTML(Object.assign({}, st, { sum: sumOf(rows) })) + '<div class="dqb-card" style="padding:6px 14px">' + histHTML(st) + '</div>';
    host.onclick = function (e) { var b = e.target.closest('[data-a]'); if (b) handle(b, st); };
  }
  /* the "Blocks" tab: every student with a block, lowest hours first */
  async function renderTab() {
    css(); var host = $('dqbTabBody'); if (!host) return; CTX.host = 'tab'; CTX.st = null;
    if (!S.loaded) { host.innerHTML = '<div style="padding:16px;color:var(--txt2,#9a9aa5)">Loading…</div>'; await load(); }
    if (S.missing) { host.innerHTML = '<div class="dqb-card">Block bookings need a one-time database update by DriveSQ admin. Please let admin know.</div>'; return; }
    var list = studentsWithBlocks(), low = list.filter(function (s) { return s.sum.leftH <= 2; }).length, all = rosterList();
    var picker = '<select id="dqbPick" class="dqb-btn" style="max-width:100%"><option value="">+ New block for…</option>' + all.map(function (s) { return '<option value="' + E(s.name) + '">' + E(s.name) + '</option>'; }).join('') + '</select>';
    host.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' + picker + (low ? '<span class="dqb-tag" style="background:rgba(245,158,11,.18);color:#f59e0b;font-size:.7rem">' + low + ' running low</span>' : '') + '</div>' +
      (list.length ? list.map(function (s) { return cardHTML(s); }).join('') : '<div class="dqb-card"><div class="dqb-name">No block bookings yet</div><div class="dqb-sub">Choose a student above when they pay for a block (for example 10 hours, £330). You then tick hours off after each lesson, and the student can see their balance on their portal once DriveSQ switches it on.</div></div>');
    $('dqbPick').onchange = function () { var s = all.find(function (x) { return x.name === this.value; }.bind(this)); this.value = ''; if (s) openAdd(s); };
    host.onclick = function (e) { var b = e.target.closest('[data-a]'); if (!b) return; var k = b.closest('.dqb-card').getAttribute('data-k'), st = list.find(function (s) { return stuKey(s) === k; }); if (st) handle(b, st); };
  }
  function lowCount() { return studentsWithBlocks().filter(function (s) { return s.sum.leftH <= 2; }).length; }
  window.DSQBlock = { init: init, load: load, renderTab: renderTab, renderStudent: renderStudent, lowCount: lowCount, _S: S, _sum: sumOf, _addBlock: addBlock, _useHours: useHours };
})();
