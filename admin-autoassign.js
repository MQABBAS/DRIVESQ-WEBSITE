/* DriveSQ auto-assign of website bookings (admin side). The engine itself runs on the server (Supabase function "whatsapp").
   - Settings, Preview (what WOULD happen, nothing is sent) and Run now live inside Admin → WhatsApp.
   - "Attention required": a red button in the top bar lists everything that needs you (an instructor can't cover, nobody replied, no match, a message failed…).
   - Instructor traits: "Female instructor" and "Don't auto-assign" on each instructor's profile. */
(function () {
  'use strict';
  var DEF = { morningSummary: true, morningHour: 8, chaseMinutes: 20, adiAutoReply: true, claudeInPrice: '', claudeOutPrice: '', directMiles: 6, aiHoldMinutes: 5, aiHoldMaxMinutes: 15, aiSend: true, aiFacts: '', femaleStudentFirst: true, femaleStudentMiles: 5, aiAssistant: false, aiTestOnly: true, aiMaxMessages: 14, balanceAmount: 0, balanceRepeatDays: 7, balanceHours: [9, 18], digestDay: 0, digestMinAmount: 0, maxMsgsInstructor: 8, maxMsgsStudent: 4, billingDigest: true, enabled: false, mode: 'assign', since: '', sources: ['[WEB]'], autoMiles: 0, autoAssignAfterMinutes: 35, confirmMiles: 8, dailyLimit: 2, weeklyLimit: 4, unpaidLimit: 2, femaleRule: 'require', hours: [8, 20], ackHours: [7, 23], replyMinutes: 90, ackStudent: false, ackSince: '', retries: 2, maxPerWeek: 0,
    messageInstructor: true, messageStudent: true, adminPhone: '', adminAlerts: true, refFee: 25, anytime: true, balanceAuto: true, concurrency: 5, maxPerRun: 10, maxPerDay: 40, franchiseMin: 3, priorityMiles: 3, fairnessMiles: 0.5, fairnessAfterDays: 2, fairnessCap: 4, droughtDays: 7, shortfallMiles: 2, followups: { enabled: true, acceptWaitHours: 24, checkinDays: 3, instructorAfterDays: 0, repeatDays: 4, rounds: 4, maxPerWeek: 2 } };
  var CFG = JSON.parse(JSON.stringify(DEF)), loaded = false, ATT = [], seen = null;
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m, t, ms) { try { window.showToast(m, t || '', ms); } catch (e) { } };
  var SBc = function () { return window.DSQ_ADMIN && DSQ_ADMIN.sb && DSQ_ADMIN.sb(); };
  var ago = function (d) { var m = Math.round((Date.now() - new Date(d)) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
  var log = function (summary) { try { DSQLog.add(SBc(), { area: 'auto_assign', action: 'settings', summary: summary, role: 'admin', actor: 'Admin' }); } catch (e) { } };

  async function load(force) {
    if (loaded && !force) return CFG; var got = null;
    try { var r = await SBc().from('growth_settings').select('value').eq('key', 'auto_assign_cfg').maybeSingle(); if (r && r.data && r.data.value) got = r.data.value; } catch (e) { }
    CFG = Object.assign(JSON.parse(JSON.stringify(DEF)), got || {}); CFG.followups = Object.assign({}, DEF.followups, (got && got.followups) || {}); loaded = true; return CFG;
  }
  async function save() {
    var r = await SBc().from('growth_settings').upsert({ key: 'auto_assign_cfg', value: CFG, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (r.error) { toast('Not saved: ' + r.error.message + ' (run the growth tools SQL so settings can be stored).', 'error', 7000); return false; } return true;
  }

  /* ---------- settings block inside Admin → WhatsApp ---------- */
  var num = function (id, label, val, hint, step) { return '<label style="font-size:.72rem;display:block"><span style="color:var(--txt3)">' + label + '</span><input type="number" id="' + id + '" class="dsq-inp" value="' + E(val) + '" step="' + (step || 1) + '" style="margin-top:2px"' + (hint ? ' title="' + E(hint) + '"' : '') + '></label>'; };
  function fu_html() {
    var fu = CFG.followups;
    return '<label style="display:flex;gap:6px;align-items:center;font-size:.76rem;margin:6px 0"><input type="checkbox" id="aaFuOn"' + (fu.enabled ? ' checked' : '') + '> Ask students and instructors whether a lesson is booked, and update Referrals from their answers</label>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">' + num('aaFuAcc', 'Hours to wait for the instructor to accept', fu.acceptWaitHours) + num('aaFuDays', 'Ask BOTH the student and the instructor this many days after the instructor accepts', fu.checkinDays) + num('aaFuCap', 'Most check-in messages per person per week', fu.maxPerWeek, 'The student and the instructor are each messaged at most this many times in any 7 days') + num('aaFuRep', 'Repeat every (days)', fu.repeatDays) + num('aaFuRounds', 'Rounds before it comes to you', fu.rounds) + '</div>' +
      '<div style="font-size:.7rem;color:var(--txt4);margin-top:4px">Student answers: <b>Yes, booked</b> → green flag; <b>Not yet</b> → note + waiting; <b>Gone elsewhere</b> → red, student left. The instructor is asked at the same time, so nothing waits on the student. If nobody answers after the rounds, it comes to you.</div>';
  }
  /* right-now strip: waiting website bookings, offers pending, items needing you */
  async function liveStatus() {
    var q1 = await SBc().from('waiting_list').select('id,notes,created_at').eq('status', 'waiting').limit(300), q2 = await SBc().from('auto_assign_jobs').select('state').in('state', ['pending_accept', 'working']).limit(300), since = CFG.since ? new Date(CFG.since).getTime() : 0;
    var web = (q1.data || []).filter(function (w) { return /\[WEB\]/i.test(w.notes || '') && new Date(w.created_at).getTime() >= since; }).length, off = (q2.data || []).filter(function (j) { return j.state === 'pending_accept'; }).length;
    var pill = function (n, t, c) { return '<span style="border:1px solid ' + c + '66;color:' + c + ';border-radius:99px;padding:2px 10px;font-size:.7rem;font-weight:700">' + n + ' ' + t + '</span>'; };
    var lr = null; try { var q3 = await SBc().from('growth_settings').select('value').eq('key', 'auto_assign_last_run').maybeSingle(); lr = q3 && q3.data && q3.data.value; } catch (e) { }
    var age = lr && lr.at ? Math.round((Date.now() - new Date(lr.at)) / 6e4) : null, runPill = age === null ? pill('never ran by itself', 'Not yet', '#f59e0b') : pill('last ran ' + (age < 1 ? 'just now' : age < 60 ? age + ' min ago' : Math.round(age / 60) + ' h ago'), age > 15 && CFG.enabled ? '⚠️' : '✓', age > 15 && CFG.enabled ? '#f59e0b' : '#22c55e');
    var warn = CFG.enabled && (age === null || age > 15) ? '<div style="border:1px solid #f59e0b;background:rgba(245,158,11,.1);border-radius:8px;padding:8px 10px;font-size:.74rem;margin-bottom:8px">⚠️ <b>It is switched on but not running by itself.</b> ' + (age === null ? 'It has never been started by the Cron job.' : 'The Cron job has not run for ' + (age < 60 ? age + ' minutes' : Math.round(age / 60) + ' hours') + '.') + ' Open <b>"Make it run by itself"</b> at the bottom and set it up once (2 minutes). Until then, press <b>Run now</b> to process bookings.</div>' : '';
    return warn + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px">' + runPill + pill(web, 'website booking' + (web === 1 ? '' : 's') + ' waiting', '#60a5fa') + pill(off, 'offer' + (off === 1 ? '' : 's') + ' awaiting a reply', '#a78bfa') + pill(ATT.length, 'need' + (ATT.length === 1 ? 's' : '') + ' your attention', ATT.length ? '#ef4444' : '#22c55e') + '</div>';
  }
  /* priority marks per instructor */
  var PRIO = [[2, 'Top'], [1, 'High'], [0, 'Equal'], [-1, 'Low'], [-2, 'Last']];
  function bookedWhen(r) { var t = 0; String(r.admin_notes || '').split('\n').forEach(function (l) { if (/✅ Booked — confirmed/.test(l)) { var d = Date.parse(l.split(' · ')[0]); if (!isNaN(d)) t = d; } }); return t || new Date(r.paid_at || r.created_at).getTime(); }
  async function fillPrio() {
    var el = document.getElementById('aaPrio'); if (!el) return; await loadTraits();
    var mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); mon = mon.getTime();
    var refs = window.DSQ_ADMIN.refs() || [], ins = (window.DSQ_ADMIN.instrs() || []).filter(function (i) { return i.status === 'approved'; }).sort(function (a, b) { return String(a.full_name).localeCompare(String(b.full_name)); });
    if (!ins.length) { el.innerHTML = '<span style="color:var(--txt4)">No approved instructors loaded yet.</span>'; return; }
    el.innerHTML = '<div style="border:1px solid var(--bdr);border-radius:10px;overflow:hidden">' + ins.map(function (i) {
      var t = TR[i.id] || {}, bw = 0, lastT = 0, fr = String(i.instructor_model || '').toLowerCase() === 'franchise';
      refs.forEach(function (r) { if (String(r.instructor_id) !== String(i.id) || r.is_cancelled || r.is_credit) return; var ct = new Date(r.created_at).getTime(); if (ct > lastT) lastT = ct; try { if (window._refAdminBooked(r) && bookedWhen(r) >= mon) bw++; } catch (e) { } });
      var min = fr ? (CFG.franchiseMin || 0) : 0, low = min && bw < min;
      return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 10px;border-top:1px solid var(--bdr)"><b style="flex:1;min-width:120px">' + E(i.full_name) + '</b><span style="font-size:.66rem;padding:1px 7px;border-radius:99px;background:rgba(148,163,184,.18)">' + (fr ? 'franchise' : 'referral') + '</span>' +
        '<span style="font-size:.7rem;color:' + (low ? '#f59e0b' : 'var(--txt3)') + '">' + bw + (min ? ' of ' + min : '') + ' booked this week' + (low ? ' ⚠️' : '') + '</span>' + (function () { var d = lastT ? Math.floor((Date.now() - lastT) / 864e5) : null, bad = d === null || d >= (CFG.droughtDays || 7); return '<span style="font-size:.7rem;color:' + (bad ? '#f59e0b' : 'var(--txt4)') + '">' + (d === null ? 'no student yet' : d === 0 ? 'student today' : 'last student ' + d + 'd ago') + (bad ? ' ⚠️' : '') + '</span>'; })() +
        '<select class="dsq-inp" style="width:auto;padding:2px 6px;font-size:.74rem" onchange="DSQAA.setPrio(\'' + i.id + '\',this.value)">' + PRIO.map(function (p) { return '<option value="' + p[0] + '"' + ((t.priority || 0) === p[0] ? ' selected' : '') + '>' + (p[0] === 0 ? 'Equal (default)' : p[1] + ' priority') + '</option>'; }).join('') + '</select></div>';
    }).join('') + '</div>';
  }
  async function setPrio(id, val) {
    await loadTraits(); TR[id] = TR[id] || {}; var n = parseInt(val, 10) || 0; if (n) TR[id].priority = n; else delete TR[id].priority; if (!Object.keys(TR[id]).length) delete TR[id];
    var r = await SBc().from('growth_settings').upsert({ key: 'instructor_traits', value: TR, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 5000); return; }
    var nm = ((window.DSQ_ADMIN.instrs() || []).find(function (x) { return String(x.id) === String(id); }) || {}).full_name || 'instructor'; toast('Saved', 'success', 1500); log('Priority for ' + nm + ' set to ' + (PRIO.filter(function (p) { return p[0] === n; })[0] || [0, 'Equal'])[1]);
  }
  async function mount() {
    var h = document.getElementById('aaHolder'); if (!h) return; await load();
    var fu = CFG.followups, oldOn = null; try { oldOn = typeof window.getAutoAssign === 'function' ? await window.getAutoAssign() : null; } catch (e) { }
    var live = ''; try { live = await liveStatus(); } catch (e) { }
    var sec = function (ico, title, sub, body, open) { return '<details class="aaSec"' + (open ? ' open' : '') + ' style="border:1px solid var(--bdr);border-radius:10px;margin:8px 0;background:rgba(255,255,255,.02)"><summary style="cursor:pointer;padding:9px 12px;font-weight:800;font-size:.82rem;list-style:none">' + ico + ' ' + title + ' <span style="font-weight:500;font-size:.7rem;color:var(--txt4);margin-left:6px">' + sub + '</span></summary><div style="padding:0 12px 12px">' + body + '</div></details>'; };
    var grid = function (x) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:6px 0">' + x + '</div>'; };
    var hint = function (t) { return '<div style="font-size:.7rem;color:var(--txt4);margin:4px 0 2px;line-height:1.5">' + t + '</div>'; };
    var chk = function (id, on, html) { return '<label style="display:flex;gap:7px;align-items:flex-start;font-size:.76rem;margin:5px 0;cursor:pointer"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + ' style="margin-top:2px">' + '<span>' + html + '</span></label>'; };
    h.innerHTML = '<div style="border:1px solid ' + (CFG.enabled ? 'rgba(34,197,94,.5)' : 'var(--bdr)') + ';border-radius:12px;padding:12px;margin:10px 0">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-weight:800;font-size:1rem">🤖 Auto-assign website bookings</div><span style="font-weight:700;font-size:.7rem;padding:2px 9px;border-radius:99px;background:' + (CFG.enabled ? 'rgba(34,197,94,.2);color:#22c55e' : 'rgba(148,163,184,.2);color:#94a3b8') + '">' + (CFG.enabled ? (CFG.mode === 'suggest' ? 'ON · suggest only' : 'ON · assigning') : 'OFF') + '</span></div>' +
      '<div style="font-size:.74rem;color:var(--txt3);margin:4px 0 8px;line-height:1.5">New website bookings are picked up by the server (even when admin is closed). It chooses an instructor, asks them to accept, WhatsApps the student, and tells you (<b>attention required</b>) whenever it needs you.</div>' +
      '<div id="aaPlain" style="border:1px dashed var(--bdr);border-radius:10px;padding:8px 12px;margin:0 0 8px;font-size:.74rem;line-height:1.6"></div>' + live + (oldOn ? '<div style="border:1px solid #ef4444;background:rgba(239,68,68,.1);border-radius:8px;padding:8px 10px;font-size:.74rem;margin-bottom:8px">⚠️ The <b>old autopilot</b> is still switched on, and it can assign students on its own. Switch it off so the two do not both assign. <button class="btn-s" style="font-size:.7rem;margin-left:6px" onclick="DSQAA.oldOff()">Switch the old one off</button> Also stop its cron-job.org job, if you set one up.</div>' : '') +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;margin:8px 0">' +
        '<label style="display:flex;gap:9px;align-items:center;cursor:pointer;border:1px solid var(--bdr);border-radius:10px;padding:10px 12px"><input type="checkbox" id="aaOn"' + (CFG.enabled ? ' checked' : '') + ' style="width:20px;height:20px"><span><b>Auto-assign is ON</b><br><span style="font-size:.7rem;color:var(--txt3)">Untick = OFF: you assign in Find &amp; Assign as before. (Tick, then Save.)</span></span></label>' +
        '<label style="font-size:.74rem;display:block;border:1px solid var(--bdr);border-radius:10px;padding:8px 12px"><span style="color:var(--txt3)">What should it do?</span><select id="aaMode" class="dsq-inp" style="margin-top:3px"><option value="suggest"' + (CFG.mode === 'suggest' ? ' selected' : '') + '>Suggest only (safe): tells me who it would pick, sends nothing</option><option value="assign"' + (CFG.mode === 'assign' ? ' selected' : '') + '>Assign and send WhatsApp messages</option></select></label></div>' +
      chk('aaOlder', false, 'When I switch it on, also include bookings that are <b>already waiting</b> (otherwise only new ones from now)') +
      sec('🎯', 'Who gets the jobs', 'distance, priorities, weekly minimum', grid(
          num('aaConf', 'Distance limit (miles)', CFG.confirmMiles, 'Up to this distance the instructor is asked to accept. Over this: attention required') +
          num('aaDirect', 'Send details straight away within … miles', CFG.directMiles, 'Franchise instructors (and anyone you set to "Send straight away") get the full student details at once, with no Accept needed, when the student is this close. The student is told who their instructor is at once. Further away they are asked first. 0 = never. Set per instructor in their Settings') +
          num('aaFrMin', 'Franchise minimum: confirmed bookings per week', CFG.franchiseMin, 'Franchise instructors below this are offered the next student first (if within the distance limit). 0 = off. A package\'s own minimum replaces it') +
          num('aaPrioMi', 'Each priority step counts as … miles closer', CFG.priorityMiles, 'Top / High = closer, Low / Last = further. Everyone is Equal by default') +
          num('aaShort', 'Each job still missing counts as … miles closer', CFG.shortfallMiles, 'Among instructors who are owed jobs, the one furthest behind goes first') +
          num('aaFair', 'Fairness: miles of help per idle day', CFG.fairnessMiles, 'Every day an instructor goes without a student counts as this many miles closer, so nobody is left out. 0 = off', 0.1) +
          num('aaFairAfter', 'Fairness starts after … idle days', CFG.fairnessAfterDays) + num('aaFairCap', 'Fairness never helps by more than … miles', CFG.fairnessCap) +
          num('aaDrought', 'Warn me when an instructor has no student for … days (0 = off)', CFG.droughtDays, 'Shows in Attention required with the likely reasons. No WhatsApp ping') +
          num('aaDay', 'Soft limit: students given today', CFG.dailyLimit, 'Over this, the instructor is asked LAST') +
          num('aaWeek', 'Soft limit: booked this week', CFG.weeklyLimit, 'Over this, the instructor is asked LAST') +
          chk('aaFemFirst', CFG.femaleStudentFirst !== false, '<b>Female students: a female instructor first</b> when one is within the distance below, otherwise the normal order. Judged from the student name, title or her own words.') + num('aaFemMi', 'Female student: female instructor within … miles', CFG.femaleStudentMiles, 'Beyond this the normal order applies') +
          num('aaCap', 'Hard cap: new students a week (0 = none)', CFG.maxPerWeek) + num('aaRetry', 'Other instructors to try', CFG.retries, 'After a "can\'t take" or no reply, before it comes to you') + num('aaFee', 'Referral fee to record (£)', CFG.refFee, 'Franchise = £0')) +
        '<label style="font-size:.74rem;display:block;margin:6px 0"><span style="color:var(--txt3)">Booking asks for a female instructor</span><select id="aaFem" class="dsq-inp" style="margin-top:2px"><option value="require"' + (CFG.femaleRule === 'require' ? ' selected' : '') + '>Only female instructors (tick "Female instructor" on their profile)</option><option value="prefer"' + (CFG.femaleRule === 'prefer' ? ' selected' : '') + '>Prefer female, but anyone is allowed</option></select></label>' +
        hint('<b>Order of choosing:</b> 1) instructors not over a soft limit, 2) franchise / package instructors still owed their weekly minimum, 3) the closest after priority marks (Top −2 steps … Last +2 steps) and fairness (an instructor with no recent student counts as closer, so everyone keeps getting jobs). A package that has not started yet gets no jobs. If everyone nearby declines or is over a limit, the closest gets it anyway.') +
        '<div style="font-weight:800;font-size:.78rem;margin:10px 0 4px">Priority by instructor <span style="font-weight:500;color:var(--txt4)">(everyone is Equal until you change it)</span></div><div id="aaPrio" style="font-size:.74rem"></div>', true) +
      sec('⏰', 'Timing', 'reply times, quiet hours', chk('aaAny', CFG.anytime !== false, '<b>Message instructors straight away, day or night</b> (recommended). The offer hours below are ignored and the reply timers run round the clock. Untick to use quiet hours.') + grid(
          num('aaConc', 'Bookings worked on at the same time (1–10)', CFG.concurrency, 'Each booking is looked up, ranked and messaged on its own, so a slow one never holds up the others') + num('aaPerDay', 'Safety: most bookings handled per day (0 = no limit)', CFG.maxPerDay, 'If more arrive than this in one day, it stops and tells you, so a runaway or spam wave cannot message everyone') + num('aaPerRun', 'Most new bookings started per run', CFG.maxPerRun, 'A run happens every 2 minutes. The rest wait for the next run, so a rush never floods your instructors') +
          num('aaReply', 'Minutes to reply before the next instructor is asked', CFG.replyMinutes) + num('aaAuto35', 'No reply after … minutes: assign anyway if they cover the area (0 = off)', CFG.autoAssignAfterMinutes, 'Only when their Covered Postcodes include the student\'s area') + num('aaAuto', 'Assign straight away within … miles (0 = ask everyone first)', CFG.autoMiles) +
          num('aaH1', 'Offers go out from (UK hour)', CFG.hours[0]) + num('aaH2', 'Offers stop at (UK hour)', CFG.hours[1]) + num('aaK1', 'Tell the student we have their booking from (UK hour)', CFG.ackHours[0]) + num('aaK2', '… until (UK hour)', CFG.ackHours[1])) +
        hint('Instructors are never contacted at night, and the reply timers <b>only count the hours above</b>, so a midnight booking is offered in the morning and the instructor gets their full time.')) +
      sec('💬', 'Messages', 'who gets WhatsApp', chk('aaAck', CFG.ackStudent, 'WhatsApp every new <b>website booking</b> straight away: <i>"we have passed your details to an instructor"</i> (once per booking)') + chk('aaMi', CFG.messageInstructor, 'Message the instructor (the offer)') + chk('aaMs', CFG.messageStudent, 'Message the student (only after the instructor agrees)') + chk('aaTerms', CFG.sendTerms === true, 'Also send the student the <b>terms &amp; conditions</b> message after their welcome (off for now)'))  +
      sec('🔁', 'Check the student booked', 'WhatsApp follow-ups', fu_html()) +
      sec('💷', 'Billing & money', 'when to chase, when to tell you', hint('Chasing runs by itself (while auto-assign is ON and sending) and only concerns <b>referral</b> instructors. Franchise instructors are never sent referral messages. Nothing is ever marked paid automatically.') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px">' +
          num('aaUnpaid2', 'Alert + message when this many booked students are unpaid', CFG.unpaidLimit, 'Also the soft limit: that instructor is asked LAST for new students. 0 = off') +
          num('aaBalAmt', 'Also alert + message when they owe at least £ …', CFG.balanceAmount, 'e.g. 50 or 75. Works on its own, even with fewer unpaid students. 0 = off') +
          num('aaBalDays', 'Repeat the reminder to the same instructor every … days', CFG.balanceRepeatDays, 'Minimum 1. Default 7') +
          num('aaBalH1', 'Balance reminders from (UK hour)', CFG.balanceHours[0]) + num('aaBalH2', 'Balance reminders until (UK hour)', CFG.balanceHours[1], 'Never on Sundays') +
          num('aaDigAmt', 'Weekly billing summary only if at least £ …', CFG.digestMinAmount, '0 = always when anything is owed') +
          '<label style="font-size:.72rem;display:block"><span style="color:var(--txt3)">Weekly billing summary day</span><select id="aaDigDay" class="dsq-inp" style="margin-top:2px">' + ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(function (d, k) { return '<option value="' + k + '"' + ((CFG.digestDay || 0) === k ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label></div>' +
          chk('aaDig', CFG.billingDigest !== false, '<b>Weekly billing summary</b> in Needs you: referral fees and franchise weekly fees owed (to you only)') +
          chk('aaBal2', CFG.balanceAuto !== false, '<b>WhatsApp referral instructors their balance</b> (template dsq_instructor_balance, with an "I have paid" button)') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin-top:6px">' + num('aaMsgI', 'Most automatic messages to ONE instructor a day', CFG.maxMsgsInstructor, 'Check-ins and reminders wait if reached. Offers are never held back. 0 = no limit') + num('aaMsgS', 'Most automatic messages to ONE student a day', CFG.maxMsgsStudent, '0 = no limit') + '</div>') +
      sec('🤖', 'WhatsApp booking assistant', 'Claude collects bookings from WhatsApp chats', hint('When someone WhatsApps the business number to book, Claude asks for their name, postcode, gearbox and times, then adds the booking for auto-assign. It never quotes prices or promises times. Anything else is handed to you as an alert. <span id="aaAiKey">Checking the Anthropic key…</span>') +
          chk('aaAi', CFG.aiAssistant, '<b>Turn the assistant ON</b> (it answers WhatsApp chats from people who are not instructors)') +
          chk('aaAiSend', CFG.aiSend !== false, '<b>✉️ Let Claude SEND messages</b> (replies and confirmations to students). Untick for <b>read only</b>: Claude reads the chats, takes out the booking details and saves the booking, but never sends anything.') +
          chk('aaAiTest', CFG.aiTestOnly !== false, '<b>Test mode:</b> it only answers YOUR admin phone number (set in Alerts to you). Untick when you are happy with the test.') +
          '<label style="font-size:.72rem;display:block;margin:6px 0"><span style="color:var(--txt3)">Facts the assistant may tell students (one per line). Empty = the built-in facts from your terms</span><textarea id="aaAiFacts" class="dsq-inp" rows="6" placeholder="- The minimum booking is 2 hours&#10;- Cancel free with more than 24 hours notice, otherwise £35 per hour booked&#10;- We cover Greater Manchester" style="margin-top:2px;width:100%">' + E(CFG.aiFacts || '') + '</textarea><span style="color:var(--txt4);font-size:.64rem">It states only these facts. Anything not written here, it says the team will confirm. Complaints, payments, cancellations, emergencies, test questions, STOP and requests for a person always get a fixed safe reply and an alert to you.</span></label>' +
          num('aaAiHold', 'Hold a WhatsApp enquiry for … minutes before auto-assign offers it', CFG.aiHoldMinutes, 'So Claude can still collect availability and the rest. It is assigned at once if availability is already given. 0 = no wait') +
          num('aaAiMax', 'Hand over to you after … messages from one person in a day', CFG.aiMaxMessages, 'Stops long chats going round in circles') +
          hint('Only one assistant should answer on this number. If the Meta AI is still on, pause its replies first (keep the subscription), or both will answer.')) +
      sec('☀️', 'Summary, reminders & ADI replies', 'extras that run by themselves',
          hint('Three optional extras. Each uses a <b>new WhatsApp template</b> that Meta has to approve. <b>While a template is in review, nothing that works today changes</b>: the morning summary goes out through the alert template you already have, the offer reminder is only sent to an instructor who has messaged you in the last 24 hours, and the ADI reply simply waits. Each one upgrades by itself when its template is approved.') +
          chk('aaMorning', CFG.morningSummary !== false, '<b>Morning summary</b> to my WhatsApp: new bookings, offers waiting, ADI enquiries, failed messages and chats waiting for me (needs my number above)') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px">' + num('aaMorningH', 'Send it from (UK hour)', CFG.morningHour === undefined ? 8 : CFG.morningHour, 'Once a day, within four hours of this time') + num('aaChase', 'Remind an instructor who has not answered after … minutes (0 = off)', CFG.chaseMinutes === undefined ? 20 : CFG.chaseMinutes, 'One gentle reminder per offer, counted in waking hours, before the offer moves on') + '</div>' +
          '<div style="margin:6px 0"><button class="btn-s" type="button" onclick="DSQHub.sendSummary()">☀️ Send me the summary now</button> <span id="aaSumOut" style="font-size:.74rem;color:var(--txt3)"></span></div>' +
          chk('aaAdiReply', CFG.adiAutoReply !== false, '<b>Thank people on WhatsApp</b> when they send the ADI Part 3 training form (they already agreed to be contacted)')) +
      sec('📈', 'Claude cost estimate', 'optional', hint('The <b>📈 Claude usage</b> tab counts every call and every token. Add what you pay Anthropic per <b>million</b> tokens (from your Anthropic billing page) and it will also show an estimate. Left empty it shows tokens only.') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px"><label style="font-size:.72rem"><span style="color:var(--txt3)">Price per million INPUT tokens</span><input id="aaPriceIn" class="dsq-inp" value="' + E(CFG.claudeInPrice || '') + '" placeholder="e.g. 1.00" style="margin-top:2px"></label><label style="font-size:.72rem"><span style="color:var(--txt3)">Price per million OUTPUT tokens</span><input id="aaPriceOut" class="dsq-inp" value="' + E(CFG.claudeOutPrice || '') + '" placeholder="e.g. 5.00" style="margin-top:2px"></label></div>') +
      sec('🚨', 'Alerts to you', 'attention required', '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px"><label style="font-size:.72rem"><span style="color:var(--txt3)">Your WhatsApp number for alerts</span><input id="aaPhone" class="dsq-inp" value="' + E(CFG.adminPhone) + '" placeholder="07700 900123" style="margin-top:2px"></label></div>' + chk('aaAlert', CFG.adminAlerts, 'WhatsApp me when attention is needed')) +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;position:sticky;bottom:0;background:var(--dk2);padding:8px 0"><button class="btn-p" onclick="DSQAA.saveForm()">💾 Save</button><button class="btn-s" onclick="DSQAA.preview()">👀 Preview</button><button class="btn-s" onclick="DSQAA.readiness()">🩺 Check my data</button><button class="btn-s" onclick="DSQAA.runNow()">▶ Run now</button></div>' +
      '<div id="aaOut" style="font-size:.76rem;margin-top:8px"></div>' +
      '<details style="margin-top:8px" ontoggle="if(this.open)DSQAA.recent()"><summary style="cursor:pointer;font-weight:700;font-size:.78rem">📜 What auto-assign did recently</summary><div id="aaRecent" style="font-size:.74rem;margin-top:4px;color:var(--txt3)">Loading…</div></details>' +
      '<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;font-size:.78rem">Make it run by itself (one-time, 2 minutes)</summary><div style="font-size:.74rem;line-height:1.6;color:var(--txt3);margin-top:4px">Supabase → Integrations → Cron → new job → every <b>2 minutes</b> (<code>*/2 * * * *</code>) → Supabase Edge Function → <b>whatsapp</b> → POST, body <code>{"action":"auto_assign","cron":true}</code>, header <code>x-admin-key</code> = your email admin key. It only works between the hours above and only on bookings created after you switched it on.</div></details>' +
      '</div>';
    try { if (window.DSQWA) DSQWA.status(false).then(function (st) { var e = document.getElementById('aaAiKey'); if (e) e.innerHTML = st && st.ai_key ? '<b style="color:#22c55e">✅ Anthropic key found.</b>' : '<b style="color:#ef4444">❌ No ANTHROPIC_API_KEY secret in Supabase yet (or the function is out of date).</b>'; }).catch(function () { }); } catch (e) { }
    fillPrio(); plain(); var hh = document.getElementById('aaHolder'); hh.addEventListener('input', plain); hh.addEventListener('change', plain);
  }
  /* the settings in plain English, updated as you type */
  function plain() {
    var el = document.getElementById('aaPlain'); if (!el) return; var g = function (id, d) { var x = document.getElementById(id); if (!x) return d; var f = parseFloat(x.value); return isNaN(f) ? d : f; };
    var on = (document.getElementById('aaOn') || {}).checked, mode = (document.getElementById('aaMode') || {}).value, conf = g('aaConf', 8), rep = g('aaReply', 90), cov = g('aaAuto35', 35), h1 = g('aaH1', 8), h2 = g('aaH2', 20), fm = g('aaFrMin', 3), fair = g('aaFair', 0), dd = g('aaDay', 2), ww = g('aaWeek', 4);
    var hr = function (h) { return (h < 10 ? '0' : '') + h + ':00'; }, li = function (t) { return '<li style="margin:2px 0">' + t + '</li>'; };
    el.innerHTML = '<b>In plain English:</b><ul style="margin:4px 0 0 16px;padding:0">' +
      li(!on ? 'Auto-assign is <b style="color:#94a3b8">OFF</b>. Nothing happens by itself; you use Find &amp; Assign.' : mode === 'suggest' ? 'Auto-assign is <b style="color:#a78bfa">ON in suggest-only mode</b>: it works out who it would pick and tells you. It sends no messages and assigns nobody.' : 'Auto-assign is <b style="color:#22c55e">ON</b>: it assigns website bookings and sends the WhatsApp messages for real.') +
      li('A new website booking goes to the <b>closest</b> suitable instructor within <b>' + conf + ' miles</b>' + (fm > 0 ? ', but franchise instructors with fewer than <b>' + fm + '</b> confirmed bookings this week are asked first' : '') + (fair > 0 ? ', and anyone who has gone without a student for a while moves up' : '') + '. Over <b>' + conf + ' miles</b> it comes to you.') +
      li('The instructor has <b>' + rep + ' minutes</b> to tap Accept' + (cov > 0 && cov < rep ? '. After <b>' + cov + ' minutes</b> with no reply it assigns them anyway if the student is in a postcode they cover' : '') + '; otherwise it moves to the next instructor.') +
      li('Up to <b>' + Math.max(1, Math.min(10, g('aaConc', 5))) + '</b> bookings are worked on <b>at the same time</b>, each independently, and up to <b>' + g('aaPerRun', 10) + '</b> new ones are started every run, so several students are handled together.') +
      li(document.getElementById('aaAny') && document.getElementById('aaAny').checked ? 'Instructors and students are messaged <b>straight away, day or night</b>.' : 'Instructors are only messaged between <b>' + hr(h1) + ' and ' + hr(h2) + '</b> (UK time), and the reply timers only count those hours.') +
      li('Anyone with more than <b>' + dd + '</b> students today or <b>' + ww + '</b> booked this week is asked last. The same student is never offered to two instructors.') + '</ul>';
  }
  function problems() {
    var g = function (id, d) { var x = document.getElementById(id); if (!x) return d; var f = parseFloat(x.value); return isNaN(f) ? d : f; }, out = [];
    var any = document.getElementById('aaAny') && document.getElementById('aaAny').checked;
    if (!any && g('aaH1', 8) >= g('aaH2', 20)) out.push('"Offers go out from" must be earlier than "Offers stop at".');
    if (!any && g('aaK1', 7) >= g('aaK2', 23)) out.push('"Tell the student" start hour must be earlier than its end hour.');
    if (g('aaConf', 8) < 1) out.push('The distance limit must be at least 1 mile.');
    if (g('aaAuto', 0) > g('aaConf', 8)) out.push('"Assign straight away within" cannot be more than the distance limit.');
    if (g('aaAuto35', 35) > 0 && g('aaAuto35', 35) >= g('aaReply', 90)) out.push('"No reply after … minutes: assign anyway" must be LESS than the minutes to reply (' + g('aaReply', 90) + '), otherwise it never happens.');
    return out;
  }
  async function recent() {
    var el = document.getElementById('aaRecent'); if (!el) return;
    try { var r = await SBc().from('admin_activity_log').select('created_at,summary').eq('area', 'auto_assign').order('created_at', { ascending: false }).limit(15); var rows = r.data || [];
      el.innerHTML = rows.length ? rows.map(function (x) { return '<div style="padding:4px 0;border-top:1px solid var(--bdr)"><span style="color:var(--txt4)">' + ago(x.created_at) + '</span> · ' + E(x.summary) + '</div>'; }).join('') : 'Nothing yet. Once it assigns or asks someone, it is listed here.'; } catch (e) { el.textContent = 'Could not load.'; }
  }
  var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; }, n = function (id, d) { var x = parseFloat(v(id)); return isNaN(x) ? d : x; };
  async function saveForm() {
    var pr = problems(); if (pr.length) { toast('Not saved: ' + pr[0], 'error', 7000); var po = document.getElementById('aaOut'); if (po) po.innerHTML = '<div style="color:#f87171">' + pr.map(E).join('<br>') + '</div>'; return; }
    await load(); var was = CFG.enabled, on = !!document.getElementById('aaOn').checked;
    CFG.enabled = on; CFG.mode = v('aaMode'); CFG.autoMiles = n('aaAuto', 5); CFG.confirmMiles = Math.max(CFG.autoMiles, n('aaConf', 8)); CFG.directMiles = Math.max(0, n('aaDirect', 6)); CFG.replyMinutes = Math.max(5, n('aaReply', 90)); CFG.autoAssignAfterMinutes = Math.max(0, n('aaAuto35', 35)); CFG.retries = Math.max(0, n('aaRetry', 2)); CFG.maxPerWeek = Math.max(0, n('aaCap', 0)); CFG.refFee = Math.max(0, n('aaFee', 25));
    CFG.anytime = !!(document.getElementById('aaAny') && document.getElementById('aaAny').checked); CFG.hours = [Math.max(0, Math.min(23, n('aaH1', 8))), Math.max(1, Math.min(24, n('aaH2', 20)))]; CFG.ackHours = [Math.max(0, Math.min(23, n('aaK1', 7))), Math.max(1, Math.min(24, n('aaK2', 23)))]; CFG.femaleRule = v('aaFem'); CFG.adminPhone = v('aaPhone').trim(); CFG.adminAlerts = !!document.getElementById('aaAlert').checked;
    var wasAck = CFG.ackStudent; CFG.ackStudent = !!document.getElementById('aaAck').checked; if (CFG.ackStudent && !wasAck) CFG.ackSince = new Date().toISOString(); CFG.messageInstructor = !!document.getElementById('aaMi').checked; CFG.messageStudent = !!document.getElementById('aaMs').checked; CFG.sendTerms = !!document.getElementById('aaTerms').checked;
    CFG.concurrency = Math.max(1, Math.min(10, Math.round(n('aaConc', 5)))); CFG.maxPerRun = Math.max(1, Math.round(n('aaPerRun', 10))); CFG.maxPerDay = Math.max(0, Math.round(n('aaPerDay', 40))); CFG.franchiseMin = Math.max(0, Math.round(n('aaFrMin', 3))); CFG.priorityMiles = Math.max(0, n('aaPrioMi', 3)); CFG.shortfallMiles = Math.max(0, n('aaShort', 2)); CFG.fairnessMiles = Math.max(0, n('aaFair', 0.5)); CFG.fairnessAfterDays = Math.max(0, n('aaFairAfter', 2)); CFG.fairnessCap = Math.max(0, n('aaFairCap', 4)); CFG.droughtDays = Math.max(0, Math.round(n('aaDrought', 7))); CFG.dailyLimit = Math.max(0, n('aaDay', 2)); CFG.weeklyLimit = Math.max(0, n('aaWeek', 4));  CFG.followups = { enabled: !!document.getElementById('aaFuOn').checked, acceptWaitHours: Math.max(1, n('aaFuAcc', 24)), checkinDays: Math.max(0, n('aaFuDays', 3)), instructorAfterDays: 0, maxPerWeek: Math.max(1, Math.round(n('aaFuCap', 2))), repeatDays: Math.max(1, n('aaFuRep', 4)), rounds: Math.max(1, Math.round(n('aaFuRounds', 4))) };
    CFG.unpaidLimit = Math.max(0, Math.round(n('aaUnpaid2', CFG.unpaidLimit))); CFG.balanceAmount = Math.max(0, n('aaBalAmt', 0)); CFG.balanceRepeatDays = Math.max(1, Math.round(n('aaBalDays', 7))); CFG.balanceHours = [Math.max(0, Math.min(23, Math.round(n('aaBalH1', 9)))), Math.max(1, Math.min(24, Math.round(n('aaBalH2', 18))))]; CFG.digestMinAmount = Math.max(0, n('aaDigAmt', 0)); CFG.digestDay = Math.max(0, Math.min(6, Math.round(n('aaDigDay', 0)))); CFG.billingDigest = !!document.getElementById('aaDig').checked; CFG.balanceAuto = !!document.getElementById('aaBal2').checked; CFG.maxMsgsInstructor = Math.max(0, Math.round(n('aaMsgI', 8))); CFG.maxMsgsStudent = Math.max(0, Math.round(n('aaMsgS', 4)));
    CFG.morningSummary = !!(document.getElementById('aaMorning') || {}).checked; CFG.morningHour = Math.max(0, Math.min(20, Math.round(n('aaMorningH', 8)))); CFG.chaseMinutes = Math.max(0, Math.round(n('aaChase', 20))); CFG.adiAutoReply = !!(document.getElementById('aaAdiReply') || {}).checked; CFG.claudeInPrice = String((document.getElementById('aaPriceIn') || {}).value || '').replace(/[^0-9.]/g, '').slice(0, 8); CFG.claudeOutPrice = String((document.getElementById('aaPriceOut') || {}).value || '').replace(/[^0-9.]/g, '').slice(0, 8);
    CFG.femaleStudentFirst = !!document.getElementById('aaFemFirst').checked; CFG.femaleStudentMiles = Math.max(0, n('aaFemMi', 5));
    CFG.aiAssistant = !!document.getElementById('aaAi').checked; CFG.aiTestOnly = !!document.getElementById('aaAiTest').checked; CFG.aiSend = !!document.getElementById('aaAiSend').checked; CFG.aiMaxMessages = Math.max(3, Math.round(n('aaAiMax', 14))); CFG.aiHoldMinutes = Math.max(0, n('aaAiHold', 5)); CFG.aiFacts = String((document.getElementById('aaAiFacts') || {}).value || '').slice(0, 2500);
    if (CFG.aiAssistant && !CFG.aiTestOnly && !confirm('Turn the assistant ON for real students?\n\nIt will answer anyone who WhatsApps the number (except instructors). Make sure the Meta AI is not also answering, and that you have tested it from your own phone.')) return;
    if (on && !was) CFG.since = document.getElementById('aaOlder').checked ? '' : new Date().toISOString();   // only bookings from now on, unless you say otherwise
    if (!(await save())) return; log('Auto-assign turned ' + (on ? 'ON (' + CFG.mode + ')' : 'OFF'));
    toast(on ? '🤖 Auto-assign is ON' + (CFG.mode === 'suggest' ? ' (suggest only)' : '') : 'Auto-assign is OFF', 'success', 3500); mount(); try { window.refreshAutoAssignBtn(); } catch (e) { }
  }
  async function preview() {
    var o = document.getElementById('aaOut'); if (!o) return; o.textContent = 'Working it out…';
    if (!window.DSQWA) return; var r = await DSQWA.call({ action: 'auto_assign', dry: true });
    if (!r.ok) { o.innerHTML = '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; return; }
    var since = CFG.since ? ' (only bookings since ' + new Date(CFG.since).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ')' : '';
    o.innerHTML = (r.results.length ? '<div style="color:var(--txt3);margin-bottom:4px">Nothing has been sent or changed. This is what it would do now' + since + ':</div>' + r.results.map(function (x) {
      var col = x.action === 'assign' ? '#22c55e' : x.action === 'offer' ? '#60a5fa' : x.action === 'suggest' ? '#a78bfa' : '#f59e0b', lab = { assign: 'Assign now', offer: 'Ask to accept', suggest: 'Suggest', attention: 'Attention' }[x.action] || x.action;
      return '<div style="padding:6px 0;border-top:1px solid var(--bdr)"><b>' + E(x.student) + '</b> <span style="color:var(--txt4)">' + E(x.postcode || '') + (x.female ? ' · female ' + (x.female === 'require' ? 'required' : 'preferred') : '') + '</span> → <b style="color:' + col + '">' + lab + '</b>' + (x.instructor ? ' ' + E(x.instructor) + ' · ' + x.dist + ' miles' : '') + (x.why ? '<div style="font-size:.7rem;color:#60a5fa">Why: ' + E(x.why) + '</div>' : '') + (x.reason ? ' <span style="color:#f59e0b">' + E(x.reason) + '</span>' : '') +
        ((x.top || []).length > 1 ? '<div style="font-size:.68rem;color:var(--txt4)">Next best: ' + x.top.slice(1).map(function (t) { return E(t.name) + ' (' + t.dist + ' mi' + ((t.over || []).length ? ', ' + E(t.over.join(' and ')) : '') + ')'; }).join(' · ') + '</div>' : '') + '</div>';
    }).join('') : '<div style="color:var(--txt3)">No waiting website bookings to handle' + since + '.</div>');
  }
  async function runNow() {
    if (!CFG.enabled) { toast('Switch auto-assign ON and Save first.', 'warn', 4000); return; }
    if (!confirm('Run auto-assign now? It will ' + (CFG.mode === 'suggest' ? 'only add suggestions to the attention list.' : 'assign and WhatsApp for real.'))) return;
    var o = document.getElementById('aaOut'); if (o) o.textContent = 'Running…'; var r = await DSQWA.call({ action: 'auto_assign' });
    if (o) o.innerHTML = r.ok ? (r.off ? 'It is switched off.' : r.waiting ? E(r.waiting) : '✅ Done: ' + (r.summary.assigned || 0) + ' assigned, ' + (r.summary.offered || 0) + ' asked to accept, ' + (r.summary.attention || 0) + ' need attention.') : '<span style="color:#f87171">' + E(r.error) + '</span>';
    poll(true);
  }
  async function oldOff() { try { await SBc().from('app_settings').update({ value: 'false', updated_at: new Date().toISOString() }).eq('key', 'autopilot_enabled'); toast('Old autopilot switched off', 'success', 3000); } catch (e) { toast('Could not: ' + e.message, 'error'); } mount(); try { window.refreshAutoAssignBtn(); } catch (e) { } }

  /* ---------- attention required ---------- */
  var KIND = { adi_lead: '🎓 ADI Part 3 enquiry', ai_handoff: '🤖 WhatsApp chat needs you', ai_error: '🤖 Assistant problem', billing_digest: '💷 Weekly billing', no_jobs: '😴 No students', female_unavailable: '👩 No female instructor', rebooking: '🔁 Booked again', balance_paid: '💷 Says paid', female_wait: '👩 Waiting for female', duplicate: '🔁 Duplicate', daily_cap: '🛑 Daily limit', no_match: '🔍 No match', declined: '🚫 Declined', declined_after: '🚫 Can\'t cover', no_reply: '⏰ No reply', postcode: '📍 Postcode', suggest: '💡 Suggestion', assign_failed: '⚠️ Failed', msg_failed: '💬 Message failed', no_accept: '⏳ Not accepted', no_confirm: '❓ No confirmation', not_contacted: '📵 Not contacted', unpaid_fees: '💷 Unpaid fees' };
  function badge() {
    var b = document.getElementById('attnBtn'), host = document.getElementById('waApiBtn');
    if (!b && host) { b = document.createElement('button'); b.id = 'attnBtn'; b.type = 'button'; b.onclick = openAttention; b.style.cssText = 'display:none;align-items:center;gap:6px;background:#dc2626;color:#fff;border:0;border-radius:9px;padding:6px 11px;font-size:.76rem;font-weight:800;cursor:pointer;white-space:nowrap;animation:attnPulse 2s infinite'; host.parentNode.insertBefore(b, host); var st = document.createElement('style'); st.textContent = '@keyframes attnPulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.5)}50%{box-shadow:0 0 0 7px rgba(220,38,38,0)}}'; document.head.appendChild(st); }
    if (!b) return; b.style.display = ATT.length ? 'inline-flex' : 'none'; b.innerHTML = '🚨 <span>' + ATT.length + ' need' + (ATT.length === 1 ? 's' : '') + ' attention</span>';
  }
  async function poll(quiet) {
    try {
      var r = await SBc().from('admin_attention').select('*').eq('resolved', false).order('created_at', { ascending: false }).limit(60); if (r.error) return;
      ATT = r.data || []; badge();
      if (seen === null) { try { seen = JSON.parse(localStorage.getItem('dsq_attn_seen') || '[]'); } catch (e) { seen = []; } }
      var fresh = ATT.filter(function (a) { return seen.indexOf(a.id) < 0; });
      if (fresh.length && !quiet) toast('🚨 Attention required: ' + fresh[0].title + (fresh.length > 1 ? ' (+' + (fresh.length - 1) + ' more)' : ''), 'warn', 12000);
      if (fresh.length) { seen = seen.concat(fresh.map(function (a) { return a.id; })).slice(-200); try { localStorage.setItem('dsq_attn_seen', JSON.stringify(seen)); } catch (e) { } }
      var m = document.getElementById('attnModal'); if (m) renderAttention();
    } catch (e) { }
  }

  /* "send the balance only": the amount, no student names */
  function unpaidOf(id) { var n = 0, amt = 0; (window.DSQ_ADMIN.refs() || []).forEach(function (r) { if (String(r.instructor_id) !== String(id) || r.is_paid || r.is_cancelled || r.is_credit) return; try { if (window._refAdminBooked(r)) { n++; amt += parseFloat(r.amount) || 0; } } catch (e) { } }); return { n: n, amt: amt }; }
  function balanceMsg(id) {
    var i = (window.DSQ_ADMIN.instrs() || []).find(function (x) { return String(x.id) === String(id); }) || {}, u = unpaidOf(id);
    return 'Hi ' + String(i.full_name || '').split(' ')[0] + ', you have ' + u.n + ' booked student' + (u.n === 1 ? '' : 's') + ' with £' + u.amt.toFixed(0) + ' in referral fees outstanding. Please pay and let us know, and we will keep sending you students. Thank you! DriveSQ';
  }
  function balanceButtons(id) {
    var i = (window.DSQ_ADMIN.instrs() || []).find(function (x) { return String(x.id) === String(id); }) || {}, ph = String(i.phone || '').replace(/\D/g, ''); ph = ph.indexOf('44') === 0 ? ph : ph.replace(/^0/, '44');
    return '<button class="btn-s" style="font-size:.72rem" onclick="DSQAA.copyBalance(\'' + id + '\')">📋 Copy balance message</button>' + (ph ? '<a class="btn-s" style="font-size:.72rem;text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/' + ph + '?text=' + encodeURIComponent(balanceMsg(id)) + '">💬 WhatsApp the balance</a>' : '');
  }
  async function copyBalance(id) { var m = balanceMsg(id); try { await navigator.clipboard.writeText(m); toast('Balance message copied', 'success', 2000); } catch (e) { window.prompt('Copy this message:', m); } }
  function renderAttention() {
    var m = document.getElementById('attnModal'); if (!m) return;
    m.firstChild.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.2rem;font-weight:700">🚨 Attention required</div><button class="btn-s" onclick="document.getElementById(\'attnModal\').remove()">Close</button></div>' +
      (ATT.length ? ATT.map(function (a) {
        return '<div style="border:1px solid #dc262666;background:rgba(220,38,38,.06);border-radius:12px;padding:10px 12px;margin-bottom:8px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="font-size:.64rem;font-weight:800;padding:2px 8px;border-radius:99px;background:rgba(220,38,38,.18);color:#f87171">' + (KIND[a.kind] || E(a.kind)) + '</span><b style="font-size:.84rem">' + E(a.title) + '</b><span style="margin-left:auto;font-size:.68rem;color:var(--txt4)">' + ago(a.created_at) + '</span></div>' +
          (a.detail ? '<div style="font-size:.76rem;color:var(--txt3);margin:5px 0">' + E(a.detail) + '</div>' : '') + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
          (a.waiting_id && !/-stu$/.test(a.waiting_id) && !/^(drought|unpaid|cap|chk|fw|ra|ack|bal)-/.test(a.waiting_id) && a.kind !== 'unpaid_fees' ? '<button class="btn-p" style="font-size:.72rem;padding:4px 12px" onclick="DSQAA.openBooking(\'' + a.waiting_id + '\',\'' + a.id + '\')">Open in Find &amp; Assign</button><button class="btn-s" style="font-size:.72rem" title="Let auto-assign try this booking again" onclick="DSQAA.retry(\'' + a.waiting_id + '\',\'' + a.id + '\')">Try again</button>' : '') +
          (a.kind === 'unpaid_fees' && a.instructor_id ? balanceButtons(a.instructor_id) : '') + (a.instructor_id ? '<button class="btn-s" style="font-size:.72rem" onclick="document.getElementById(\'attnModal\').remove();openRefDetail(\'' + a.instructor_id + '\',true)">Instructor\'s students</button>' : '') +
          '<button class="btn-s" style="font-size:.72rem;margin-left:auto" onclick="DSQAA.resolve(\'' + a.id + '\')">✓ Done</button></div></div>';
      }).join('') : '<div style="padding:18px;text-align:center;color:#22c55e;font-weight:700">✅ Nothing needs your attention</div>');
  }
  async function openAttention() {
    var m = document.getElementById('attnModal'); if (m) m.remove(); m = document.createElement('div'); m.id = 'attnModal'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99998;display:flex;align-items:center;justify-content:center;padding:14px'; m.onclick = function (e) { if (e.target === m) m.remove(); };
    document.body.appendChild(m); m.innerHTML = '<div style="background:var(--dk2);border:1px solid var(--bdr);border-radius:16px;width:100%;max-width:680px;max-height:90vh;overflow:auto;padding:16px"></div>'; await poll(true); renderAttention();
  }
  async function resolve(id) { await SBc().from('admin_attention').update({ resolved: true, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id); ATT = ATT.filter(function (a) { return a.id !== id; }); badge(); renderAttention(); }
  async function retry(wid, aid) {
    try { await SBc().from('auto_assign_jobs').delete().eq('waiting_id', String(wid)); } catch (e) { }
    await resolve(aid); toast('Auto-assign will try this booking again on its next run (or press Run now).', 'success', 4500);
  }
  async function openBooking(wid, aid) {
    var r = await SBc().from('waiting_list').select('*').eq('id', wid).maybeSingle(); var w = r && r.data; if (!w) { toast('That booking is no longer waiting.', 'info'); return; }
    if (w.status !== 'waiting') { toast('That booking has already been dealt with (' + w.status + ').', 'info'); await resolve(aid); return; }
    var m = document.getElementById('attnModal'); if (m) m.remove(); try { window.closeModal('webBookingsModal'); } catch (e) { }
    try { window.waitlistAssign(w.id, w.student_name, w.postcode || '', w.lesson_type || 'Manual', w.student_phone || '', w.notes || '', w.area || ''); } catch (e) { toast('Could not open Find & Assign: ' + e.message, 'error'); }
  }

  /* ---------- instructor traits: Female / Don't auto-assign ---------- */
  var TR = null;
  async function loadTraits() { if (TR) return TR; TR = {}; try { var r = await SBc().from('growth_settings').select('value').eq('key', 'instructor_traits').maybeSingle(); if (r && r.data && r.data.value) TR = r.data.value; } catch (e) { } return TR; }
  var traitsHolder = function (id) { return '<div id="instrTraits-' + id + '" style="font-size:.78rem;color:var(--txt4)">Loading…</div>'; };
  async function fillTraits(id) {
    var el = document.getElementById('instrTraits-' + id); if (!el) return; await loadTraits(); var t = TR[id] || {};
    el.innerHTML = '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:2px 0"><input type="checkbox" ' + (t.female ? 'checked' : '') + ' onchange="DSQAA.setTrait(\'' + id + '\',\'female\',this.checked)"> <b>Female instructor</b> <span style="color:var(--txt4)">(used when a booking asks for a female instructor)</span></label>' +
      '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:2px 0"><input type="checkbox" ' + (t.noAuto ? 'checked' : '') + ' onchange="DSQAA.setTrait(\'' + id + '\',\'noAuto\',this.checked)"> <b>Never auto-assign</b> <span style="color:var(--txt4)">(you still assign them by hand)</span></label>' +
      '<label style="display:flex;gap:6px;align-items:center;margin:4px 0"><b>Priority for jobs</b> <select class="dsq-inp" style="width:auto;padding:2px 6px;font-size:.76rem" onchange="DSQAA.setPrio(\''+id+'\',this.value)">' + PRIO.map(function (p) { return '<option value="' + p[0] + '"' + ((t.priority || 0) === p[0] ? ' selected' : '') + '>' + (p[0] === 0 ? 'Equal (default)' : p[1]) + '</option>'; }).join('') + '</select> <span style="color:var(--txt4);font-size:.7rem">Top / High = offered students sooner</span></label>';
  }
  /* save ALL of one instructor's auto-assign settings at once and record what changed in the admin activity log */
  var TLAB = { sendMode: 'How students reach them', coveredOnly: 'Covered areas only', female: 'Female instructor', noAuto: 'Ignored', noAutoNote: 'Reason', only: 'Students', pausedUntil: 'Paused until', priority: 'Priority', maxDay: 'Max per day', maxWeek: 'Max booked per week', maxWeekHard: 'Hard cap per week', minWeek: 'Weekly minimum', maxMiles: 'Max miles' };
  async function saveInstr(id, obj) {
    await loadTraits(); var old = TR[id] || {}, clean = {};
    Object.keys(obj).forEach(function (k) { var v = obj[k]; if (v === '' || v === null || v === undefined || v === false) return; clean[k] = typeof v === 'string' ? v.slice(0, 80) : v; });
    var ch = []; Object.keys(TLAB).forEach(function (k) { if (String(old[k] || '') !== String(clean[k] || '')) ch.push(TLAB[k] + ': ' + (old[k] ? (old[k] === true ? 'on' : old[k]) : 'default') + ' → ' + (clean[k] ? (clean[k] === true ? 'on' : clean[k]) : 'default')); });
    if (Object.keys(clean).length) TR[id] = clean; else delete TR[id];
    var r = await SBc().from('growth_settings').upsert({ key: 'instructor_traits', value: TR, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (r.error) { toast('Not saved: ' + r.error.message, 'error', 5000); return false; }
    var nm = ((window.DSQ_ADMIN.instrs() || []).find(function (i) { return String(i.id) === String(id); }) || {}).full_name || 'instructor';
    if (ch.length) { try { DSQLog.add(SBc(), { area: 'auto_assign', action: 'instructor_settings', summary: '⚙️ Auto-assign settings for ' + nm + ' changed: ' + ch.join('; '), instructor_id: id }); } catch (e) { } }
    toast(ch.length ? 'Saved' : 'Nothing changed', 'success', 1500); return true;
  }
  function getTraits(id) { return Object.assign({}, TR[id] || {}); }
  async function setTraitVal(id, k, v) {
    await loadTraits(); if (!TR[id]) return; if (v) TR[id][k] = String(v).slice(0, 80); else delete TR[id][k]; if (!Object.keys(TR[id]).length) delete TR[id];
    await SBc().from('growth_settings').upsert({ key: 'instructor_traits', value: TR, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }
  async function setTrait(id, k, on) {
    await loadTraits(); TR[id] = TR[id] || {}; if (on) TR[id][k] = true; else delete TR[id][k]; if (!Object.keys(TR[id]).length) delete TR[id];
    var r = await SBc().from('growth_settings').upsert({ key: 'instructor_traits', value: TR, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (r.error) toast('Not saved: ' + r.error.message, 'error', 5000); else { toast('Saved', 'success', 1500); var nm = ((window.DSQ_ADMIN.instrs() || []).find(function (i) { return String(i.id) === String(id); }) || {}).full_name || 'instructor'; log((on ? 'Set ' : 'Cleared ') + (k === 'female' ? 'female instructor' : 'never auto-assign') + ' for ' + nm); }
  }

    /* Find & Assign: the student asked for a woman (read from the booking's notes, the same wording auto-assign reads) */
  function femaleWish() {
    var n = String(window._fcRawNotes || ''), fn = String((document.getElementById('fc-notes') || {}).value || ''); n = n + '\n' + fn;
    if (/FEMALE INSTRUCTOR REQUESTED/i.test(n)) return 'require';
    if (/FEMALE PREFERRED|prefer[a-z]*\s+(?:a\s+)?female|female[^.\n]{0,30}(?:prefer|if possible|if you can)/i.test(n)) return 'prefer';
    if (/female instructor/i.test(n)) return 'require';
    return '';
  }
  function femaleFirst(ranked) {
    var w = femaleWish(); window._fcFemaleWish = w; if (!w || !TR) return ranked;
    var f = [], o = []; ranked.forEach(function (r) { ((TR[r.instr.id] || {}).female ? f : o).push(r); }); return f.concat(o);
  }
  function femaleChip(r) {
    var w = femaleWish(); if (!w) return ''; var isF = !!(TR && (TR[r.instr.id] || {}).female);
    return isF ? '<div style="font-size:.68rem;margin-top:3px;font-weight:800;color:#ec4899"><i class="bi bi-gender-female me-1"></i>Female instructor' + (w === 'require' ? ' · student asked for a woman' : ' · student prefers a woman') + '</div>'
      : (w === 'require' ? '<div style="font-size:.66rem;margin-top:3px;font-weight:600;color:#f59e0b"><i class="bi bi-exclamation-triangle me-1"></i>Student asked for a female instructor: ask them first</div>' : '');
  }

  /* Is the data good enough for auto-assign? Every approved instructor needs a location, a phone number and a lesson type. */
  var instrLoc = function (i) {
    var up = function (v) { return String(v || '').toUpperCase(); }, full = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/, out = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\b/;
    if (String(i.postcode || '').trim()) return i.postcode; var f = up(i.area).match(full) || up(i.address).match(full); if (f) return f[0];
    var o = up(i.area).match(out) || up(i.coverage_postcodes).match(out); return o ? o[0] : '';
  };
  var phoneOk = function (p) { var d = String(p || '').replace(/\(0\)/g, '').replace(/\D/g, ''); if (d.indexOf('0044') === 0) d = d.slice(2); else if (d.indexOf('0') === 0) d = '44' + d.slice(1); return d.length >= 10 && d.length <= 15; };
  async function readiness() {
    var o = document.getElementById('aaOut'); if (!o) return; o.textContent = 'Checking…'; await load(); await loadTraits();
    var ins = (window.DSQ_ADMIN.instrs() || []).filter(function (i) { return i.status === 'approved'; }), rows = [], nF = 0;
    ins.forEach(function (i) {
      var iss = [], loc = instrLoc(i), t = TR[i.id] || {}; if (t.female) nF++;
      if (!loc) iss.push('no postcode or area, so it can never be matched by distance'); else if (!/\d[A-Z]{2}\s*$/i.test(String(loc).trim())) iss.push('only an area code (' + loc + '), distances will be approximate. Add a full postcode');
      if (!phoneOk(i.phone)) iss.push('no valid mobile number, so WhatsApp cannot reach them');
      if (!i.car_type) iss.push('no lesson type (manual / automatic / both)');
      if (!String(i.coverage_postcodes || '').trim()) iss.push('no covered postcodes (they miss the coverage bonus)');
      if (!String(i.instructor_model || '').trim()) iss.push('no model set (franchise or referral)');
      rows.push({ i: i, iss: iss, t: t });
    });
    var bad = rows.filter(function (r) { return r.iss.length; }), ok = rows.length - bad.length, wl = 0;
    try { var since = new Date(Date.now() - 30 * 864e5).toISOString(); var r = await SBc().from('waiting_list').select('id,postcode,notes,status,created_at').gte('created_at', since).limit(500); (r.data || []).forEach(function (w) { if (/\[WEB\]/i.test(w.notes || '') && !(w.postcode || /Postcode:\s*\S/i.test(w.notes || ''))) wl++; }); } catch (e) { }
    o.innerHTML = '<div style="margin-bottom:6px"><b style="color:' + (bad.length ? '#f59e0b' : '#22c55e') + '">' + (bad.length ? bad.length + ' of ' + rows.length + ' instructors need attention' : '✅ All ' + rows.length + ' instructors are ready') + '</b> · ' + ok + ' ready · ' + nF + ' marked female</div>' +
      (nF === 0 && CFG.femaleRule === 'require' ? '<div style="color:#f59e0b;margin-bottom:6px">⚠️ No instructor is marked <b>Female instructor</b>, so bookings that ask for a female instructor will always go to your attention list. Tick it on each female instructor\'s profile.</div>' : '') +
      (wl ? '<div style="color:#f59e0b;margin-bottom:6px">⚠️ ' + wl + ' recent website booking' + (wl === 1 ? '' : 's') + ' have no postcode, so they cannot be matched.</div>' : '') +
      bad.map(function (r) { return '<div style="padding:5px 0;border-top:1px solid var(--bdr)"><b>' + E(r.i.full_name) + '</b> <button class="btn-s" style="font-size:.66rem;padding:1px 8px;margin-left:6px" onclick="document.getElementById(\'waSet\').remove();viewInstr(\'' + r.i.id + '\')">Open profile</button><ul style="margin:2px 0 0 18px;padding:0;font-size:.72rem;color:var(--txt3)">' + r.iss.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></div>'; }).join('');
  }

  /* ---------- the old "Auto-assign" button in Website Bookings now opens the new settings ---------- */
  function takeOver() {
    window.toggleAutoAssign = function () { if (window.DSQWA) DSQWA.openSettings('auto'); };
    window.refreshAutoAssignBtn = async function () {
      var b = document.getElementById('wbAutoBtn'); if (!b) return; await load(); var on = CFG.enabled;
      b.innerHTML = '<i class="bi bi-robot me-1"></i>Auto-assign: ' + (on ? '<span style="color:#4ade80">ON' + (CFG.mode === 'suggest' ? ' (suggest)' : '') + '</span> · settings' : '<span style="color:#94a3b8">OFF</span> · settings');
      b.title = 'Automatic assigning of website bookings: settings, preview and attention list'; b.style.borderColor = on ? 'rgba(74,222,128,.6)' : 'rgba(100,116,139,.35)'; b.style.background = on ? 'rgba(74,222,128,.1)' : 'rgba(100,116,139,.12)';
    };
  }
  takeOver(); window.addEventListener('load', function () { takeOver(); setTimeout(takeOver, 1500); });   // the page's own script defines these after this file loads, so take over again once everything is ready
  (function init() { var t0 = 0, t = setInterval(function () { t0++; if (t0 > 40) return clearInterval(t); if (window.DSQ_ADMIN && DSQ_ADMIN.sb && DSQ_ADMIN.sb() && document.getElementById('waApiBtn')) { clearInterval(t); load().then(function () { poll(); setInterval(poll, 60000); }); } }, 1000); })();
  window.DSQAA = { saveInstr: saveInstr, getTraits: getTraits, loadTraits: loadTraits, setTraitVal: setTraitVal, recent: recent, plain: plain, problems: problems, copyBalance: copyBalance, readiness: readiness, mount: mount, saveForm: saveForm, preview: preview, runNow: runNow, oldOff: oldOff, poll: poll, openAttention: openAttention, resolve: resolve, retry: retry, openBooking: openBooking, traitsHolder: traitsHolder, loadTraits: loadTraits, femaleFirst: femaleFirst, femaleChip: femaleChip, femaleWish: femaleWish, fillTraits: fillTraits, setTrait: setTrait, setPrio: setPrio, load: load, _cfg: function () { return CFG; }, _att: function () { return ATT; } };
})();
