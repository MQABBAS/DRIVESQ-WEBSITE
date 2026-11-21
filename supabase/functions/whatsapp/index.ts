// @ts-nocheck — plain JavaScript in a .ts file
// DriveSQ — whatsapp (Meta WhatsApp Business Platform / Cloud API) + AUTO-ASSIGN of website bookings
// This ONE function is the webhook (it replaces the older whatsapp-webhook / autopilot and send-whatsapp functions).
//
// Admin calls (header x-admin-key = EMAIL_ADMIN_KEY, same key as the email function):
//   { action:"status" }                                    connection check
//   { action:"send_template", to, template, lang, params, buttons, instructor_id, referral_id, student_name }
//   { action:"test", to }                                  sends Meta's built-in "hello_world"
//   { action:"auto_assign", dry:true }                     PREVIEW: what would happen to the waiting website bookings (writes nothing)
//   { action:"auto_assign" }                               run it now      { action:"auto_assign", cron:true }  from Supabase Cron every few minutes
// Meta calls this same URL as the webhook: GET verification, POST delivery receipts + replies (Accept / Can't take buttons).
//
// Secrets: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, EMAIL_ADMIN_KEY (reused).
//   (META_ACCESS_TOKEN / META_PHONE_NUMBER_ID / WA_TOKEN / WA_PHONE_ID from the older functions are also accepted.)
// Turn OFF "Verify JWT" for this function.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = (k: string) => Deno.env.get(k) || "";
const SUPABASE_URL = env("SUPABASE_URL") || "https://vwvbfqrlumvoabzkjxoa.supabase.co";
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY") || env("SERVICE_ROLE_KEY");
const TOKEN = env("WHATSAPP_TOKEN") || env("META_ACCESS_TOKEN") || env("WA_TOKEN");
const PHONE_ID = env("WHATSAPP_PHONE_ID") || env("META_PHONE_NUMBER_ID") || env("WA_PHONE_ID");
const VERIFY = env("WHATSAPP_VERIFY_TOKEN");
const APP_SECRET = env("WHATSAPP_APP_SECRET");
const ADMIN_KEY = env("EMAIL_ADMIN_KEY");
const API = "https://graph.facebook.com/" + (env("WHATSAPP_API_VERSION") || "v21.0");
const LONDON = "Europe/London";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- small helpers ---------- */
function waNumber(raw: string) {   // 07700 900123 / +44 7700 900123 → 447700900123
  let d = String(raw || "").replace(/\(0\)/g, "").replace(/\D/g, "");
  if (d.startsWith("0044")) d = d.slice(2); else if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "44" + d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : "";
}
const last10 = (p: string) => String(p || "").replace(/\D/g, "").slice(-10);
const param = (v: unknown) => ({ type: "text", text: (String(v == null ? "" : v).replace(/[\r\n\t]+/g, " | ").replace(/ {5,}/g, "    ").replace(/( \| )+/g, " | ").trim().slice(0, 900)) || "-" });
const first = (n: string) => String(n || "").trim().split(/\s+/)[0] || "there";
const fmtPhone = (p: string) => { const d = String(p || "").replace(/\D/g, ""); return d.length === 11 && d[0] === "0" ? d.slice(0, 5) + " " + d.slice(5) : String(p || "").trim(); };
const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: LONDON });
const londonHour = () => +new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, hour: "2-digit", hour12: false }).format(new Date()) % 24;
const outward = (pc: string) => String(pc || "").toUpperCase().replace(/\s+/g, "").replace(/\d[A-Z]{2}$/, "").trim();
const fmtPc = (v: string) => { const c = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return c.length >= 5 ? c.slice(0, -3) + " " + c.slice(-3) : c; };
async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function graph(path: string, body?: unknown) {
  const r = await fetch(API + path, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
}

/* ---------- sending ---------- */
async function sendTemplate(sb: any, b: any) {
  if (!TOKEN || !PHONE_ID) return { ok: false, error: "WhatsApp is not set up yet (missing token or phone number ID)." };
  const to = waNumber(b.to); if (!to) return { ok: false, error: "That phone number doesn't look right." };
  const name = String(b.template || "").trim(); if (!/^[a-z0-9_]{1,512}$/.test(name)) return { ok: false, error: "Bad template name." };
  const components: any[] = [];
  if (Array.isArray(b.params) && b.params.length) components.push({ type: "body", parameters: b.params.map(param) });
  (Array.isArray(b.buttons) ? b.buttons : []).forEach((p: string, i: number) => components.push({ type: "button", sub_type: "quick_reply", index: String(i), parameters: [{ type: "payload", payload: String(p).slice(0, 256) }] }));
  let r: any = null, used = "";
  for (const lang of Array.from(new Set([b.lang || "en_GB", "en_GB", "en", "en_US"]))) {   // a template saved as "English" or "English (US)" instead of "English (UK)" still works
    used = lang;
    r = await graph("/" + PHONE_ID + "/messages", { messaging_product: "whatsapp", to, type: "template", template: { name, language: { code: lang }, ...(components.length ? { components } : {}) } });
    if (r.ok || !(r.j && r.j.error && r.j.error.code === 132001)) break;
  }
  const id = r.j && r.j.messages && r.j.messages[0] && r.j.messages[0].id || null;
  const err = r.ok ? null : ((r.j && r.j.error && (r.j.error.error_user_msg || r.j.error.message)) || "WhatsApp error " + r.status);
  await sb.from("wa_log").insert([{ direction: "out", wa_message_id: id, to_phone: to, template: name, body: (b.params || []).map((x: any) => String(x == null ? "" : x).replace(/\s+/g, " ")).join(" · ").slice(0, 900), status: r.ok ? "sent" : "failed", error: err, instructor_id: b.instructor_id || null, referral_id: b.referral_id || null, student_name: b.student_name || null }]);
  return r.ok ? { ok: true, id, to } : { ok: false, error: err, code: r.j && r.j.error && r.j.error.code };
}
async function sendText(to: string, text: string) { return graph("/" + PHONE_ID + "/messages", { messaging_product: "whatsapp", to, type: "text", text: { body: text } }); }
/* free-form reply with tap buttons: allowed without a template while the person has just messaged us (24-hour window) */
async function sendButtons(to: string, text: string, buttons: { id: string; title: string }[]) {
  return graph("/" + PHONE_ID + "/messages", { messaging_product: "whatsapp", to, type: "interactive", interactive: { type: "button", body: { text }, action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) } })) } } });
}

/* ---------- settings ---------- */
const DEFAULT_CFG = {
  enabled: false,                  // master switch
  mode: "assign",                  // "assign" = assign + message; "suggest" = only tell the admin who it would pick (no messages, no assignment)
  since: "",                       // only bookings created after this moment are touched (set when you switch it on)
  sources: ["[WEB]"],              // which bookings: [WEB] = website booking forms
  autoMiles: 5,                    // at or under this many miles: assign straight away
  confirmMiles: 8,                 // the limit: up to this many miles the instructor is asked to accept first. Over it: attention required
  dailyLimit: 2,                   // soft limit: students assigned to an instructor today. Over it they are asked LAST
  weeklyLimit: 4,                  // soft limit: students confirmed booked this week (Mon-Sun). Over it they are asked LAST
  femaleRule: "require",           // when the booking asks for a female instructor: "require" (only female instructors) or "prefer"
  hours: [8, 21],                  // only run between these UK hours
  replyHours: 5,                   // how long an instructor has to accept an offer
  retries: 2,                      // after a "can't take" or no reply, try this many other instructors before asking you
  maxPerWeek: 0,                   // (old hard cap, off) 0 = none
  messageInstructor: true, messageStudent: true,
  adminPhone: "", adminAlerts: true,
  refFee: 25,                      // referral fee recorded for referral-model instructors (franchise = 0)
  followups: { enabled: true, acceptWaitHours: 24, checkinDays: 3, instructorAfterDays: 1, repeatDays: 5, rounds: 4 },
};
async function loadCfg(sb: any) {
  const { data } = await sb.from("growth_settings").select("value").eq("key", "auto_assign_cfg").maybeSingle();
  const v = (data && data.value) || {};
  return { ...DEFAULT_CFG, ...v, followups: { ...DEFAULT_CFG.followups, ...(v.followups || {}) } };
}

/* ---------- attention required ---------- */
async function attention(sb: any, cfg: any, a: any) {
  const { data: ex } = await sb.from("admin_attention").select("*").eq("waiting_id", a.waiting_id || "").eq("kind", a.kind).eq("resolved", false).maybeSingle();
  if (ex && a.waiting_id) { await sb.from("admin_attention").update({ detail: a.detail, updated_at: new Date().toISOString() }).eq("id", ex.id); return ex.id; }
  const row = { kind: a.kind, title: a.title, detail: a.detail || "", waiting_id: a.waiting_id || null, referral_id: a.referral_id || null, instructor_id: a.instructor_id || null, student_name: a.student_name || null, resolved: false };
  const { data } = await sb.from("admin_attention").insert([row]).select().single();
  try { await sb.from("admin_activity_log").insert([{ area: "auto_assign", action: "attention_" + a.kind, summary: "⚠️ " + a.title + (a.detail ? " — " + a.detail : ""), actor_role: "system", actor_name: "Auto-assign", instructor_id: a.instructor_id || null, student_name: a.student_name || null, ref_id: a.referral_id || null }]); } catch (_) { /* best effort */ }
  if (cfg.adminAlerts && cfg.adminPhone) { try { await sendTemplate(sb, { to: cfg.adminPhone, template: "dsq_admin_attention", lang: "en_GB", params: [a.title, a.detail || "Open admin to see it."] }); } catch (_) { /* best effort */ } }
  return data && data.id;
}

/* ---------- locations + distance ---------- */
const geoCache = new Map();
async function geocode(pc: string) {
  const c = String(pc || "").replace(/\s+/g, "").toUpperCase(); if (!c) return null; if (geoCache.has(c)) return geoCache.get(c);
  let g = null;
  try {
    let r = await fetch("https://api.postcodes.io/postcodes/" + encodeURIComponent(c)); let j = await r.json().catch(() => ({}));
    if (j && j.result) g = { lat: j.result.latitude, lon: j.result.longitude, exact: true };
    else { const oc = c.replace(/\d[A-Z]{2}$/, ""); r = await fetch("https://api.postcodes.io/outcodes/" + encodeURIComponent(oc)); j = await r.json().catch(() => ({})); if (j && j.result) g = { lat: j.result.latitude, lon: j.result.longitude, exact: false }; }
  } catch (_) { /* network problem: leave null */ }
  geoCache.set(c, g); return g;
}
function haversine(a1: number, o1: number, a2: number, o2: number) {
  const R = 3958.8, d = (x: number) => x * Math.PI / 180, dA = d(a2 - a1), dO = d(o2 - o1);
  const a = Math.sin(dA / 2) ** 2 + Math.cos(d(a1)) * Math.cos(d(a2)) * Math.sin(dO / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function drivingMiles(sLat: number, sLon: number, iLat: number, iLon: number) {
  try { const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${sLon},${sLat};${iLon},${iLat}?overview=false`, { signal: AbortSignal.timeout(3500) }); const j = await r.json(); if (j.routes && j.routes[0]) return j.routes[0].distance / 1609.34; } catch (_) { /* fall back */ }
  return haversine(sLat, sLon, iLat, iLon);
}
const extractPc = (s: string) => { const m = String(s || "").toUpperCase().match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/); return m ? m[0] : ""; };
function instrPc(i: any) {
  const own = String(i.postcode || "").trim(); if (own) return own;
  const full = extractPc(i.area) || extractPc(i.address); if (full) return full;
  const oc = String(i.area || "").toUpperCase().match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\b/); if (oc) return oc[0];
  const cov = String(i.coverage_postcodes || "").toUpperCase().match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\b/); return cov ? cov[0] : "";
}
const canTeach = (t: string, req: string) => t === "Both" || (req === "Automatic" ? t === "Automatic" : t !== "Automatic");

/* ---------- reading a website booking ---------- */
function readBooking(w: any) {
  const n = String(w.notes || ""), pick = (re: RegExp) => { const m = n.match(re); return m ? m[1].trim() : ""; };
  const pc = fmtPc(w.postcode || pick(/(?:^|\n)\s*Postcode:\s*([^\n]+)/i));
  const gear = pick(/(?:^|\n)\s*(?:Gearbox|Transmission):\s*([^\n]+)/i) || pick(/(?:^|\n)\s*Service:\s*([^\n]+)/i);
  let type = w.lesson_type || (/auto/i.test(gear) ? "Automatic" : "Manual"); if (/auto/i.test(gear)) type = "Automatic"; else if (/manual/i.test(gear) && !/^(Intensive|Mock Test)$/.test(type)) type = "Manual";
  const femaleStrict = /FEMALE INSTRUCTOR REQUESTED/i.test(n) || (/female instructor/i.test(n) && !/FEMALE PREFERRED/i.test(n)), femalePref = /FEMALE PREFERRED/i.test(n);
  return { id: w.id, name: w.student_name || "Student", phone: w.student_phone || "", email: pick(/(?:^|\n)\s*Email:\s*(\S+@\S+)/i), postcode: pc, addr: pick(/(?:^|\n)\s*(?:Address|Pick-?up street):\s*([^\n]+)/i) || w.area || "", type, avail: pick(/(?:^|\n)\s*Availability:\s*([^\n]+)/i), notes: n, female: femaleStrict ? "require" : femalePref ? "prefer" : "", ref: pick(/(?:^|\n)\s*Ref:\s*([^\n]+)/i), created: w.created_at };
}

/* ---------- referral statistics (same booked rule as admin: ✅ confirmed by admin or instructor, not removed later) ---------- */
const BK_MARKS = ["✅ Booked — confirmed by admin", "✅ Booked — confirmed by instructor", "✅ Booked — confirmed by student"];
function isBooked(r: any) { if (r.is_paid) return true; if (r.flag_color !== "green") return false; const n = String(r.admin_notes || ""), a = Math.max(...BK_MARKS.map((m) => n.lastIndexOf(m))), b = n.lastIndexOf("↩️ Booked mark removed by admin"); return a > b || (a < 0 && r.reply_status !== "booked"); }
/* when a student was confirmed booked: the date at the start of the confirmation line ("20 Nov 2026 · ✅ Booked — confirmed by …") */
function bookedAt(r: any) {
  const lines = String(r.admin_notes || "").split("\n"); let t = 0;
  for (const l of lines) if (BK_MARKS.some((m) => l.includes(m))) { const d = Date.parse(l.split(" · ")[0]); if (!isNaN(d)) t = d; }
  return t || (r.paid_at ? new Date(r.paid_at).getTime() : new Date(r.created_at).getTime());
}
function londonMidnightToday() { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value])); const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); return Date.now() - (asUtc - Date.UTC(+p.year, +p.month - 1, +p.day)); }
function mondayLondon() { const p = new Date(Date.now() - ((new Date().getUTCDay() + 6) % 7) * 864e5); p.setUTCHours(0, 0, 0, 0); return p; }

async function candidateData(sb: any) {
  const { data: instrs } = await sb.from("instructors").select("*").eq("status", "approved");
  const since90 = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data: refs } = await sb.from("referrals").select("*").gte("created_at", since90);
  const { data: tr } = await sb.from("growth_settings").select("value").eq("key", "instructor_traits").maybeSingle();
  const { data: pk } = await sb.from("growth_settings").select("value").eq("key", "packages").maybeSingle();
  const traits = (tr && tr.value) || {}, packages = (pk && pk.value && pk.value.by) || {}, mon = mondayLondon().getTime();
  const stats: any = {}, midnight = londonMidnightToday();
  (refs || []).forEach((r: any) => {
    if (r.is_cancelled || r.is_credit) return; const s = stats[r.instructor_id] = stats[r.instructor_id] || { week: 0, today: 0, bookedWeek: 0, total: 0, booked: 0, unmarked: 0 };
    if (new Date(r.created_at).getTime() >= mon) s.week++;
    if (new Date(r.created_at).getTime() >= midnight) s.today++;
    if (isBooked(r) && bookedAt(r) >= mon) s.bookedWeek++;
    const age = (Date.now() - new Date(r.created_at).getTime()) / 864e5; if (age < 7) return;
    s.total++; if (isBooked(r)) s.booked++; else if (!r.flag_color && !r.reply_status && !r.is_paid && age >= 3) s.unmarked++;
  });
  return { instrs: instrs || [], stats, traits, packages };
}

/* rank the instructors for one booking. exclude = ids already asked */
async function rank(sb: any, cfg: any, b: any, cd: any, exclude: string[]) {
  const out: any[] = [];
  const sg = await geocode(b.postcode); if (!sg) return { error: 'Postcode "' + b.postcode + '" was not found', list: [] };
  const rows: any[] = [];
  for (const i of cd.instrs) {
    const tr = cd.traits[i.id] || {}; if (tr.noAuto) continue;
    if (exclude.includes(String(i.id))) continue;
    if (!canTeach(i.car_type || "Manual", b.type)) continue;
    if (b.female === "require" && cfg.femaleRule === "require" && !tr.female) continue;
    const st = cd.stats[i.id] || { week: 0, today: 0, bookedWeek: 0, total: 0, booked: 0, unmarked: 0 }; if (cfg.maxPerWeek > 0 && st.week >= cfg.maxPerWeek) continue;
    const pc = instrPc(i); if (!pc) continue; const g = await geocode(pc); if (!g) continue;
    rows.push({ i, tr, st, g, crow: haversine(sg.lat, sg.lon, g.lat, g.lon) });
  }
  rows.sort((a, c) => a.crow - c.crow);
  for (const r of rows.slice(0, 8)) r.dist = await drivingMiles(sg.lat, sg.lon, r.g.lat, r.g.lon);
  for (const r of rows.slice(8)) r.dist = r.crow * 1.3;
  for (const r of rows) {
    const over: string[] = [];
    if (cfg.dailyLimit > 0 && r.st.today >= cfg.dailyLimit) over.push(`already given ${r.st.today} today`);
    if (cfg.weeklyLimit > 0 && r.st.bookedWeek >= cfg.weeklyLimit) over.push(`already ${r.st.bookedWeek} booked this week`);
    out.push({ id: r.i.id, name: r.i.full_name, phone: r.i.phone, model: String(r.i.instructor_model || "").toLowerCase(), dist: Math.round(r.dist * 10) / 10, score: 0, tier: over.length ? 1 : 0, over, today: r.st.today, bookedWeek: r.st.bookedWeek, week: r.st.week, female: !!r.tr.female, rate: r.st.total >= 5 ? Math.round(r.st.booked / r.st.total * 100) : null, instr: r.i });
  }
  // the closest instructor first, but anyone over a soft limit is asked LAST (still closest first inside each group)
  out.sort((a, c) => (a.tier - c.tier) || (a.dist - c.dist));
  const near = out.filter((x) => x.dist <= cfg.confirmMiles);
  const closest = near.slice().sort((a, c) => a.dist - c.dist)[0];
  if (near[0]) {
    const best = near[0];
    best.why = closest && closest.id !== best.id ? `${closest.name} is closer (${closest.dist} mi) but ${closest.over.join(" and ")}, so asked after others` : best.tier === 1 ? `everyone close by is over a limit (${best.over.join(" and ")}), so the closest gets it` : "closest instructor";
  }
  return { list: out, geo: sg };
}

/* ---------- assigning a student to an instructor (same records as Find & Assign) ---------- */
/* the student's welcome. Only sent once (a marker line in the referral notes stops a second one) and only if the student messages are switched on */
async function welcomeStudent(sb: any, cfg: any, ref: any, c: any, waitingId?: any) {
  if (!cfg.messageStudent || !ref.student_phone) return "";
  const { data: wc } = await sb.from("growth_settings").select("value").eq("key", "whatsapp_cfg").maybeSingle(); if (wc && wc.value && wc.value.student === false) return "";
  const { data: cur } = await sb.from("referrals").select("admin_notes").eq("id", ref.id).maybeSingle(); if (String((cur && cur.admin_notes) || ref.notes || "").includes("💬 Student welcomed")) return "";
  const r2 = await sendTemplate(sb, { to: ref.student_phone, template: "dsq_student_welcome", lang: "en_GB", params: [first(ref.student_name), c.name, fmtPhone(c.phone) || "their phone"], instructor_id: c.id, referral_id: ref.id, student_name: ref.student_name });
  if (r2.ok) { const n = String((cur && cur.admin_notes) || ""); await sb.from("referrals").update({ admin_notes: [n, `${today()} · 💬 Student welcomed on WhatsApp (after ${c.name} agreed)`].filter(Boolean).join("\n") }).eq("id", ref.id); return "student welcomed"; }
  await attention(sb, cfg, { kind: "msg_failed", title: "WhatsApp to " + (ref.student_name || "the student") + " did not send", detail: `${c.name} agreed, but the welcome failed: ${r2.error}. Message the student by hand.`, waiting_id: String(waitingId || ref.id) + "-stu", referral_id: ref.id, instructor_id: c.id, student_name: ref.student_name });
  return "student message failed: " + r2.error;
}
async function assign(sb: any, cfg: any, b: any, c: any, agreed = false) {
  const now = new Date().toISOString(), pickup = [b.addr, b.postcode].filter(Boolean).join(", ");
  const phoneDigits = last10(b.phone);
  let accId = null;
  try {
    let have = null; if (phoneDigits) { const { data: accs } = await sb.from("student_accounts").select("id,phone").eq("instructor_id", c.id); have = (accs || []).find((a: any) => last10(a.phone) === phoneDigits) || null; }
    if (!have) { const { data: acc } = await sb.from("student_accounts").insert([{ full_name: b.name, phone: b.phone || null, email: b.email || null, address: pickup || null, instructor_id: c.id, student_code: "STU" + Date.now().toString(36).toUpperCase().slice(-5), pin: "0000", password_hash: "", status: "active", created_at: now, updated_at: now }]).select("id").maybeSingle(); accId = acc && acc.id; }
  } catch (_) { /* non-fatal, like Find & Assign */ }
  const notesStr = [b.avail ? "Availability: " + b.avail : "", b.postcode ? "Postcode: " + b.postcode : ""].filter(Boolean).join("\n") || null;
  const base = { instructor_id: c.id, name: b.name, phone: b.phone || null, address: pickup || null, created_at: now };
  let prof = false; for (const p of [{ ...base, lesson_type: b.type, notes: notesStr, availability: b.avail || null }, { ...base, lesson_type: b.type, notes: notesStr }, { ...base, lesson_type: b.type }, base]) { const { error } = await sb.from("student_profiles").insert([p]); if (!error) { prof = true; break; } }
  if (!prof) throw new Error("could not save the student to the instructor's roster");
  try { await sb.from("student_requests").insert([{ instructor_id: c.id, student_name: b.name, student_phone: b.phone || null, pickup_address: null, postcode: b.postcode || null, lesson_type: b.type, notes: [b.avail ? "Availability: " + b.avail : "", pickup ? "Address: " + pickup : ""].filter(Boolean).join("\n") || null, status: "approved", created_at: now }]); } catch (_) { /* audit only */ }
  const amount = c.model === "referral" ? (parseFloat(cfg.refFee) || 0) : 0;
  const { data: ref, error: rerr } = await sb.from("referrals").insert([{ instructor_id: c.id, student_name: b.name, student_phone: b.phone || null, amount, is_paid: false, paid_at: null, is_cancelled: false, is_credit: false, credit_fulfilled: false, notes: ["Auto-assigned (website booking)", b.postcode ? "Postcode: " + b.postcode : "", pickup ? "Address: " + pickup : "", b.avail ? "Availability: " + b.avail : "", b.ref ? "Ref: " + b.ref : ""].filter(Boolean).join("\n"), admin_notes: `${today()} · 🤖 Auto-assigned to ${c.name} (${c.dist} miles)`, created_at: now }]).select().single();
  if (rerr) throw new Error("referral not saved: " + rerr.message);
  try { await startFollowup(sb, cfg, ref, c, agreed ? "waiting_student" : "waiting_accept"); } catch (_) { /* follow-ups are best effort */ }
  try { await sb.from("admin_messages").insert([{ instructor_id: c.id, subject: "👤 New Student Assigned: " + b.name, message_type: "general", body: `${b.name}${b.phone ? " · " + fmtPhone(b.phone) : ""}${pickup ? " · " + pickup : ""}\nLessons: ${b.type}${b.avail ? "\nAvailability: " + b.avail : ""}\nPlease contact them to arrange the first lesson.`, is_read: false, dismissed: false, created_at: now }]); } catch (_) { /* in-app message only */ }
  try { await fetch(SUPABASE_URL + "/functions/v1/send-push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + SERVICE_KEY }, body: JSON.stringify({ instructor_id: c.id, title: "👤 New Student Assigned: " + b.name, body: (b.phone ? fmtPhone(b.phone) + " · " : "") + (pickup || ""), url: "/dashboard.html" }) }); } catch (_) { /* push is best effort */ }
  let up = await sb.from("waiting_list").update({ status: "assigned", assigned_instructor_id: c.id }).eq("id", b.id); if (up.error) up = await sb.from("waiting_list").update({ status: "assigned" }).eq("id", b.id);
  const { data: wl } = await sb.from("waiting_list").select("notes").eq("id", b.id).maybeSingle();
  await sb.from("waiting_list").update({ notes: [(wl && wl.notes) || "", `${today()} · 🤖 Auto-assigned to ${c.name} (${c.dist} miles)`].filter(Boolean).join("\n") }).eq("id", b.id);
  try { await sb.from("admin_activity_log").insert([{ area: "auto_assign", action: "assigned", summary: `🤖 ${b.name} auto-assigned to ${c.name} (${c.dist} miles)`, actor_role: "system", actor_name: "Auto-assign", instructor_id: c.id, student_name: b.name, ref_id: ref.id }]); } catch (_) { /* log only */ }
  // WhatsApp: instructor gets the details with Accept / Can't take; the student gets their welcome
  const msgs: string[] = [];
  if (cfg.messageInstructor && c.phone) {
    const det = [b.avail ? "Availability: " + b.avail : "", pickup ? "Address: " + pickup : ""].filter(Boolean).join(" | ") || "None";
    const r1 = await sendTemplate(sb, { to: c.phone, template: "dsq_new_student", lang: "en_GB", params: [first(c.name), b.name, fmtPhone(b.phone) || "Not provided", b.postcode || "Not provided", b.type, det], buttons: ["ACCEPT:" + ref.id, "DECLINE:" + ref.id], instructor_id: c.id, referral_id: ref.id, student_name: b.name });
    msgs.push(r1.ok ? "instructor messaged" : "instructor message failed: " + r1.error);
    if (!r1.ok) await attention(sb, cfg, { kind: "msg_failed", title: "WhatsApp to " + c.name + " did not send", detail: `${b.name} was assigned but the message failed: ${r1.error}. Contact them by hand.`, waiting_id: String(b.id), referral_id: ref.id, instructor_id: c.id, student_name: b.name });
  }
  // The student is only told who their instructor is once the instructor has agreed:
  //   - after an offer was accepted (agreed = true) the welcome goes now
  //   - for a direct assignment it goes when the instructor taps Accept (see assignedReply)
  if (agreed) { const w = await welcomeStudent(sb, cfg, { id: ref.id, student_name: b.name, student_phone: b.phone, notes: ref.admin_notes }, c, b.id); if (w) msgs.push(w); }
  else msgs.push("student welcome waits for the instructor to accept");
  return { referral_id: ref.id, msgs };
}

/* ---------- the engine ---------- */
async function offer(sb: any, cfg: any, b: any, c: any, job: any, attempt: number, tried: string[]) {
  const expires = new Date(Date.now() + cfg.replyHours * 3600 * 1000).toISOString();
  await sb.from("auto_assign_jobs").update({ state: "pending_accept", instructor_id: c.id, attempt, tried, expires_at: expires, dist: c.dist, updated_at: new Date().toISOString() }).eq("id", job.id);
  const r = await sendTemplate(sb, { to: c.phone, template: "dsq_student_offer", lang: "en_GB", params: [first(c.name), outward(b.postcode) || b.postcode, c.dist.toFixed(1), b.type], buttons: ["OFFER_ACCEPT:" + job.id, "OFFER_DECLINE:" + job.id], instructor_id: c.id, student_name: b.name });
  if (!r.ok) { await sb.from("auto_assign_jobs").update({ state: "attention", note: r.error }).eq("id", job.id); await attention(sb, cfg, { kind: "msg_failed", title: "Could not message " + c.name, detail: `Offer for ${b.name} (${b.postcode}) did not send: ${r.error}`, waiting_id: String(b.id), instructor_id: c.id, student_name: b.name }); return "offer failed"; }
  const { data: wl } = await sb.from("waiting_list").select("notes").eq("id", b.id).maybeSingle();
  await sb.from("waiting_list").update({ notes: [(wl && wl.notes) || "", `${today()} · 🤖 Offered to ${c.name} (${c.dist} miles), waiting for their reply`].filter(Boolean).join("\n") }).eq("id", b.id);
  return "offered";
}

/* decide what to do with one booking. job = its row in auto_assign_jobs. Returns a one-line outcome. */
async function decide(sb: any, cfg: any, b: any, cd: any, job: any, tried: string[], attempt: number, dry: boolean) {
  const rk = await rank(sb, cfg, b, cd, tried);
  const near = (rk.list || []).filter((x: any) => x.dist <= cfg.confirmMiles), nearestAny = (rk.list || []).slice().sort((a: any, c: any) => a.dist - c.dist)[0];
  const top = near.slice(0, 4).map((x: any) => ({ name: x.name, dist: x.dist, today: x.today, bookedWeek: x.bookedWeek, over: x.over, female: x.female }));
  if (rk.error) { if (!dry) { await sb.from("auto_assign_jobs").update({ state: "attention", note: rk.error }).eq("id", job.id); await attention(sb, cfg, { kind: "postcode", title: "Check the postcode for " + b.name, detail: rk.error + ". Fix it and assign by hand.", waiting_id: String(b.id), student_name: b.name }); } return { action: "attention", reason: rk.error, top }; }
  const best = near[0];
  const wantF = b.female === "require" && cfg.femaleRule === "require";
  if (!best) {
    const reason = tried.length ? "no other instructor left within " + cfg.confirmMiles + " miles (" + tried.length + " already asked)" : nearestAny ? `nearest suitable instructor (${nearestAny.name}) is ${nearestAny.dist} miles away, over your ${cfg.confirmMiles} mile limit` : wantF ? "no female instructor can take this booking" : "no instructor can take this booking";
    if (!dry) { await sb.from("auto_assign_jobs").update({ state: "attention", note: reason }).eq("id", job.id); await attention(sb, cfg, { kind: "no_match", title: "Attention: no match for " + b.name + " (" + b.postcode + ")", detail: reason + (wantF ? ". They asked for a female instructor." : "") + " Assign them by hand in Find & Assign.", waiting_id: String(b.id), student_name: b.name }); }
    return { action: "attention", reason, top };
  }
  if (cfg.mode === "suggest") {
    const reason = `would ${best.dist <= cfg.autoMiles ? "assign" : "offer to"} ${best.name} (${best.dist} miles). ${best.why || ""}`;
    if (!dry) { await sb.from("auto_assign_jobs").update({ state: "attention", note: reason }).eq("id", job.id); await attention(sb, cfg, { kind: "suggest", title: `Suggested: ${best.name} for ${b.name} (${b.postcode})`, detail: `${best.dist} miles away. ${best.why || ""} Press Open in Find & Assign to confirm.`, waiting_id: String(b.id), instructor_id: best.id, student_name: b.name }); }
    return { action: "suggest", instructor: best.name, dist: best.dist, why: best.why, top };
  }
  if (dry) return { action: best.dist <= cfg.autoMiles ? "assign" : "offer", instructor: best.name, dist: best.dist, why: best.why, top };
  if (best.dist <= cfg.autoMiles) {
    try { const res = await assign(sb, cfg, b, best); await sb.from("auto_assign_jobs").update({ state: "assigned", instructor_id: best.id, referral_id: res.referral_id, dist: best.dist, updated_at: new Date().toISOString(), note: res.msgs.join("; ") }).eq("id", job.id); return { action: "assigned", instructor: best.name, dist: best.dist, msgs: res.msgs }; }
    catch (e) { const m = String((e && e.message) || e); await sb.from("auto_assign_jobs").update({ state: "attention", note: m }).eq("id", job.id); await attention(sb, cfg, { kind: "assign_failed", title: "Auto-assign failed for " + b.name, detail: m + ". Assign them by hand.", waiting_id: String(b.id), student_name: b.name }); return { action: "attention", reason: m }; }
  }
  const what = await offer(sb, cfg, b, best, job, attempt, tried);
  return { action: what === "offered" ? "offered" : "attention", instructor: best.name, dist: best.dist };
}

async function autoAssign(sb: any, body: any) {
  const cfg = await loadCfg(sb), dry = !!body.dry, now = Date.now();
  let followups: any[] = [];
  if (!dry && body.cron) { try { followups = await runFollowups(sb, cfg); } catch (e) { console.error("followups", e); } }   // checking whether students booked runs whether or not auto-assign is on
  if (!dry && body.cron && !body.force) {
    if (!cfg.enabled) return { ok: true, off: true, message: "Auto-assign is switched off", followups };
    const h = londonHour(); if (h < cfg.hours[0] || h >= cfg.hours[1]) return { ok: true, waiting: `Runs between ${cfg.hours[0]}:00 and ${cfg.hours[1]}:00 UK time` };
  }
  if (!dry && !cfg.enabled && !body.force) return { ok: true, off: true, message: "Auto-assign is switched off" };
  if (!dry && (!TOKEN || !PHONE_ID) && cfg.mode === "assign") return { ok: false, error: "WhatsApp is not connected, so auto-assign cannot message anyone yet." };
  const results: any[] = [];
  const cd = await candidateData(sb), since = cfg.since ? new Date(cfg.since).getTime() : 0;

  // 1. offers nobody answered in time → next instructor, or ask the admin
  if (!dry) {
    const { data: stale } = await sb.from("auto_assign_jobs").select("*").eq("state", "pending_accept");
    for (const j of (stale || []).filter((x: any) => x.expires_at && new Date(x.expires_at).getTime() < now)) {
      const { data: w } = await sb.from("waiting_list").select("*").eq("id", j.waiting_id).maybeSingle(); if (!w || w.status !== "waiting") { await sb.from("auto_assign_jobs").update({ state: "closed" }).eq("id", j.id); continue; }
      const tried = [...(j.tried || []), String(j.instructor_id)];
      if (tried.length > cfg.retries) { await sb.from("auto_assign_jobs").update({ state: "attention", note: "no reply" }).eq("id", j.id); await attention(sb, cfg, { kind: "no_reply", title: "Attention: nobody replied for " + w.student_name, detail: `${tried.length} instructor(s) were asked and did not accept in ${cfg.replyHours} hours. Assign by hand.`, waiting_id: String(w.id), student_name: w.student_name }); results.push({ student: w.student_name, action: "attention", reason: "no reply" }); continue; }
      results.push({ student: w.student_name, ...(await decide(sb, cfg, readBooking(w), cd, j, tried, tried.length + 1, false)) });
    }
  }

  // 2. new website bookings
  const { data: waiting } = await sb.from("waiting_list").select("*").eq("status", "waiting").order("created_at", { ascending: true });
  const { data: jobs } = await sb.from("auto_assign_jobs").select("waiting_id,state");
  const handled = new Set((jobs || []).map((j: any) => String(j.waiting_id)));
  const tags = (cfg.sources || ["[WEB]"]).map((t: string) => t.toLowerCase());
  for (const w of waiting || []) {
    if (handled.has(String(w.id))) continue;
    if (new Date(w.created_at).getTime() < since && !body.includeOlder) continue;
    if (!tags.some((t: string) => String(w.notes || "").toLowerCase().includes(t))) continue;
    const b = readBooking(w);
    if (dry) { results.push({ student: b.name, postcode: b.postcode, type: b.type, female: b.female || "", ...(await decide(sb, cfg, b, cd, { id: "dry" }, [], 1, true)) }); continue; }
    const { data: job, error } = await sb.from("auto_assign_jobs").insert([{ waiting_id: String(w.id), state: "working", attempt: 1, tried: [] }]).select().single();
    if (error || !job) continue;   // someone else is already handling it
    results.push({ student: b.name, ...(await decide(sb, cfg, b, cd, job, [], 1, false)) });
  }
  return { ok: true, dry, enabled: cfg.enabled, mode: cfg.mode, results, followups, summary: { assigned: results.filter((r) => r.action === "assigned").length, offered: results.filter((r) => r.action === "offered").length, attention: results.filter((r) => r.action === "attention").length } };
}

/* ---------- replies from instructors ---------- */
async function instructorByPhone(sb: any, from: string) { const { data } = await sb.from("instructors").select("*").eq("status", "approved"); return (data || []).find((i: any) => last10(i.phone) === last10(from)) || null; }
const YES = ["yes", "y", "yep", "yeah", "ok", "okay", "sure", "accept", "confirm", "confirmed", "ican", "cantake"], NO = ["no", "nope", "n", "cant", "cannot", "decline", "declined", "reject", "sorry"];
const norm = (t: string) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
async function offerReply(sb: any, accept: boolean, jobId: string, from: string) {
  const cfg = await loadCfg(sb); const { data: job } = await sb.from("auto_assign_jobs").select("*").eq("id", jobId).maybeSingle(); if (!job || job.state !== "pending_accept") { try { await sendText(from, "Thanks. That student has already been dealt with."); } catch (_) { /* window */ } return; }
  const { data: w } = await sb.from("waiting_list").select("*").eq("id", job.waiting_id).maybeSingle(); if (!w || w.status !== "waiting") { await sb.from("auto_assign_jobs").update({ state: "closed" }).eq("id", jobId); return; }
  const b = readBooking(w), cd = await candidateData(sb), i = cd.instrs.find((x: any) => String(x.id) === String(job.instructor_id)); if (!i) return;
  const c = { id: i.id, name: i.full_name, phone: i.phone, model: String(i.instructor_model || "").toLowerCase(), dist: Math.round((job.dist || 0) * 10) / 10 };
  if (accept) {
    try { const res = await assign(sb, cfg, b, c, true); await sb.from("auto_assign_jobs").update({ state: "assigned", referral_id: res.referral_id, updated_at: new Date().toISOString(), note: "accepted; " + res.msgs.join("; ") }).eq("id", jobId); try { await sendText(from, "Thanks, you're confirmed ✅ We've sent you the student's details."); } catch (_) { /* window */ } }
    catch (e) { const m = String((e && e.message) || e); await sb.from("auto_assign_jobs").update({ state: "attention", note: m }).eq("id", jobId); await attention(sb, cfg, { kind: "assign_failed", title: "Accepted but not saved: " + b.name, detail: `${c.name} accepted but the assignment failed: ${m}. Assign by hand.`, waiting_id: String(w.id), instructor_id: c.id, student_name: b.name }); }
    return;
  }
  try { await sendText(from, "No problem, thanks for letting us know. We'll find someone else."); } catch (_) { /* window */ }
  const tried = [...(job.tried || []), String(job.instructor_id)];
  if (tried.length > cfg.retries) { await sb.from("auto_assign_jobs").update({ state: "attention", note: "declined", tried }).eq("id", jobId); await attention(sb, cfg, { kind: "declined", title: `Attention: ${c.name} can't take ${b.name}`, detail: `${tried.length} instructor(s) have now said they can't take this student (${b.postcode}). Assign by hand.`, waiting_id: String(w.id), instructor_id: c.id, student_name: b.name }); return; }
  await decide(sb, cfg, b, cd, job, tried, tried.length + 1, false);
}
/* an instructor tapped Accept / Can't take on a student who was ALREADY assigned */
async function assignedReply(sb: any, kind: string, refId: string, from: string) {
  const cfg = await loadCfg(sb); const { data: r } = await sb.from("referrals").select("*").eq("id", refId).maybeSingle(); if (!r) return;
  const { data: ins } = await sb.from("instructors").select("full_name").eq("id", r.instructor_id).maybeSingle(); const name = (ins && ins.full_name) || "Instructor", ok = kind === "ACCEPT";
  const line = ok ? `${today()} · 👨‍🏫 ${name} accepted this student on WhatsApp` : `${today()} · 🚫 ${name} can't take this student (WhatsApp) — please reassign`;
  const patch: any = { admin_notes: [r.admin_notes || "", line].filter(Boolean).join("\n") }; if (!ok && !r.flag_color) patch.flag_color = "purple";
  await sb.from("referrals").update(patch).eq("id", refId);
  try { await sb.from("admin_activity_log").insert([{ area: "referral", action: ok ? "wa_accepted" : "wa_declined", summary: `${name} ${ok ? "accepted" : "can't take"} ${r.student_name || "a student"} (WhatsApp)`, actor_role: "instructor", actor_name: name, instructor_id: r.instructor_id, student_name: r.student_name, ref_id: refId }]); } catch (_) { /* log */ }
  try {
    const { data: f0 } = await sb.from("student_followups").select("*").eq("referral_id", String(refId)).maybeSingle();
    if (ok) { if (f0 && f0.state === "waiting_accept") await setF(sb, f0.id, { state: "waiting_student", accepted_at: new Date().toISOString(), next_due: new Date(Date.now() + cfg.followups.checkinDays * 864e5).toISOString() }); else if (!f0) await startFollowup(sb, cfg, { id: refId, student_name: r.student_name, student_phone: r.student_phone }, { id: r.instructor_id }, "waiting_student"); }
    else if (f0) await setF(sb, f0.id, { state: "closed", result: "instructor can't cover" });
  } catch (_) { /* follow-ups are best effort */ }
  if (ok) { try { const { data: ins2 } = await sb.from("instructors").select("*").eq("id", r.instructor_id).maybeSingle(); if (ins2) await welcomeStudent(sb, cfg, { id: refId, student_name: r.student_name, student_phone: r.student_phone, notes: patch.admin_notes }, { id: ins2.id, name: ins2.full_name, phone: ins2.phone }); } catch (_) { /* the instructor's accept is already saved */ } }
  if (!ok) await attention(sb, cfg, { kind: "declined_after", title: `Attention: ${name} can't cover ${r.student_name || "a student"}`, detail: "They were already assigned. Reassign them in Find & Assign.", referral_id: refId, instructor_id: r.instructor_id, student_name: r.student_name });
  try { await sendText(from, ok ? "Thanks, noted ✅ Please contact the student to arrange the first lesson." : "No problem, thanks for letting us know. We'll find another instructor for them."); } catch (_) { /* window */ }
}


/* ================= follow-ups: did the student book? =================
   instructor accepts → 3 days later the STUDENT is asked → no answer in 1 day → the INSTRUCTOR is asked → repeat every 5 days (4 rounds) → attention.
   Every answer updates the referral in admin (flag, reply status, notes) exactly as if admin or the instructor had marked it. */
const NOTE_LINE = (txt: string) => `${today()} · ${txt}`;
async function logAct(sb: any, role: string, actor: string, action: string, summary: string, ref: any) {
  try { await sb.from("admin_activity_log").insert([{ area: "referral", action, summary, actor_role: role, actor_name: actor, instructor_id: ref.instructor_id, student_name: ref.student_name, ref_id: ref.id }]); } catch (_) { /* log only */ }
}
async function setF(sb: any, id: any, patch: any) { await sb.from("student_followups").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id); }
async function startFollowup(sb: any, cfg: any, ref: any, c: any, state: string) {
  const f = cfg.followups; if (!f.enabled) return;
  const { data: ex } = await sb.from("student_followups").select("*").eq("referral_id", String(ref.id)).maybeSingle(); if (ex) return;
  const due = new Date(Date.now() + (state === "waiting_accept" ? f.acceptWaitHours * 3600e3 : f.checkinDays * 864e5)).toISOString();
  await sb.from("student_followups").insert([{ referral_id: String(ref.id), instructor_id: String(c.id), student_name: ref.student_name || "", student_phone: ref.student_phone || "", state, round: 1, accepted_at: state === "waiting_accept" ? null : new Date().toISOString(), next_due: due }]);
}
/* write an answer into the referral (what admin shows) */
async function applyMark(sb: any, refId: string, kind: "booked" | "not_yet" | "left", who: "student" | "instructor", actor: string) {
  const { data: r } = await sb.from("referrals").select("*").eq("id", refId).maybeSingle(); if (!r) return null;
  const sName = r.student_name || "the student", ch = who === "student" ? "📱" : "👨‍🏫";
  const lines: string[] = [], patch: any = { replied_at: new Date().toISOString(), reply_note: (who === "student" ? "Student replied on WhatsApp" : "Instructor replied on WhatsApp") };
  if (kind === "booked") {
    patch.flag_color = "green"; patch.reply_status = "booked";
    lines.push(NOTE_LINE(`✅ Booked — confirmed by ${who}`));
    lines.push(NOTE_LINE(who === "student" ? `📱 ${sName} messaged on WhatsApp: confirmed they are booked in` : `👨‍🏫 ${actor} replied on WhatsApp: ${sName} is booked in`));
  } else if (kind === "not_yet") {
    patch.reply_status = "not_yet"; if (r.flag_color !== "green") patch.flag_color = "purple";
    lines.push(NOTE_LINE(who === "student" ? `📱 ${sName} messaged on WhatsApp: not booked yet` : `👨‍🏫 ${actor} replied on WhatsApp: ${sName} is not booked yet`));
  } else {
    if (r.flag_color !== "green") { patch.flag_color = "red"; patch.reply_status = "left"; }
    lines.push(NOTE_LINE(who === "student" ? `📱 ${sName} messaged on WhatsApp: gone elsewhere. Student confirmed left` : `👨‍🏫 ${actor} replied on WhatsApp: ${sName} has left. Student left`));
  }
  patch.admin_notes = [r.admin_notes || "", ...lines].filter(Boolean).join("\n");
  await sb.from("referrals").update(patch).eq("id", refId);
  await logAct(sb, who, who === "student" ? sName : actor, who === "student" ? "student_" + kind : "wa_" + kind, kind === "booked" ? `${who === "student" ? sName : actor} confirmed ${sName} is booked (WhatsApp)` : kind === "left" ? `${sName} has left (${who} said so on WhatsApp)` : `${sName} not booked yet (${who} said so on WhatsApp)`, r);
  return r;
}
async function followupReply(sb: any, kind: string, fid: string, from: string) {
  const cfg = await loadCfg(sb); const { data: f } = await sb.from("student_followups").select("*").eq("id", fid).maybeSingle(); if (!f) return;
  const { data: ins } = await sb.from("instructors").select("full_name,phone").eq("id", f.instructor_id).maybeSingle(); const iName = (ins && ins.full_name) || "the instructor", stu = f.student_name || "the student";
  const settled = f.state === "done" || f.state === "closed";
  if (kind === "CONTACT_YES" || kind === "CONTACT_NO") {
    const { data: r } = await sb.from("referrals").select("admin_notes").eq("id", f.referral_id).maybeSingle();
    const line = kind === "CONTACT_YES" ? NOTE_LINE(`📱 ${stu} says ${iName} has been in touch`) : NOTE_LINE(`📱 ⚠️ ${stu} says ${iName} has NOT been in touch yet`);
    await sb.from("referrals").update({ admin_notes: [(r && r.admin_notes) || "", line].filter(Boolean).join("\n") }).eq("id", f.referral_id);
    try { await sendText(from, kind === "CONTACT_YES" ? "Thanks, that's helpful 👍 We'll check in again in a few days." : "Sorry about that. We'll chase them for you right away."); } catch (_) { /* window */ }
    if (kind === "CONTACT_NO" && !settled) {
      await attention(sb, cfg, { kind: "not_contacted", title: `Attention: ${iName} has not contacted ${stu}`, detail: "The student says their instructor hasn't been in touch. We've messaged the instructor. Consider reassigning.", referral_id: f.referral_id, instructor_id: f.instructor_id, student_name: stu });
      if (ins && ins.phone) { const r1 = await sendTemplate(sb, { to: ins.phone, template: "dsq_instructor_checkin", lang: "en_GB", params: [first(iName), stu], buttons: ["INS_BOOKED:" + f.id, "INS_NOTYET:" + f.id, "INS_LEFT:" + f.id], instructor_id: String(f.instructor_id), referral_id: f.referral_id, student_name: stu }); if (r1.ok) await setF(sb, f.id, { state: "asked_instructor", next_due: new Date(Date.now() + cfg.followups.repeatDays * 864e5).toISOString() }); }
    }
    return;
  }
  const who = kind.startsWith("STU_") ? "student" : "instructor", what = kind.endsWith("BOOKED") ? "booked" : kind.endsWith("NOTYET") ? "not_yet" : "left";
  if (settled) { try { await sendText(from, "Thanks, we already have an answer for this one 👍"); } catch (_) { /* window */ } return; }
  const r = await applyMark(sb, f.referral_id, what as any, who as any, iName); if (!r) return;
  if (what === "booked") { await setF(sb, f.id, { state: "done", result: "booked (" + who + ")" }); try { await sendText(from, who === "student" ? "Brilliant, thanks! 🎉 Enjoy your lessons. Message us any time if you need anything." : "Thanks, we've marked them as booked ✅"); } catch (_) { /* window */ } return; }
  if (what === "left") { await setF(sb, f.id, { state: "done", result: "left (" + who + ")" }); try { await sendText(from, who === "student" ? "No problem, thanks for letting us know. Good luck with your driving!" : "Thanks, we've marked the student as left."); } catch (_) { /* window */ } return; }
  // not yet
  if (who === "student") {
    await setF(sb, f.id, { state: "asked_instructor", next_due: new Date(new Date(f.student_asked_at || Date.now()).getTime() + cfg.followups.repeatDays * 864e5).toISOString() });
    try { await sendButtons(from, `Thanks! Has ${iName} been in touch with you yet?`, [{ id: "CONTACT_YES:" + f.id, title: "Yes, in touch" }, { id: "CONTACT_NO:" + f.id, title: "No, not yet" }]); } catch (_) { /* window */ }
  } else {
    await setF(sb, f.id, { state: "asked_instructor", next_due: new Date(new Date(f.student_asked_at || Date.now()).getTime() + cfg.followups.repeatDays * 864e5).toISOString() });
    try { await sendText(from, "Thanks, noted. We'll check again in a few days."); } catch (_) { /* window */ }
  }
}
async function runFollowups(sb: any, cfg: any) {
  const f = cfg.followups; if (!f.enabled || !TOKEN || !PHONE_ID) return [];
  const h = londonHour(); if (h < cfg.hours[0] || h >= cfg.hours[1]) return [];
  const { data: rows } = await sb.from("student_followups").select("*");
  const due = (rows || []).filter((r: any) => !["done", "attention", "closed"].includes(r.state) && r.next_due && new Date(r.next_due).getTime() <= Date.now());
  const { data: instrs } = await sb.from("instructors").select("id,full_name,phone"); const out: any[] = [];
  for (const r of due) {
    const { data: ref } = await sb.from("referrals").select("*").eq("id", r.referral_id).maybeSingle(); const ins = (instrs || []).find((i: any) => String(i.id) === String(r.instructor_id)) || { full_name: "your instructor", phone: "" }, stu = r.student_name || "the student";
    if (!ref || ref.is_cancelled || isBooked(ref) || ref.reply_status === "left") { await setF(sb, r.id, { state: "done", result: "settled in admin" }); continue; }
    const studentAsk = async (round: number) => {
      const t = await sendTemplate(sb, { to: r.student_phone, template: "dsq_student_checkin", lang: "en_GB", params: [first(stu), ins.full_name], buttons: ["STU_BOOKED:" + r.id, "STU_NOTYET:" + r.id, "STU_LEFT:" + r.id], instructor_id: String(r.instructor_id), referral_id: r.referral_id, student_name: stu });
      if (!t.ok) { await setF(sb, r.id, { state: "attention", result: "student message failed" }); await attention(sb, cfg, { kind: "msg_failed", title: "WhatsApp check-in to " + stu + " did not send", detail: t.error + ". Ask them by hand whether they booked.", referral_id: r.referral_id, instructor_id: r.instructor_id, student_name: stu }); return "failed"; }
      await setF(sb, r.id, { state: "asked_student", round, student_asked_at: new Date().toISOString(), next_due: new Date(Date.now() + f.instructorAfterDays * 864e5).toISOString() }); return "asked student";
    };
    if (r.state === "waiting_accept") { await setF(sb, r.id, { state: "attention", result: "no accept" }); await attention(sb, cfg, { kind: "no_accept", title: `Attention: ${ins.full_name} has not accepted ${stu}`, detail: `They were assigned ${f.acceptWaitHours} hours ago and haven't tapped Accept, so the student hasn't been welcomed. Chase them or reassign.`, referral_id: r.referral_id, instructor_id: r.instructor_id, student_name: stu }); out.push({ student: stu, step: "attention (not accepted)" }); }
    else if (r.state === "waiting_student") out.push({ student: stu, step: await studentAsk(r.round || 1) });
    else if (r.state === "asked_student") {
      const t = await sendTemplate(sb, { to: ins.phone, template: "dsq_instructor_checkin", lang: "en_GB", params: [first(ins.full_name), stu], buttons: ["INS_BOOKED:" + r.id, "INS_NOTYET:" + r.id, "INS_LEFT:" + r.id], instructor_id: String(r.instructor_id), referral_id: r.referral_id, student_name: stu });
      if (!t.ok) { await setF(sb, r.id, { state: "attention", result: "instructor message failed" }); await attention(sb, cfg, { kind: "msg_failed", title: "WhatsApp check-in to " + ins.full_name + " did not send", detail: t.error + `. Ask them whether ${stu} booked.`, referral_id: r.referral_id, instructor_id: r.instructor_id, student_name: stu }); out.push({ student: stu, step: "failed" }); continue; }
      await setF(sb, r.id, { state: "asked_instructor", next_due: new Date(Math.max(Date.now() + 3600e3, new Date(r.student_asked_at || Date.now()).getTime() + f.repeatDays * 864e5)).toISOString() }); out.push({ student: stu, step: "asked instructor" });
    } else if (r.state === "asked_instructor") {
      const round = (r.round || 1) + 1;
      if (round > f.rounds) { await setF(sb, r.id, { state: "attention", result: "no confirmation" }); await attention(sb, cfg, { kind: "no_confirm", title: `Attention: nobody has confirmed whether ${stu} booked`, detail: `${f.rounds} rounds of check-ins to the student and ${ins.full_name} got no clear answer. Check with them directly.`, referral_id: r.referral_id, instructor_id: r.instructor_id, student_name: stu }); out.push({ student: stu, step: "attention (no confirmation)" }); }
      else out.push({ student: stu, step: "round " + round + ": " + await studentAsk(round) });
    }
  }
  return out;
}

async function webhook(sb: any, raw: string) {
  let body: any = {}; try { body = JSON.parse(raw); } catch (_) { return; }
  for (const en of body.entry || []) for (const ch of en.changes || []) {
    const v = ch.value || {};
    for (const s of v.statuses || []) { const err = s.errors && s.errors[0] && (s.errors[0].title || s.errors[0].message) || null; await sb.from("wa_log").update({ status: s.status, ...(err ? { error: err } : {}) }).eq("wa_message_id", s.id); }
    for (const m of v.messages || []) {
      const payload = (m.button && m.button.payload) || (m.interactive && m.interactive.button_reply && m.interactive.button_reply.id) || null;
      const text = (m.text && m.text.body) || (m.button && m.button.text) || (m.interactive && m.interactive.button_reply && m.interactive.button_reply.title) || "[" + m.type + "]";
      await sb.from("wa_log").insert([{ direction: "in", wa_message_id: m.id, to_phone: m.from, body: String(text).slice(0, 900), payload, status: "received", raw: m }]);
      const fm = payload && String(payload).match(/^(STU_BOOKED|STU_NOTYET|STU_LEFT|INS_BOOKED|INS_NOTYET|INS_LEFT|CONTACT_YES|CONTACT_NO):(.+)$/);
      if (fm) { await followupReply(sb, fm[1], fm[2], m.from); continue; }
      const mm = payload && String(payload).match(/^(OFFER_ACCEPT|OFFER_DECLINE|ACCEPT|DECLINE):(.+)$/);
      if (mm) { if (mm[1].startsWith("OFFER_")) await offerReply(sb, mm[1] === "OFFER_ACCEPT", mm[2], m.from); else await assignedReply(sb, mm[1], mm[2], m.from); continue; }
      // plain "yes" / "no" typed by an instructor who has an offer waiting
      const t = norm(text); const isYes = YES.includes(t), isNo = NO.includes(t);
      if (isYes || isNo) { const ins = await instructorByPhone(sb, m.from); if (ins) { const { data: jobs } = await sb.from("auto_assign_jobs").select("*").eq("instructor_id", String(ins.id)).eq("state", "pending_accept"); const j = (jobs || []).sort((a: any, b: any) => String(b.updated_at).localeCompare(String(a.updated_at)))[0]; if (j) await offerReply(sb, isYes, j.id, m.from); } }
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url), sb = createClient(SUPABASE_URL, SERVICE_KEY);
  if (req.method === "GET" && url.searchParams.get("hub.mode") === "subscribe") {
    if (VERIFY && url.searchParams.get("hub.verify_token") === VERIFY) return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
    return new Response("Forbidden", { status: 403 });
  }
  const sig = req.headers.get("x-hub-signature-256");
  if (req.method === "POST" && sig) {
    const raw = await req.text();
    if (!APP_SECRET || !safeEqual(sig, "sha256=" + await hmacHex(APP_SECRET, raw))) return new Response("Bad signature", { status: 401 });
    try { await webhook(sb, raw); } catch (e) { console.error("webhook", e); }
    return new Response("ok", { status: 200 });
  }
  const key = req.headers.get("x-admin-key") || "";
  if (!ADMIN_KEY || !safeEqual(key, ADMIN_KEY)) return json({ ok: false, error: "Wrong or missing admin key" }, 401);
  let b: any = {}; try { b = await req.json(); } catch { return json({ ok: false, error: "Bad JSON" }, 400); }
  try {
    if (b.action === "status") {
      const have = { token: !!TOKEN, phone_id: !!PHONE_ID, verify_token: !!VERIFY, app_secret: !!APP_SECRET }; let phone = null, err = null;
      if (TOKEN && PHONE_ID) { const r = await graph("/" + PHONE_ID + "?fields=display_phone_number,verified_name,quality_rating"); if (r.ok) phone = r.j; else err = (r.j && r.j.error && r.j.error.message) || "Meta rejected the token"; }
      return json({ ok: true, configured: have, ready: have.token && have.phone_id, webhook_ready: have.verify_token && have.app_secret, phone, error: err });
    }
    if (b.action === "send_template") return json(await sendTemplate(sb, b));
    if (b.action === "test") return json(await sendTemplate(sb, { to: b.to, template: "hello_world", lang: "en_US", params: [] }));
    if (b.action === "auto_assign") return json(await autoAssign(sb, b));
  } catch (e) { return json({ ok: false, error: String((e && e.message) || e) }, 500); }
  return json({ ok: false, error: "Unknown action" }, 400);
});
