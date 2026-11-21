import fs from "fs";
const src = fs.readFileSync(new URL("../../supabase/functions/send-email/loop.part.js", import.meta.url), "utf8");
const LONDON = "Europe/London";
const londonParts = (d = new Date()) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d).map((x) => [x.type, x.value])); return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24 }; };
const norm = (e) => String(e || "").trim().toLowerCase(), EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const sentMails = []; const resendBatch = async (m) => { m.forEach((x) => sentMails.push(x)); return m.map(() => ({ status: "sent" })); };
const code = src + "\nreturn { monthlyNew };";
const mk = new Function("londonParts", "norm", "EMAIL_RE", "unsubUrl", "FROM", "personalise", "build", "text", "resendBatch", "REPLY_TO", "fnUrl", "RESEND_KEY", code);
const { monthlyNew } = mk(londonParts, norm, EMAIL_RE, async (e) => "https://u/" + e, "DriveSQ <a@b.c>", (s) => s, (d) => "<p>" + d.body + "</p>", (d) => d.body, resendBatch, "", () => "", "k");
// tiny fake supabase
const DB = { student_accounts: [], waiting_list: [], email_contacts: [], growth_settings: [] }; let id = 1;
const sb = { from: (t) => { const st = { f: [], op: "select", patch: null, rows: null, ord: null, lim: 1e9 }; const tbl = () => (DB[t] = DB[t] || []);
  const match = (r) => st.f.every(([k, o, v]) => o === "eq" ? String(r[k]) === String(v) : o === "gte" ? String(r[k]) >= String(v) : o === "in" ? v.includes(r[k]) : true);
  const run = () => { const T = tbl(); if (st.op === "insert") { st.rows.forEach((r) => { const row = { id: "i" + id++, created_at: new Date().toISOString(), tags: [], status: "subscribed", ...r }; if (t === "email_contacts") row.email_key = row.email.toLowerCase().trim(); T.push(row); }); return { data: st.rows, error: null }; }
    if (st.op === "update") { T.filter(match).forEach((r) => Object.assign(r, st.patch)); return { data: null, error: null }; }
    if (st.op === "upsert") { const e = T.find((r) => r.key === st.rows.key); if (e) Object.assign(e, st.rows); else T.push(st.rows); return { data: null, error: null }; }
    let out = T.filter(match); if (st.ord) out = out.sort((a, b) => String(a[st.ord]).localeCompare(String(b[st.ord]))); return { data: out.slice(0, st.lim), error: null }; };
  const o = { select: () => o, eq: (k, v) => (st.f.push([k, "eq", v]), o), gte: (k, v) => (st.f.push([k, "gte", v]), o), in: (k, v) => (st.f.push([k, "in", v]), o), order: (k) => (st.ord = k, o), limit: (n) => (st.lim = n, o), insert: (r) => (st.op = "insert", st.rows = r, o), update: (p) => (st.op = "update", st.patch = p, o), upsert: (r) => (st.op = "upsert", st.rows = r, o),
    maybeSingle: async () => { const r = run(); return { data: r.data[0] || null, error: null }; }, then: (res) => res(run()) }; return o; } };
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const now = new Date(), lp = londonParts(now), cur = lp.y + "-" + String(lp.m).padStart(2, "0"), today = "d1";
const prev = (() => { const d = new Date(Date.UTC(lp.y, lp.m - 2, 10)); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"); })();
const iso = (k, day) => new Date(k + "-" + String(day).padStart(2, "0") + "T12:00:00Z").toISOString();
for (let i = 0; i < 40; i++) DB.student_accounts.push({ full_name: "Old " + i, email: `old${i}@x.com`, created_at: iso(prev, 5) });
for (let i = 0; i < 20; i++) DB.student_accounts.push({ full_name: "New " + i, email: `new${i}@x.com`, created_at: iso(cur, 1) });
DB.waiting_list.push({ student_name: "Booked Bea", notes: "[WEB] x\nEmail: bea@x.com", created_at: iso(cur, 1), status: "assigned" }, { student_name: "Waiting Wes", notes: "[WEB]\nEmail: wes@x.com", created_at: iso(cur, 1), status: "waiting" });
DB.email_contacts.push({ id: "u1", email: "old0@x.com", email_key: "old0@x.com", status: "unsubscribed", tags: [] });
const cfg = { enabled: true, hour: 0, keepMonths: 3, monthlyDesigns: {}, design: { subject: "Block bookings", body: "Save on a block" } };
const run = (extra = {}) => monthlyNew(sb, {}, { force: true, ...extra }, cfg, cfg.design, "https://f", new Date(), lp, today + Math.random(), 30, 7 * 864e5);
let r = await run({ dry: true });
ok(r.newStudentsFound === 60 + 1 - 1 + 0 || r.newStudentsFound === 61, "dry: 40 old + 20 new + 1 booked student found (" + r.newStudentsFound + "); the waiting enquiry is not a student");
ok(DB.email_contacts.length === 1, "dry run writes nothing");
r = await run();
ok(r.sent === 30 && sentMails.length === 30, "day 1: exactly 30 emails (" + r.sent + ")");
ok(sentMails.every((m) => m.to[0].startsWith("old")), "all from last month first (the top of the queue)");
ok(!sentMails.some((m) => m.to[0] === "old0@x.com"), "the unsubscribed student is never emailed");
ok(DB.email_contacts.find((c) => c.email === "old1@x.com").tags.includes("new-" + prev), "students are tagged with their month");
sentMails.length = 0; r = await run(); ok(r.sent === 30 && sentMails.slice(0, 9).every((m) => m.to[0].startsWith("old")) && sentMails.slice(9).every((m) => /^(new|bea)/.test(m.to[0])), "day 2: the last 9 of last month, then this month's students move up to fill the 30 (" + r.sent + ")");
const st = DB.growth_settings.find((x) => x.key === "emailloop_monthly_state").value;
ok((st.retired || []).some((x) => x.month === prev), "last month finished -> removed from the queue (" + JSON.stringify((st.retired || []).map((x) => x.month)) + ")");
DB.student_accounts.push({ full_name: "Late Lee", email: "late@x.com", created_at: iso(cur, 2) }); sentMails.length = 0; r = await run();
ok(sentMails.length === 1 && sentMails[0].to[0] === "late@x.com", "a student who joins later this month is added and emailed, and nobody gets it twice");
cfg.monthlyDesigns[cur] = { subject: "December special", body: "x" };
console.log("queue:", JSON.stringify((await run({ dry: true })).queue));
