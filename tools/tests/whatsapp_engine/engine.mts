import "/tmp/claude-0/watest/fn2.ts";
const h = globalThis.__h, mk = (body) => new Request("https://f/whatsapp", { method: "POST", headers: { "x-admin-key": "adm" }, body: JSON.stringify(body) });
const call = async (b) => (await (await h(mk(b))).json());
const sigf = async (b) => { const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("sec"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return "sha256=" + Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(b)))).map((x) => x.toString(16).padStart(2, "0")).join(""); };
const hook = async (payload, text) => { const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "in" + Math.random(), from: payload.from, type: payload.p ? "button" : "text", ...(payload.p ? { button: { payload: payload.p, text: "x" } } : { text: { body: text } }) }] } }] }] }); return h(new Request("https://f/whatsapp", { method: "POST", headers: { "x-hub-signature-256": await sigf(body) }, body })); };
const I = (id, name, area, phone, extra = {}) => ({ id, full_name: name, status: "approved", area, phone, car_type: "Both", instructor_model: "referral", coverage_postcodes: area.split(" ")[0], ...extra });
DB.instructors = [I("i1", "Dawood Khan", "M13 0PG", "07700900001"), I("i2", "Sara Female", "M20 0AA", "07700900002"), I("i3", "Mo Sale", "M33 0AA", "07700900003", { instructor_model: "franchise" }), I("i4", "Far Frank", "BL1 0AA", "07700900004")];
DB.growth_settings = [{ key: "instructor_traits", value: { i2: { female: true } } }, { key: "auto_assign_cfg", value: { enabled: true, since: new Date(Date.now() - 2 * 864e5).toISOString(), adminPhone: "07700900999", mode: "assign", hours: [0, 24] } }];
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
ok(sent("dsq_new_student").length === 2 && sent("dsq_student_welcome").length === 0, "instructors messaged, students NOT welcomed yet");
const nn = DB.referrals.find((x) => x.student_name === "Near Nora"), ff = DB.referrals.find((x) => x.student_name === "Female Fay");
let fNN = DB.student_followups.find((f) => f.referral_id === String(nn.id)); ok(fNN.state === "waiting_accept", "follow-up waits for the instructor to accept");
await hook({ from: "447700900001", p: "ACCEPT:" + nn.id }); fNN = DB.student_followups.find((f) => f.referral_id === String(nn.id));
ok(fNN.state === "waiting_student" && sent("dsq_student_welcome").length === 1, "after Accept: student welcomed + 3-day clock started");
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
