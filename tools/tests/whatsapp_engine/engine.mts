
import "/tmp/claude-0/watest/fn2.ts";
const h = globalThis.__h, mk = (body) => new Request("https://f/whatsapp", { method: "POST", headers: { "x-admin-key": "adm" }, body: JSON.stringify(body) });
const call = async (b) => (await (await h(mk(b))).json());
const sigf = async (b) => { const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("sec"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return "sha256=" + Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(b)))).map((x) => x.toString(16).padStart(2, "0")).join(""); };
const hook = async (payload, text) => { const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "in" + Math.random(), from: payload.from, type: payload.p ? "button" : "text", ...(payload.p ? { button: { payload: payload.p, text: "x" } } : { text: { body: text } }) }] } }] }] }); return h(new Request("https://f/whatsapp", { method: "POST", headers: { "x-hub-signature-256": await sigf(body) }, body })); };
const I = (id, name, area, phone, extra = {}) => ({ id, full_name: name, status: "approved", area, phone, car_type: "Both", instructor_model: "referral", coverage_postcodes: area.split(" ")[0], ...extra });
DB.instructors = [I("i1", "Dawood Khan", "M13 0PG", "07700900001"), I("i2", "Sara Female", "M20 0AA", "07700900002"), I("i3", "Mo Sale", "M33 0AA", "07700900003", { instructor_model: "franchise" }), I("i4", "Far Frank", "BL1 0AA", "07700900004")];
DB.growth_settings = [{ key: "instructor_traits", value: { i2: { female: true } } }];
const now = Date.now(), W = (name, pc, notes = "", extra = {}) => ({ id: "w" + (globalThis.SEQ++), student_name: name, student_phone: "07700" + String(900000 + globalThis.SEQ).slice(-6), postcode: pc, lesson_type: "Manual", status: "waiting", created_at: new Date(now - 3600e3).toISOString(), notes: "[WEB] Email: " + name.split(" ")[0].toLowerCase() + "@x.com\n" + notes, ...extra });
DB.waiting_list = [W("Near Nora", "M13 9AA"), W("Mid Mia", "WA3 1AA", "Gearbox: Automatic"), W("Far Fred", "PR1 1AA"), W("Female Fay", "M14 0AA", "👩 FEMALE INSTRUCTOR REQUESTED"), W("Bad Bev", "ZZ9 9ZZ"), W("Old Olga", "M13 0PG", "", { created_at: new Date(now - 9 * 864e5).toISOString() }), W("Manual Mel", "M13 0PG", "", { notes: "[CALL] by phone" })];
let r;
console.log("cron while OFF:", JSON.stringify(await call({ action: "auto_assign", cron: true })));
DB.growth_settings.push({ key: "auto_assign_cfg", value: { enabled: false, since: new Date(now - 2 * 864e5).toISOString(), adminPhone: "07700900999", mode: "assign", hours: [0, 24] } });
r = await call({ action: "auto_assign", dry: true });
console.log("DRY RUN:"); r.results.forEach((x) => console.log("  ", x.student.padEnd(11), "|", x.action, "|", x.instructor || "", x.dist != null ? x.dist + "mi" : "", x.reason || "", x.top ? "top:" + x.top.map((t) => t.name).join(",") : ""));
console.log("dry wrote nothing:", DB.auto_assign_jobs === undefined || DB.auto_assign_jobs.length === 0, "| messages sent:", CALLS.filter((c) => c.wa).length);
// ON
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value.enabled = true;
r = await call({ action: "auto_assign", cron: true });
if(!r.summary)console.log("RUN raw:",JSON.stringify(r)); console.log("RUN:", JSON.stringify(r.summary), r.results.map((x) => x.student + ":" + x.action).join(" "));
const waSends = CALLS.filter((c) => c.wa && c.wa.template).map((c) => c.wa.template.name + "→" + c.wa.to);
console.log("templates sent:", waSends.join(" | "));
console.log("referral rows:", DB.referrals.map((x) => x.student_name + " £" + x.amount + " → " + x.instructor_id).join("; "));
console.log("profiles:", (DB.student_profiles || []).length, "| accounts:", (DB.student_accounts || []).length, "| admin_messages:", (DB.admin_messages || []).length, "| push:", CALLS.filter((c) => c.push).length);
console.log("waiting statuses:", DB.waiting_list.map((x) => x.student_name.split(" ")[0] + ":" + x.status).join(" "));
console.log("attention:", DB.admin_attention.map((x) => x.kind + " — " + x.title).join(" || "));
console.log("admin alert WA sent to admin:", CALLS.some((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_admin_alert" && c.wa.to === "447700900999"));
const offerCall = CALLS.find((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_student_offer"); console.log("offer buttons:", offerCall && JSON.stringify(offerCall.wa.template.components.filter((c) => c.type === "button").map((b) => b.parameters[0].payload)));
// second run must not duplicate
CALLS.length = 0; r = await call({ action: "auto_assign", cron: true }); console.log("second run results:", r.results.length, "| messages:", CALLS.filter((c) => c.wa).length);
// instructor DECLINES the offer for Mid Mia (Mo Sale) -> next candidate or attention
const job = DB.auto_assign_jobs.find((j) => j.state === "pending_accept"); console.log("pending offer to:", DB.instructors.find((i) => i.id === job.instructor_id).full_name);
CALLS.length = 0; await hook({ from: "447700900003", p: "OFFER_DECLINE:" + job.id });
const j2 = DB.auto_assign_jobs.find((j) => j.id === job.id); console.log("after decline -> state:", j2.state, "| now with:", j2.instructor_id && DB.instructors.find((i) => i.id === j2.instructor_id).full_name, "| tried:", JSON.stringify(j2.tried));
// next instructor accepts via typed YES
const nextInstr = DB.instructors.find((i) => i.id === j2.instructor_id);
if (j2.state === "pending_accept") { CALLS.length = 0; await hook({ from: "44" + nextInstr.phone.slice(1) }, "Yes"); const j3 = DB.auto_assign_jobs.find((j) => j.id === job.id); console.log("after typed YES -> state:", j3.state, "| referral:", !!j3.referral_id, "| templates:", CALLS.filter((c) => c.wa && c.wa.template).map((c) => c.wa.template.name).join(",")); }
// a timeout: make a new offer expire
const w2 = W("Timeout Tim", "M13 0PG"); w2.postcode = "M10AA"; DB.waiting_list.push(w2);
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value.autoMiles = 0;   // force "ask first"
await call({ action: "auto_assign", cron: true }); const tj = DB.auto_assign_jobs.find((j) => j.waiting_id === String(w2.id)); console.log("Timeout Tim offer state:", tj && tj.state);
tj.expires_at = new Date(now - 1000).toISOString(); r = await call({ action: "auto_assign", cron: true });
const tj2 = DB.auto_assign_jobs.find((j) => j.waiting_id === String(w2.id)); console.log("after expiry -> state:", tj2.state, "attempt:", tj2.attempt, "tried:", JSON.stringify(tj2.tried));
// instructor taps ACCEPT on the directly-assigned Female Fay -> only now the student gets the welcome
const ff = DB.referrals.find((x) => x.student_name === "Female Fay"); const welcomedBefore = CALLS.length; CALLS.length = 0;
console.log("welcome sent BEFORE accept (direct assignment):", (DB.wa_log || []).some((l) => l.template === "dsq_student_welcome" && l.student_name === "Female Fay"));
await hook({ from: "447700900002", p: "ACCEPT:" + ff.id });
console.log("welcome sent AFTER accept:", (DB.wa_log || []).some((l) => l.template === "dsq_student_welcome" && l.student_name === "Female Fay" && l.status === "sent"), "| marker:", /Student welcomed/.test(ff.admin_notes));
CALLS.length = 0; await hook({ from: "447700900002", p: "ACCEPT:" + ff.id }); console.log("second Accept sends another welcome:", CALLS.some((c) => c.wa && c.wa.template && c.wa.template.name === "dsq_student_welcome"));
// post-assign decline on Near Nora
const nn = DB.referrals.find((x) => x.student_name === "Near Nora"); CALLS.length = 0; await hook({ from: "447700900001", p: "DECLINE:" + nn.id });
console.log("post-assign decline -> flag:", nn.flag_color, "| attention:", DB.admin_attention.filter((a) => a.kind === "declined_after").map((a) => a.title));
// quiet hours
DB.growth_settings.find((x) => x.key === "auto_assign_cfg").value.hours = [25, 26]; console.log("quiet hours:", JSON.stringify(await call({ action: "auto_assign", cron: true })));
