import "/tmp/claude-0/watest/fn2.ts";
const h = globalThis.__h, mk = (body) => new Request("https://f/whatsapp", { method: "POST", headers: { "x-admin-key": "adm" }, body: JSON.stringify(body) });
const call = async (b) => (await (await h(mk(b))).json());
const sigf = async (b) => { const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("sec"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return "sha256=" + Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(b)))).map((x) => x.toString(16).padStart(2, "0")).join(""); };
const hook = async (payload, text) => { const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "in" + Math.random(), from: payload.from, type: payload.p ? "button" : "text", ...(payload.p ? { button: { payload: payload.p, text: "x" } } : { text: { body: text } }) }] } }] }] }); return h(new Request("https://f/whatsapp", { method: "POST", headers: { "x-hub-signature-256": await sigf(body) }, body })); };
const I = (id, name, area, phone, extra = {}) => ({ id, full_name: name, status: "approved", area, phone, car_type: "Both", instructor_model: "referral", coverage_postcodes: area.split(" ")[0], ...extra });
DB.instructors = [I("i1", "Dawood Khan", "M13 0PG", "07700900001"), I("i2", "Sara Female", "M20 0AA", "07700900002"), I("i3", "Mo Sale", "M33 0AA", "07700900003", { instructor_model: "franchise" }), I("i4", "Far Frank", "BL1 0AA", "07700900004")];
DB.growth_settings = [{ key: "instructor_traits", value: { i2: { female: true } } }, { key: "auto_assign_cfg", value: { enabled: true, franchiseMin: 0, fairnessMiles: 0, since: new Date(Date.now() - 2 * 864e5).toISOString(), adminPhone: "07700900999", mode: "assign", hours: [0, 24], autoMiles: 5, autoAssignAfterMinutes: 0 } }];
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
DB.referrals = [1, 2, 3, 4].map((n) => ({ id: "b" + n, instructor_id: "i1", student_name: "B" + n, created_at: new Date(now - 4 * 864e5).toISOString(), flag_color: "green", reply_status: "booked", admin_notes: d + " · ✅ Booked — confirmed by admin", is_cancelled: false, is_credit: false }));
r = await call({ action: "auto_assign", dry: true }); console.log("   ->", r.results[0].instructor, "|", r.results[0].why);
ok(r.results[0].instructor === "Sara Female" && /4 booked this week/.test(r.results[0].why), "Dawood has 4 booked this week -> Sara gets it");

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
ok(sent("dsq_student_checkin").length === 1 && fNN.state === "asked_student", "day 3: student asked 'has the instructor booked?'");
const sc = (DB.wa_log || []).find((l) => l.template === "dsq_student_checkin"); const callsC = CALLS.find((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_student_checkin");
console.log("   buttons:", JSON.stringify(callsC.wa.template.components.filter((c) => c.type === "button").map((b) => b.parameters[0].payload.split(":")[0])));
// student says NOT YET
CALLS.length = 0; await hook({ from: "44" + nn.student_phone.slice(1), p: "STU_NOTYET:" + fNN.id });
ok(/not booked yet/.test(nn.admin_notes) && nn.flag_color === "purple" && nn.reply_status === "not_yet", "student 'Not yet' -> admin note + purple + reply status. note: " + nn.admin_notes.split("\n").pop());
ok(CALLS.some((c) => c.wa && c.wa.type === "interactive"), "follow-up question 'has the instructor been in touch?' sent with buttons");
// student says instructor has NOT been in touch
CALLS.length = 0; await hook({ from: "44" + nn.student_phone.slice(1), p: "CONTACT_NO:" + fNN.id });
ok(DB.admin_attention.some((a) => a.kind === "not_contacted"), "'not in touch' -> attention required for admin");
ok(sent("dsq_instructor_checkin").length === 1, "instructor is messaged straight away");
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

console.log("== 7. No reply: instructor is asked after 1 day, then repeats every 5 days, 4 rounds ==");
DB.waiting_list = [W("Quiet Quin", "M13 9AA")]; await call({ action: "auto_assign", cron: true }); const qq = DB.referrals.find((x) => x.student_name === "Quiet Quin"); await hook({ from: "447700900001", p: "ACCEPT:" + qq.id });
const fQ = DB.student_followups.find((f) => f.referral_id === String(qq.id)); fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(fQ.state === "asked_student" && Math.abs(new Date(fQ.next_due).getTime() - (Date.now() + 864e5)) < 5000, "student asked; instructor will be asked in 1 day");
const before = sent("dsq_instructor_checkin").length; fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(sent("dsq_instructor_checkin").length === before + 1 && fQ.state === "asked_instructor", "no student reply in 1 day -> instructor asked");
ok(new Date(fQ.next_due).getTime() > Date.now() + 3 * 864e5, "next round is ~5 days after the first student message");
for (let i = 2; i <= 4; i++) { fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true }); ok(fQ.round === i && fQ.state === "asked_student", "round " + i + " starts with the student"); fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true }); }
fQ.next_due = new Date(Date.now() - 1000).toISOString(); await call({ action: "auto_assign", cron: true });
ok(fQ.state === "attention" && DB.admin_attention.some((a) => a.kind === "no_confirm"), "after 4 rounds -> attention required");

console.log("== 8. Marked in admin meanwhile -> follow-ups stop =="); DB.referrals = [];
DB.waiting_list = [W("Done Dee", "M13 9AA")]; await call({ action: "auto_assign", cron: true }); const dd = DB.referrals.find((x) => x.student_name === "Done Dee"); await hook({ from: "447700900001", p: "ACCEPT:" + dd.id });
const fD = DB.student_followups.find((f) => f.referral_id === String(dd.id)); dd.flag_color = "green"; dd.admin_notes = (dd.admin_notes || "") + "\n" + d + " · ✅ Booked — confirmed by admin";
fD.next_due = new Date(Date.now() - 1000).toISOString(); const n0 = sent("dsq_student_checkin").length; await call({ action: "auto_assign", cron: true });
ok(sent("dsq_student_checkin").length === n0 && fD.state === "done", "already booked by admin -> no message, follow-up closed");
console.log("== 9. Instructor can't cover after assignment ==");
DB.waiting_list = [W("Decline Dot", "M13 9AA")]; await call({ action: "auto_assign", cron: true }); const dt = DB.referrals.find((x) => x.student_name === "Decline Dot"); await hook({ from: "447700900001", p: "DECLINE:" + dt.id });
ok(DB.student_followups.find((f) => f.referral_id === String(dt.id)).state === "closed" && DB.admin_attention.some((a) => a.kind === "declined_after"), "decline -> follow-up closed + attention");

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
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value = { enabled: true, franchiseMin: 0, fairnessMiles: 0, since: new Date(Date.now() - 2 * 864e5).toISOString(), adminPhone: "07700900999", mode: "assign", hours: [0, 24], autoMiles: 0, autoAssignAfterMinutes: 0, ackHours: [0, 24], ackStudent: true, ackSince: new Date(Date.now() - 864e5).toISOString() };
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
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value = { enabled: true, franchiseMin: 0, fairnessMiles: 0, since: new Date(Date.now() - 2 * 864e5).toISOString(), mode: "assign", hours: [0, 24], autoMiles: 0 };
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
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value = { enabled: true, franchiseMin: 0, fairnessMiles: 0, since: new Date(Date.now() - 2 * 864e5).toISOString(), mode: "assign", hours: [0, 24], ackStudent: true, ackSince: new Date(Date.now() - 864e5).toISOString(), ackHours: [0, 24], autoAssignAfterMinutes: 0 };
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
ok(DB.auto_assign_jobs.length === 1 && /duplicate/.test(DB.auto_assign_jobs[0].note) && !DB.auto_assign_jobs.some((j) => j.state === "pending_accept"), "already given to an instructor 3 days ago -> not offered again");
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

console.log("== 20. Odd bookings never crash the run ==");
cfgOf().dailyLimit = 0; cfgOf().mode = "assign";
DB.referrals = []; DB.auto_assign_jobs = []; DB.wa_log = []; DB.admin_attention = [];
DB.waiting_list = [W("No Postcode", "", "", { postcode: null, student_phone: "07833000111" }), W("Bad Postcode", "ZZ99 9ZZ", "", { student_phone: "07833000222" }), W("No Phone", "M13 9AA", "", { student_phone: null }), W("", "M13 9AA", "", { student_name: null, student_phone: "07833000333" }), W("Long Notes", "M13 9AA", "x".repeat(20000), { student_phone: "07833000444" }), W("Auto Ann", "M13 9AA", "Gearbox: Automatic", { student_phone: "07833000555" })];
const rOdd = await call({ action: "auto_assign", cron: true });
ok(rOdd.ok === true, "run completes with odd bookings (" + rOdd.ok + ")");
ok(DB.auto_assign_jobs.length === 6 && DB.auto_assign_jobs.every((j) => ["pending_accept", "attention", "assigned"].includes(j.state)), "every booking ends in a clear state (" + DB.auto_assign_jobs.map((j) => j.state).join(",") + ")");
ok(DB.admin_attention.some((a) => /postcode|No Postcode/i.test(a.title + a.detail)), "the booking with no postcode goes to the admin");
ok(DB.auto_assign_jobs.filter((j) => j.state === "pending_accept").length >= 3, "good ones still go out (" + DB.auto_assign_jobs.filter((j) => j.state === "pending_accept").length + ")");
