import "/tmp/claude-0/watest/fn2.ts";
const h = globalThis.__h, mk = (body) => new Request("https://f/whatsapp", { method: "POST", headers: { "x-admin-key": "adm" }, body: JSON.stringify(body) });
const call = async (b) => (await (await h(mk(b))).json());
const sigf = async (b) => { const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("sec"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return "sha256=" + Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(b)))).map((x) => x.toString(16).padStart(2, "0")).join(""); };
const hook = async (payload, text) => { const body = JSON.stringify({ entry: [{ changes: [{ value: { ...(payload.name ? { contacts: [{ wa_id: payload.from, profile: { name: payload.name } }] } : {}), messages: [{ id: "in" + Math.random(), from: payload.from, type: payload.p ? "button" : "text", ...(payload.p ? { button: { payload: payload.p, text: "x" } } : { text: { body: text } }) }] } }] }] }); return h(new Request("https://f/whatsapp", { method: "POST", headers: { "x-hub-signature-256": await sigf(body) }, body })); };
const I = (id, name, area, phone, extra = {}) => ({ id, full_name: name, status: "approved", area, phone, car_type: "Both", instructor_model: "referral", coverage_postcodes: area.split(" ")[0], ...extra });
DB.instructors = [I("i1", "Dawood Khan", "M13 0PG", "07700900001"), I("i2", "Sara Female", "M20 0AA", "07700900002"), I("i3", "Mo Sale", "M33 0AA", "07700900003", { instructor_model: "franchise" }), I("i4", "Far Frank", "BL1 0AA", "07700900004")];
DB.growth_settings = [{ key: "instructor_traits", value: { i2: { female: true } } }, { key: "auto_assign_cfg", value: { enabled: true, sendTerms: true, directMiles: 0, franchiseMin: 0, replyMinutes: 60, anytime: false, fairnessMiles: 0, since: new Date(Date.now() - 2 * 864e5).toISOString(), adminPhone: "07700900999", mode: "assign", hours: [0, 24], autoMiles: 5, autoAssignAfterMinutes: 0 } }];
const now = Date.now(), ph = () => "07700" + String(900000 + globalThis.SEQ++).slice(-6);
const W = (name, pc, notes = "", extra = {}) => ({ id: "w" + (globalThis.SEQ++), student_name: name, student_phone: ph(), postcode: pc, lesson_type: "Manual", status: "waiting", created_at: new Date(now - 3600e3).toISOString(), notes: "[WEB] Email: x@x.com\n" + notes, ...extra });
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const sent = (name) => (DB.wa_log || []).filter((l) => l.template === name && l.status === "sent");

console.log("== 1. Dry run: 8 mile limit, assign vs ask-first ==");
DB.waiting_list = [W("Near Nora", "M13 9AA"), W("Mid Mia", "M4 1AA"), W("Far Fred", "PR1 1AA"), W("Female Fay", "M14 0AA", "👩 FEMALE INSTRUCTOR REQUESTED"), W("Bad Bev", "ZZ9 9ZZ")];
let r = await call({ action: "auto_assign", dry: true }); const by = (n) => r.results.find((x) => x.student === n);
ok(by("Near Nora").action === "assign" && by("Near Nora").instructor === "Dawood Khan", "within 5 miles -> assign the closest (Dawood)");
ok(by("Mid Mia").action === "offer" && by("Mid Mia").instructor === "Mo Sale", "5-8 miles -> ask first (Mo Sale)");
ok(by("Far Fred").action === "attention", "over 8 miles -> attention: " + by("Far Fred").reason);
ok(by("Female Fay").instructor === "Sara Female", "female request -> only the female instructor");
ok(by("Bad Bev").action === "attention", "bad postcode -> attention");

console.log("== 2. Soft daily limit (2 today) ==");
const today = new Date().toISOString(); DB.referrals = [1, 2].map((n) => ({ id: "t" + n, instructor_id: "i1", student_name: "T" + n, created_at: today, flag_color: null, is_cancelled: false, is_credit: false }));
DB.waiting_list = [W("Daily Dan", "M13 9AB")]; r = await call({ action: "auto_assign", dry: true });
console.log("   ->", r.results[0].instructor, "|", r.results[0].why);
ok(r.results[0].instructor === "Sara Female" && /already given 2 today/.test(r.results[0].why), "Dawood has 2 today -> next closest (Sara) gets it, with the reason");

console.log("== 3. Soft weekly limit (4 booked this week) ==");
const d = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
DB.referrals = [1, 2, 3, 4].map((n) => ({ id: "b" + n, instructor_id: "i1", student_name: "B" + n, created_at: new Date(globalThis.__waTest.mondayLondon().getTime() + 60000).toISOString(), flag_color: "green", reply_status: "booked", admin_notes: d + " · ✅ Booked — confirmed by admin", is_cancelled: false, is_credit: false }));
r = await call({ action: "auto_assign", dry: true }); console.log("   ->", r.results[0].instructor, "|", r.results[0].why);
ok(r.results[0].instructor === "Sara Female" && /4 booked this week/.test(r.results[0].why), "Dawood has 4 booked this week -> Sara gets it");
const _keep3 = DB.referrals;
DB.referrals = [1, 2, 3, 4].map((n) => ({ id: "old" + n, instructor_id: "i1", student_name: "Old" + n, created_at: new Date(globalThis.__waTest.mondayLondon().getTime() - 3 * 864e5).toISOString(), flag_color: "green", reply_status: "booked", admin_notes: d + " · ✅ Booked — confirmed by admin", is_cancelled: false, is_credit: false }));
r = await call({ action: "auto_assign", dry: true }); ok(r.results[0].instructor === "Dawood Khan" && !/booked this week/.test(r.results[0].why || ""), "4 students GIVEN last week but confirmed booked this week do NOT count as booked this week: Dawood can still get a student (" + r.results[0].instructor + ")");
DB.referrals = _keep3;

console.log("== 4. Everyone close is over a limit -> the closest gets it anyway ==");
DB.referrals = DB.referrals.concat(["i2", "i3"].flatMap((iid) => [1, 2].map((n) => ({ id: "s" + iid + n, instructor_id: iid, student_name: "S" + iid + n, created_at: today, flag_color: null, is_cancelled: false, is_credit: false }))));
r = await call({ action: "auto_assign", dry: true }); console.log("   ->", r.results[0].instructor, "|", r.results[0].why);
ok(r.results[0].instructor === "Dawood Khan" && /everyone close by is over a limit/.test(r.results[0].why), "all near instructors over limit -> closest (Dawood)");

console.log("== 5. Real run, then the follow-up flow ==");
DB.referrals = []; DB.waiting_list = [W("Near Nora", "M13 9AA"), W("Female Fay", "M14 0AA", "👩 FEMALE INSTRUCTOR REQUESTED")];
r = await call({ action: "auto_assign", cron: true }); ok(r.summary.assigned === 2, "2 assigned: " + JSON.stringify(r.summary));
ok(sent("dsq_new_student").length === 2 && sent("dsq_student_welcome_2").length === 0, "instructors messaged, students NOT welcomed yet");
const nn = DB.referrals.find((x) => x.student_name === "Near Nora"), ff = DB.referrals.find((x) => x.student_name === "Female Fay");
let fNN = DB.student_followups.find((f) => f.referral_id === String(nn.id)); ok(fNN.state === "waiting_accept", "follow-up waits for the instructor to accept");
await hook({ from: "447700900001", p: "ACCEPT:" + nn.id }); fNN = DB.student_followups.find((f) => f.referral_id === String(nn.id));
ok(fNN.state === "waiting_student" && sent("dsq_student_welcome_2").length === 1, "after Accept: student welcomed + 3-day clock started");
ok(Math.abs(new Date(fNN.next_due).getTime() - (Date.now() + 3 * 864e5)) < 5000, "first check-in is 3 days after accept");
CALLS.length = 0; await call({ action: "auto_assign", cron: true }); ok(sent("dsq_student_checkin").length === 0, "nothing is sent before the 3 days are up");
fNN.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_checkin").length === 1 && sent("dsq_instructor_checkin").length === 1 && fNN.state === "asked_both", "day 3: the student AND the instructor are asked at the same time (no waiting for the student)");
const sc = (DB.wa_log || []).find((l) => l.template === "dsq_student_checkin"); const callsC = CALLS.find((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_student_checkin");
console.log("   buttons:", JSON.stringify(callsC.wa.template.components.filter((c) => c.type === "button").map((b) => b.parameters[0].payload.split(":")[0])));
// student says NOT YET
CALLS.length = 0; await hook({ from: "44" + nn.student_phone.slice(1), p: "STU_NOTYET:" + fNN.id });
ok(/not booked yet/.test(nn.admin_notes) && nn.flag_color === "purple" && nn.reply_status === "not_yet", "student 'Not yet' -> admin note + purple + reply status. note: " + nn.admin_notes.split("\n").pop());
ok(CALLS.some((c) => c.wa && c.wa.type === "interactive"), "follow-up question 'has the instructor been in touch?' sent with buttons");
// student says instructor has NOT been in touch
CALLS.length = 0; await hook({ from: "44" + nn.student_phone.slice(1), p: "CONTACT_NO:" + fNN.id });
ok(DB.admin_attention.some((a) => a.kind === "not_contacted"), "'not in touch' -> attention required for admin");
ok(sent("dsq_instructor_checkin").length === 2, "instructor is messaged straight away as well (2nd message: " + sent("dsq_instructor_checkin").length + ")");
// instructor says BOOKED
await hook({ from: "447700900001", p: "INS_BOOKED:" + fNN.id });
ok(nn.flag_color === "green" && /confirmed by instructor/.test(nn.admin_notes) && fNN.state === "done", "instructor 'Booked' -> green + marker + done");

console.log("== 6. Student says BOOKED / LEFT ==");
await hook({ from: "447700900002", p: "ACCEPT:" + ff.id }); const fFF = DB.student_followups.find((f) => f.referral_id === String(ff.id));
fFF.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
await hook({ from: "44" + ff.student_phone.slice(1), p: "STU_BOOKED:" + fFF.id });
ok(ff.flag_color === "green" && /confirmed by student/.test(ff.admin_notes) && /confirmed they are booked in/.test(ff.admin_notes) && ff.reply_status === "booked", "student 'Yes booked' -> green, marker, WhatsApp note");
console.log("   notes:", JSON.stringify(ff.admin_notes.split("\n").slice(-2)));
ok(DB.admin_activity_log.some((x) => /confirmed .* booked \(WhatsApp\)/.test(x.summary)), "logged in the activity log");
// a fresh student who has gone elsewhere
DB.waiting_list = [W("Left Lee", "M13 9AA")]; await call({ action: "auto_assign", cron: true }); const ll = DB.referrals.find((x) => x.student_name === "Left Lee"); await hook({ from: "447700900001", p: "ACCEPT:" + ll.id });
const fLL = DB.student_followups.find((f) => f.referral_id === String(ll.id)); fLL.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
await hook({ from: "44" + ll.student_phone.slice(1), p: "STU_LEFT:" + fLL.id });
ok(ll.flag_color === "red" && ll.reply_status === "left" && /Student confirmed left/.test(ll.admin_notes) && fLL.state === "done", "student 'Gone elsewhere' -> red + left + 'Student confirmed left'");

console.log("== 7. Nobody answers: both asked together, every 4 days, max 2 a week each, then the admin is told ==");
DB.waiting_list = [W("Quiet Quin", "M13 9AA")]; await call({ action: "auto_assign", cron: true }); const qq = DB.referrals.find((x) => x.student_name === "Quiet Quin"); await hook({ from: "447700900001", p: "ACCEPT:" + qq.id });
const fQ = DB.student_followups.find((f) => f.referral_id === String(qq.id)); const s0 = sent("dsq_student_checkin").length, i0 = sent("dsq_instructor_checkin").length;
fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_checkin").length === s0 + 1 && sent("dsq_instructor_checkin").length === i0 + 1 && fQ.state === "asked_both", "day 3: student and instructor asked together");
ok(Math.abs(new Date(fQ.next_due).getTime() - (Date.now() + 4 * 864e5)) < 5000, "next round is 4 days later");
fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_checkin").length === s0 + 2 && sent("dsq_instructor_checkin").length === i0 + 2 && fQ.round === 2, "round 2: both asked again (2 each so far)");
fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_checkin").length === s0 + 2 && sent("dsq_instructor_checkin").length === i0 + 2, "a 3rd message inside the same 7 days is NOT sent (weekly limit of 2 each)");
ok(new Date(fQ.next_due).getTime() > Date.now() + 20 * 3600e3 && new Date(fQ.next_due).getTime() < Date.now() + 28 * 3600e3, "it tries again the next day instead");
// a week later the limit has reset
DB.wa_log.forEach((l) => { if (["dsq_student_checkin", "dsq_instructor_checkin"].includes(l.template)) l.created_at = new Date(Date.now() - 8 * 864e5).toISOString(); });
fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(fQ.round === 3 && sent("dsq_student_checkin").length === s0 + 3, "after 7 days the next round is sent (round " + fQ.round + ")");
for (let k = 0; k < 3 && fQ.state !== "attention"; k++) { DB.wa_log.forEach((l) => { if (["dsq_student_checkin", "dsq_instructor_checkin"].includes(l.template)) l.created_at = new Date(Date.now() - 8 * 864e5).toISOString(); }); fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true }); }
ok(fQ.state === "attention" && DB.admin_attention.some((a) => a.kind === "no_confirm" && /Quin/.test(a.title)), "after 4 rounds with no answer -> attention required for the admin");

console.log("== 8. Marked in admin meanwhile -> follow-ups stop =="); DB.referrals = [];
DB.waiting_list = [W("Done Dee", "M13 9AA")]; await call({ action: "auto_assign", cron: true }); const dd = DB.referrals.find((x) => x.student_name === "Done Dee"); await hook({ from: "447700900001", p: "ACCEPT:" + dd.id });
const fD = DB.student_followups.find((f) => f.referral_id === String(dd.id)); dd.flag_color = "green"; dd.admin_notes = (dd.admin_notes || "") + "\n" + d + " · ✅ Booked — confirmed by admin";
fD.next_due = new Date(Date.now() - 1000).toISOString(); const n0 = sent("dsq_student_checkin").length; await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_checkin").length === n0 && fD.state === "done", "already booked by admin -> no message, follow-up closed");
console.log("== 9. Instructor can't cover after assignment ==");
DB.waiting_list = [W("Decline Dot", "M13 9AA")]; await call({ action: "auto_assign", cron: true }); const dt = DB.referrals.find((x) => x.student_name === "Decline Dot"); await hook({ from: "447700900001", p: "DECLINE:" + dt.id });
ok(DB.student_followups.find((f) => f.referral_id === String(dt.id)).state === "closed" && dt.is_cancelled === true && DB.admin_activity_log.some((x) => x.action === "reassign" && /Decline Dot/.test(x.summary)), "decline -> follow-up closed, the student is taken off that instructor and sent to the next one automatically");

console.log("== 10. Unpaid booked students (referral instructors) ==");
DB.referrals = []; DB.admin_attention = [];
const dd2 = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const bk = (id, iid, amt, paid = false) => ({ id, instructor_id: iid, student_name: "P" + id, amount: amt, is_paid: paid, created_at: new Date(now - 20 * 864e5).toISOString(), flag_color: "green", reply_status: "booked", admin_notes: dd2 + " · ✅ Booked — confirmed by student", is_cancelled: false, is_credit: false });
DB.referrals = [bk("u1", "i1", 25), bk("u2", "i1", 25), bk("u3", "i1", 25, true)];   // Dawood: 2 booked + unpaid, 1 paid
DB.waiting_list = [W("Unpaid Una", "M13 9AA")]; r = await call({ action: "auto_assign", dry: true }); console.log("   ->", r.results[0].instructor, "|", r.results[0].why);
ok(r.results[0].instructor === "Sara Female" && /2 booked students not paid yet \(£50\)/.test(r.results[0].why), "2 booked + unpaid -> Dawood asked last (soft), Sara gets it, reason shows the £");
await call({ action: "auto_assign", cron: true }); const ua = DB.admin_attention.filter((a) => a.kind === "unpaid_fees");
ok(ua.length === 1 && /£50/.test(ua[0].title) && ua[0].instructor_id === "i1", "attention: '" + (ua[0] && ua[0].title) + "'");
await call({ action: "auto_assign", cron: true }); ok(DB.admin_attention.filter((a) => a.kind === "unpaid_fees").length === 1, "only one alert (no repeats)");
DB.referrals.find((x) => x.id === "u1").is_paid = true; await call({ action: "auto_assign", cron: true });
ok(DB.admin_attention.find((a) => a.kind === "unpaid_fees").resolved === true, "one fee marked paid (1 left unpaid) -> alert clears itself");
DB.referrals = [bk("u1", "i3", 0), bk("u2", "i3", 0)]; DB.admin_attention = []; await call({ action: "auto_assign", cron: true });
ok(DB.admin_attention.filter((a) => a.kind === "unpaid_fees").length === 0, "franchise instructors are not affected");
DB.referrals = [bk("u1", "i1", 25), bk("u2", "i1", 25)]; DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value.unpaidLimit = 0; DB.waiting_list = [W("Unpaid Una2", "M13 9AA")]; r = await call({ action: "auto_assign", dry: true });
ok(r.results[0].instructor === "Dawood Khan", "limit set to 0 -> rule is off");

console.log("== 11. 45-minute reply time + acknowledgement ==");
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value = { enabled: true, sendTerms: true, directMiles: 0, franchiseMin: 0, replyMinutes: 60, anytime: false, fairnessMiles: 0, since: new Date(Date.now() - 2 * 864e5).toISOString(), adminPhone: "07700900999", mode: "assign", hours: [0, 24], autoMiles: 0, autoAssignAfterMinutes: 0, ackHours: [0, 24], ackStudent: true, ackSince: new Date(Date.now() - 864e5).toISOString() };
DB.referrals = []; DB.admin_attention = []; DB.wa_log = [];
DB.waiting_list = [W("Offer Ola", "M13 9AA"), W("Call Cal", "M13 9AA", "", { notes: "[CALL] phone booking" })];
CALLS.length = 0; r = await call({ action: "auto_assign", cron: true });
const jo = DB.auto_assign_jobs.find((j) => j.waiting_id === String(DB.waiting_list[0].id));
ok(jo && jo.state === "pending_accept" && Math.abs(new Date(jo.expires_at).getTime() - Date.now()) < 5000, "offer time recorded");
ok(sent("dsq_booking_received").length === 1, "website booking acknowledged on WhatsApp (the [CALL] booking was not)");
ok(/booking acknowledgement sent/.test(DB.waiting_list[0].notes), "note added so it is only sent once");
await call({ action: "auto_assign", cron: true }); ok(sent("dsq_booking_received").length === 1, "no second acknowledgement");
const firstInstr = jo.instructor_id; jo.expires_at = new Date(Date.now() - 61 * 60000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(jo.instructor_id !== firstInstr && jo.state === "pending_accept" && JSON.stringify(jo.tried).includes(String(firstInstr)), "no reply in 60 min -> offered to the NEXT instructor straight away");

console.log("== 12. Offer first; no reply after 35 min -> auto-assign if they cover the area ==");
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value = { enabled: true, sendTerms: true, directMiles: 0, franchiseMin: 0, replyMinutes: 60, anytime: false, fairnessMiles: 0, since: new Date(Date.now() - 2 * 864e5).toISOString(), mode: "assign", hours: [0, 24], autoMiles: 0 };
DB.referrals = []; DB.admin_attention = []; DB.wa_log = []; DB.auto_assign_jobs = []; DB.student_followups = [];
DB.waiting_list = [W("Cover Cora", "M13 9AA"), W("Nocover Nick", "M4 1AA")];
CALLS.length = 0; r = await call({ action: "auto_assign", cron: true });
const jc = DB.auto_assign_jobs.find((j) => j.waiting_id === String(DB.waiting_list[0].id)), jn = DB.auto_assign_jobs.find((j) => j.waiting_id === String(DB.waiting_list[1].id));
ok(jc.state === "pending_accept" && jn.state === "pending_accept" && sent("dsq_student_offer").length === 2, "everyone is offered first (no instant assignment)");
const offered = (j, minAgo) => { j.expires_at = new Date(Date.now() - minAgo * 60000).toISOString(); };
offered(jc, 20); offered(jn, 20); await call({ action: "auto_assign", cron: true });
ok(jc.state === "pending_accept" && jn.state === "pending_accept", "after 20 min: still waiting");
offered(jc, 36); offered(jn, 36); const wc = (DB.wa_log || []).filter((l) => l.template === "dsq_student_welcome_2" && l.status === "sent").length; await call({ action: "auto_assign", cron: true });
ok(jc.state === "assigned" && DB.referrals.some((x) => x.student_name === "Cover Cora" && /no reply after 35 minutes and they cover M13/.test(x.admin_notes)), "after 36 min: Dawood covers M13 -> assigned without Accept, note explains why");
ok((DB.wa_log || []).filter((l) => l.template === "dsq_student_welcome_2" && l.student_name === "Cover Cora" && l.status === "sent").length === 1, "student told to contact the instructor (welcome sent)");
ok(DB.student_followups.some((f) => f.student_name === "Cover Cora" && f.state === "waiting_student"), "follow-up clock started");
ok(jn.state === "pending_accept" && jn.instructor_id === jn.instructor_id && !DB.referrals.some((x) => x.student_name === "Nocover Nick"), "instructor who does NOT cover M4: not assigned, keeps waiting");
const mo = jn.instructor_id; offered(jn, 61); await call({ action: "auto_assign", cron: true });
ok(jn.state === "attention" && DB.admin_attention.some((a) => a.kind === "no_match" && /no other instructor left/.test(a.detail || a.title)), "after 60 min the non-covering instructor is skipped; nobody else within 8 miles -> attention");

console.log("== 13. Reply timers only count waking hours ==");
const AM = globalThis.__waTest.activeMinutes, at = (d, hm) => Date.parse("2026-11-" + d + "T" + hm + ":00Z");   // November = UK winter time (GMT)
ok(AM(at("18", "19:50"), at("19", "08:25"), 8, 20) === 35, "offer 19:50, resumes 08:00 -> 08:25 is 35 waking minutes (10 + 25)");
ok(AM(at("18", "23:30"), at("19", "07:30"), 8, 20) === 0, "a booking at 23:30 with no waking minutes before 07:30 = 0");
ok(AM(at("19", "08:00"), at("19", "08:35"), 8, 20) === 35, "offered at 08:00, 35 minutes later = 35");
ok(AM(at("18", "12:00"), at("18", "12:35"), 8, 20) === 35, "midday offer, 35 minutes = 35");
ok(AM(at("18", "20:00"), at("19", "08:00"), 8, 20) === 0, "overnight 20:00-08:00 counts nothing");

console.log("== 14. Night booking -> different wording; outside ack hours -> not sent yet ==");
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value = { enabled: true, sendTerms: true, directMiles: 0, franchiseMin: 0, replyMinutes: 60, anytime: false, fairnessMiles: 0, since: new Date(Date.now() - 2 * 864e5).toISOString(), mode: "assign", hours: [0, 24], ackStudent: true, ackSince: new Date(Date.now() - 864e5).toISOString(), ackHours: [0, 24], autoAssignAfterMinutes: 0 };
DB.referrals = []; DB.wa_log = []; DB.auto_assign_jobs = []; DB.waiting_list = [W("Awake Ann", "M13 9AA")]; await call({ action: "auto_assign", cron: true });
ok(sent("dsq_booking_received").length === 1 && sent("dsq_booking_received_later").length === 0, "inside the offer hours -> 'we have passed your details'");
const hNow = new Date().getUTCHours(); const away = [(hNow + 3) % 24, ((hNow + 3) % 24) + 1];   // a window that does NOT contain the current hour
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value.hours = away[1] > 23 ? [(hNow + 6) % 24, (hNow + 7) % 24 || 24] : away; DB.wa_log = []; DB.waiting_list = [W("Night Nia", "M13 9AA")];
await call({ action: "auto_assign", cron: true });
ok(sent("dsq_booking_received_later").length === 1 && sent("dsq_booking_received").length === 0, "outside the offer hours the student gets the 'first thing in the morning' wording");
ok(DB.auto_assign_jobs.length === 0 || DB.auto_assign_jobs.every((j) => j.waiting_id !== String(DB.waiting_list[0].id)), "and NO instructor is contacted at that time");
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value.ackHours = [(hNow + 8) % 24, ((hNow + 8) % 24) + 1 > 24 ? 24 : ((hNow + 8) % 24) + 1]; DB.wa_log = []; DB.waiting_list = [W("Sleep Sid", "M13 9AA")];
await call({ action: "auto_assign", cron: true }); ok(sent("dsq_booking_received").length + sent("dsq_booking_received_later").length === 0, "outside the ack hours nothing is sent (waits until morning)");

console.log("== 15. Franchise minimum, priority marks, package start date ==");
const cfgOf = () => DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value;
cfgOf().franchiseMin = 3; cfgOf().hours = [0, 24]; cfgOf().dailyLimit = 0; cfgOf().weeklyLimit = 0; cfgOf().unpaidLimit = 0; cfgOf().autoMiles = 0; cfgOf().mode = "assign";
const mo3 = DB.instructors.find((x) => x.id === "i3"); mo3.area = "M14 4AA"; mo3.postcode = "M14 4AA"; mo3.coverage_postcodes = "M14";
const wk = (id, iid) => ({ id, instructor_id: iid, student_name: "W" + id, amount: 0, is_paid: false, created_at: new Date().toISOString(), flag_color: "green", reply_status: "booked", admin_notes: dd2 + " · ✅ Booked — confirmed by admin", is_cancelled: false, is_credit: false });
DB.referrals = []; DB.auto_assign_jobs = []; DB.student_followups = []; DB.wa_log = []; DB.waiting_list = [W("Min Mia", "M13 9AA")];
let pv = await call({ action: "auto_assign", dry: true }); const m1 = pv.results.find((x) => x.student === "Min Mia");
ok(m1 && m1.instructor === "Mo Sale" && /0 of 3 confirmed booked/.test(m1.why || ""), "franchise Mo has 0 of 3 booked this week -> offered first although Dawood is closer (" + (m1 && m1.instructor) + ")");
DB.referrals = [wk("a1", "i3"), wk("a2", "i3"), wk("a3", "i3")]; pv = await call({ action: "auto_assign", dry: true });
ok(pv.results.find((x) => x.student === "Min Mia").instructor === "Dawood Khan", "Mo has 3 booked this week -> back to the closest (Dawood)");
DB.referrals = [wk("a1", "i3")]; cfgOf().franchiseMin = 0; pv = await call({ action: "auto_assign", dry: true });
ok(pv.results.find((x) => x.student === "Min Mia").instructor === "Dawood Khan", "franchiseMin 0 (off) -> closest");
cfgOf().franchiseMin = 3; DB.growth_settings.find((x) => x.key === "packages") ? 0 : DB.growth_settings.push({ key: "packages", value: { by: {}, tiers: {} } });
DB.referrals = []; DB.growth_settings.find((x) => x.key === "packages").value.by = { i3: { tier: "gold", start: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10) } };
pv = await call({ action: "auto_assign", dry: true });
ok(pv.results.find((x) => x.student === "Min Mia").instructor === "Dawood Khan", "Mo's Gold package starts in 5 days -> no jobs yet");
DB.growth_settings.find((x) => x.key === "packages").value.by = { i3: { tier: "gold", start: "2026-01-01" } }; DB.referrals = [wk("a1", "i3"), wk("a2", "i3"), wk("a3", "i3")];
pv = await call({ action: "auto_assign", dry: true }); ok(pv.results.find((x) => x.student === "Min Mia").instructor === "Mo Sale", "Gold package minimum is 5 -> 3 booked is still short, so Mo is first");
DB.growth_settings.find((x) => x.key === "packages").value.by = {}; DB.referrals = []; cfgOf().franchiseMin = 0;
DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true }, i3: { priority: 2 } };
pv = await call({ action: "auto_assign", dry: true }); const pr = pv.results.find((x) => x.student === "Min Mia");
ok(pr.instructor === "Mo Sale" && /priority Top/.test(pr.why || ""), "Mo marked Top priority (3 miles closer per step x2) -> ahead of the nearer Dawood (" + pr.instructor + ": " + pr.why + ")");
DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } };
pv = await call({ action: "auto_assign", dry: true }); ok(pv.results.find((x) => x.student === "Min Mia").instructor === "Dawood Khan", "everyone Equal (default) -> simply the closest");

console.log("== 16. Fairness: nobody is left without jobs ==");
cfgOf().franchiseMin = 0; cfgOf().fairnessMiles = 0.5; cfgOf().fairnessAfterDays = 2; cfgOf().fairnessCap = 4; cfgOf().droughtDays = 7; cfgOf().adminPhone = "07700900999"; cfgOf().adminAlerts = true;
const agoRef = (id, iid, d) => ({ id, instructor_id: iid, student_name: "F" + id, amount: 0, is_paid: false, created_at: new Date(Date.now() - d * 864e5).toISOString(), flag_color: "", reply_status: "", admin_notes: "", is_cancelled: false, is_credit: false });
DB.instructors.find((x) => x.id === "i3").area = "M14 4AA";
DB.referrals = [agoRef("f1", "i1", 0.2), agoRef("f2", "i2", 1), agoRef("f3", "i3", 9), agoRef("f4", "i4", 1)]; DB.waiting_list = [W("Fair Fay", "M13 9AA")];
pv = await call({ action: "auto_assign", dry: true }); const fr = pv.results.find((x) => x.student === "Fair Fay");
ok(fr.instructor === "Mo Sale" && /no student for 9 days/.test(fr.why || ""), "Mo has had no student for 9 days -> ahead of the nearer Dawood (" + fr.instructor + ": " + fr.why + ")");
DB.referrals = [agoRef("f1", "i1", 1), agoRef("f2", "i2", 1), agoRef("f3", "i3", 1), agoRef("f4", "i4", 1)]; pv = await call({ action: "auto_assign", dry: true });
ok(pv.results.find((x) => x.student === "Fair Fay").instructor === "Dawood Khan", "everyone had a student yesterday -> simply the closest");
DB.admin_attention = []; DB.referrals = [agoRef("f1", "i1", 1), agoRef("f2", "i2", 1), agoRef("f4", "i4", 1)]; DB.wa_log = [];
await call({ action: "auto_assign", cron: true, force: true });
ok(DB.admin_attention.some((a) => a.kind === "no_jobs" && a.instructor_id === "i3" && !a.resolved), "Mo has had nothing for 90 days -> 'no student' attention item with reasons");
ok(!DB.admin_attention.some((a) => a.kind === "no_jobs" && a.instructor_id === "i1"), "Dawood had one yesterday -> no item");
ok(sent("dsq_admin_attention").length === 0, "these items do not ping your WhatsApp");
DB.referrals.push(agoRef("f5", "i3", 0.1)); await call({ action: "auto_assign", cron: true, force: true });
ok(DB.admin_attention.filter((a) => a.kind === "no_jobs" && a.instructor_id === "i3").every((a) => a.resolved), "Mo is given a student -> the item clears itself");

console.log("== 17. Duplicates, rush cap, stuck jobs ==");
cfgOf().fairnessMiles = 0; cfgOf().maxPerRun = 5; cfgOf().dailyLimit = 0; cfgOf().weeklyLimit = 0; cfgOf().hours = [0, 24];
DB.referrals = []; DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = [];
const dupA = W("Dup Dan", "M13 9AA", "", { student_phone: "07811 222333" }), dupB = W("Dup Dan again", "M13 9AA", "UPDATED", { student_phone: "07811222333" });
DB.waiting_list = [dupA, dupB]; await call({ action: "auto_assign", cron: true });
ok(DB.auto_assign_jobs.filter((j) => j.state === "pending_accept").length === 1 && DB.auto_assign_jobs.some((j) => /duplicate/.test(j.note || "")), "same phone twice -> only ONE instructor is asked, the repeat is held as a duplicate");
ok(DB.admin_attention.some((a) => a.kind === "duplicate") && sent("dsq_admin_attention").length === 0, "duplicate listed for the admin (no WhatsApp ping)");
DB.referrals = [{ id: "old1", instructor_id: "i1", student_name: "Placed Pat", student_phone: "07822 333444", created_at: new Date(Date.now() - 3 * 864e5).toISOString(), is_cancelled: false, is_credit: false }];
DB.auto_assign_jobs = []; DB.admin_attention = []; DB.waiting_list = [W("Placed Pat", "M13 9AA", "", { student_phone: "07822333444" })]; await call({ action: "auto_assign", cron: true });
ok(DB.auto_assign_jobs.length === 1 && DB.auto_assign_jobs[0].state === "pending_accept" && DB.auto_assign_jobs[0].instructor_id === "i1" && DB.admin_attention.some((a) => a.kind === "rebooking"), "existing student (given to Dawood 3 days ago) books again -> offered back to Dawood and the admin is told");
DB.referrals = []; DB.auto_assign_jobs = []; DB.admin_attention = []; DB.waiting_list = Array.from({ length: 8 }, (_, k) => W("Rush " + k, "M13 9AA", "", { student_phone: "0790000" + String(1000 + k) }));
await call({ action: "auto_assign", cron: true }); ok(DB.auto_assign_jobs.length === 5, "8 bookings at once -> 5 started this run (" + DB.auto_assign_jobs.length + ")");
await call({ action: "auto_assign", cron: true }); ok(DB.auto_assign_jobs.length === 8, "next run picks up the other 3 (" + DB.auto_assign_jobs.length + ")");
DB.auto_assign_jobs = [{ id: "stk", waiting_id: "zz", state: "working", created_at: new Date(Date.now() - 30 * 60000).toISOString(), updated_at: new Date(Date.now() - 30 * 60000).toISOString() }]; DB.waiting_list = []; DB.admin_attention = [];
await call({ action: "auto_assign", cron: true }); ok(DB.auto_assign_jobs[0].state === "attention" && DB.admin_attention.some((a) => /stuck/.test(a.title)), "a job stuck 'working' for 30 minutes -> attention");

console.log("== 18. Several bookings at the same time ==");
cfgOf().maxPerRun = 10; cfgOf().concurrency = 5; cfgOf().dailyLimit = 2; cfgOf().weeklyLimit = 0; cfgOf().autoMiles = 0; cfgOf().franchiseMin = 0; cfgOf().fairnessMiles = 0;
DB.referrals = []; DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = [];
DB.waiting_list = Array.from({ length: 6 }, (_, k) => W("Multi " + k, "M13 9AA", "", { student_phone: "0780000" + String(2000 + k) }));
const t1 = Date.now(); const rr = await call({ action: "auto_assign", cron: true });
const perI: any = {}; DB.auto_assign_jobs.forEach((j) => { if (j.instructor_id) perI[j.instructor_id] = (perI[j.instructor_id] || 0) + 1; });
ok(DB.auto_assign_jobs.length === 6 && DB.auto_assign_jobs.every((j) => j.state === "pending_accept"), "6 bookings in one run -> all 6 offered (" + DB.auto_assign_jobs.map((j) => j.state).join(",") + ")");
ok(Math.max(...Object.values(perI)) <= 3, "no single instructor is given all of them while others are free: " + JSON.stringify(perI));
DB.auto_assign_jobs = []; DB.wa_log = []; DB.waiting_list = Array.from({ length: 4 }, (_, k) => W("Twin " + k, "M13 9AA", "", { student_phone: "0781000" + String(3000 + k) }));
await Promise.all([call({ action: "auto_assign", cron: true }), call({ action: "auto_assign", cron: true }), call({ action: "auto_assign", cron: true })]);
ok(DB.auto_assign_jobs.length === 4 && new Set(DB.auto_assign_jobs.map((j) => j.waiting_id)).size === 4, "three runs at the same moment -> each booking handled exactly once (" + DB.auto_assign_jobs.length + " jobs)");
ok(sent("dsq_student_offer").length === 4, "and each offer was messaged exactly once (" + sent("dsq_student_offer").length + ")");

console.log("== 19. Pending offers count; accept races ==");
cfgOf().dailyLimit = 1; cfgOf().weeklyLimit = 0; cfgOf().maxPerRun = 10; cfgOf().fairnessMiles = 0; cfgOf().franchiseMin = 0; cfgOf().hours = [0, 24];
DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.waiting_list = [W("Pend A", "M13 9AA", "", { student_phone: "0782000" + "1111" })];
await call({ action: "auto_assign", cron: true }); const first1 = DB.auto_assign_jobs[0].instructor_id;
DB.waiting_list.push(W("Pend B", "M13 9AA", "", { student_phone: "0782000" + "2222" })); await call({ action: "auto_assign", cron: true });
const second1 = DB.auto_assign_jobs.find((j) => j.waiting_id !== DB.auto_assign_jobs[0].waiting_id).instructor_id;
ok(first1 && second1 && first1 !== second1, "daily limit 1: the instructor holding an unanswered offer is not offered the next student first (" + first1 + " then " + second1 + ")");
const jobA = DB.auto_assign_jobs[0]; const insA = DB.instructors.find((x) => x.id === jobA.instructor_id);
await Promise.all([hook({ from: "44" + insA.phone.replace(/^0/, "").replace(/\s/g, ""), p: "OFFER_ACCEPT:" + jobA.id }), hook({ from: "44" + insA.phone.replace(/^0/, "").replace(/\s/g, ""), p: "OFFER_ACCEPT:" + jobA.id })]);
ok(DB.referrals.filter((r) => r.student_name === "Pend A").length === 1, "two Accept taps at the same moment -> the student is assigned once (" + DB.referrals.filter((r) => r.student_name === "Pend A").length + ")");
ok(DB.waiting_list.some((w) => w.student_name === "Pend A" && /Auto-assigned to .* — .* accepted/.test(w.notes || "")), "after the instructor accepts, the website booking says who it was auto-assigned to and that they accepted");

console.log("== 20. Odd bookings never crash the run ==");
cfgOf().dailyLimit = 0; cfgOf().mode = "assign";
DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = [];
DB.waiting_list = [W("No Postcode", "", "", { postcode: null, student_phone: "07833000111" }), W("Bad Postcode", "ZZ99 9ZZ", "", { student_phone: "07833000222" }), W("No Phone", "M13 9AA", "", { student_phone: null }), W("", "M13 9AA", "", { student_name: null, student_phone: "07833000333" }), W("Long Notes", "M13 9AA", "x".repeat(20000), { student_phone: "07833000444" }), W("Auto Ann", "M13 9AA", "Gearbox: Automatic", { student_phone: "07833000555" })];
const rOdd = await call({ action: "auto_assign", cron: true });
ok(rOdd.ok === true, "run completes with odd bookings (" + rOdd.ok + ")");
ok(DB.auto_assign_jobs.length === 6 && DB.auto_assign_jobs.every((j) => ["pending_accept", "attention", "assigned"].includes(j.state)), "every booking ends in a clear state (" + DB.auto_assign_jobs.map((j) => j.state).join(",") + ")");
ok(DB.admin_attention.some((a) => /postcode|No Postcode/i.test(a.title + a.detail)), "the booking with no postcode goes to the admin");
ok(DB.auto_assign_jobs.filter((j) => j.state === "pending_accept").length >= 3, "good ones still go out (" + DB.auto_assign_jobs.filter((j) => j.state === "pending_accept").length + ")");

console.log("== 21. Simulator, daily safety cap ==");
cfgOf().maxPerDay = 3; cfgOf().maxPerRun = 10; cfgOf().dailyLimit = 0; cfgOf().hours = [0, 24]; DB.referrals = []; DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = [];
DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true }, i3: { noAuto: true } };
DB.waiting_list = Array.from({ length: 6 }, (_, k) => W("Cap " + k, "M13 9AA", "", { student_phone: "0784000" + String(4000 + k) }));
await call({ action: "auto_assign", cron: true });
ok(DB.auto_assign_jobs.length === 3, "daily cap of 3 -> only 3 started (" + DB.auto_assign_jobs.length + ")");
ok(DB.admin_attention.some((a) => a.kind === "daily_cap"), "and the admin is told the safety limit was reached");
await call({ action: "auto_assign", cron: true }); ok(DB.auto_assign_jobs.length === 3, "a second run the same day starts nothing more");
const sim = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", female: "require" });
ok(sim.ok && sim.best && sim.best.name === "Sara Female", "simulate: female required -> only Sara is in the running (" + (sim.best && sim.best.name) + ")");
ok((sim.skipped || []).some((x) => x.name === "Mo Sale" && /Never auto-assign/.test(x.why)) && (sim.skipped || []).some((x) => /female/.test(x.why)), "simulate: left-out instructors come with reasons (" + (sim.skipped || []).map((x) => x.name + ": " + x.why).join("; ") + ")");
const sim2 = await call({ action: "simulate", postcode: "M13 9AA", type: "Automatic" }); ok(sim2.ok && sim2.list.length >= 1, "simulate: automatic booking works (" + sim2.list.length + " in the running)");
const sim3 = await call({ action: "simulate", postcode: "" }); ok(sim3.ok === false, "simulate: empty postcode is rejected");
const tpl = await call({ action: "templates" }); ok(tpl.ok && (tpl.needWaba || tpl.needToken || Array.isArray(tpl.templates)), "templates: answers even without a Business Account ID (" + JSON.stringify(tpl).slice(0, 80) + ")");

console.log("== 22. Female requested, none available -> ask the student ==");
cfgOf().mode = "assign"; cfgOf().messageStudent = true; cfgOf().maxPerDay = 40; cfgOf().dailyLimit = 0; cfgOf().hours = [0, 24]; cfgOf().autoMiles = 0;
DB.growth_settings.find((x) => x.key === "instructor_traits").value = {};   // nobody is marked female
DB.referrals = []; DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = [];
const fw = W("Fem Faye", "M13 9AA", "👩 FEMALE INSTRUCTOR REQUESTED", { student_phone: "07855000111" }); DB.waiting_list = [fw];
await call({ action: "auto_assign", cron: true });
ok(sent("dsq_female_unavailable").length === 1, "student is asked on WhatsApp if a male instructor is fine");
ok(DB.admin_attention.some((a) => a.kind === "female_unavailable") && !DB.auto_assign_jobs.some((j) => j.state === "pending_accept"), "admin is alerted and nobody is offered the booking yet");
const jobF = DB.auto_assign_jobs[0]; const callsF = CALLS.find((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_female_unavailable");
ok(callsF && callsF.wa.template.components.some((c) => c.type === "button" && /^FEM_YES:/.test(c.parameters[0].payload)), "the message carries Yes / No buttons");
await hook({ from: "447855000111", p: "FEM_YES:" + jobF.id });
ok(DB.auto_assign_jobs.find((j) => j.id === jobF.id).state === "pending_accept" && /agreed to a male instructor/.test(fw.notes), "student says male is fine -> the booking is offered to the closest instructor");
ok(DB.admin_attention.filter((a) => a.kind === "female_unavailable").every((a) => a.resolved), "and the admin alert clears");
// student says no
DB.auto_assign_jobs = []; DB.admin_attention = []; const fw2 = W("Fem Fran", "M13 9AA", "👩 FEMALE INSTRUCTOR REQUESTED", { student_phone: "07855000222" }); DB.waiting_list = [fw2]; await call({ action: "auto_assign", cron: true });
await hook({ from: "447855000222", p: "FEM_NO:" + DB.auto_assign_jobs[0].id });
ok(/prefers to wait for a female/.test(fw2.notes) && DB.admin_attention.some((a) => a.kind === "female_wait") && !DB.auto_assign_jobs.some((j) => j.state === "pending_accept"), "student says wait -> nobody offered, admin told");

console.log("== 23. Re-booking of someone marked left; messages at any hour ==");
DB.referrals = [{ id: "old2", instructor_id: "i1", student_name: "Left Larry", student_phone: "07866 111222", created_at: new Date(Date.now() - 3 * 864e5).toISOString(), is_cancelled: false, is_credit: false, flag_color: "red", reply_status: "left" }];
DB.auto_assign_jobs = []; DB.admin_attention = []; DB.waiting_list = [W("Left Larry", "M13 9AA", "", { student_phone: "07866111222" })]; await call({ action: "auto_assign", cron: true });
ok(DB.auto_assign_jobs.length === 1 && DB.auto_assign_jobs[0].state === "pending_accept" && !DB.admin_attention.some((a) => a.kind === "rebooking"), "a student who LEFT earlier is treated as a new booking");
const cNow = cfgOf(); cNow.hours = [(new Date().getUTCHours() + 5) % 24, (new Date().getUTCHours() + 6) % 24 || 24]; delete cNow.anytime; DB.auto_assign_jobs = []; DB.wa_log = []; DB.referrals = []; DB.waiting_list = [W("Night Nick", "M13 9AA", "", { student_phone: "07866333444" })];
await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_offer").length === 1, "with the default (24/7) the instructor is messaged immediately even though the old 'hours' setting says it is closed");
cNow.anytime = false; DB.auto_assign_jobs = []; DB.wa_log = []; DB.waiting_list = [W("Night Nell", "M13 9AA", "", { student_phone: "07866555666" })]; await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_offer").length === 0, "with 24/7 switched off the old quiet hours apply again");

console.log("== 24. Female PREFERRED and the 'anyone allowed' rule ==");
cfgOf().femaleRule = "require"; DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } };
DB.referrals = []; DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = [];
DB.waiting_list = [W("Pref Pia", "M13 9AA", "👩 FEMALE PREFERRED REQUESTED", { student_phone: "07877000111" })];
let pv24 = await call({ action: "auto_assign", dry: true }); ok(pv24.results[0].instructor === "Sara Female", "female PREFERRED: the female instructor is chosen even though a man is closer (" + pv24.results[0].instructor + ")");
DB.growth_settings.find((x) => x.key === "instructor_traits").value = {}; pv24 = await call({ action: "auto_assign", dry: true });
ok(pv24.results[0].action === "female_ask", "female PREFERRED, no woman available -> the student is asked first (" + pv24.results[0].action + ")");
cfgOf().femaleRule = "prefer"; DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } };
DB.waiting_list = [W("Req Rae", "M13 9AA", "👩 FEMALE INSTRUCTOR REQUESTED", { student_phone: "07877000222" })]; pv24 = await call({ action: "auto_assign", dry: true });
ok(pv24.results[0].instructor === "Sara Female", "rule 'anyone allowed': women still go first (" + pv24.results[0].instructor + ")");
DB.growth_settings.find((x) => x.key === "instructor_traits").value = {}; pv24 = await call({ action: "auto_assign", dry: true });
ok(pv24.results[0].action !== "female_ask" && pv24.results[0].instructor, "rule 'anyone allowed' and no woman: a man is offered straight away (" + pv24.results[0].instructor + ")");
cfgOf().femaleRule = "require";

console.log("== 25. How a booking's female wording is read ==");
cfgOf().femaleRule = "require";
const readF = async (notes) => { DB.auto_assign_jobs = []; DB.admin_attention = []; DB.waiting_list = [W("Word Wes", "M13 9AA", notes, { student_phone: "07899" + String(Math.floor(100000 + Math.random() * 899999)) })]; DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } }; const r = await call({ action: "auto_assign", dry: true }); return r.results[0]; };
let rf = await readF("Message from learner: I'd prefer a female instructor if possible."); ok(rf.female === "prefer" && rf.instructor === "Sara Female", "homepage chip 'I'd prefer a female instructor if possible' = PREFERRED, a woman is chosen (" + rf.female + ")");
rf = await readF("👩 FEMALE INSTRUCTOR REQUESTED"); ok(rf.female === "require", "'FEMALE INSTRUCTOR REQUESTED' = only a woman");
rf = await readF("👩 FEMALE PREFERRED REQUESTED"); ok(rf.female === "prefer", "'FEMALE PREFERRED REQUESTED' = preferred");
rf = await readF("Nervous learner: yes"); ok(!rf.female, "no mention = no preference");

console.log("== 26. Updated / re-sent forms are never offered twice ==");
cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().femaleRule = "require";
DB.referrals = [{ id: "fresh1", instructor_id: "i1", student_name: "Fresh Fay", student_phone: "07811 999000", created_at: new Date(Date.now() - 30 * 60000).toISOString(), is_cancelled: false, is_credit: false }];
DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = []; DB.waiting_list = [W("Fresh Fay", "M13 9AA", "— UPDATED request", { student_phone: "07811999000" })]; await call({ action: "auto_assign", cron: true });
ok(DB.auto_assign_jobs.length === 1 && /duplicate/.test(DB.auto_assign_jobs[0].note) && sent("dsq_student_offer").length === 0, "the same phone placed 30 minutes ago -> held as a duplicate, nobody is messaged");
DB.referrals = [{ id: "d1", instructor_id: "i1", student_name: "Day Dee", student_phone: "07811 999111", created_at: new Date(Date.now() - 2 * 864e5).toISOString(), is_cancelled: false, is_credit: false }];
DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = []; DB.waiting_list = [W("Day Dee", "M13 9AA", "", { student_phone: "07811999111" })]; await call({ action: "auto_assign", cron: true });
ok(DB.auto_assign_jobs[0] && DB.auto_assign_jobs[0].state === "pending_accept" && DB.auto_assign_jobs[0].instructor_id === "i1", "2 days later it is a genuine re-booking -> back to the same instructor");

console.log("== 27. Garbage and strangers never crash the webhook ==");
let crashed = 0; const tryHook = async (p, t) => { try { await hook(p, t); } catch (e) { crashed++; console.log("   threw:", String(e).slice(0, 120)); } };
for (const p of ["OFFER_ACCEPT:nonexistent", "OFFER_DECLINE:", "ACCEPT:xyz", "DECLINE:", "STU_BOOKED:bad", "INS_LEFT:bad", "CONTACT_NO:bad", "FEM_YES:bad", "FEM_NO:", "TOTALLY_UNKNOWN:1", "OFFER_ACCEPT:" + "9".repeat(300)]) await tryHook({ from: "447999000111", p });
for (const t of ["", "STOP", "yes", "no", "👍", "x".repeat(5000), "ACCEPT", "<script>alert(1)</script>"]) await tryHook({ from: "447999000222", t }, t);
await tryHook({ from: "447700900001", t: "yes" }, "yes");   // a real instructor with nothing waiting
ok(crashed === 0, "20 odd messages from strangers and instructors: no crash (" + crashed + " threw)");
const bad = await h(new Request("https://f/whatsapp", { method: "POST", headers: { "x-admin-key": "wrong" }, body: JSON.stringify({ action: "auto_assign" }) }));
ok(bad.status === 401 || bad.status === 403, "wrong admin key is refused (" + bad.status + ")");
const unk = await h(new Request("https://f/whatsapp", { method: "POST", headers: { "x-admin-key": "adm" }, body: "not json" }));
ok(unk.status < 500, "a body that is not JSON does not crash it (" + unk.status + ")");
const nz = await call({ action: "no_such_action" }); ok(nz && nz.ok === false, "an unknown action is answered with an error");

console.log("== 28. Franchise on the Normal package still gets the franchise minimum ==");
cfgOf().franchiseMin = 3; cfgOf().fairnessMiles = 0; cfgOf().femaleRule = "require"; DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } };
const mo28 = DB.instructors.find((x) => x.id === "i3"); mo28.area = "M14 4AA"; mo28.postcode = "M14 4AA"; mo28.coverage_postcodes = "M14";
DB.growth_settings = DB.growth_settings.filter((x) => x.key !== "packages"); DB.growth_settings.push({ key: "packages", value: { by: { i3: { tier: "normal", fee: 50, active: true } }, tiers: {} } });
DB.referrals = []; DB.auto_assign_jobs = []; DB.waiting_list = [W("Normal Nia", "M13 9AA", "", { student_phone: "07811000321" })];
const pv28 = await call({ action: "auto_assign", dry: true }); ok(pv28.results[0].instructor === "Mo Sale" && /0 of 3/.test(pv28.results[0].why || ""), "franchise Mo on the Normal package (£50, no guarantee) is still offered first until 3 are booked (" + pv28.results[0].instructor + ")");

console.log("== 29. Fuzz: 80 random bookings, random replies, several runs ==");
let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pick = (a) => a[Math.floor(rnd() * a.length)];
cfgOf().maxPerDay = 500; cfgOf().maxPerRun = 10; cfgOf().dailyLimit = 3; cfgOf().weeklyLimit = 0; cfgOf().franchiseMin = 2; cfgOf().fairnessMiles = 0.5; cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().femaleRule = "require"; cfgOf().autoMiles = 0;
DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } }; DB.growth_settings = DB.growth_settings.filter((x) => x.key !== "packages");
DB.referrals = []; DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = []; DB.student_followups = [];
const PCS = ["M13 9AA", "M14 4AA", "M20 2AA", "M33 5AA", "M1 1AA", "BL1 1AA", "M21 7AA", "SK8 3AA", "ZZ9 9ZZ", "", "M13 0PG", "M16 8AA"];
let phones = []; DB.waiting_list = Array.from({ length: 80 }, (_, k) => { const ph = k % 9 === 0 && phones.length ? pick(phones) : "078" + String(1000000 + Math.floor(rnd() * 8999999)); phones.push(ph); return W("Fuzz " + k, pick(PCS), pick(["", "👩 FEMALE INSTRUCTOR REQUESTED", "👩 FEMALE PREFERRED REQUESTED", "Gearbox: Automatic", "— UPDATED request", "I'd prefer a female instructor if possible."]), { student_phone: ph, created_at: new Date(Date.now() - rnd() * 3600e3).toISOString() }); });
let thrown = 0;
for (let round = 0; round < 12; round++) {
  try { await call({ action: "auto_assign", cron: true }); } catch (e) { thrown++; console.log("   threw:", String(e).slice(0, 160)); }
  for (const j of DB.auto_assign_jobs.filter((x) => x.state === "pending_accept")) { const r = rnd(); const ins = DB.instructors.find((i) => i.id === j.instructor_id); if (!ins) continue; const from = "44" + ins.phone.replace(/^0/, ""); try { if (r < 0.4) await hook({ from, p: "OFFER_ACCEPT:" + j.id }); else if (r < 0.6) await hook({ from, p: "OFFER_DECLINE:" + j.id }); else if (r < 0.7) j.expires_at = new Date(Date.now() - 70 * 60000).toISOString(); } catch (e) { thrown++; } }
  for (const j of DB.auto_assign_jobs.filter((x) => x.state === "attention" && /female instructor not available/.test(x.note || ""))) { const r = rnd(); const w = DB.waiting_list.find((x) => String(x.id) === String(j.waiting_id)); if (w && r < 0.5) { try { await hook({ from: "44" + String(w.student_phone).replace(/^0/, ""), p: (r < 0.3 ? "FEM_YES:" : "FEM_NO:") + j.id }); } catch (e) { thrown++; } } }
}
ok(thrown === 0, "12 rounds of random bookings and replies: nothing threw (" + thrown + ")");
const byWaiting = {}; DB.auto_assign_jobs.forEach((j) => { byWaiting[j.waiting_id] = (byWaiting[j.waiting_id] || 0) + 1; });
ok(Object.values(byWaiting).every((n) => n === 1), "every booking has exactly one job row");
const asgn = {}; DB.referrals.forEach((r) => { asgn[r.student_phone] = (asgn[r.student_phone] || 0) + 1; });
ok(Object.values(asgn).every((n) => n === 1), "no student was assigned twice (max " + Math.max(0, ...Object.values(asgn)) + ")");
const stuckW = DB.auto_assign_jobs.filter((j) => j.state === "working"); ok(stuckW.length === 0, "no job is left stuck working (" + stuckW.length + ")");
const pendNoInstr = DB.auto_assign_jobs.filter((j) => j.state === "pending_accept" && !j.instructor_id); ok(pendNoInstr.length === 0, "every pending offer names an instructor");
const fem = DB.referrals.filter((r) => /FEMALE INSTRUCTOR REQUESTED/.test((DB.waiting_list.find((w) => w.student_phone === r.student_phone) || {}).notes || "")); const maleToFem = fem.filter((r) => r.instructor_id !== "i2" && !/agreed to a male/.test((DB.waiting_list.find((w) => w.student_phone === r.student_phone) || {}).notes || ""));
ok(maleToFem.length === 0, "nobody who asked for a woman was given a man without agreeing (" + maleToFem.length + ")");
const perDay = {}; DB.referrals.forEach((r) => { perDay[r.instructor_id] = (perDay[r.instructor_id] || 0) + 1; }); console.log("   given per instructor:", JSON.stringify(perDay), "| jobs:", DB.auto_assign_jobs.length, "| states:", JSON.stringify(DB.auto_assign_jobs.reduce((a, j) => (a[j.state] = (a[j.state] || 0) + 1, a), {})));

console.log("== 30. Meta re-sends the same message ==");
cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().dailyLimit = 0; cfgOf().maxPerDay = 500; DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.student_followups = [];
DB.waiting_list = [W("Retry Rae", "M13 9AA", "", { student_phone: "07833777888" })]; await call({ action: "auto_assign", cron: true });
const jr = DB.auto_assign_jobs[0], insR = DB.instructors.find((i) => i.id === jr.instructor_id), fromR = "44" + insR.phone.replace(/^0/, "");
const sameMsg = async (p) => { const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "wamid.SAME1", from: fromR, type: "button", button: { payload: p, text: "x" } }] } }] }] }); const sg = await sigf(body); for (let k = 0; k < 3; k++) await h(new Request("https://f/whatsapp", { method: "POST", headers: { "x-hub-signature-256": sg }, body })); };
await sameMsg("OFFER_ACCEPT:" + jr.id);
ok(DB.referrals.filter((r) => r.student_name === "Retry Rae").length === 1 && DB.wa_log.filter((l) => l.direction === "in" && l.wa_message_id === "wamid.SAME1").length === 1, "the same Accept delivered 3 times -> processed once (1 referral, 1 log row)");

console.log("== 31. Week and day boundaries around the clocks changing ==");
const RealDate = Date; const withNow = (iso, fn) => { const t = RealDate.parse(iso); class FD extends RealDate { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } } (globalThis as any).Date = FD; try { return fn(); } finally { (globalThis as any).Date = RealDate; } };
const { mondayLondon: ML, londonMidnightToday: LM } = globalThis.__waTest;
const iso = (ms) => new RealDate(ms).toISOString();
const exp = (nowIso, expect, fn, label) => { const got = withNow(nowIso, () => iso(fn().getTime ? fn().getTime() : fn())); ok(got === expect, label + " (" + got + ")"); };
exp("2026-03-29T10:00:00Z", "2026-03-23T00:00:00.000Z", () => ML(), "Sunday 29 Mar 2026 (clocks go forward that day): the week began Mon 23 Mar 00:00 GMT");
exp("2026-03-30T08:00:00Z", "2026-03-29T23:00:00.000Z", () => ML(), "Monday 30 Mar morning (BST): the week began Mon 00:00 BST = Sun 23:00 UTC");
exp("2026-06-01T22:30:00Z", "2026-05-31T23:00:00.000Z", () => ML(), "Mon 1 Jun 23:30 BST is already Monday: week began 23:00 UTC the night before");
exp("2026-06-01T23:30:00Z", "2026-05-31T23:00:00.000Z", () => ML(), "Tue 2 Jun 00:30 BST: same week");
exp("2026-10-25T10:00:00Z", "2026-10-18T23:00:00.000Z", () => ML(), "Sunday 25 Oct 2026 (clocks go back that day): the week began Mon 19 Oct 00:00 BST");
exp("2026-10-25T10:00:00Z", "2026-10-24T23:00:00.000Z", () => LM(), "midnight at the start of 25 Oct (a 25-hour day) = 23:00 UTC the day before");
exp("2026-03-29T10:00:00Z", "2026-03-29T00:00:00.000Z", () => LM(), "midnight at the start of 29 Mar (a 23-hour day) = 00:00 UTC");
exp("2026-11-21T09:00:00Z", "2026-11-21T00:00:00.000Z", () => LM(), "an ordinary winter day");

console.log("== 32. Terms link after the welcome ==");
cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().messageStudent = true; DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.student_followups = [];
DB.waiting_list = [W("Terms Tia", "M13 9AA", "", { student_phone: "07844123123" })]; await call({ action: "auto_assign", cron: true });
const jt = DB.auto_assign_jobs[0], insT = DB.instructors.find((i) => i.id === jt.instructor_id), fromT = "44" + insT.phone.replace(/^0/, "");
await hook({ from: fromT, p: "OFFER_ACCEPT:" + jt.id });
const refT = DB.referrals.find((r) => r.student_name === "Terms Tia");
ok(sent("dsq_student_welcome_2").length === 1 && sent("dsq_student_terms").length === 1, "after the instructor accepts: welcome, then the terms link (1 each)");
const callT = CALLS.filter((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_student_terms").pop(); ok(callT && callT.wa.to === "447844123123" && callT.wa.template.components[0].parameters[0].text === "Terms", "the terms message goes to the student with their first name");
ok(/Terms & conditions link sent/.test(refT.admin_notes), "noted on the referral so admin can see it was sent");
await hook({ from: fromT, p: "ACCEPT:" + refT.id }); ok(sent("dsq_student_terms").length === 1, "tapping Accept again does not send it twice");

cfgOf().sendTerms = false; DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.student_followups = [];
DB.waiting_list = [W("No Terms Nia", "M13 9AA", "", { student_phone: "07844555666" })]; await call({ action: "auto_assign", cron: true });
{ const jn = DB.auto_assign_jobs[0], inn = DB.instructors.find((i) => i.id === jn.instructor_id); await hook({ from: "44" + inn.phone.replace(/^0/, ""), p: "OFFER_ACCEPT:" + jn.id }); }
ok(sent("dsq_student_welcome_2").length + sent("dsq_student_welcome").length >= 1 && sent("dsq_student_terms").length === 0, "terms switched OFF: the student is welcomed but NO terms & conditions message is sent");
cfgOf().sendTerms = true;
console.log("== 32b. A roster that cannot be saved does not stop the assignment ==");
cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().messageStudent = true; cfgOf().sendTerms = false; DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.student_followups = []; CALLS.length = 0;
DB.waiting_list = [W("Roster Rae", "M13 9AA", "", { student_phone: "447844777888" })]; await call({ action: "auto_assign", cron: true });
globalThis.FAIL_INSERT = new Set(["student_profiles"]);
{ const jr = DB.auto_assign_jobs[0], inr = DB.instructors.find((i) => i.id === jr.instructor_id); await hook({ from: "44" + inr.phone.replace(/^0/, ""), p: "OFFER_ACCEPT:" + jr.id }); }
globalThis.FAIL_INSERT = new Set();
ok(DB.referrals.some((r) => r.student_name === "Roster Rae") && DB.waiting_list.find((w) => w.student_name === "Roster Rae").status === "assigned", "roster save fails: the student is STILL assigned to the instructor");
ok(DB.admin_attention.some((x) => x.kind === "roster_failed" && /Roster Rae/.test(x.title) && /simulated/.test(x.detail)), "...and you are told to add them by hand, with the real reason");
const dcall = CALLS.filter((c) => c.wa && c.wa.template && /dsq_student_details|dsq_new_student/.test(c.wa.template.name)).pop();
ok(dcall && JSON.stringify(dcall.wa.template.components[0].parameters).includes("07844 777888"), "a number that came from WhatsApp (447844777888) is shown to the instructor as 07844 777888");
ok(sent("dsq_student_welcome_2").length + sent("dsq_student_welcome").length >= 1, "...and the student is still welcomed");

console.log("== 32c. An instructor TYPES the answer instead of tapping the button ==");
{ const resetT = () => { cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().autoMiles = 0; DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.student_followups = []; CALLS.length = 0; };
  const textsTo = (to) => CALLS.filter((c) => c.wa && c.wa.type === "text" && String(c.wa.to) === to).map((c) => c.wa.text.body), insOf = (job) => DB.instructors.find((i) => i.id === job.instructor_id), numOf = (i) => "44" + i.phone.replace(/^0/, "").replace(/\s/g, "");
  resetT(); DB.waiting_list = [W("Typed Tess", "M13 9AA", "", { student_phone: "07844000111" })]; await call({ action: "auto_assign", cron: true });
  let jt = DB.auto_assign_jobs[0], it = insOf(jt); await hook({ from: numOf(it) }, "Yes please");
  ok(DB.referrals.some((r) => r.student_name === "Typed Tess" && r.instructor_id === it.id), "typed 'Yes please' = Accept: the student is assigned");
  resetT(); DB.waiting_list = [W("Typed Tom", "M13 9AA", "", { student_phone: "07844000222" })]; await call({ action: "auto_assign", cron: true });
  jt = DB.auto_assign_jobs[0]; it = insOf(jt); await hook({ from: numOf(it) }, "What is the postcode exactly?"); await hook({ from: numOf(it) }, "and the name?");
  ok(!DB.referrals.some((r) => r.student_name === "Typed Tom") && DB.auto_assign_jobs[0].state === "pending_accept" && textsTo(numOf(it)).filter((x) => /tap \*Accept\*/.test(x)).length === 1, "an unclear typed message is never guessed: nothing is assigned, and they are told once how to answer");
  await hook({ from: numOf(it) }, "I can't, sorry");
  ok(!DB.referrals.some((r) => r.student_name === "Typed Tom" && r.instructor_id === it.id) && (DB.auto_assign_jobs[0].state !== "pending_accept" || DB.auto_assign_jobs[0].instructor_id !== it.id), "typed 'I can't, sorry' = Can't take: the offer moves on");
  resetT(); cfgOf().autoMiles = 0; }
console.log("== 32d. Franchise / chosen instructors get the student straight away; a decline reassigns ==");
{ const reset = () => { cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().autoMiles = 0; cfgOf().directMiles = 6; cfgOf().messageStudent = true; cfgOf().mode = "assign"; cfgOf().enabled = true; DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.student_followups = []; DB.admin_activity_log = []; CALLS.length = 0; };
  const sentTo = (t) => CALLS.filter((c) => c.wa && c.wa.template && c.wa.template.name === t).map((c) => c.wa);
  const origModel = DB.instructors.map((i) => i.instructor_model), origTraits = JSON.stringify(DB.growth_settings.find((x) => x.key === "instructor_traits").value);
  // (a) franchise instructor within 6 miles: no offer, details + student welcome at once, buttons still on the details message
  reset(); DB.instructors.forEach((i) => { i.instructor_model = "franchise"; }); DB.waiting_list = [W("Direct Dee", "M13 9AA", "", { student_phone: "07844555101" })]; await call({ action: "auto_assign", cron: true });
  const rd = DB.referrals.find((r) => r.student_name === "Direct Dee"), jobD = DB.auto_assign_jobs[0];
  ok(rd && jobD.state === "assigned" && sentTo("dsq_student_offer").length === 0, "franchise instructor within 6 miles: NO offer is sent, the student is assigned straight away");
  const dcall2 = sentTo("dsq_new_student").pop(); ok(dcall2 && dcall2.template.components.some((c) => c.type === "button"), "...they get the full student details, with the Accept / Can't take buttons still there");
  ok(sentTo("dsq_student_welcome_2").length + sentTo("dsq_student_welcome").length >= 1 && /no Accept needed/.test(DB.waiting_list.find((w) => w.student_name === "Direct Dee").notes), "...and the student is told who their instructor is at once; the booking says so");
  // (b) the instructor then taps Can't take: student told, back in the queue, next instructor gets it
  const insA = DB.instructors.find((i) => i.id === rd.instructor_id); CALLS.length = 0; await hook({ from: "44" + insA.phone.replace(/^0/, "").replace(/\s/g, ""), p: "DECLINE:" + rd.id });
  const rd2 = DB.referrals.filter((r) => r.student_name === "Direct Dee"), cur = rd2.find((r) => !r.is_cancelled);
  ok(rd2.find((r) => r.id === rd.id).is_cancelled === true && sentTo("dsq_student_reassign").length === 1, "Can't take: the first record is cancelled and the student gets the 'finding you another instructor' message");
  ok(cur && cur.instructor_id !== rd.instructor_id && sentTo("dsq_new_student").length >= 1, "...and the student goes to the NEXT instructor, who is sent the details");
  // (c) an instructor set to 'ask first' is offered the student instead (even if franchise)
  reset(); DB.instructors.forEach((i, k) => { i.instructor_model = origModel[k]; }); DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i1: { sendMode: "ask" }, i2: { female: true, sendMode: "ask" } }; DB.instructors.forEach((i) => { i.instructor_model = "franchise"; });
  DB.waiting_list = [W("Ask Abe", "M13 9AA", "", { student_phone: "07844555102" })]; await call({ action: "auto_assign", cron: true });
  ok(sentTo("dsq_student_offer").length === 1 && !DB.referrals.some((r) => r.student_name === "Ask Abe"), "set to 'Ask first': a franchise instructor is still offered the student and must Accept");
  // (d) a referral instructor set to 'send straight away' gets it directly
  reset(); DB.instructors.forEach((i) => { i.instructor_model = "referral"; }); DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i1: { sendMode: "direct" }, i2: { female: true, sendMode: "direct" } };
  DB.waiting_list = [W("Direct Del", "M13 9AA", "", { student_phone: "07844555103" })]; await call({ action: "auto_assign", cron: true });
  ok(DB.referrals.some((r) => r.student_name === "Direct Del") && sentTo("dsq_student_offer").length === 0, "a referral instructor set to 'send straight away' is sent the student with no offer");
  // (e) a referral instructor with no setting is asked first (default)
  reset(); DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } }; DB.waiting_list = [W("Ask Amy", "M13 9AA", "", { student_phone: "07844555104" })]; await call({ action: "auto_assign", cron: true });
  ok(sentTo("dsq_student_offer").length === 1 && !DB.referrals.some((r) => r.student_name === "Ask Amy"), "referral instructor, default setting: asked first, as before");
  // (f) over the direct distance: franchise is asked first
  reset(); DB.instructors.forEach((i) => { i.instructor_model = "franchise"; }); cfgOf().directMiles = 0.1; DB.waiting_list = [W("Far Fay", "M13 9AA", "", { student_phone: "07844555105" })]; await call({ action: "auto_assign", cron: true });
  ok(sentTo("dsq_student_offer").length === 1, "further than the direct distance, a franchise instructor is offered the student first");
  DB.instructors.forEach((i, k) => { i.instructor_model = origModel[k]; }); DB.growth_settings.find((x) => x.key === "instructor_traits").value = JSON.parse(origTraits); reset(); cfgOf().directMiles = 0; }
console.log("== 33. Re-booking uses its own template, with a fallback ==");
cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().femaleRule = "require"; DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } };
const rebookSetup = (name, phone) => { DB.referrals = [{ id: "rb" + phone, instructor_id: "i1", student_name: name, student_phone: phone, created_at: new Date(Date.now() - 3 * 864e5).toISOString(), is_cancelled: false, is_credit: false }]; DB.auto_assign_jobs = []; DB.admin_attention = []; DB.wa_log = []; DB.waiting_list = [W(name, "M13 9AA", "", { student_phone: phone.replace(/\s/g, "") })]; };
rebookSetup("Back Bea", "07855 000111"); CALLS.length = 0; await call({ action: "auto_assign", cron: true });
const rbCall = CALLS.find((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_instructor_rebooked");
ok(rbCall && rbCall.wa.template.components[0].parameters.map((p) => p.text).join("|") === "Dawood|Back Bea|M13|Manual" && sent("dsq_student_offer").length === 0, "an existing student booking again -> the instructor gets 'one of your existing students' (Dawood|Back Bea|M13|Manual)");
ok(rbCall.wa.template.components.filter((c) => c.type === "button").length === 2 && DB.auto_assign_jobs[0].state === "pending_accept", "with Accept / Can't take buttons, and the offer is pending");
globalThis.FAIL_TEMPLATES.add("dsq_instructor_rebooked"); rebookSetup("Back Ben", "07855 000222"); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_offer").length === 1 && DB.auto_assign_jobs[0].state === "pending_accept", "if the re-booking template is not approved yet, the normal offer is sent instead (nothing held up)");
globalThis.FAIL_TEMPLATES.clear();

console.log("== 34. Balance reminder to the instructor ==");
const pinDate = (isoS) => { const t = RealDate.parse(isoS); class FD extends RealDate { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } } (globalThis as any).Date = FD; }; const unpin = () => { (globalThis as any).Date = RealDate; };
pinDate("2026-11-24T11:00:00Z"); // a Tuesday, 11am UK
cfgOf().enabled = true; cfgOf().mode = "assign"; cfgOf().unpaidLimit = 2; cfgOf().anytime = true; cfgOf().hours = [0, 24]; delete cfgOf().balanceAuto;
const bk34 = (id, iid, amt, paid = false) => ({ id, instructor_id: iid, student_name: "B" + id, student_phone: "0790" + id, amount: amt, is_paid: paid, created_at: new Date(Date.now() - 20 * 864e5).toISOString(), flag_color: "green", reply_status: "booked", admin_notes: dd2 + " · ✅ Booked — confirmed by admin", is_cancelled: false, is_credit: false });
DB.referrals = [bk34("5001", "i1", 25), bk34("5002", "i1", 25), bk34("5003", "i1", 25), bk34("5004", "i1", 25, true), bk34("5005", "i3", 25), bk34("5006", "i3", 25)]; DB.wa_log = []; DB.admin_attention = []; DB.waiting_list = []; DB.auto_assign_jobs = []; CALLS.length = 0;
await call({ action: "auto_assign", cron: true });
const balCall = CALLS.find((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_instructor_balance");
ok(sent("dsq_instructor_balance").length === 1 && balCall && balCall.wa.template.components[0].parameters.map((p) => p.text).join("|") === "Dawood|3|75", "referral instructor with 3 unpaid booked students: balance WhatsApp 'Dawood|3|75' (franchise Mo, with the same data, gets nothing)");
ok(balCall.wa.template.components.some((c) => c.type === "button" && /^BAL_PAID:i1$/.test(c.parameters[0].payload)), "it carries an 'I've paid' button");
await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 1, "the next run does not repeat it (once a week)");
DB.wa_log.forEach((l) => { if (l.template === "dsq_instructor_balance") l.created_at = new Date(Date.now() - 8 * 864e5).toISOString(); }); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_instructor_balance").length === 2, "8 days later it is sent again");
await hook({ from: "447700900001", p: "BAL_PAID:i1" }); ok(DB.admin_attention.some((a) => a.kind === "balance_paid"), "'I've paid' tapped -> you get an item to check the bank (nothing marked paid automatically)");
cfgOf().mode = "suggest"; DB.wa_log = []; await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 0, "in suggest mode nothing is sent");
cfgOf().mode = "assign"; cfgOf().balanceAuto = false; await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 0, "switched off in settings -> nothing is sent");
delete cfgOf().balanceAuto; DB.wa_log = []; unpin(); pinDate("2026-11-24T22:30:00Z"); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_instructor_balance").length === 0, "balance reminders never go out at night (only 9am-6pm UK)");
unpin(); pinDate("2026-11-22T11:00:00Z"); await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 0, "...or on a Sunday");
unpin(); pinDate("2026-11-24T11:00:00Z"); DB.wa_log = []; for (let n = 0; n < 8; n++) DB.wa_log.push({ to_phone: "447700900001", direction: "out", status: "sent", template: "x", created_at: new Date().toISOString() });
await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 0, "an instructor who already had 8 messages today gets no reminder (daily limit)");
console.log("== 34b. Weekly billing digest to the admin ==");
DB.wa_log = []; DB.admin_attention = []; DB.growth_settings = DB.growth_settings.filter((k) => k.key !== "billing_digest_last"); DB.admin_attention = []; unpin(); pinDate("2026-11-23T10:00:00Z"); // Monday 10am
await call({ action: "auto_assign", cron: true });
const bd = DB.admin_attention.filter((a) => a.kind === "billing_digest"); ok(bd.length === 1 && /to collect/.test(bd[0].title), "Monday: one billing summary for the admin (" + (bd[0] && bd[0].title) + ")");
await call({ action: "auto_assign", cron: true }); ok(DB.admin_attention.filter((a) => a.kind === "billing_digest").length === 1, "not repeated the same week");
unpin();
console.log("== 40. Per-instructor settings and student gender ==");
const trs = () => DB.growth_settings.find((x) => x.key === "instructor_traits").value;
const names40 = (r) => (r.list || []).map((x) => x.name), skippedOf = (r) => (r.skipped || []).map((x) => x.name + ":" + x.why);
trs().i1 = { only: "female" }; let r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Gary Smith" });
ok(!names40(r40).includes("Dawood Khan") && skippedOf(r40).some((x) => /Dawood.*only teaches women.*looks male/.test(x)), "'women only' instructor is not offered a man (Gary): " + skippedOf(r40).filter((x) => /Dawood/.test(x)));
r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Priya Patel" }); ok(names40(r40).includes("Dawood Khan"), "...but is offered a woman (Priya)");
r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Noor Ali" }); ok(!names40(r40).includes("Dawood Khan") && skippedOf(r40).some((x) => /Dawood.*unclear/.test(x)), "...and is not offered a name that could be either (Noor): never a wrong guess");
r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Noor Ali", notes: "Student gender: female" }); ok(names40(r40).includes("Dawood Khan"), "a 'Student gender: female' line on the booking settles it");
r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Zzxq Qwerty", notes: "I am a woman and a beginner" }); ok(names40(r40).includes("Dawood Khan"), "'I am a woman' in the student's own words is understood");
r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Mrs Jones" }); ok(names40(r40).includes("Dawood Khan"), "title Mrs is understood");
trs().i1 = { only: "male" }; r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Mohammed Hussain" }); ok(names40(r40).includes("Dawood Khan"), "'men only' instructor is offered Mohammed");
r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Emma Brown" }); ok(!names40(r40).includes("Dawood Khan"), "...not Emma");
trs().i1 = { pausedUntil: "2999-01-01" }; r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual" }); ok(!names40(r40).includes("Dawood Khan") && skippedOf(r40).some((x) => /paused until 2999/.test(x)), "paused until a date: skipped with the reason");
trs().i1 = { pausedUntil: "2000-01-01" }; r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual" }); ok(names40(r40).includes("Dawood Khan"), "a pause in the past has ended by itself");
trs().i1 = { maxMiles: 0.1 }; r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual" }); const dMyA40 = (r40.list || []).find((x) => x.name === "Dawood Khan"); ok(dMyA40 && dMyA40.within === false, "own distance limit 0.1 mile: not within range for this booking");
trs().i1 = { maxMiles: 30 }; r40 = await call({ action: "simulate", postcode: "BL1 1AA", type: "Manual" }); const dMy40 = (r40.list || []).find((x) => x.name === "Dawood Khan"); ok(dMy40 && dMy40.within === true, "own distance limit 30 miles: in range even above the general limit");
trs().i1 = { coveredOnly: true }; r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual" }); ok(names40(r40).includes("Dawood Khan"), "covered-only instructor IS offered a postcode they cover (M13)");
r40 = await call({ action: "simulate", postcode: "M4 1AA", type: "Manual" }); ok(!names40(r40).includes("Dawood Khan") && skippedOf(r40).some((q) => /Dawood.*only teaches their covered postcodes/.test(q)), "...but NOT one they do not cover (M4): " + skippedOf(r40).filter((q) => /Dawood/.test(q)));
{ const d0 = DB.instructors[0], keep = d0.coverage_postcodes; d0.coverage_postcodes = ""; r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual" }); ok(!names40(r40).includes("Dawood Khan") && skippedOf(r40).some((q) => /none are set/.test(q)), "covered-only with no postcodes set: not offered anything, with the reason"); d0.coverage_postcodes = keep; }
delete trs().i1; trs().i2 = { female: true };
{ r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Priya Patel" }); const l = r40.list || []; ok(l.length && l[0].name === "Sara Female" || l.findIndex((q) => q.name === "Sara Female") < l.findIndex((q) => q.name === "Mo Sale"), "a female student: the female instructor is ahead of the closer male one (Mo): " + l.map((q) => q.name + " " + q.dist).join(", "));
  r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Gary Smith" }); const l2 = r40.list || []; ok(l2.findIndex((q) => q.name === "Mo Sale") < l2.findIndex((q) => q.name === "Sara Female"), "a male student: normal order (closest first)");
  cfgOf().femaleStudentMiles = 1; r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Priya Patel" }); const l3 = r40.list || []; ok(l3.findIndex((q) => q.name === "Mo Sale") < l3.findIndex((q) => q.name === "Sara Female"), "female instructor beyond the limit (1 mile): normal order, nobody excluded");
  cfgOf().femaleStudentMiles = 5; cfgOf().femaleStudentFirst = false; r40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual", name: "Priya Patel" }); const l4 = r40.list || []; ok(l4.findIndex((q) => q.name === "Mo Sale") < l4.findIndex((q) => q.name === "Sara Female"), "switched off: normal order"); cfgOf().femaleStudentFirst = true; }
const trailBefore = DB.admin_activity_log ? DB.admin_activity_log.length : 0; ok(true, "(audit trail checked below)");
console.log("== 41. WhatsApp enquiry ticked for auto-assign ==");
{ cfgOf().enabled = true; cfgOf().mode = "assign"; cfgOf().sources = ["[WEB]"]; DB.waiting_list = []; DB.auto_assign_jobs = []; DB.wa_log = [];
  const wa = W("Hannah Brown", "M13 9AA"); wa.notes = "[WHATSAPP]\n[AUTO]\nSource: WhatsApp enquiry\nPostcode: M13 9AA"; const hand = W("Hand Held", "M13 9AA"); hand.notes = "Postcode: M13 9AA";
  DB.waiting_list.push(wa, hand); await call({ action: "auto_assign", cron: true });
  ok(DB.auto_assign_jobs.some((j) => String(j.waiting_id) === String(wa.id)), "a WhatsApp enquiry ticked for auto-assign is picked up (even though sources is only [WEB])");
  ok(!DB.auto_assign_jobs.some((j) => String(j.waiting_id) === String(hand.id)), "an entry added by hand with no tag is left alone"); }
console.log("== 42. AI booking assistant ==");
const readBookingTest = (w) => ({ addr: ((String(w.notes).match(/(?:^|\n)\s*Address:\s*([^\n]+)/i) || [])[1] || "").trim() });
{
  const textsTo = (to) => CALLS.filter((c) => c.wa && c.wa.type === "text" && String(c.wa.to) === to).map((c) => c.wa.text.body);
  const tool = (name, input) => ({ content: [{ type: "tool_use", id: "t1", name, input }] });
  const say = (txt) => ({ content: [{ type: "text", text: txt }] });
  const STU = "447911123456"; CALLS.length = 0; DB.wa_log = []; DB.admin_attention = []; DB.waiting_list = []; DB.auto_assign_jobs = [];
  cfgOf().aiAssistant = false; globalThis.CLAUDE_Q = [say("hi")]; await hook({ from: STU }, "Hi I want driving lessons");
  ok(!CALLS.some((c) => c.claude) && textsTo(STU).length === 0, "assistant OFF: Claude is never called and nobody is answered");
  cfgOf().aiAssistant = true; cfgOf().aiTestOnly = true; cfgOf().adminPhone = "07700900999"; await hook({ from: STU }, "Hi I want driving lessons");
  ok(!CALLS.some((c) => c.claude) && textsTo(STU).length === 0, "test mode: a real student is NOT answered (only the admin phone)");
  globalThis.CLAUDE_Q = [say("Hi! What is your full name?")]; await hook({ from: "447700900999" }, "Hi I want driving lessons");
  ok(CALLS.some((c) => c.claude) && textsTo("447700900999")[0] === "Hi! What is your full name?", "test mode: the admin phone gets a reply");
  const cl = CALLS.find((c) => c.claude).claude; ok(cl.model === "claude-haiku-5-5" && cl.tools.length === 2 && /Never quote prices/.test(cl.system) && cl.messages[cl.messages.length - 1].role === "user", "sent to Claude with the rules, 2 tools and the student's message last");
  cfgOf().aiTestOnly = false; CALLS.length = 0; globalThis.CLAUDE_Q = [say("Great! What is your full name?")]; await hook({ from: STU }, "Hi I want driving lessons");
  ok(textsTo(STU)[0] === "Great! What is your full name?", "live mode: a student is answered");
  globalThis.CLAUDE_Q = [tool("create_booking", { name: "Hannah Brown", postcode: "m13 9aa", gearbox: "automatic", availability: "weekday evenings", instructor_gender: "female_required", notes: "nervous" })]; CALLS.length = 0;
  await hook({ from: STU }, "Hannah Brown, M13 9AA, automatic please");
  const wl = DB.waiting_list.find((w) => /Hannah/.test(w.student_name));
  ok(wl && wl.postcode === "M13 9AA" && wl.lesson_type === "Automatic" && /\[AUTO\]/.test(wl.notes) && /\[WHATSAPP\]/.test(wl.notes) && /FEMALE INSTRUCTOR REQUESTED/.test(wl.notes) && /weekday evenings/.test(wl.notes) && wl.student_phone === STU, "booking created with the tags, gearbox, availability, female request and their phone: " + (wl && wl.notes.replace(/\n/g, " | ")));
  ok(/passed your details/.test(textsTo(STU)[0] || ""), "the student gets one fixed confirmation (no free-text promises)");
  CALLS.length = 0; await call({ action: "auto_assign", cron: true }); ok(DB.auto_assign_jobs.some((j) => String(j.waiting_id) === String(wl.id)), "auto-assign then picks the assistant's booking up");
  CALLS.length = 0; globalThis.CLAUDE_Q = [say("should not be sent")]; await hook({ from: STU }, "thanks!"); ok(!CALLS.some((c) => c.claude) && textsTo(STU).length === 0, "after the booking it stays quiet (no second answer)");
  ok(DB.admin_attention.some((x) => x.kind === "ai_handoff" && /after their booking/.test(x.title) && /thanks!/.test(x.detail)), "...but you are told about their new message (nobody is ignored)");
  const S2 = "447922222222"; globalThis.CLAUDE_Q = [tool("create_booking", { name: "Joe Bloggs", postcode: "ZZ99 9ZZ", gearbox: "manual" })]; CALLS.length = 0; await hook({ from: S2 }, "Joe Bloggs ZZ99 9ZZ manual");
  ok(!DB.waiting_list.some((w) => /Joe/.test(w.student_name)) && /postcode/i.test(textsTo(S2)[0] || ""), "an unknown postcode is not saved: the student is asked again");
  globalThis.CLAUDE_Q = [tool("create_booking", { name: "Joe Bloggs", postcode: "M13 9AA", gearbox: "manual" })]; CALLS.length = 0; await hook({ from: S2 }, "sorry M13 9AA");
  ok(DB.waiting_list.some((w) => /Joe/.test(w.student_name)), "...and saved when the postcode is right");
  const S3 = "447933333333"; globalThis.CLAUDE_Q = [tool("hand_off", { reason: "asks how much a lesson costs and wants a person" })]; CALLS.length = 0; await hook({ from: S3 }, "can I speak to someone");
  ok(/member of our team/.test(textsTo(S3)[0] || "") && DB.admin_attention.some((a) => a.kind === "ai_handoff"), "hand-off: the student is told, you get an alert");
  CALLS.length = 0; globalThis.CLAUDE_Q = [say("x")]; await hook({ from: S3 }, "hello??"); ok(!CALLS.some((c) => c.claude), "after a hand-off the assistant stays out of the conversation");
  const S4 = "447944444444"; globalThis.CLAUDE_FAIL = true; CALLS.length = 0; await hook({ from: S4 }, "hi"); globalThis.CLAUDE_FAIL = false;
  ok(textsTo(S4).length === 0 && DB.admin_attention.some((a) => a.kind === "ai_error"), "if Claude is unavailable the student gets nothing wrong and you get an alert");
  const ins = DB.instructors[0]; CALLS.length = 0; globalThis.CLAUDE_Q = [say("x")]; await hook({ from: "44" + ins.phone.replace(/^0/, "") }, "I am running late today"); ok(!CALLS.some((c) => c.claude), "a message from an instructor is never sent to the assistant");
  const S5 = "447955555555"; CALLS.length = 0; await hook({ from: S5 }, "[image]"); ok(CALLS.some((c) => c.claude) === false, "(media is handled without calling Claude)");
  { const i0 = DB.instructors[0]; cfgOf().aiTestOnly = true; cfgOf().adminPhone = i0.phone; CALLS.length = 0; globalThis.CLAUDE_Q = [say("Hello admin")]; await hook({ from: "44" + i0.phone.replace(/^0/, "") }, "test");
    ok(CALLS.some((c) => c.claude), "test mode: your own number is answered even if it is also saved as an instructor"); cfgOf().aiTestOnly = false; CALLS.length = 0; globalThis.CLAUDE_Q = [say("x")]; await hook({ from: "44" + i0.phone.replace(/^0/, "") }, "late");
    ok(!CALLS.some((c) => c.claude), "live mode: a number saved as an instructor is never answered"); cfgOf().adminPhone = "07700900999"; }
  // ---- fixed handlers for every kind of message ----
  globalThis.CLAUDE_Q = [];
  const KT = [["urgent", "I've had an accident on my lesson", /urgent|999/i, /URGENT/], ["complaint", "I want to make a complaint, the instructor never turned up", /sorry to hear/i, /Complaint/], ["payment", "I need a refund please", /payment question/i, /Payment/], ["cancel", "I need to cancel my lesson tomorrow", /cancellation terms/i, /Cancel/], ["test", "How do I book my theory test?", /test question/i, /test/i], ["instructor", "my instructor hasn't contacted me", /let the team know/i, /instructor/i], ["person", "can I talk to a real person", /member of our team/i, /speak to someone/i]];
  let n9 = 0; for (const [k, msg, rep, title] of KT) { const F = "44790000" + String(1000 + n9++); DB.admin_attention = []; CALLS.length = 0; await hook({ from: F }, msg);
    ok(!CALLS.some((c) => c.claude) && rep.test(textsTo(F)[0] || "") && DB.admin_attention.some((x) => x.kind === "ai_handoff" && title.test(x.title)), k + ": fixed reply sent, you are alerted, Claude not needed (" + (textsTo(F)[0] || "").slice(0, 50) + ")"); }
  { const F = "447900007000"; DB.admin_attention = []; CALLS.length = 0; await hook({ from: F }, "I have to book an emergency test and have accidentally booked for a different date");
    ok(!/999/.test(textsTo(F)[0] || "") && /test question/i.test(textsTo(F)[0] || "") && DB.admin_attention.some((x) => /🚨.*test/i.test(x.title) && /TIME-SENSITIVE/.test(x.detail)), "'emergency test, booked a different date': NOT treated as an accident; handled as a time-sensitive test problem (" + (DB.admin_attention[0] || {}).title + ")");
    for (const [m, expect] of [["I crashed my car on the way", "urgent"], ["I am in hospital and need to cancel", "urgent"], ["I accidentally booked the wrong day for my lesson", "cancel"], ["this is an emergency, I need a lesson tomorrow", ""], ["can I move my test date please", "test"]]) { DB.admin_attention = []; CALLS.length = 0; const FF = "447900008" + String(Math.floor(Math.random() * 900) + 100); globalThis.CLAUDE_Q = [say("ok")]; await hook({ from: FF }, m);
      const got = DB.admin_attention.length ? (/URGENT/.test(DB.admin_attention[0].title) ? "urgent" : /Cancel/.test(DB.admin_attention[0].title) ? "cancel" : /test/i.test(DB.admin_attention[0].title) ? "test" : "other") : ""; ok(got === expect, `"${m}" -> ${expect || "goes to Claude"} (got ${got || "Claude"})`); } }
  // ---- Claude labels the message, fixed rules decide ----
  const lab = (intent, urgency, confidence, summary = "x") => ({ content: [{ type: "tool_use", id: "c1", name: "classify_message", input: { intent, urgency, confidence, summary } }] });
  const act = async (F, msg, label, chat) => { DB.admin_attention = []; DB.admin_activity_log = []; CALLS.length = 0; globalThis.CLASSIFY_Q = label ? [label] : []; globalThis.CLAUDE_Q = chat ? [chat] : []; await hook({ from: F }, msg); return { said: textsTo(F)[0] || "", att: DB.admin_attention.map((x) => x.title + " | " + x.detail).join(" || "), chat: CALLS.some((c) => c.claude), cls: CALLS.some((c) => c.classify), trail: (DB.admin_activity_log || []).filter((x) => x.action === "ai_understood").map((x) => x.summary).join(" ") }; };
  { let r = await act("447910000001", "I have to book an emergency test and have accidentally booked for a different date", lab("test_date", "time_sensitive", 0.96, "needs an earlier test; booked the wrong date"));
    ok(r.cls && !r.chat && /test question/i.test(r.said) && !/999/.test(r.said) && /🚨/.test(r.att) && /TIME-SENSITIVE/.test(r.att), "Claude: emergency test + wrong date -> test problem, time-sensitive alert, no 999 (" + r.att.slice(0, 70) + ")");
    ok(/test_date \(96% sure, time_sensitive\)/.test(r.trail) && /fixed reply \(test\)/.test(r.trail), "the decision is written in plain English in Activity: " + r.trail.slice(0, 120));
    r = await act("447910000002", "I need an emergency lesson as my test is next week", lab("booking", "time_sensitive", 0.9, "wants lessons before a test next week"), say("Sure! What is your full name?"));
    ok(r.chat && /full name/.test(r.said) && /Time-sensitive WhatsApp enquiry/.test(r.att), "'emergency lesson': the assistant carries on collecting the booking AND you get a time-sensitive heads-up");
    r = await act("447910000003", "I crashed on the way to my lesson", lab("safety_emergency", "urgent", 0.95, "car crash"));
    ok(/999/.test(r.said) && /URGENT/.test(r.att), "a real crash: urgent alert and the 999 line");
    r = await act("447910000004", "hmm maybe", lab("booking", "normal", 0.4, "unsure"));
    ok(!r.chat && /member of our team/.test(r.said) && /only 40% sure/.test(r.att), "not sure (40%): handed to you, never guessed (" + r.att.slice(0, 90) + ")");
    r = await act("447910000005", "asdfgh", lab("unclear", "normal", 0.9, "gibberish"));
    ok(!r.chat && /could not tell what they meant/.test(r.att), "unclear: handed to you");
    r = await act("447910000006", "is this a scam? are you real?", lab("faq", "normal", 0.92, "asks if the school is genuine"), say("We are a real driving school in Greater Manchester."));
    ok(r.chat && !/Abusive/.test(r.att) && /We are a real/.test(r.said), "'is this a scam?' is a question, not abuse (the keyword rule is overruled by Claude)");
    r = await act("447910000007", "you useless idiots", lab("abuse", "normal", 0.97, "insults"));
    ok(r.said === "" && /Abusive/.test(r.att), "real abuse: no reply, alert only");
    r = await act("447910000008", "can I cancel tomorrow's lesson", lab("cancel_change", "time_sensitive", 0.93, "cancel tomorrow"));
    ok(/cancellation terms/.test(r.said) && /🚨.*Cancel/.test(r.att), "cancel tomorrow: fixed reply with the terms link + time-sensitive alert");
    r = await act("447910000009", "I need to cancel my lesson", { content: [{ type: "tool_use", id: "c", name: "classify_message", input: { intent: "made_up", urgency: "normal", confidence: 0.99, summary: "x" } }] });
    ok(!r.chat && /cancellation terms/.test(r.said) && /keyword rules/.test(r.trail), "a label that does not fit the rules is ignored: the keyword rules take over");
    globalThis.CLAUDE_FAIL = true; r = await act("447910000010", "I want a refund", null); globalThis.CLAUDE_FAIL = false;
    ok(/payment question/.test(r.said), "Claude unreachable: the keyword rules still give a safe fixed reply");
    CALLS.length = 0; globalThis.CLASSIFY_Q = [lab("booking", "normal", 0.9)]; globalThis.CLAUDE_Q = [say("Thanks! And your postcode?")]; await hook({ from: "447910000011" }, "Hannah Brown"); const cc = (CALLS.find((c) => c.classify) || { classify: { messages: [{ content: "" }] } }).classify; ok(cc.tool_choice && cc.tool_choice.name === "classify_message" && /NEW MESSAGE: Hannah Brown/.test(cc.messages[0].content), "the classifier is forced to answer with the label tool and sees the message");
    cfgOf().aiClassifier = false; r = await act("447910000012", "I need to cancel my lesson", lab("booking", "normal", 0.9)); ok(!r.cls && /cancellation terms/.test(r.said), "classifier switched off: keyword rules only"); cfgOf().aiClassifier = true; globalThis.CLASSIFY_Q = []; globalThis.CLAUDE_Q = []; }
  // ---- READ-ONLY mode: Claude reads, extracts, saves, and sends NOTHING ----
  {
    const ext = (o) => ({ content: [{ type: "tool_use", id: "e1", name: "save_details", input: o }] });
    const RO = async (F, msg, extraction) => { DB.admin_attention = []; CALLS.length = 0; globalThis.EXTRACT_Q = extraction ? [extraction] : []; globalThis.CLASSIFY_Q = []; globalThis.CLAUDE_Q = []; await hook({ from: F }, msg); return { texts: textsTo(F), att: DB.admin_attention.map((x) => x.title + " | " + x.detail).join(" || "), chat: CALLS.some((c) => c.claude), extract: CALLS.some((c) => c.extract) }; };
    const prevTest = cfgOf().aiTestOnly, prevOn = cfgOf().aiAssistant;
    cfgOf().aiSend = false; cfgOf().aiAssistant = true; cfgOf().aiTestOnly = false; cfgOf().aiClassifier = true;
    const F = "447920000001"; let r = await RO(F, "Sam Khan", ext({ name: "Sam Khan" }));
    ok(r.extract && !r.chat && r.texts.length === 0 && /still incomplete/.test(r.att) && /postcode/.test(r.att) && /manual or automatic/.test(r.att), "read-only: a partial chat -> nothing sent, alert says what Claude found and what is missing (" + r.att.slice(0, 120) + ")");
    ok((DB.admin_activity_log || []).some((x) => x.action === "ai_incomplete" && /still missing/.test(x.summary)), "an incomplete chat also shows in the live feed: Claude read it and what is still missing");
    r = await RO(F, "M13 9AA manual please", ext({ name: "Sam Khan", postcode: "m13 9aa", gearbox: "manual", availability: "weekday evenings" }));
    const wl = DB.waiting_list.find((w) => /Sam Khan/.test(w.student_name));
    ok(wl && wl.postcode === "M13 9AA" && /\[AUTO\]/.test(wl.notes) && /read by Claude/.test(wl.notes) && wl.student_phone === F && r.texts.length === 0, "read-only: complete details -> booking saved for auto-assign, STILL nothing sent to the student");
    ok(!DB.wa_log.some((l) => l.direction === "out" && l.to_phone === F && l.status === "sent"), "no outgoing message to that student was logged as sent");
    ok(DB.admin_attention.some((x) => /Booking read from a WhatsApp chat/.test(x.title)), "you are told a booking was read from the chat");
    r = await RO("447920000002", "I need a refund please", null);
    ok(r.texts.length === 0 && /Payment/.test(r.att), "read-only: a refund message -> alert only, no reply sent");
    { const G = "447920000077", lb = (intent, conf) => ({ content: [{ type: "tool_use", id: "c", name: "classify_message", input: { intent, urgency: "normal", confidence: conf, summary: "x" } }] }); DB.admin_attention = [];
      globalThis.CLASSIFY_Q = [lb("unclear", 0.3)]; globalThis.EXTRACT_Q = [ext({})]; await hook({ from: G }, "hmm ok");
      globalThis.CLASSIFY_Q = [lb("booking", 0.9)]; globalThis.EXTRACT_Q = [ext({ name: "Gina Lee", postcode: "m13 9aa", gearbox: "automatic" })]; await hook({ from: G }, "Gina Lee M13 9AA automatic");
      ok(DB.waiting_list.some((w) => /Gina Lee/.test(w.student_name)) && textsTo(G).length === 0, "read-only: an earlier message Claude was unsure about does NOT stop it reading the details sent next: booking saved, nothing sent"); }
    { const H = "447920000088", lb = (intent, conf) => ({ content: [{ type: "tool_use", id: "c", name: "classify_message", input: { intent, urgency: "normal", confidence: conf, summary: "x" } }] });
      DB.wa_log.push({ id: "old-ab", direction: "out", to_phone: H, template: "ai_booked", status: "sent", body: "booked earlier", created_at: new Date().toISOString() }); DB.waiting_list = DB.waiting_list.filter((w) => w.student_phone !== H);
      globalThis.CLASSIFY_Q = [lb("booking", 0.9)]; globalThis.EXTRACT_Q = [ext({ name: "Syed Ali", postcode: "m13 9aa", gearbox: "manual", availability: "Mon Tue Wed" })]; await hook({ from: H }, "Syed Ali M13 9AA manual Mon Tue Wed");
      ok(DB.waiting_list.some((w) => /Syed Ali/.test(w.student_name) && /Mon Tue Wed/.test(w.notes)), "marked booked earlier today but that booking no longer exists: complete new details create a NEW booking (with availability)"); }
    { const R = "447920000099"; DB.waiting_list = DB.waiting_list.filter((w) => w.student_phone !== R); DB.wa_log = []; DB.wa_log.push(...["Kay Lee", "M13 9AA", "automatic please", "weekends"].map((b, i) => ({ id: "rc" + i, direction: "in", to_phone: R, template: null, status: "received", body: b, created_at: new Date(Date.now() - (4 - i) * 60000).toISOString() })));
      globalThis.EXTRACT_Q = [ext({ name: "Kay Lee", postcode: "m13 9aa", gearbox: "automatic", availability: "weekends" })]; const rc = await call({ action: "read_chats" });
      ok(rc.ok && rc.saved >= 1 && DB.waiting_list.some((w) => /Kay Lee/.test(w.student_name) && /weekends/.test(w.notes)) && textsTo(R).length === 0, "'Read recent chats now' saves the booking from chats already received, without the student sending anything again and without sending them anything"); }
    { const P = "447920000066"; DB.waiting_list = DB.waiting_list.filter((w) => w.student_phone !== P); DB.wa_log = []; DB.wa_log.push(...["Hi", "Zara Ndlovu here", "M14 5AA", "auto"].map((b, i) => ({ id: "cd" + i, direction: "in", to_phone: P, template: null, status: "received", body: b, created_at: new Date(Date.now() - (4 - i) * 60000).toISOString() })));
      globalThis.EXTRACT_Q = [ext({ name: "Zara Ndlovu", postcode: "m14 5aa", gearbox: "automatic" })]; const cdr = await call({ action: "chat_details", phone: P });
      ok(cdr.ok && cdr.messages.length === 4 && cdr.proposed.name === "Zara Ndlovu" && !cdr.existing && !DB.waiting_list.some((w) => /Zara/.test(w.student_name)), "pick a chat: it shows what they wrote and what Claude would fill in, and saves nothing yet");
      const cb = await call({ action: "create_booking", phone: P, name: "Zara Ndlovu", postcode: "m14 5aa", gearbox: "automatic", availability: "Weekends", lesson_type: "standard" }); const wb = DB.waiting_list.find((w) => /Zara/.test(w.student_name));
      ok(cb.ok && wb && wb.postcode === "M14 5AA" && /Availability: Weekends/.test(wb.notes) && /\[AUTO\]/.test(wb.notes) && /added by admin/.test(wb.notes) && textsTo(P).length === 0, "admin creates a booking from the chosen chat with the details they confirmed (picked up by auto-assign, nothing sent to the student)");
      const cb2 = await call({ action: "create_booking", phone: P, name: "Zara Ndlovu", postcode: "m14 5aa", gearbox: "automatic" }); const cb3 = await call({ action: "create_booking", phone: "447920000067", name: "Bad Pc", postcode: "ZZ99 9ZZ", gearbox: "manual" }); const cb4 = await call({ action: "create_booking", phone: "447920000068", name: "X", postcode: "m14 5aa", gearbox: "manual" });
      ok(!cb2.ok && /already has a booking/.test(cb2.error) && !cb3.ok && /postcode/i.test(cb3.error) && !cb4.ok && /name/i.test(cb4.error), "a second booking for the same number, a made-up postcode and a one-letter name are all refused with a clear reason"); }
    { const cI = await call({ action: "create_booking", phone: "447920000041", name: "M h", postcode: "m13 9aa", gearbox: "manual", test_centre: "Trafford Park", test_date: "14 March 10:30" }); const wI = DB.waiting_list.find((w) => w.student_phone === "447920000041");
      const cJ = await call({ action: "create_booking", phone: "447920000042", name: "hello", postcode: "m13 9aa", gearbox: "manual" });
      ok(cI.ok && wI && wI.student_name === "M h" && /Test centre: Trafford Park/.test(wI.notes) && /Test date: 14 March 10:30/.test(wI.notes), "initials such as 'M h' are accepted as a name, and the test centre is saved on the booking");
      ok(!cJ.ok && /name/i.test(cJ.error), "a greeting or gearbox word ('hello') is never accepted as a name"); }
    { const S = "447920000055", S2 = "447920000056", mkc = (n, bodies) => bodies.map((b, i) => ({ id: "sw" + n + i, direction: "in", to_phone: n, template: null, status: "received", body: b, created_at: new Date(Date.now() - (6 - i) * 60000).toISOString() }));
      DB.waiting_list = DB.waiting_list.filter((w) => w.student_phone !== S && w.student_phone !== S2); DB.wa_log = [...mkc(S, ["Omar Reid", "M13 9AA", "manual"]), ...mkc(S2, ["Ruth Hale", "M13 9AA", "automatic"])]; DB.growth_settings = DB.growth_settings.filter((x) => x.key !== "ai_sweep_state");
      const _ap = cfgOf().adminPhone; cfgOf().aiAssistant = true; cfgOf().aiSend = false; cfgOf().aiTestOnly = true; cfgOf().adminPhone = "07700900999";
      globalThis.EXTRACT_Q = [ext({ name: "Omar Reid", postcode: "m13 9aa", gearbox: "manual" })]; await call({ action: "auto_assign", cron: true });
      ok(!DB.waiting_list.some((w) => /Omar Reid/.test(w.student_name)), "automatic catch-up while test mode is on: only YOUR admin phone is read, real students are left alone");
      cfgOf().aiTestOnly = false; DB.growth_settings = DB.growth_settings.filter((x) => x.key !== "ai_sweep_state");
      globalThis.EXTRACT_Q = [ext({ name: "Omar Reid", postcode: "m13 9aa", gearbox: "manual" }), ext({ name: "Ruth Hale", postcode: "m13 9aa", gearbox: "automatic" })]; await call({ action: "auto_assign", cron: true });
      ok(DB.waiting_list.some((w) => /Omar Reid/.test(w.student_name)) && DB.waiting_list.some((w) => /Ruth Hale/.test(w.student_name)) && textsTo(S).length === 0, "automatic catch-up (read-only mode): each chat is read on its own and both bookings are saved without anyone pressing a button, nothing is sent");
      const n0 = DB.waiting_list.length, c0 = CALLS.length; await call({ action: "auto_assign", cron: true });
      ok(DB.waiting_list.length === n0 && CALLS.length === c0 || CALLS.slice(c0).every((c) => !c.extract), "the catch-up runs about once a minute at most and never re-reads a chat that has no new message");
      { const PN = "447920000031", PM = "447920000032"; DB.waiting_list = DB.waiting_list.filter((w) => w.student_phone !== PN && w.student_phone !== PM); DB.wa_log = []; const sdp = () => { const x = DB.growth_settings.find((q) => q.key === "ai_sweep_state"); if (x) x.value = { ...x.value, at: 0, seen: {} }; };
        globalThis.EXTRACT_Q = [ext({ postcode: "m13 9aa", gearbox: "manual", availability: "weekdays" })]; sdp(); await hook({ from: PN, name: "Jess Moore 😊" }, "M13 9AA manual weekdays"); await call({ action: "auto_assign", cron: true });
        const wp = DB.waiting_list.find((w) => w.student_phone === PN);
        ok(wp && wp.student_name === "Jess Moore" && /Name taken from their WhatsApp profile/.test(wp.notes), "no name given: the name on their WhatsApp account (emoji removed) is used, and the booking says so");
        globalThis.EXTRACT_Q = [ext({ name: "Jessica Moore-Hall", postcode: "m13 9aa", gearbox: "manual", availability: "weekdays" })]; sdp(); await hook({ from: PM, name: "Jess 😊" }, "Jessica Moore-Hall M13 9AA manual weekdays"); await call({ action: "auto_assign", cron: true });
        const wq = DB.waiting_list.find((w) => w.student_phone === PM);
        ok(wq && wq.student_name === "Jessica Moore-Hall" && !/WhatsApp profile/.test(wq.notes), "a name they wrote always wins over the WhatsApp account name"); }
      { const FP = "447920000022"; DB.waiting_list = DB.waiting_list.filter((w) => w.student_phone !== FP); DB.wa_log = [{ id: "fp1", direction: "in", to_phone: FP, template: null, status: "received", body: "Fran Bell M13 9AA manual weekdays, I would prefer a female instructor", created_at: new Date().toISOString() }];
        globalThis.EXTRACT_Q = [ext({ name: "Fran Bell", postcode: "m13 9aa", gearbox: "manual", availability: "weekdays", instructor_gender: "female_preferred" })]; const sd = DB.growth_settings.find((x) => x.key === "ai_sweep_state"); if (sd) sd.value = { ...sd.value, at: 0, seen: {} };
        const savedCfg = { ...cfgOf() }; cfgOf().enabled = true; cfgOf().mode = "assign"; cfgOf().since = new Date(Date.now() - 864e5).toISOString(); cfgOf().femaleRule = "require";
        await call({ action: "auto_assign", cron: true }); const wf = DB.waiting_list.find((w) => w.student_phone === FP);
        const jf = wf && DB.auto_assign_jobs.find((j) => String(j.waiting_id) === String(wf.id)), rf = jf && { instructor: (DB.instructors.find((i) => i.id === jf.instructor_id) || {}).full_name };
        ok(wf && /FEMALE PREFERRED/.test(wf.notes) && rf && rf.instructor === "Sara Female", "a student who says she would prefer a female instructor: the booking is marked FEMALE PREFERRED and auto-assign picks the FEMALE instructor (" + (rf && rf.instructor) + ")");
        Object.assign(cfgOf(), savedCfg); }
      { const T2 = "447920000033"; DB.waiting_list = DB.waiting_list.filter((w) => w.student_phone !== T2); DB.wa_log = [];
        const full = ext({ name: "Twin Tom", postcode: "m13 9aa", gearbox: "manual" }); globalThis.EXTRACT_Q = [full, full]; globalThis.CLASSIFY_Q = [];
        await Promise.all([hook({ from: T2 }, "Twin Tom M13 9AA manual"), hook({ from: T2 }, "manual")]);
        ok(DB.waiting_list.filter((w) => w.student_phone === T2).length === 1, "two messages arriving in the same second still make ONE booking"); }
      { const sw = DB.growth_settings.find((x) => x.key === "ai_sweep_state"); if (sw) sw.value = { ...sw.value, at: 0 }; } const c1 = CALLS.length; await call({ action: "auto_assign", cron: true });
      ok(CALLS.slice(c1).every((c) => !c.extract), "...and a chat already read is not read again when nothing new was written");
      ok(DB.growth_settings.some((x) => x.key === "ai_sweep_state" && x.value.at && typeof x.value.read === "number"), "the catch-up records when it last checked and how many chats it read (shown on the readiness list)");
      cfgOf().aiSend = true; DB.growth_settings = DB.growth_settings.filter((x) => x.key !== "ai_sweep_state"); DB.wa_log = mkc("447920000057", ["Ann Fox", "M13 9AA", "manual"]); const c2 = CALLS.length; await call({ action: "auto_assign", cron: true });
      ok(CALLS.slice(c2).every((c) => !c.extract), "when Claude may send messages the catch-up stays out of it (the assistant answers each message as it arrives)"); cfgOf().aiSend = false; cfgOf().aiTestOnly = false; cfgOf().adminPhone = _ap; DB.wa_log = []; DB.growth_settings = DB.growth_settings.filter((x) => x.key !== "ai_sweep_state"); }
    r = await RO("447920000003", "Zed Zed", ext({ name: "Zed Zed", postcode: "ZZ99 9ZZ", gearbox: "manual" }));
    ok(!DB.waiting_list.some((w) => /Zed/.test(w.student_name)) && /valid postcode/.test(r.att), "read-only: an unknown postcode is never saved (Claude is not trusted to invent one)");
    globalThis.CLAUDE_FAIL = true; r = await RO("447920000004", "hello there", null); globalThis.CLAUDE_FAIL = false; ok(r.texts.length === 0 && /could not read a chat|could not answer/.test(r.att), "read-only: if Claude is down you get an alert and nothing is sent");
    // ---- everything the student says goes into the booking; the booking is saved as soon as the main details are there ----
    { const G = "447920000010";
      r = await RO(G, "Priya Patel M13 9AA automatic. I can do weekday evenings and Saturdays, I live at 12 Kingsway, I'm a complete beginner and my test is 14 March, I have a provisional licence", ext({ name: "Priya Patel", postcode: "M13 9AA", gearbox: "automatic", availability: "weekday evenings and Saturdays", address: "12 Kingsway", experience: "complete beginner", test_date: "14 March", licence: "yes", instructor_gender: "female_preferred", notes: "nervous driver" }));
      const w1 = DB.waiting_list.find((w) => /Priya/.test(w.student_name));
      ok(w1 && /Availability: weekday evenings and Saturdays/.test(w1.notes) && /Address: 12 Kingsway/.test(w1.notes) && /Experience: complete beginner/.test(w1.notes) && /Test date: 14 March/.test(w1.notes) && /Provisional licence: yes/.test(w1.notes) && /FEMALE PREFERRED/.test(w1.notes) && /Notes: nervous driver/.test(w1.notes), "everything given is in the booking: availability, address, experience, test date, licence, gender wish, notes");
      ok(readBookingTest(w1).addr === "12 Kingsway", "the address line is read by auto-assign as the pick-up address");
      // a booking with only the main details is saved straight away (nothing is waited for)
      const H = "447920000011"; r = await RO(H, "Tom Hill M13 9AA manual", ext({ name: "Tom Hill", postcode: "M13 9AA", gearbox: "manual" }));
      const w2 = DB.waiting_list.find((w) => /Tom Hill/.test(w.student_name)); ok(w2 && !/Availability/.test(w2.notes), "main details only: saved immediately, without availability");
      // later the student adds availability and an address: same booking, no second one
      const n0 = DB.waiting_list.length; r = await RO(H, "I'm free on Tuesday mornings, pick me up from 5 High Street", ext({ name: "Tom Hill", postcode: "M13 9AA", gearbox: "manual", availability: "Tuesday mornings", address: "5 High Street" }));
      const w3 = DB.waiting_list.find((w) => /Tom Hill/.test(w.student_name));
      ok(DB.waiting_list.length === n0 && /Availability: Tuesday mornings/.test(w3.notes) && /Address: 5 High Street/.test(w3.notes) && r.texts.length === 0, "later messages add availability and address to the SAME booking (no duplicate), still nothing sent");
      DB.activity = null; r = await RO(H, "Also I can do Tuesday mornings", ext({ name: "Tom Hill", postcode: "M13 9AA", gearbox: "manual", availability: "Tuesday mornings" })); const w4 = DB.waiting_list.find((w) => /Tom Hill/.test(w.student_name)); ok((w4.notes.match(/Availability/g) || []).length === 1, "saying the same thing twice does not repeat the line");
      // after assignment: you are told to pass it on
      DB.waiting_list.find((w) => /Tom Hill/.test(w.student_name)).status = "assigned"; DB.admin_attention = []; r = await RO(H, "actually Thursdays are better too", ext({ name: "Tom Hill", postcode: "M13 9AA", gearbox: "manual", availability: "Tuesday mornings and Thursdays" }));
      ok(DB.admin_attention.some((x) => /more details after being assigned/.test(x.title)), "extra details after the student was given to an instructor: you are told to pass them on"); }
    cfgOf().aiSend = true; CALLS.length = 0; globalThis.CLASSIFY_Q = [{ content: [{ type: "tool_use", id: "c", name: "classify_message", input: { intent: "booking", urgency: "normal", confidence: 0.9, summary: "x" } }] }]; globalThis.CLAUDE_Q = [say("Hello! What is your full name?")]; await hook({ from: "447920000005" }, "hi");
    ok(textsTo("447920000005")[0] === "Hello! What is your full name?" && !CALLS.some((c) => c.extract), "switching 'Claude can send messages' ON: it replies again (and does not use the read-only extraction)");
    cfgOf().aiSend = true; cfgOf().aiTestOnly = prevTest; cfgOf().aiAssistant = prevOn; globalThis.EXTRACT_Q = []; globalThis.CLASSIFY_Q = []; globalThis.CLAUDE_Q = [];
  }
  { const F = "447900002000"; DB.admin_attention = []; CALLS.length = 0; await hook({ from: F }, "you are all useless idiots"); ok(textsTo(F).length === 0 && DB.admin_attention.some((x) => /Abusive/.test(x.title)), "abusive message: no reply, you are alerted"); }
  { const F = "447900003000"; DB.referrals = [{ id: "rk1", instructor_id: "i1", student_name: "Known Kate", student_phone: "07900003000", created_at: new Date().toISOString(), is_cancelled: false }]; DB.admin_attention = []; CALLS.length = 0; await hook({ from: F }, "I need to cancel my lesson");
    ok(DB.admin_attention.some((x) => /student of Dawood Khan/.test(x.title)), "an existing student: the alert names their instructor (" + (DB.admin_attention[0] || {}).title + ")"); DB.referrals = []; }
  { const F = "447900004000"; CALLS.length = 0; await hook({ from: F }, "STOP"); ok(/unsubscribed/i.test(textsTo(F)[0] || ""), "STOP: confirmed"); const r = await call({ action: "send_template", to: "07900004000", template: "dsq_student_checkin", lang: "en_GB", params: ["A"] }); ok(r.ok === false && /STOP/.test(r.error || ""), "...and no automatic message goes to them any more");
    CALLS.length = 0; await hook({ from: F }, "start"); const r2 = await call({ action: "send_template", to: "07900004000", template: "dsq_student_checkin", lang: "en_GB", params: ["A"] }); ok(r2.ok === true, "START: messages resume"); }
  { const F = "447900005000"; CALLS.length = 0; globalThis.CLAUDE_Q = [say("ok")]; await hook({ from: F }, "hi"); const sys = (CALLS.find((c) => c.claude) || { claude: { system: "" } }).claude.system; ok(/minimum booking is 2 hours/.test(sys) && /£35 for each hour/.test(sys), "built-in facts (2 hour minimum, cancellation, refunds) are given to Claude");
    cfgOf().aiFacts = "Lessons are 2 hours minimum. We are closed on Sundays."; CALLS.length = 0; globalThis.CLAUDE_Q = [say("ok")]; await hook({ from: "447900005001" }, "hi"); const sys2 = (CALLS.find((c) => c.claude) || { claude: { system: "" } }).claude.system; ok(/closed on Sundays/.test(sys2) && !/£35 for each hour/.test(sys2), "your own facts box replaces the built-in facts"); cfgOf().aiFacts = ""; }
  { const F = "447900006000"; CALLS.length = 0; globalThis.CLAUDE_Q = [tool("create_booking", { name: "Ian Intense", postcode: "M13 9AA", gearbox: "manual", lesson_type: "intensive" })]; await hook({ from: F }, "Ian Intense M13 9AA manual intensive"); const w6 = DB.waiting_list.find((w) => /Ian/.test(w.student_name)); ok(w6 && w6.lesson_type === "Intensive" && /Lesson type: intensive/.test(w6.notes), "an intensive course enquiry is recorded as Intensive"); }
  cfgOf().aiAssistant = false;
}
console.log("== 43. Is the Meta app subscribed to the WhatsApp account? ==");
{ globalThis.GRAPH = { wabas: [{ id: "W9", name: "DriveSQ", phones: [{ id: "123", display_phone_number: "+44 7352 932003", verified_name: "drivesq" }], templates: [] }] };
  let wc = await call({ action: "webhook_check" }); ok(wc.ok && wc.subscribed === false && /NOT subscribed/.test(wc.advice[0]), "not subscribed: it says so (" + wc.advice[0].slice(0, 60) + ")");
  wc = await call({ action: "webhook_check", fix: true }); ok(wc.ok && wc.subscribed && wc.fixed && /Done/.test(wc.advice[0]), "fix: the app is subscribed to the account");
  wc = await call({ action: "webhook_check" }); ok(wc.subscribed && !wc.fixed && /is subscribed/.test(wc.advice[0]), "afterwards it reports subscribed"); delete globalThis.GRAPH; }
console.log("== 44. WhatsApp enquiries are held a few minutes so Claude can collect more ==");
{ cfgOf().enabled = true; cfgOf().mode = "assign"; cfgOf().sources = ["[WEB]"]; cfgOf().aiHoldMinutes = 5; cfgOf().aiHoldMaxMinutes = 15; delete cfgOf().since;
  const mk = (name, notes, ageMin) => { const w = W(name, "M13 9AA"); w.notes = notes; w.created_at = new Date(Date.now() - ageMin * 60000).toISOString(); return w; };
  const base = "[WHATSAPP]\n[AUTO]\nSource: WhatsApp enquiry (assistant)\nPostcode: M13 9AA\nGearbox: Manual";
  DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = [];
  const hA = mk("Hold Henry", base + "\nAI-updated: " + new Date(Date.now() - 1 * 60000).toISOString(), 1), vB = mk("Avail Alice", base + "\nAvailability: weekday evenings\nAI-updated: " + new Date().toISOString(), 1), pC = mk("Pasted Pat", "[WHATSAPP]\n[AUTO]\nSource: WhatsApp enquiry\nPostcode: M13 9AA", 1), wD = mk("Web Wendy", "[WEB]\nPostcode: M13 9AA", 1);
  DB.waiting_list = [hA, vB, pC, wD]; const jobFor = (w) => DB.auto_assign_jobs.some((j) => String(j.waiting_id) === String(w.id));
  const pv = await call({ action: "auto_assign", dry: true }); const wait = (pv.results || []).find((r) => r.student === "Hold Henry");
  ok(wait && wait.action === "waiting" && /held \d+ more minute/.test(wait.reason), "preview: a fresh WhatsApp enquiry without availability shows as held (" + (wait && wait.reason || "").slice(0, 70) + ")");
  await call({ action: "auto_assign", cron: true });
  ok(!jobFor(hA), "a 1-minute-old WhatsApp enquiry without availability is NOT offered yet");
  ok(jobFor(vB), "...one whose availability is already given is offered straight away");
  ok(jobFor(pC) && jobFor(wD), "...a booking you pasted yourself, or a website booking, is never held");
  hA.notes = base + "\nAI-updated: " + new Date(Date.now() - 6 * 60000).toISOString(); hA.created_at = new Date(Date.now() - 6 * 60000).toISOString();
  await call({ action: "auto_assign", cron: true }); ok(jobFor(hA), "after the 5 minutes it is offered even without availability");
  const dX = mk("Detail Dan", base + "\nAI-updated: " + new Date(Date.now() - 1 * 60000).toISOString(), 12); DB.waiting_list.push(dX); await call({ action: "auto_assign", cron: true }); ok(!jobFor(dX), "new details 1 minute ago restart the wait (even though it was created 12 minutes ago)");
  const mX = mk("Max Mo", base + "\nAI-updated: " + new Date(Date.now() - 1 * 60000).toISOString(), 16); DB.waiting_list.push(mX); await call({ action: "auto_assign", cron: true }); ok(jobFor(mX), "but never held longer than 15 minutes in total");
  cfgOf().aiHoldMinutes = 0; const zZ = mk("Zero Zed", base, 0); DB.waiting_list.push(zZ); await call({ action: "auto_assign", cron: true }); ok(jobFor(zZ), "hold set to 0: no wait"); cfgOf().aiHoldMinutes = 5; }
const waNum = (p) => "44" + String(p).replace(/\D/g, "").replace(/^0/, "");
console.log("== 45. The instructor accepts ONCE ==");
{ cfgOf().enabled = true; cfgOf().mode = "assign"; cfgOf().sources = ["[WEB]"]; cfgOf().messageStudent = true; cfgOf().messageInstructor = true; cfgOf().aiHoldMinutes = 5; DB.waiting_list = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.referrals = []; globalThis.FAIL_TEMPLATES.clear();
  const w = W("Once Olivia", "M13 9AA"); DB.waiting_list.push(w); await call({ action: "auto_assign", cron: true });
  const job = DB.auto_assign_jobs.find((j) => String(j.waiting_id) === String(w.id)); ok(job && job.state === "pending_accept", "the offer is sent (one Accept button)");
  const inst = DB.instructors.find((i) => String(i.id) === String(job.instructor_id)); CALLS.length = 0; DB.wa_log = [];
  await hook({ from: waNum(inst.phone), p: "OFFER_ACCEPT:" + job.id });
  const tplOut = (n) => CALLS.filter((c) => c.wa && c.wa.template && c.wa.template.name === n);
  const det = tplOut("dsq_student_details"), old = tplOut("dsq_new_student");
  ok(det.length === 1 && det[0].wa.template.components.filter((c) => c.type === "button").length === 0 && old.length === 0, "after the FIRST Accept the instructor gets the student's details with NO second Accept button");
  ok(tplOut("dsq_student_welcome_2").length + tplOut("dsq_student_welcome").length >= 1, "and the student is welcomed straight away (no waiting for a second tap)");
  // until the new template is approved: the old details message is used, and a second tap must be harmless
  globalThis.FAIL_TEMPLATES.add("dsq_student_details"); DB.waiting_list = [W("Fallback Fran", "M13 9AA")]; DB.auto_assign_jobs = []; DB.referrals = []; await call({ action: "auto_assign", cron: true });
  const job2 = DB.auto_assign_jobs[0]; const inst2 = DB.instructors.find((i) => String(i.id) === String(job2.instructor_id)); CALLS.length = 0;
  await hook({ from: waNum(inst2.phone), p: "OFFER_ACCEPT:" + job2.id });
  ok(tplOut("dsq_new_student").length === 1, "template not approved yet: the older details message (with buttons) is used instead");
  const ref2 = DB.referrals[0]; const nBefore = CALLS.filter((c) => c.wa && c.wa.template && /welcome/.test(c.wa.template.name)).length; await hook({ from: waNum(inst2.phone), p: "ACCEPT:" + ref2.id });
  ok(CALLS.filter((c) => c.wa && c.wa.template && /welcome/.test(c.wa.template.name)).length === nBefore, "a second Accept tap changes nothing and the student is not welcomed twice");
  globalThis.FAIL_TEMPLATES.clear(); }
console.log("== 34c. Billing thresholds from the control centre ==");
pinDate("2026-11-24T11:00:00Z"); DB.wa_log = []; DB.admin_attention = []; cfgOf().balanceAuto = true; cfgOf().unpaidLimit = 5; cfgOf().balanceAmount = 0;
DB.referrals = [bk34("7001", "i1", 80)]; await call({ action: "auto_assign", cron: true });
ok(sent("dsq_instructor_balance").length === 0, "1 unpaid student under the count limit (5) and amount rule off: no message");
cfgOf().balanceAmount = 75; await call({ action: "auto_assign", cron: true });
ok(sent("dsq_instructor_balance").length === 1 && DB.admin_attention.some((a) => a.kind === "unpaid_fees"), "owes £80, limit £75: you get an alert and the instructor one reminder");
cfgOf().balanceAmount = 100; DB.wa_log = []; DB.admin_attention = []; await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 0, "owes £80, limit £100: nothing");
cfgOf().balanceAmount = 75; cfgOf().balanceHours = [14, 18]; await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 0, "reminder hours 14-18 and it is 11am: nothing");
cfgOf().balanceHours = [9, 18]; cfgOf().balanceRepeatDays = 3; await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 1, "inside the hours: sent");
DB.wa_log.forEach((l) => { if (l.template === "dsq_instructor_balance") l.created_at = new Date(Date.now() - 4 * 864e5).toISOString(); }); await call({ action: "auto_assign", cron: true }); ok(sent("dsq_instructor_balance").length === 2, "repeat every 3 days: sent again after 4");
const frI = DB.instructors.find((x) => x.instructor_model === "franchise"); DB.wa_log = []; DB.admin_attention = []; DB.referrals = [bk34("7101", frI.id, 90), bk34("7102", frI.id, 90), bk34("7103", frI.id, 90)]; await call({ action: "auto_assign", cron: true });
ok(sent("dsq_instructor_balance").length === 0 && !DB.admin_attention.some((a) => a.kind === "unpaid_fees"), "a FRANCHISE instructor is never sent or flagged for referral fees, whatever they 'owe'");
cfgOf().balanceAmount = 0; unpin();
delete cfgOf().balanceAuto;

console.log("== 35. Default reply time is 90 minutes ==");
delete cfgOf().replyMinutes; cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().autoAssignAfterMinutes = 35; cfgOf().autoMiles = 0; cfgOf().maxPerDay = 500; cfgOf().dailyLimit = 0; cfgOf().femaleRule = "require";
DB.growth_settings.find((x) => x.key === "instructor_traits").value = { i2: { female: true } }; DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = [];
DB.instructors.forEach((i) => { i.coverage_postcodes = "ZZ1"; });   // nobody covers the area, so only the move-on timer matters
DB.waiting_list = [W("Slow Sam", "M13 9AA", "", { student_phone: "07866909090" })]; await call({ action: "auto_assign", cron: true });
const j35 = DB.auto_assign_jobs[0], first35 = j35.instructor_id; j35.expires_at = new Date(Date.now() - 80 * 60000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(j35.state === "pending_accept" && j35.instructor_id === first35, "80 minutes with no reply: still waiting for the first instructor");
j35.expires_at = new Date(Date.now() - 95 * 60000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(j35.state === "pending_accept" && j35.instructor_id !== first35, "95 minutes: moved on to the next instructor (" + first35 + " -> " + j35.instructor_id + ")");

console.log("== 36. Welcome falls back to the older template until _2 is approved ==");
cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().messageStudent = true; cfgOf().maxPerDay = 500; cfgOf().femaleRule = "require"; DB.growth_settings.find((x) => x.key === "instructor_traits").value = {};
DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.student_followups = []; DB.instructors.forEach((i) => { i.coverage_postcodes = "M13"; });
globalThis.FAIL_TEMPLATES.add("dsq_student_welcome_2");
DB.waiting_list = [W("Fall Fay", "M13 9AA", "", { student_phone: "07877121212" })]; await call({ action: "auto_assign", cron: true });
const jf = DB.auto_assign_jobs[0], insF = DB.instructors.find((i) => i.id === jf.instructor_id); await hook({ from: "44" + insF.phone.replace(/^0/, ""), p: "OFFER_ACCEPT:" + jf.id });
ok(sent("dsq_student_welcome_2").length === 0 && sent("dsq_student_welcome").length === 1, "welcome_2 not approved -> the student still gets the older welcome (" + sent("dsq_student_welcome").length + ")");
ok(!DB.admin_attention.some((a) => a.kind === "msg_failed" && /welcome|Fall/.test(a.title)), "and no 'message failed' alert for it");
globalThis.FAIL_TEMPLATES.clear();

console.log("== 37. Cron gets an immediate answer; the work finishes in the background ==");
cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().maxPerDay = 500; cfgOf().dailyLimit = 0; cfgOf().femaleRule = "require"; DB.growth_settings.find((x) => x.key === "instructor_traits").value = {}; DB.instructors.forEach((i) => { i.coverage_postcodes = "M13"; });
DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.waiting_list = [W("Bg Bea", "M13 9AA", "", { student_phone: "07866454545" })];
const pending = []; globalThis.EdgeRuntime = { waitUntil: (p) => { pending.push(p); } };
const accepted = await call({ action: "auto_assign", cron: true });
ok(accepted.accepted === true && DB.auto_assign_jobs.length === 0, "the cron call is answered at once ('accepted') before any work is done");
await Promise.all(pending); ok(DB.auto_assign_jobs.length === 1 && DB.auto_assign_jobs[0].state === "pending_accept", "the booking is then handled in the background (offer pending)");
const manual = await call({ action: "auto_assign", dry: true }); ok(manual.dry === true && Array.isArray(manual.results), "the admin screen still gets the full answer when it asks (preview)");
delete globalThis.EdgeRuntime;

console.log("== 38. Failed balance reminders are not retried every 2 minutes; an updated form with no earlier copy is processed ==");
pinDate("2026-11-24T11:00:00Z");
cfgOf().enabled = true; cfgOf().mode = "assign"; cfgOf().unpaidLimit = 2; cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().maxPerDay = 500; delete cfgOf().balanceAuto;
globalThis.FAIL_TEMPLATES.add("dsq_instructor_balance");
const bk38 = (id, iid) => ({ id, instructor_id: iid, student_name: "C" + id, student_phone: "0791" + id, amount: 25, is_paid: false, created_at: new Date(Date.now() - 20 * 864e5).toISOString(), flag_color: "green", reply_status: "booked", admin_notes: dd2 + " · ✅ Booked — confirmed by admin", is_cancelled: false, is_credit: false });
DB.referrals = [bk38("6001", "i1"), bk38("6002", "i1")]; DB.wa_log = []; DB.admin_attention = []; DB.waiting_list = []; DB.auto_assign_jobs = [];
for (let k = 0; k < 4; k++) await call({ action: "auto_assign", cron: true });
ok(DB.wa_log.filter((l) => l.template === "dsq_instructor_balance").length === 1, "template not approved: ONE failed attempt, not one every run (" + DB.wa_log.filter((l) => l.template === "dsq_instructor_balance").length + " in 4 runs)");
DB.wa_log.forEach((l) => { l.created_at = new Date(Date.now() - 25 * 3600e3).toISOString(); }); globalThis.FAIL_TEMPLATES.clear(); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_instructor_balance").length === 1, "a day later, once the template exists, it is sent");
cfgOf().mode = "suggest";
DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.waiting_list = [W("Upd Una", "M13 9AA", "— UPDATED request", { student_phone: "07811404040" })]; cfgOf().mode = "assign"; cfgOf().enabled = true;
await call({ action: "auto_assign", cron: true });
ok(DB.auto_assign_jobs[0] && DB.auto_assign_jobs[0].state === "pending_accept", "an 'UPDATED request' whose first copy was never processed is handled normally (" + (DB.auto_assign_jobs[0] && DB.auto_assign_jobs[0].state) + ")");

unpin();
console.log("== 39. Plain-words hint when a template is missing ==");
globalThis.FAIL_TEMPLATES.add("dsq_student_offer"); cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().maxPerDay = 500; cfgOf().mode = "assign"; cfgOf().enabled = true; DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = [];
DB.waiting_list = [W("Hint Hal", "M13 9AA", "", { student_phone: "07866 787878" })]; await call({ action: "auto_assign", cron: true });
ok(DB.admin_attention.some((a) => /SAME WhatsApp Business Account/.test(a.detail)) && DB.auto_assign_jobs[0].state === "attention", "a missing template tells you to check it is in the SAME WhatsApp account, English (UK)");
globalThis.FAIL_TEMPLATES.clear();

console.log("== 40. Ignored instructors ==");
cfgOf().anytime = true; cfgOf().hours = [0, 24]; cfgOf().maxPerDay = 500; cfgOf().mode = "assign"; cfgOf().enabled = true; cfgOf().droughtDays = 7; cfgOf().franchiseMin = 0; cfgOf().fairnessMiles = 0; cfgOf().dailyLimit = 0; cfgOf().femaleRule = "require";
DB.instructors.forEach((i) => { i.coverage_postcodes = "ZZ1"; }); DB.growth_settings.find((x) => x.key === "instructor_traits").value = {};
DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = []; DB.waiting_list = [W("Ign Ivy", "M13 9AA", "", { student_phone: "07866 929292" })];
let pvI = await call({ action: "auto_assign", dry: true }); const firstPick = pvI.results[0].instructor;
const firstId = DB.instructors.find((i) => i.full_name === firstPick).id;
DB.growth_settings.find((x) => x.key === "instructor_traits").value = { [firstId]: { noAuto: true } };
pvI = await call({ action: "auto_assign", dry: true }); ok(pvI.results[0].instructor !== firstPick, "ignoring the first choice (" + firstPick + ") -> the next instructor is picked (" + pvI.results[0].instructor + ")");
await call({ action: "auto_assign", cron: true }); const jI = DB.auto_assign_jobs[0], ignoredNow = jI.instructor_id; ok(jI.state === "pending_accept" && jI.instructor_id !== firstId, "a real run skips the ignored instructor too");
DB.growth_settings.find((x) => x.key === "instructor_traits").value = { [ignoredNow]: { noAuto: true } };
await call({ action: "auto_assign", cron: true }); ok(DB.auto_assign_jobs[0].instructor_id !== ignoredNow, "ignoring the instructor who has a waiting offer moves it to someone else straight away");
const sim40 = await call({ action: "simulate", postcode: "M13 9AA", type: "Manual" }); ok(sim40.skipped.some((x) => /Never auto-assign/.test(x.why)), "the simulator lists them under 'Left out: marked Never auto-assign'");
DB.admin_attention = []; DB.referrals = []; await call({ action: "auto_assign", cron: true });
ok(!DB.admin_attention.some((a) => a.kind === "no_jobs" && a.instructor_id === ignoredNow), "ignored instructors do not trigger 'no students for 7 days' warnings");

console.log("== 41. Diagnose and create the templates in the right WhatsApp account ==");
const ALLN = ["dsq_new_student", "dsq_student_offer", "dsq_student_welcome_2", "dsq_student_welcome", "dsq_admin_attention", "dsq_student_checkin", "dsq_instructor_checkin", "dsq_booking_received", "dsq_booking_received_later", "dsq_female_unavailable", "dsq_student_terms", "dsq_instructor_rebooked", "dsq_instructor_balance"];
globalThis.GRAPH = { wabas: [
  { id: "W1", name: "Test WhatsApp Business Account", phones: [{ id: "999", display_phone_number: "+1 555 000 1111", verified_name: "Test" }], templates: [{ name: "hello_world", status: "APPROVED", language: "en_US" }, { name: "jaspers_market_image_cta_v1", status: "APPROVED", language: "en_US" }, ...ALLN.slice(0, 8).map((n) => ({ name: n, status: "APPROVED", language: "en_GB" }))] },
  { id: "W2", name: "DriveSQ", phones: [{ id: "123", display_phone_number: "+44 7352 932003", verified_name: "drivesq" }], templates: [] }] };
let dg = await call({ action: "diagnose" });
ok(dg.ok && dg.match === "W2" && dg.missing.length === 15, "diagnose: your number is in the account 'DriveSQ' (W2) and all 15 templates are missing there (" + dg.missing.length + ")");
ok(dg.advice.some((a) => /DriveSQ/.test(a)) && dg.advice.some((a) => /another account/.test(a) && /Test WhatsApp/.test(a)), "it says in plain words that the right names exist in the TEST account, which your number cannot use");
const tst = await call({ action: "templates" }); ok(tst.ok && tst.account === "W2" && tst.templates.every((t) => t.status === "MISSING"), "the readiness check now sees the statuses with no secret needed (all MISSING in your account)");
const cr = await call({ action: "create_templates" });
ok(cr.ok && cr.created === 15 && cr.failed === 0 && cr.account === "W2", "create_templates: 15 submitted to YOUR account (" + cr.created + ")");
const made = globalThis.GRAPH.created, offer = made.find((m) => m.name === "dsq_student_offer");
ok(made.every((m) => m.waba === "W2" && m.language === "en_GB"), "all created in account W2 with language en_GB");
const comp = (m, t) => m.components.find((c) => c.type === t);
ok(offer.category === "MARKETING" && comp(offer, "BODY") && comp(offer, "BODY").example.body_text[0].length === 4 && comp(offer, "BUTTONS").buttons.length === 2 && comp(offer, "BUTTONS").buttons[0].type === "QUICK_REPLY", "the offer: category MARKETING, 4 sample values, 2 quick-reply buttons");
ok(!comp(made.find((m) => m.name === "dsq_student_terms"), "BUTTONS") && comp(made.find((m) => m.name === "dsq_student_terms"), "BODY").example.body_text[0][0] === "Sara", "terms: no buttons, sample 'Sara'");
ok(comp(made.find((m) => m.name === "dsq_student_checkin"), "BUTTONS").buttons.map((b) => b.text).join("|") === "Yes, booked|Not yet|Gone elsewhere", "check-in buttons carry the right labels");
dg = await call({ action: "diagnose" }); ok(dg.missing.length === 0 && dg.notApproved.length === 15, "afterwards: nothing missing, 15 waiting for Meta's review");
const again = await call({ action: "create_templates" }); ok(again.created === 0 && /already exists/.test(again.note), "running it again creates nothing (no duplicates)");
globalThis.GRAPH.wabas[1].templates = []; globalThis.GRAPH.failCreate = ["dsq_booking_received"]; const part = await call({ action: "create_templates" });
ok(part.created === 14 && part.failed === 1 && /start with a variable/.test(part.results.find((r) => !r.ok).error), "if Meta refuses one, the others still go through and the reason is shown");
globalThis.GRAPH.wabas = [globalThis.GRAPH.wabas[0]]; dg = await call({ action: "diagnose" }); ok(dg.match === null && dg.advice.some((a) => /not in any account/.test(a)), "if the token cannot see the number's account, it says so");
delete globalThis.GRAPH;

console.log("== 42. Version stamp ==");
const stv = await call({ action: "status" }); ok(stv.ok && stv.version === "2026-11-24-direct-assign", "the status call reports the function version (" + stv.version + ")");

console.log("== 43. Headers on the templates ==");
globalThis.GRAPH = { wabas: [{ id: "W2", name: "DriveSQ", phones: [{ id: "123", display_phone_number: "+44 7352 932003", verified_name: "drivesq" }], templates: [] }] };
const crH = await call({ action: "create_templates" }); const mH = globalThis.GRAPH.created;
ok(crH.created === 15 && mH.every((m) => m.components[0].type === "HEADER" && m.components[0].format === "TEXT" && m.components[0].text.length <= 60 && !/\{\{/.test(m.components[0].text)), "all 15 are created with a plain text header (no variables, under 60 characters)");
ok(mH.find((m) => m.name === "dsq_student_offer").components[0].text === "New student for you" && mH.find((m) => m.name === "dsq_admin_attention").components[0].text === "Attention needed" && mH.find((m) => m.name === "dsq_student_terms").components[1].type === "BODY", "e.g. offer: 'New student for you', alert: 'Attention needed', and the body follows the header");
ok(mH.find((m) => m.name === "dsq_student_checkin").components.map((c) => c.type).join(",") === "HEADER,BODY,BUTTONS", "components are in Meta's order: HEADER, BODY, BUTTONS");
delete globalThis.GRAPH;
