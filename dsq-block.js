/* DriveSQ block bookings (v2) — shared by the instructor dashboard, the student portal and admin.
   A block = hours a student paid for up front (e.g. 10 hours, £330). Lessons take hours off it.
   Accuracy rule: every lesson in the calendar after the block was bought is counted ONCE (a ledger row linked by lesson_id).
   - Added to the calendar  -> hours taken off automatically (instructor gets a "tap to edit / don't count" message)
   - Moved or changed       -> hours follow the lesson
   - Deleted from calendar  -> hours go back on the block
   - Ticked by hand on the same day/hours as a calendar lesson -> they are linked, never counted twice
   Every change is written to student_credit_history. Private admin notes and instructor pay are never read here. */
(function () {
  'use strict';
  var C = { sb: null, instr: null, toast: null, roster: null, report: null, sfx: null }, S = { rows: [], hist: [], sets: {}, loaded: false, missing: false, noSync: false, busy: false };
  var $ = function (id) { return document.getElementById(id); };
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (v) { v = +v || 0; return (v < 0 ? '−' : '') + '£' + Math.abs(v).toFixed(2).replace(/\.00$/, ''); };
  var hrs = function (v) { v = Math.round((+v || 0) * 100) / 100; return (Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')) + 'h'; };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var nameKey = function (n) { return String(n || '').trim().toLowerCase(); };
  var dnice = function (d) { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } };
  var toast = function (m, t, ms) { try { (C.toast || window.showToast)(m, t || '', ms); } catch (e) { } };
  var who = function () { return (C.instr && (C.instr.full_name || C.instr.name)) || 'Instructor'; };
  var snd = function (k) { try { if (C.sfx && C.sfx[k]) C.sfx[k](); else tone(k); } catch (e) { } };

  /* tiny built-in sounds for pages that don't have their own (student portal, admin) */
  var _ac = null;
  function tone(k) {
    try {
      if (localStorage.getItem('dsq_sound') === 'off') return;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; _ac = _ac || new AC(); if (_ac.state === 'suspended') _ac.resume();
      var seq = { ok: [[1318, 0], [1760, .12]], info: [[1047, 0]], del: [[880, 0], [659, .09]], err: [[330, 0]] }[k] || [[1047, 0]], t = _ac.currentTime;
      seq.forEach(function (n) { var o = _ac.createOscillator(), g = _ac.createGain(); o.type = 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(.0001, t + n[1]); g.gain.exponentialRampToValueAtTime(.15, t + n[1] + .015); g.gain.exponentialRampToValueAtTime(.0001, t + n[1] + .5); o.connect(g); g.connect(_ac.destination); o.start(t + n[1]); o.stop(t + n[1] + .55); });
      if (navigator.vibrate) navigator.vibrate(k === 'err' ? [60] : [10]);
    } catch (e) { }
  }

  var LCOLS = 'id,student_account_id,student_profile_id,student_name,instructor_id,kind,hours,amount,method,reference,public_note,entry_date,created_at,created_by_role,created_by_name,edited_by_role,edited_by_name,edited_at,lesson_id,lesson_date,auto,excluded,overridden,paid_to,payout_amount,payout_status,payout_date,payout_ref';   // the private admin note and instructor pay are never requested here
  var LCOLS_SYNC = LCOLS.replace(',paid_to,payout_amount,payout_status,payout_date,payout_ref', '');   // admin / student syncs never download instructor payout details
  function init(o) { C.sb = o.sb || C.sb; C.instr = o.instr || C.instr; C.toast = o.toast || C.toast; C.roster = o.roster || C.roster; C.report = o.report || C.report; C.sfx = o.sfx || C.sfx; }
  function rosterList() { try { return (C.roster && C.roster()) || []; } catch (e) { return []; } }
  function stuKey(st) { return st.accId || (st.profId ? 'p:' + st.profId : 'n:' + nameKey(st.name)); }
  function matches(row, st) {
    if (st.accId && row.student_account_id && String(row.student_account_id) === String(st.accId)) return true;
    if (st.profId && row.student_profile_id && String(row.student_profile_id) === String(st.profId)) return true;
    return !!row.student_name && nameKey(row.student_name) === nameKey(st.name) && !(row.student_account_id && st.accId && String(row.student_account_id) !== String(st.accId));
  }
  function matchLesson(l, st) {
    if (st.accId && l.student_account_id && String(l.student_account_id) === String(st.accId)) return true;
    return !!l.student_name && nameKey(l.student_name) === nameKey(st.name);
  }
  function setOf(st) { return S.sets[st.accId || ''] || S.sets['p:' + st.profId] || null; }
  function canSee(st) { var s = setOf(st); return !s || s.show_to_instructor !== false; }

  /* ---------- totals: done / booked ahead / left ---------- */
  function sumOf(rows) {
    rows = rows.slice().sort(function (a, b) { return String(a.lesson_date || a.entry_date || a.created_at).localeCompare(String(b.lesson_date || b.entry_date || b.created_at)) || String(a.created_at).localeCompare(String(b.created_at)); });
    var t = today(), bh = 0, bm = 0, dh = 0, ah = 0, th = 0, tm = 0, first = null;
    rows.forEach(function (r) {
      var h = +r.hours || 0, m = +r.amount || 0; th += h; tm += m;
      if (r.kind === 'purchase' && h > 0) { bh += h; bm += m; var d = r.entry_date || String(r.created_at).slice(0, 10); if (!first || d < first) first = d; }
      else if (h < 0) { var ld = r.lesson_date || r.entry_date || String(r.created_at).slice(0, 10); if (r.lesson_date && ld > t) ah += -h; else dh += -h; }
    });
    var viaDS = rows.some(function (r) { return r.kind === 'purchase' && (+r.hours || 0) > 0 && r.paid_to !== 'instructor'; }), rel = 0, pendN = 0, pendH = 0, pendV = 0;
    rows.forEach(function (r) {
      if (r.kind !== 'lesson' || !((+r.hours || 0) < 0) || r.excluded) return; var ld = r.lesson_date || r.entry_date || String(r.created_at).slice(0, 10);
      if (r.payout_status === 'released') rel += +r.payout_amount || 0; else if (ld <= t) { pendN++; pendH += -r.hours; pendV += -r.amount; }
    });
    return { rows: rows, boughtH: bh, paid: bm, usedH: dh, aheadH: ah, leftH: Math.round(th * 100) / 100, leftM: Math.round(tm * 100) / 100, rate: bh > 0 ? bm / bh : 35, any: rows.length > 0, start: first, viaDS: viaDS, released: Math.round(rel * 100) / 100, pendN: pendN, pendH: pendH, pendV: Math.round(pendV * 100) / 100 };
  }

  /* ---------- the calendar sync: plan (pure, testable) then apply ---------- */
  function plan(st, rows, lessons) {
    var out = { insert: [], update: [], link: [], remove: [] }, mine = rows.filter(function (r) { return matches(r, st); }), sum = sumOf(mine);
    if (!sum.boughtH || !sum.start) return out;
    var byLesson = {}, manual = [];
    mine.forEach(function (r) { if (r.kind !== 'lesson') return; if (r.lesson_id) byLesson[String(r.lesson_id)] = r; else if (!r.auto) manual.push(r); });
    var ls = lessons.filter(function (l) { return matchLesson(l, st) && l.lesson_date >= sum.start && (+l.duration_hours || 0) > 0; }), seen = {};
    ls.forEach(function (l) {
      seen[String(l.id)] = 1; var dur = +l.duration_hours || 0, e = byLesson[String(l.id)];
      if (!e) {
        var m = manual.filter(function (x) { return !x._used && (x.entry_date === l.lesson_date) && Math.abs(-x.hours - dur) < .01; })[0];
        if (m) { m._used = true; out.link.push({ row: m, lesson: l }); return; }
        out.insert.push({ lesson: l, hours: -dur, amount: -Math.round(dur * sum.rate * 100) / 100 });
      } else {
        var chg = {};
        if (!e.excluded && !e.overridden && Math.abs(-e.hours - dur) > .01) { chg.hours = -dur; chg.amount = -Math.round(dur * sum.rate * 100) / 100; }
        if (e.lesson_date !== l.lesson_date) chg.lesson_date = l.lesson_date, chg.entry_date = l.lesson_date;
        if (Object.keys(chg).length) out.update.push({ row: e, patch: chg, lesson: l });
      }
    });
    Object.keys(byLesson).forEach(function (id) { var e = byLesson[id]; if (!seen[id] && e.auto) out.remove.push(e); });
    return out;
  }
  async function logRaw(st, instrId, action, summary, before, after, ledgerId, role, actor) {
    var row = { ledger_id: ledgerId || null, student_key: stuKey(st), student_account_id: st.accId || null, student_profile_id: st.profId || null, student_name: st.name, instructor_id: instrId || null, action: action, actor_role: role, actor_name: actor, summary: summary, before: before || null, after: after || null };
    try { await C.sb.from('student_credit_history').insert(row); S.hist.unshift(Object.assign({ created_at: new Date().toISOString() }, row)); } catch (e) { }
  }
  async function applyPlan(st, instrId, p, role, actor) {
    var res = { added: [], removed: [], changed: [], linked: [] }, i, x;
    for (i = 0; i < p.insert.length; i++) {
      x = p.insert[i];
      var row = { student_account_id: st.accId || null, student_profile_id: st.profId || null, student_name: st.name, instructor_id: instrId || null, kind: 'lesson', hours: x.hours, amount: x.amount, entry_date: x.lesson.lesson_date, lesson_date: x.lesson.lesson_date, lesson_id: String(x.lesson.id), auto: true, created_by_role: 'calendar', created_by_name: 'Calendar', public_note: 'Calendar lesson' + (x.lesson.start_time ? ' · ' + String(x.lesson.start_time).slice(0, 5) : '') };
      var r = await C.sb.from('student_credit_ledger').insert(row).select().maybeSingle();
      if (r.error) { if (/column|schema cache/i.test(r.error.message || '')) { S.noSync = true; return res; } continue; }   // duplicate = someone else counted it first
      var saved = r.data || row; S.rows.push(saved); res.added.push({ row: saved, lesson: x.lesson });
      await logRaw(st, instrId, 'used', 'lesson on ' + dnice(x.lesson.lesson_date) + ' counted against the block (' + hrs(-x.hours) + ')', null, { hours: x.hours, lesson_id: x.lesson.id }, saved.id, role, actor);
    }
    for (i = 0; i < p.link.length; i++) {
      x = p.link[i];
      var l1 = await C.sb.from('student_credit_ledger').update({ lesson_id: String(x.lesson.id), lesson_date: x.lesson.lesson_date, auto: true }).eq('id', x.row.id);
      if (!l1.error) { Object.assign(x.row, { lesson_id: String(x.lesson.id), lesson_date: x.lesson.lesson_date, auto: true }); res.linked.push(x); await logRaw(st, instrId, 'edited', 'matched the hours ticked on ' + dnice(x.lesson.lesson_date) + ' to the calendar lesson (not counted twice)', null, null, x.row.id, role, actor); }
    }
    for (i = 0; i < p.update.length; i++) {
      x = p.update[i];
      var u = await C.sb.from('student_credit_ledger').update(x.patch).eq('id', x.row.id);
      if (!u.error) { var before = { hours: x.row.hours }; Object.assign(x.row, x.patch); res.changed.push(x); if (x.patch.hours != null) await logRaw(st, instrId, 'edited', 'calendar lesson changed: ' + hrs(Math.abs(before.hours)) + ' → ' + hrs(-x.patch.hours) + ' (' + dnice(x.lesson.lesson_date) + ')', before, { hours: x.patch.hours }, x.row.id, role, actor); }
    }
    for (i = 0; i < p.remove.length; i++) {
      x = p.remove[i];
      var d = await C.sb.from('student_credit_ledger').delete().eq('id', x.id);
      if (!d.error) { S.rows = S.rows.filter(function (y) { return y.id !== x.id; }); res.removed.push(x); await logRaw(st, instrId, 'deleted', 'lesson removed from the calendar: ' + hrs(Math.abs(x.hours)) + ' put back on the block', { hours: x.hours }, null, x.id, role, actor); }
    }
    return res;
  }
  /* sync one student (used by admin and the student portal, and by the instructor tab) */
  async function syncFor(o) {
    var sb = o.sb || C.sb, st = o.st; if (!sb || !st || S.noSync) return null; C.sb = C.sb || sb;
    try {
      var conds = []; if (st.accId) conds.push('student_account_id.eq.' + st.accId); if (st.profId) conds.push('student_profile_id.eq.' + st.profId);
      var q = sb.from('student_credit_ledger').select(LCOLS_SYNC); q = conds.length ? q.or(conds.join(',')) : q.eq('student_name', st.name || '~');
      var a = await q; if (a.error) { if (/column|schema cache|relation/i.test(a.error.message || '')) S.noSync = /column/i.test(a.error.message || ''); return null; }
      var rows = a.data || []; if (!rows.some(function (r) { return r.kind === 'purchase'; })) return null;
      var instrId = st.instrId || (rows[0] && rows[0].instructor_id); if (!instrId) return null;
      var start = sumOf(rows).start || '2000-01-01';
      var l = await sb.from('lessons').select('id,student_name,student_account_id,lesson_date,start_time,duration_hours').eq('instructor_id', instrId).gte('lesson_date', start).limit(3000);
      if (l.error) return null;
      var saveRows = S.rows; S.rows = rows;
      var p = plan(st, rows, l.data || []), res = await applyPlan(st, instrId, p, o.role || 'admin', o.actor || 'Admin');
      S.rows = saveRows; return res;
    } catch (e) { return null; }
  }
  async function syncAll(opts) {
    opts = opts || {}; if (S.busy || S.noSync || !C.sb || !C.instr) return null; S.busy = true;
    try {
      if (!S.loaded) await load(); if (S.missing || S.noSync) return null;
      var list = rosterList().concat(extraStudents()), minStart = null;
      list.forEach(function (st) { var s = sumOf(S.rows.filter(function (r) { return matches(r, st); })); if (s.start && (!minStart || s.start < minStart)) minStart = s.start; });
      if (!minStart) return null;
      var l = await C.sb.from('lessons').select('id,student_name,student_account_id,lesson_date,start_time,duration_hours').eq('instructor_id', C.instr.id).gte('lesson_date', minStart).limit(3000);
      if (l.error) return null;
      var all = { added: [], removed: [], changed: [], linked: [] };
      for (var i = 0; i < list.length; i++) {
        var st = list[i], p = plan(st, S.rows, l.data || []);
        if (!p.insert.length && !p.update.length && !p.link.length && !p.remove.length) continue;
        var r = await applyPlan(st, C.instr.id, p, 'calendar', 'Calendar');
        ['added', 'removed', 'changed', 'linked'].forEach(function (k) { r[k].forEach(function (x) { all[k].push({ st: st, x: x }); }); });
        if (r.added.length || r.removed.length) { try { if (C.report && opts.announce) C.report('block_booking', '📦 Block booking updated from the calendar: ' + st.name, who() + '\'s calendar changed ' + st.name + '\'s block: ' + (r.added.length ? r.added.length + ' lesson(s) counted. ' : '') + (r.removed.length ? r.removed.length + ' lesson(s) removed (hours put back). ' : '') + '\nStudent: ' + st.name, '📦 Block updated'); } catch (e) { } }
      }
      if (opts.announce) announce(all);
      if (all.added.length || all.removed.length || all.changed.length) { await load(); if (CTX.host === 'tab') renderTab(); else if (CTX.host) renderStudent(CTX.host, CTX.st); try { badge(); } catch (e) { } }
      return all;
    } finally { S.busy = false; }
  }
  function badge() { try { var n = lowCount(), b = $('blkLowBadge'); if (b) { b.style.display = n ? 'inline-block' : 'none'; b.textContent = n || ''; } } catch (e) { } }

  /* ---------- the "tap to edit / don't count" message ---------- */
  function announce(all) {
    var a = all.added, r = all.removed;
    if (!a.length && !r.length) return;
    if (a.length === 1 && !r.length) {
      var e = a[0], st = e.st, sum = sumOf(S.rows.filter(function (x) { return matches(x, st); })), left = sum.leftH;
      snack({ icon: '📦', title: 'Block updated for ' + st.name, text: hrs(-e.x.row.hours) + ' taken off for ' + dnice(e.x.lesson.lesson_date) + '. ' + (left < 0 ? 'Over the block by ' + hrs(-left) + '.' : hrs(left) + ' left on their block.'), st: st, row: e.x.row, sound: 'info' });
    } else if (a.length) {
      snack({ icon: '📦', title: a.length + ' lesson' + (a.length === 1 ? '' : 's') + ' counted against blocks', text: a.slice(0, 3).map(function (z) { return z.st.name.split(' ')[0] + ' ' + hrs(-z.x.row.hours); }).join(' · ') + (a.length > 3 ? ' …' : ''), tab: true, sound: 'info' });
    }
    if (r.length) snack({ icon: '↩️', title: 'Hours put back on a block', text: r.map(function (z) { return z.st.name.split(' ')[0] + ' +' + hrs(Math.abs(z.x.hours)); }).join(' · ') + ' — the lesson left your calendar.', tab: true, sound: 'del', delay: a.length ? 3500 : 0 });
  }
  var _snT = null;
  function snack(o) {
    css(); setTimeout(function () {
      var el = $('dqbSnack'); if (el) el.remove(); clearTimeout(_snT);
      el = document.createElement('div'); el.id = 'dqbSnack'; el.className = 'dqb-snack';
      el.innerHTML = '<div class="dqb-snack-i">' + o.icon + '</div><div style="flex:1;min-width:0"><b>' + E(o.title) + '</b><span>' + E(o.text) + '</span><div class="dqb-snack-b">' + (o.row ? '<button data-s="edit">Edit</button><button data-s="skip">Don\'t count it</button>' : '') + (o.tab ? '<button data-s="open">Open Blocks</button>' : '') + '<button data-s="x">OK</button></div></div>';
      el.addEventListener('click', async function (e) {
        var b = e.target.closest('button'); if (!b) return; var k = b.dataset.s;
        if (k === 'edit') { el.remove(); openEdit(o.st, o.row); }
        else if (k === 'skip') { el.remove(); await excludeEntry(o.row, o.st); }
        else if (k === 'open') { el.remove(); try { window.switchTab('blocks'); window.setMobActive && window.setMobActive('blocks'); } catch (x) { } }
        else el.remove();
      });
      document.body.appendChild(el); snd(o.sound || 'info'); _snT = setTimeout(function () { var q = $('dqbSnack'); if (q) q.remove(); }, 14000);
    }, o.delay || 0);
  }
  async function excludeEntry(row, st) {
    var r = await C.sb.from('student_credit_ledger').update({ hours: 0, amount: 0, excluded: true, edited_by_role: 'instructor', edited_by_name: who(), edited_at: new Date().toISOString() }).eq('id', row.id);
    if (r.error) { toast('Could not update: ' + r.error.message, 'error'); return; }
    var was = Math.abs(row.hours); row.hours = 0; row.amount = 0; row.excluded = true;
    await log(st, 'edited', 'chose not to count the ' + dnice(row.lesson_date) + ' lesson against the block (' + hrs(was) + ' not taken off)', { hours: -was }, { hours: 0 }, row.id);
    snd('del'); toast('Not counted — the hours stay on the block', 'success'); await refresh();
  }
  async function includeEntry(row, st) {
    var sum = sumOf(S.rows.filter(function (r) { return matches(r, st); })), dur = 0;
    try { var l = await C.sb.from('lessons').select('duration_hours').eq('id', row.lesson_id).maybeSingle(); dur = +((l.data || {}).duration_hours) || 0; } catch (e) { }
    if (!dur) dur = 1;
    var patch = { hours: -dur, amount: -Math.round(dur * sum.rate * 100) / 100, excluded: false, overridden: false, edited_by_role: 'instructor', edited_by_name: who(), edited_at: new Date().toISOString() };
    var r = await C.sb.from('student_credit_ledger').update(patch).eq('id', row.id); if (r.error) { toast('Could not update: ' + r.error.message, 'error'); return; }
    Object.assign(row, patch); await log(st, 'edited', 'counted the ' + dnice(row.lesson_date) + ' lesson against the block again (' + hrs(dur) + ')', { hours: 0 }, { hours: -dur }, row.id);
    snd('ok'); await refresh();
  }

  /* ---------- load / write ---------- */
  async function load() {
    S.missing = false;
    try {
      var rl = rosterList(), ids = rl.map(function (s) { return s.profId; }).filter(Boolean), aids = rl.map(function (s) { return s.accId; }).filter(Boolean), names = rl.map(function (s) { return s.name; }).filter(Boolean);
      var a = await C.sb.from('student_credit_ledger').select(LCOLS).eq('instructor_id', C.instr.id).order('created_at', { ascending: true });
      if (a.error) throw a.error;
      var rows = a.data || [];
      var have = {}; rows.forEach(function (r) { have[r.id] = 1; });
      var more = [];
      if (ids.length) more.push(C.sb.from('student_credit_ledger').select(LCOLS).in('student_profile_id', ids));
      if (aids.length) more.push(C.sb.from('student_credit_ledger').select(LCOLS).in('student_account_id', aids));
      if (names.length) more.push(C.sb.from('student_credit_ledger').select(LCOLS).is('instructor_id', null).in('student_name', names));   // blocks admin added before the instructor was linked
      (await Promise.all(more)).forEach(function (b) { if (!b.error) (b.data || []).forEach(function (r) { if (!have[r.id]) { have[r.id] = 1; rows.push(r); } }); });
      S.rows = rows;
      var st = await C.sb.from('student_credit_settings').select('*'); S.sets = {}; (st.data || []).forEach(function (x) { S.sets[x.student_key] = x; });
      var h = await C.sb.from('student_credit_history').select('*').eq('instructor_id', C.instr.id).order('created_at', { ascending: false }).limit(400); S.hist = h.data || [];
    } catch (e) { var m = String((e && e.message) || e); S.missing = /does not exist|relation|schema cache|column|student_credit/i.test(m); S.err = m; }
    S.loaded = true;
  }
  /* students that have a block for this instructor but are not in the roster list (e.g. admin chose the instructor for them) */
  function extraStudents() {
    var rl = rosterList(), ex = {};
    S.rows.forEach(function (r) {
      if (!C.instr || String(r.instructor_id) !== String(C.instr.id)) return;
      if (rl.some(function (st) { return matches(r, st); })) return;
      var k = r.student_account_id || (r.student_profile_id ? 'p:' + r.student_profile_id : 'n:' + nameKey(r.student_name));
      (ex[k] = ex[k] || { name: r.student_name || 'Student', accId: r.student_account_id || null, profId: r.student_profile_id || null, phone: '', extra: true }).name = (ex[k].name === 'Student' && r.student_name) ? r.student_name : ex[k].name;
    });
    return Object.keys(ex).map(function (k) { return ex[k]; });
  }
  function studentsWithBlocks() {
    var out = [], seen = {};
    rosterList().concat(extraStudents()).forEach(function (st) {
      var rows = S.rows.filter(function (r) { return matches(r, st); });
      if (!rows.length || !canSee(st)) return; var k = stuKey(st); if (seen[k]) return; seen[k] = 1;
      out.push(Object.assign({}, st, { sum: sumOf(rows) }));
    });
    out.sort(function (a, b) { return (a.sum.leftH <= 0 ? 1 : 0) - (b.sum.leftH <= 0 ? 1 : 0) || a.sum.leftH - b.sum.leftH; });
    return out;
  }
  async function log(st, action, summary, before, after, ledgerId) {
    await logRaw(st, C.instr.id, action, summary, before, after, ledgerId, 'instructor', who());
    try { if (C.report) C.report('block_booking', '📦 Block booking edited by instructor: ' + st.name, who() + ' ' + summary + '\nStudent: ' + st.name, '📦 Block booking edited'); } catch (e) { }
  }
  async function ensureSetting(st) {
    var k = st.accId || 'p:' + st.profId; if (S.sets[k] || S.sets['p:' + st.profId]) return;
    var row = { student_key: k, student_name: st.name, instructor_id: C.instr.id, show_to_instructor: true, show_on_portal: false, updated_at: new Date().toISOString() };
    try { await C.sb.from('student_credit_settings').insert(row); S.sets[k] = row; } catch (e) { }
  }
  function baseRow(st) { return { student_account_id: st.accId || null, student_profile_id: st.profId || null, student_name: st.name, instructor_id: C.instr.id, created_by_role: 'instructor', created_by_name: who() }; }
  async function addBlock(st, f) {
    var h = parseFloat(f.hours) || 0, m = parseFloat(f.amount) || 0;
    if (h <= 0 || m <= 0) { toast('Enter the hours and the amount the student paid.', 'error'); snd('err'); return false; }
    var row = Object.assign(baseRow(st), { kind: 'purchase', hours: h, amount: m, paid_to: f.paidTo === 'drivesq' ? 'drivesq' : 'instructor', method: f.method || null, reference: (f.reference || '').trim() || null, public_note: (f.note || '').trim() || null, entry_date: f.date || today() });
    var r = await C.sb.from('student_credit_ledger').insert(row).select().maybeSingle();
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 6000); snd('err'); return false; }
    var saved = r.data || row; S.rows.push(saved); await ensureSetting(st);
    await log(st, 'added', 'added a block for ' + st.name + ': ' + hrs(h) + ' · ' + money(m), null, { hours: h, amount: m }, saved.id);
    snd('ok'); toast('✅ Block added: ' + hrs(h) + ' · ' + money(m), 'success'); setTimeout(function () { syncAll({ announce: true }); }, 400); return true;
  }
  async function useHours(st, h, note, date) {
    h = parseFloat(h) || 0; if (h <= 0) { toast('Enter the hours done.', 'error'); snd('err'); return false; }
    var d = date || today(), mine = S.rows.filter(function (r) { return matches(r, st); }), sum = sumOf(mine);
    var dup = mine.filter(function (r) { return r.kind === 'lesson' && r.lesson_id && (r.lesson_date || r.entry_date) === d && Math.abs(-r.hours - h) < .01; })[0];
    if (dup && !confirm('A calendar lesson on ' + dnice(d) + ' (' + hrs(h) + ') is already counted for ' + st.name + '. Add these hours as well?')) return false;
    if (h > sum.leftH + .001 && !confirm('That is more than the ' + hrs(sum.leftH) + ' left on the block. Record it anyway?')) return false;
    var row = Object.assign(baseRow(st), { kind: 'lesson', hours: -h, amount: -Math.round(h * sum.rate * 100) / 100, public_note: (note || '').trim() || null, entry_date: d });
    var r = await C.sb.from('student_credit_ledger').insert(row).select().maybeSingle();
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 6000); snd('err'); return false; }
    var saved = r.data || row; S.rows.push(saved); var left = Math.round((sum.leftH - h) * 100) / 100;
    await log(st, 'used', 'ticked off ' + hrs(h) + ' for ' + st.name + ' (' + hrs(left) + ' left)', null, { hours: -h, left: left }, saved.id);
    snd('ok'); toast('✅ ' + hrs(h) + ' ticked off · ' + (left < 0 ? 'over by ' + hrs(-left) : hrs(left) + ' left'), 'success'); return true;
  }
  async function editEntry(row, st, f) {
    var sign = row.kind === 'purchase' ? 1 : -1, h = parseFloat(f.hours) || 0, m = parseFloat(f.amount) || 0;
    if (h <= 0) { toast('Enter the hours.', 'error'); snd('err'); return false; }
    var patch = { hours: sign * h, amount: sign * m, method: f.method || row.method || null, reference: (f.reference || '').trim() || null, public_note: (f.note || '').trim() || null, entry_date: f.date || row.entry_date, edited_by_role: 'instructor', edited_by_name: who(), edited_at: new Date().toISOString() };
    if (row.lesson_id) { patch.overridden = true; patch.excluded = false; }
    var r = await C.sb.from('student_credit_ledger').update(patch).eq('id', row.id);
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 6000); snd('err'); return false; }
    var before = { hours: row.hours, amount: row.amount, date: row.entry_date, note: row.public_note }; Object.assign(row, patch);
    await log(st, 'edited', 'changed a ' + (row.kind === 'purchase' ? 'block' : 'lesson entry') + ' for ' + st.name + ': ' + hrs(Math.abs(before.hours)) + ' · ' + money(Math.abs(before.amount)) + ' → ' + hrs(h) + ' · ' + money(m), before, { hours: patch.hours, amount: patch.amount }, row.id);
    snd('ok'); toast('Saved', 'success'); return true;
  }
  async function deleteEntry(row, st) {
    var cal = !!row.lesson_id;
    if (cal) { if (!confirm('This lesson is in your calendar. Remove it from the block only (the lesson stays in your calendar)?')) return false; return excludeEntry(row, st).then(function () { return true; }); }
    if (!confirm('Delete this entry? The student\'s hours left will change.')) return false;
    var r = await C.sb.from('student_credit_ledger').delete().eq('id', row.id);
    if (r.error) { toast('Not deleted: ' + r.error.message, 'error'); return false; }
    S.rows = S.rows.filter(function (x) { return x.id !== row.id; });
    await log(st, 'deleted', 'deleted a ' + (row.kind === 'purchase' ? 'block' : 'lesson entry') + ' for ' + st.name + ' (' + hrs(Math.abs(row.hours)) + ' · ' + money(Math.abs(row.amount)) + ')', { hours: row.hours, amount: row.amount }, null, row.id);
    snd('del'); return true;
  }

  /* ---------- UI ---------- */
  var CSS = '@keyframes dqbIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes dqbPop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}' +
    '.dqb-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.dqb-sum div{background:var(--card-bg,#16161b);border:1px solid var(--bdr,#2a2a32);border-radius:14px;padding:10px 12px;text-align:center;animation:dqbIn .35s both}.dqb-sum b{display:block;font-family:Oswald,sans-serif;font-size:1.35rem}.dqb-sum small{font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;color:var(--txt2,#9a9aa5)}' +
    '.dqb-card{background:var(--card-bg,#16161b);border:1px solid var(--bdr,#2a2a32);border-radius:20px;padding:16px;margin-bottom:12px;box-shadow:0 6px 22px rgba(0,0,0,.08);animation:dqbIn .4s both;position:relative;overflow:hidden}' +
    '.dqb-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--bk,#4ade80)}' +
    '.dqb-top{display:flex;gap:14px;align-items:center}.dqb-ring{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;animation:dqbPop .5s both}' +
    '.dqb-ring>div{width:72px;height:72px;border-radius:50%;background:var(--card-bg,#16161b);display:grid;place-items:center;text-align:center;line-height:1}' +
    '.dqb-ring b{font-family:Oswald,sans-serif;font-size:1.6rem}.dqb-ring small{display:block;font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;color:var(--txt2,#9a9aa5);margin-top:3px}' +
    '.dqb-name{font-family:Oswald,sans-serif;font-size:1.08rem;font-weight:700;color:var(--txt,#fff)}.dqb-sub{font-size:.76rem;color:var(--txt2,#9a9aa5);margin-top:2px}.dqb-chip{display:inline-block;font-size:.66rem;font-weight:800;letter-spacing:.04em;padding:2px 9px;border-radius:99px;margin-top:5px}' +
    '.dqb-pay{margin-top:10px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.32);border-radius:12px;padding:10px 12px;font-size:.76rem;line-height:1.45;color:var(--txt,#fff)}.dqb-payrow{display:flex;gap:8px;margin-top:8px}.dqb-payrow span{flex:1;background:rgba(128,128,128,.12);border-radius:10px;padding:7px 9px;font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;color:var(--txt2,#9a9aa5)}.dqb-payrow b{display:block;font-family:Oswald,sans-serif;font-size:.92rem;letter-spacing:0;text-transform:none;color:var(--txt,#fff);margin-top:2px}.dqb-leg{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0 2px;font-size:.72rem;color:var(--txt2,#9a9aa5)}.dqb-leg i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:baseline}' +
    '.dqb-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.dqb-stats div{flex:1;min-width:78px;background:rgba(128,128,128,.1);border-radius:12px;padding:8px 10px}.dqb-stats small{display:block;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;color:var(--txt2,#9a9aa5)}.dqb-stats b{font-family:Oswald,sans-serif;font-size:1.05rem}' +
    '.dqb-btns{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.dqb-btn{border:1px solid var(--bdr,#2a2a32);background:rgba(128,128,128,.14);color:var(--txt,#fff);border-radius:12px;padding:9px 13px;font-size:.78rem;font-weight:700;cursor:pointer;transition:transform .12s,filter .12s}.dqb-btn:active{transform:scale(.95)}.dqb-btn:hover{filter:brightness(1.1)}' +
    '.dqb-btn.p{background:#d10a11;border-color:#d10a11;color:#fff}.dqb-btn.g{background:rgba(74,222,128,.16);border-color:rgba(74,222,128,.5);color:#16a34a}.dqb-btn:disabled{opacity:.45}' +
    '.dqb-hist{margin-top:10px;font-size:.76rem}.dqb-hist>div{display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--bdr,#2a2a32);align-items:flex-start}.dqb-hist .d{min-width:58px;color:var(--txt3,#6f6f7a);white-space:nowrap}.dqb-ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:.8rem;flex:0 0 auto;background:rgba(128,128,128,.14)}' +
    '.dqb-tag{display:inline-block;font-size:.56rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:1px 6px;border-radius:99px;margin-left:5px;vertical-align:middle;background:rgba(96,165,250,.18);color:#3b82f6}' +
    '.dqb-ov{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:flex-end;justify-content:center}.dqb-md{background:var(--card-bg,#16161b);border:1px solid var(--bdr,#2a2a32);border-radius:20px 20px 0 0;width:100%;max-width:540px;max-height:92vh;overflow:auto;padding:18px;animation:dqbIn .25s both}' +
    '@media(min-width:600px){.dqb-ov{align-items:center}.dqb-md{border-radius:20px}}.dqb-f{display:block;margin-top:10px}.dqb-f span{display:block;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--txt2,#9a9aa5);margin-bottom:3px}' +
    '.dqb-f input,.dqb-f select{width:100%;background:var(--input-bg,#1d1d24);border:1px solid var(--bdr,#2a2a32);color:var(--txt,#fff);border-radius:10px;padding:10px;font-size:.9rem}.dqb-row{display:flex;gap:8px}.dqb-row>*{flex:1}.dqb-help{font-size:.72rem;color:var(--txt2,#9a9aa5);margin-top:6px;line-height:1.45}' +
    '.dqb-snack{position:fixed;left:12px;right:12px;margin:0 auto;bottom:84px;max-width:480px;z-index:100000;background:var(--card-bg,#16161b);border:1px solid #a855f7;border-radius:16px;box-shadow:0 10px 36px rgba(0,0,0,.35);padding:12px 14px;display:flex;gap:12px;animation:dqbIn .3s both}' +
    '.dqb-snack-i{font-size:1.5rem}.dqb-snack b{display:block;font-size:.84rem;color:var(--txt,#fff)}.dqb-snack span{display:block;font-size:.76rem;color:var(--txt2,#9a9aa5);margin-top:2px;line-height:1.4}.dqb-snack-b{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
    '.dqb-snack-b button{border:1px solid var(--bdr,#2a2a32);background:rgba(128,128,128,.14);color:var(--txt,#fff);border-radius:9px;padding:6px 11px;font-size:.74rem;font-weight:700;cursor:pointer}.dqb-snack-b button:first-child{background:#a855f7;border-color:#a855f7;color:#fff}';
  function css() { if ($('dqbCss')) return; var s = document.createElement('style'); s.id = 'dqbCss'; s.textContent = CSS; document.head.appendChild(s); }
  function tone3(left, bought) { return left <= 0 ? ['#f87171', 'Block used up'] : left <= 2 ? ['#f59e0b', 'Running low'] : ['#22c55e', 'On track']; }
  function ringGrad(s) { var b = s.boughtH || 1, d = Math.min(360, Math.round(s.usedH / b * 360)), a = Math.min(360 - d, Math.round(s.aheadH / b * 360)); return 'conic-gradient(#22c55e 0 ' + d + 'deg,#60a5fa ' + d + 'deg ' + (d + a) + 'deg,rgba(128,128,128,.25) ' + (d + a) + 'deg)'; }
  function cardHTML(st) {
    var s = st.sum, t = tone3(s.leftH), shown = (setOf(st) || {}).show_on_portal, first = String(st.name || '?').split(' ')[0];
    return '<div class="dqb-card" data-k="' + E(stuKey(st)) + '" style="--bk:' + t[0] + '"><div class="dqb-top"><div class="dqb-ring" style="background:' + ringGrad(s) + '"><div><span><b style="color:' + t[0] + '">' + hrs(Math.max(0, s.leftH)).replace('h', '') + '</b><small>hrs left</small></span></div></div>' +
      '<div style="flex:1;min-width:150px"><div class="dqb-name">' + E(st.name) + '</div><div class="dqb-sub">' + hrs(s.boughtH) + ' block</div><span class="dqb-chip" style="background:rgba(34,197,94,.16);color:#16a34a;margin-right:6px">✅ Student paid ' + money(s.paid) + '</span><span class="dqb-chip" style="background:' + t[0] + '22;color:' + t[0] + '">' + t[1] + (s.leftH < 0 ? ' · over by ' + hrs(-s.leftH) : '') + '</span>' + (shown ? '' : '<div class="dqb-sub" style="font-size:.68rem;margin-top:5px">🙈 ' + E(first) + ' can\'t see this yet (admin switches it on)</div>') + '</div></div>' +
      '<div class="dqb-leg"><span><i style="background:#22c55e"></i>Done ' + hrs(s.usedH) + '</span><span><i style="background:#60a5fa"></i>Booked ahead ' + hrs(s.aheadH) + '</span><span><i style="background:rgba(128,128,128,.5)"></i>Left to book ' + hrs(Math.max(0, s.leftH)) + '</span></div>' +
      payStrip(s) + '<div class="dqb-stats"><div><small>Paid</small><b>' + money(s.paid) + '</b></div><div><small>Done</small><b>' + hrs(s.usedH) + '</b></div><div><small>Credit left</small><b>' + money(s.leftM) + '</b></div></div>' +
      '<div class="dqb-btns"><button class="dqb-btn g" data-a="use" data-n="1">＋1 hr done</button><button class="dqb-btn g" data-a="use" data-n="2">＋2 hrs done</button><button class="dqb-btn" data-a="use" data-n="0">Other…</button><button class="dqb-btn" data-a="add">New block</button><button class="dqb-btn" data-a="hist">History</button></div></div>';
  }
  function payStrip(s) {
    if (!s.paid) return '';
    if (!s.viaDS) return '<div class="dqb-pay"><b>💷 Student paid you directly.</b> DriveSQ is not holding this payment.</div>';
    return '<div class="dqb-pay"><b>🔒 Student paid DriveSQ ' + money(s.paid) + '</b> for ' + hrs(s.boughtH) + '. DriveSQ releases your payment after each lesson is done.' +
      '<div class="dqb-payrow"><span>💷 Released to you<b>' + money(s.released) + '</b></span><span>⏳ Awaiting release<b>' + (s.pendN ? s.pendN + ' lesson' + (s.pendN === 1 ? '' : 's') + ' · ' + hrs(s.pendH) : 'none') + '</b></span></div></div>';
  }
  function payChip(r, st) {
    if (r.kind !== 'lesson' || r.excluded || (+r.hours || 0) >= 0) return '';
    var sum = st && st.sum ? st.sum : sumOf(S.rows.filter(function (x) { return matches(x, st || {}); })); if (!sum.viaDS) return '';
    var d = r.lesson_date || r.entry_date || String(r.created_at).slice(0, 10);
    if (r.payout_status === 'released') return '<div style="margin-top:3px"><span class="dqb-tag" style="background:rgba(34,197,94,.18);color:#16a34a;margin-left:0">💷 ' + money(r.payout_amount) + ' released' + (r.payout_date ? ' · ' + dnice(r.payout_date) : '') + '</span></div>';
    return d > today() ? '' : '<div style="margin-top:3px"><span class="dqb-tag" style="background:rgba(245,158,11,.18);color:#d97706;margin-left:0">⏳ Payment awaiting release</span></div>';
  }
  function entryLine(r, run, st) {
    var isIn = (+r.hours || 0) > 0, cal = !!r.lesson_id, d = r.lesson_date || r.entry_date || String(r.created_at).slice(0, 10), fut = cal && d > today();
    var ic = r.kind === 'purchase' ? '💷' : cal ? '📅' : '✋', title = r.kind === 'purchase' ? 'Block paid' : r.excluded ? 'Not counted' : cal ? (fut ? 'Lesson booked' : 'Lesson done') : 'Hours ticked';
    var by = r.created_by_role === 'calendar' ? 'from your calendar' : r.created_by_role === 'instructor' ? 'added by you' : 'added by DriveSQ', ed = r.edited_at ? ' · edited by ' + E(r.edited_by_role === 'admin' ? 'DriveSQ' : (r.edited_by_name || 'instructor')) : '';
    return '<div><span class="dqb-ic">' + ic + '</span><span style="flex:1;min-width:0"><b style="color:' + (isIn ? '#16a34a' : r.excluded ? 'var(--txt2)' : '#d97706') + '">' + title + (r.excluded ? '' : ' ' + (isIn ? '+' : '−') + hrs(Math.abs(r.hours))) + (r.kind === 'purchase' ? ' · ' + money(r.amount) : '') + '</b><div style="color:var(--txt2,#9a9aa5)">' + dnice(d) + (r.public_note && r.public_note !== 'Calendar lesson' ? ' · ' + E(r.public_note) : '') + '</div><div style="color:var(--txt3,#6f6f7a);font-size:.68rem">' + by + ed + '</div>' + payChip(r, st) + '</span><span style="text-align:right;color:var(--txt2,#9a9aa5);white-space:nowrap">' + hrs(run) + ' left<br>' + (r.excluded ? '<button class="dqb-btn" style="padding:3px 9px;margin-top:4px;font-size:.68rem" data-a="incl" data-id="' + E(r.id) + '">Count it</button>' : '<button class="dqb-btn" style="padding:3px 9px;margin-top:4px;font-size:.68rem" data-a="edit" data-id="' + E(r.id) + '">Edit</button>') + '</span></div>';
  }
  function histHTML(st) {
    var sum = sumOf(S.rows.filter(function (r) { return matches(r, st); })), run = 0;
    var lines = sum.rows.map(function (r) { run += +r.hours || 0; return entryLine(r, Math.round(run * 100) / 100, st); }).reverse().join('');
    var h = S.hist.filter(function (x) { return x.student_key === stuKey(st) || x.student_profile_id === st.profId || (x.student_account_id && x.student_account_id === st.accId); });
    return '<div class="dqb-hist"><b>Every lesson and payment</b>' + (lines || '<div style="color:var(--txt3)">None yet.</div>') + '</div><div class="dqb-hist" style="margin-top:14px"><b>Change log</b>' + (h.length ? h.slice(0, 40).map(function (x) { return '<div><span class="d">' + new Date(x.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span><span style="flex:1">' + E((x.actor_role === 'admin' ? 'DriveSQ' : x.actor_role === 'calendar' ? 'Calendar' : x.actor_name || x.actor_role) + ' ' + x.summary) + '</span></div>'; }).join('') : '<div style="color:var(--txt3)">No changes logged yet.</div>') + '</div>';
  }
  function modal(html, onReady) { css(); closeModal(); var o = document.createElement('div'); o.className = 'dqb-ov'; o.id = 'dqbOv'; o.innerHTML = '<div class="dqb-md">' + html + '</div>'; o.addEventListener('click', function (e) { if (e.target === o) closeModal(); }); document.body.appendChild(o); if (onReady) onReady(o); }
  function closeModal() { var o = $('dqbOv'); if (o) o.remove(); }
  var CTX = { host: null, st: null };
  function formHTML(title, f, extra) {
    return '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:Oswald,sans-serif;font-size:1.12rem;font-weight:700;color:var(--txt)">' + title + '</div><button class="dqb-btn" data-x="close">✕</button></div>' + (extra || '') +
      '<div class="dqb-row"><label class="dqb-f"><span>Hours</span><input id="dqbH" type="number" step="0.5" min="0.5" value="' + E(f.hours) + '"></label>' + (f.noAmount ? '' : '<label class="dqb-f"><span>Amount £</span><input id="dqbA" type="number" step="0.01" min="0" value="' + E(f.amount) + '"></label>') + '<label class="dqb-f"><span>Date</span><input id="dqbD" type="date" value="' + E(f.date) + '"></label></div>' +
      (f.paidTo ? '<label class="dqb-f"><span>Who did the student pay?</span><select id="dqbP"><option value="instructor">I was paid directly</option><option value="drivesq">The student paid DriveSQ</option></select></label>' : '') +
      (f.method === false ? '' : '<div class="dqb-row"><label class="dqb-f"><span>Paid via</span><select id="dqbM">' + [['bank_transfer', 'Bank transfer'], ['cash', 'Cash'], ['card', 'Card'], ['other', 'Other']].map(function (m) { return '<option value="' + m[0] + '"' + (f.method === m[0] ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') + '</select></label><label class="dqb-f"><span>Reference</span><input id="dqbR" value="' + E(f.reference || '') + '" placeholder="optional"></label></div>') +
      '<label class="dqb-f"><span>Comment (the student and admin can see it)</span><input id="dqbN" value="' + E(f.note || '') + '" placeholder="e.g. Lesson 3 — roundabouts"></label>' + (f.help ? '<div class="dqb-help">' + f.help + '</div>' : '') +
      '<div class="dqb-btns"><button class="dqb-btn p" data-x="save">Save</button><button class="dqb-btn" data-x="close">Cancel</button>' + (f.del ? '<button class="dqb-btn" style="margin-left:auto;color:#ef4444" data-x="del">' + (f.delLabel || 'Delete') + '</button>' : '') + '</div>';
  }
  function val() { var g = function (i) { var e = $(i); return e ? e.value : ''; }; return { paidTo: g('dqbP'), hours: g('dqbH'), amount: g('dqbA'), date: g('dqbD'), method: g('dqbM'), reference: g('dqbR'), note: g('dqbN') }; }
  function openAdd(st) {
    modal(formHTML('New block for ' + E(st.name), { hours: 10, amount: 330, date: today(), method: 'bank_transfer', paidTo: true, help: 'Lessons in your calendar from this date are taken off the block automatically.' }), function (o) {
      o.addEventListener('click', async function (e) { var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'close') return closeModal(); if (b.dataset.x === 'save') { b.disabled = true; if (await addBlock(st, val())) { closeModal(); await refresh(); } else b.disabled = false; } });
    });
  }
  function openUse(st, n) {
    if (n > 0) return (async function () { if (await useHours(st, n, '', today())) await refresh(); })();
    modal(formHTML('Hours done for ' + E(st.name), { hours: 1, date: today(), noAmount: true, method: false, help: 'Lessons you add to your calendar are counted automatically — only use this for lessons that are not in your calendar.' }), function (o) {
      o.addEventListener('click', async function (e) { var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'close') return closeModal(); if (b.dataset.x === 'save') { var v = val(); b.disabled = true; if (await useHours(st, v.hours, v.note, v.date)) { closeModal(); await refresh(); } else b.disabled = false; } });
    });
  }
  function openEdit(st, row) {
    var cal = !!row.lesson_id;
    modal(formHTML('Edit ' + (row.kind === 'purchase' ? 'block' : cal ? 'calendar lesson' : 'lesson entry'), { hours: Math.abs(row.hours), amount: Math.abs(row.amount), date: row.entry_date || today(), method: row.method || 'bank_transfer', reference: row.reference, note: row.public_note && row.public_note !== 'Calendar lesson' ? row.public_note : '', del: true, delLabel: cal ? "Don't count it" : 'Delete', help: cal ? 'This lesson came from your calendar. Change the hours if the lesson was longer or shorter, or choose “Don\'t count it” to leave it off the block.' : '' }), function (o) {
      o.addEventListener('click', async function (e) { var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'close') return closeModal(); if (b.dataset.x === 'del') { closeModal(); if (await deleteEntry(row, st)) await refresh(); return; } if (b.dataset.x === 'save') { b.disabled = true; if (await editEntry(row, st, val())) { closeModal(); await refresh(); } else b.disabled = false; } });
    });
  }
  function openHist(st) {
    var sum = sumOf(S.rows.filter(function (r) { return matches(r, st); }));
    modal('<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:Oswald,sans-serif;font-size:1.1rem;font-weight:700;color:var(--txt)">' + E(st.name) + '</div><button class="dqb-btn" data-x="close">✕</button></div>' + cardHTML(Object.assign({}, st, { sum: sum })) + histHTML(st), function (o) {
      o.addEventListener('click', function (e) { var b = e.target.closest('[data-x],[data-a]'); if (!b) return; if (b.dataset.x === 'close') return closeModal(); handle(b, st); });
    });
  }
  function handle(b, st) {
    var a = b.dataset.a; if (!a) return;
    if (a === 'use') return openUse(st, parseFloat(b.dataset.n) || 0);
    if (a === 'add') return openAdd(st);
    if (a === 'hist') return openHist(st);
    var row = S.rows.find(function (r) { return String(r.id) === b.dataset.id; });
    if (a === 'edit' && row) { closeModal(); openEdit(st, row); }
    if (a === 'incl' && row) { includeEntry(row, st); }
  }
  async function refresh() { await load(); if (CTX.host === 'tab') renderTab(); else if (CTX.host) renderStudent(CTX.host, CTX.st); badge(); }

  async function renderStudent(hostId, st) {
    css(); var host = $(hostId); if (!host) return; CTX.host = hostId; CTX.st = st;
    host.innerHTML = '<div style="padding:12px;color:var(--txt2,#9a9aa5);font-size:.8rem">Loading block booking…</div>';
    await load();   // always fresh, so a block the admin just added is there
    if (S.missing) { host.innerHTML = '<div class="dqb-card">Block bookings need a one-time database update by DriveSQ admin. Please let admin know.</div>'; return; }
    syncAll({ announce: false });
    var rows = S.rows.filter(function (r) { return matches(r, st); });
    if (!canSee(st)) { host.innerHTML = '<div class="dqb-card"><div class="dqb-sub">Block bookings are switched off for this student by DriveSQ admin.</div></div>'; return; }
    if (!rows.length) { host.innerHTML = '<div class="dqb-card" style="--bk:#9ca3af"><div class="dqb-name">No block booking yet</div><div class="dqb-sub">When ' + E(String(st.name).split(' ')[0]) + ' pays for a block of lessons (for example 10 hours, £330), add it here. Lessons you put in your calendar are then taken off automatically.</div><div class="dqb-btns"><button class="dqb-btn p" data-a="add">Add block</button></div></div>'; }
    else host.innerHTML = cardHTML(Object.assign({}, st, { sum: sumOf(rows) })) + '<div class="dqb-card" style="padding:6px 14px;--bk:#9ca3af">' + histHTML(st) + '</div>';
    host.onclick = function (e) { var b = e.target.closest('[data-a]'); if (b) handle(b, st); };
  }
  async function renderTab() {
    css(); var host = $('dqbTabBody'); if (!host) return; CTX.host = 'tab'; CTX.st = null;
    host.innerHTML = '<div style="padding:16px;color:var(--txt2,#9a9aa5)">Loading…</div>'; await load();   // always fresh
    if (S.missing) { host.innerHTML = '<div class="dqb-card">Block bookings need a one-time database update by DriveSQ admin. Please let admin know.</div>'; return; }
    var list = studentsWithBlocks(), low = list.filter(function (s) { return s.sum.leftH <= 2; }).length, all = rosterList();
    var left = list.reduce(function (a, s) { return a + Math.max(0, s.sum.leftH); }, 0), paid = list.reduce(function (a, s) { return a + s.sum.paid; }, 0);
    var picker = '<select id="dqbPick" class="dqb-btn" style="max-width:100%"><option value="">＋ New block for…</option>' + all.map(function (s) { return '<option value="' + E(s.name) + '">' + E(s.name) + '</option>'; }).join('') + '</select>';
    host.innerHTML = (list.length ? '<div class="dqb-sum"><div><b>' + list.length + '</b><small>Active blocks</small></div><div><b>' + hrs(left) + '</b><small>Hours owed</small></div><div><b style="color:' + (low ? '#f59e0b' : 'inherit') + '">' + low + '</b><small>Running low</small></div></div>' : '') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' + picker + '<button class="dqb-btn" id="dqbSyncBtn">↻ Check my calendar</button></div>' +
      (list.length ? list.map(function (s) { return cardHTML(s); }).join('') : '<div class="dqb-card" style="--bk:#9ca3af"><div class="dqb-name">No block bookings yet</div><div class="dqb-sub">Choose a student above when they pay for a block (for example 10 hours, £330). Lessons you add to your calendar are then taken off automatically, and the student can see their balance on their portal once DriveSQ switches it on.</div></div>');
    $('dqbPick').onchange = function () { var s = all.find(function (x) { return x.name === this.value; }.bind(this)); this.value = ''; if (s) openAdd(s); };
    $('dqbSyncBtn').onclick = async function () { this.disabled = true; var r = await syncAll({ announce: true }); this.disabled = false; if (r && !(r.added.length || r.removed.length || r.changed.length || r.linked.length)) { toast('✅ Everything matches your calendar', 'success'); snd('info'); } };
    host.onclick = function (e) { var b = e.target.closest('[data-a]'); if (!b) return; var k = b.closest('.dqb-card').getAttribute('data-k'), st = list.find(function (s) { return stuKey(s) === k; }); if (st) handle(b, st); };
  }
  function lowCount() { return studentsWithBlocks().filter(function (s) { return s.sum.leftH <= 2; }).length; }
  window.DSQBlock = { init: init, load: load, renderTab: renderTab, renderStudent: renderStudent, lowCount: lowCount, syncAll: syncAll, syncFor: syncFor, sumOf: sumOf, plan: plan, _S: S, _addBlock: addBlock, _useHours: useHours, hrs: hrs, money: money, sound: snd };
})();
