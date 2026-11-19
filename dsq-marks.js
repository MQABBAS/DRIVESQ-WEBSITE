/* How an instructor's one-tap answer is saved on the referral (used by the Instructor Portal and the one-tap link page).
   booked    → counts as a booking straight away (no admin approval) and is noted as "confirmed by instructor"
   later     → will book later (unsure until they do)
   notbooked → not booked / not going ahead
   cantreach → can't reach the student
   left      → student has gone / left
   Every answer adds a line starting with 👨‍🏫 to the referral's admin notes (shown in a different colour to admin). */
(function () {
  'use strict';
  var TAG = '👨‍🏫';
  var MARKS = {
    booked: { reply: 'booked', flag: 'green', icon: '✅', label: 'Booked', line: '✅ Booked — confirmed by instructor', forceFlag: true },
    later: { reply: 'not_yet', flag: 'purple', icon: '⏳', label: 'Will book later', line: '⏳ Will book later', keepGreen: true },
    notbooked: { reply: 'not_interested', flag: 'red', icon: '🚩', label: 'Not booked', line: '🚩 Not booked', forceFlag: true },
    cantreach: { reply: 'unreachable', flag: 'red', icon: '📵', label: "Can't reach", line: "📵 Can't reach the student", forceFlag: true },
    left: { reply: 'left', flag: 'red', icon: '👋', label: 'Student left', line: '👋 Student left / gone', forceFlag: true }
  };
  function today() { return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  /* ref = the referral row, key = one of the marks above, o = { note, name } → { patch, line, mark } */
  function build(ref, key, o) {
    o = o || {}; var m = MARKS[key]; if (!m) return null;
    var line = today() + ' · ' + TAG + ' ' + (o.name ? o.name + ': ' : '') + m.line + (o.note ? ' — ' + String(o.note).slice(0, 200) : '');
    var patch = { reply_status: m.reply, reply_note: o.note || null, replied_at: new Date().toISOString(), admin_notes: [ref && ref.admin_notes || '', line].filter(Boolean).join('\n') };
    var cur = ref && ref.flag_color;
    if (m.forceFlag || !cur || (cur === 'purple' && !m.keepGreen)) patch.flag_color = m.flag; else if (m.keepGreen && cur !== 'green' && cur !== 'red') patch.flag_color = m.flag;
    if (key === 'later' && cur === 'green') { delete patch.flag_color; }
    return { patch: patch, line: line, mark: m };
  }
  /* quick re-test of whether a referral already has an answer that needs no more asking */
  function answered(ref) { var s = ref && ref.reply_status; return s === 'booked' || s === 'left' || s === 'not_interested' || s === 'unreachable'; }
  window.DSQMarks = { MARKS: MARKS, build: build, answered: answered, TAG: TAG };
})();
