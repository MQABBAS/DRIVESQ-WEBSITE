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
/* minutes between two moments that fall INSIDE the waking window [h0, h1) UK time: the reply timers only run while instructors are awake */
function activeMinutes(fromMs: number, toMs: number, h0: number, h1: number) {
  if (h0 <= 0 && h1 >= 24) return Math.max(0, Math.min(toMs - fromMs, 96 * 3600000) / 60000);   // 24/7: every minute counts (and no slow clock loop)
  let m = 0; const step = 5 * 60000, end = Math.min(toMs, fromMs + 96 * 3600000);
  for (let t = fromMs; t < end; t += step) { const h = +new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, hour: "2-digit", hour12: false }).format(new Date(t)) % 24; if (h >= h0 && h < h1) m += Math.min(5, (end - t) / 60000); }
  return m;
}
(globalThis as any).__waTest = { activeMinutes };
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
  autoMiles: 0,                    // at or under this many miles: assign straight away without asking (0 = everyone is offered first)
  confirmMiles: 8,                 // the limit: up to this many miles the instructor is asked to accept first. Over it: attention required
  dailyLimit: 2,                   // soft limit: students assigned to an instructor today. Over it they are asked LAST
  weeklyLimit: 4,                  // soft limit: students confirmed booked this week (Mon-Sun). Over it they are asked LAST
  unpaidLimit: 2,                  // soft limit (referral instructors): booked students whose referral fee is not yet paid. At this many they are asked LAST and you are told to send the balance. 0 = off
  franchiseMin: 3,                 // franchise instructors should get at least this many students CONFIRMED BOOKED each week (Mon-Sun). Until they do they are offered the next student first (if within the distance limit). 0 = off. A package's own minimum replaces it
  priorityMiles: 3,                // each priority step (set per instructor: Top / High / Equal / Low / Last) counts as this many miles closer / further when choosing. Everyone is Equal by default
  shortfallMiles: 2,               // among instructors owed jobs, each job still missing this week counts as this many miles closer
  fairnessMiles: 0.5,              // fairness: for every day an instructor has gone WITHOUT a student they count this many miles closer (so nobody is left out). 0 = off
  fairnessAfterDays: 2,            // ... starting after this many idle days
  fairnessCap: 4,                  // ... and never more than this many miles of help
  droughtDays: 7,                  // tell the admin when an approved instructor has had no student for this many days (and why). 0 = off
  femaleRule: "require",           // when the booking asks for a female instructor: "require" (only female instructors) or "prefer"
  anytime: true,                  // instructors (and students) are messaged straight away, day or night. Untick in the settings to use the hours below instead
  hours: [8, 20],                  // offers go out only between these UK hours, and the reply timers (35 / 60 min) PAUSE outside them, so nobody misses out while asleep
  ackHours: [7, 23],               // the "we have your booking" WhatsApp to the student can go out between these UK hours
  replyMinutes: 60,                // how long an instructor has to accept an offer before it goes to the next instructor
  autoAssignAfterMinutes: 35,      // no reply after this long AND the instructor's covered postcodes include the student's area: assign anyway (they are probably in a lesson). 0 = off
  concurrency: 5,                  // how many bookings are worked on AT THE SAME TIME (each one is looked up, ranked and messaged independently)
  maxPerDay: 40,                   // safety: never start more than this many new bookings in one UK day (a runaway or a spam wave stops here and tells you)
  maxPerDay: 40,                   // safety: never start more than this many new bookings in one UK day. A runaway or a spam wave stops here and tells you (0 = no cap)
  maxPerRun: 10,                    // at most this many new bookings are started in one run (every 2 minutes), so a rush never floods the instructors
  retries: 2,                      // after a "can't take" or no reply, try this many other instructors before asking you
  maxPerWeek: 0,                   // (old hard cap, off) 0 = none
  messageInstructor: true, messageStudent: true,
  ackStudent: false, ackSince: "",   // WhatsApp the student as soon as a website booking arrives ("we have passed your details to an instructor")
  adminPhone: "", adminAlerts: true,
  refFee: 25,                      // referral fee recorded for referral-model instructors (franchise = 0)
  followups: { enabled: true, acceptWaitHours: 24, checkinDays: 3, instructorAfterDays: 0, repeatDays: 4, rounds: 4, maxPerWeek: 2 },   // 3 days after they accept, the student AND the instructor are asked at the same moment. After that every 4 days, at most 2 check-in messages a week to each person
};
async function loadCfg(sb: any) {
  const { data } = await sb.from("growth_settings").select("value").eq("key", "auto_assign_cfg").maybeSingle();
  const v = (data && data.value) || {};
  const c = { ...DEFAULT_CFG, ...v, followups: { ...DEFAULT_CFG.followups, ...(v.followups || {}) } };
  if (c.anytime) { c.hours = [0, 24]; c.ackHours = [0, 24]; }   // 24/7: no quiet hours, and the reply timers run round the clock
  return c;
}

/* run async jobs with at most n at the same time; one failing never stops the others */
async function pool(tasks: any[], n: number) {
  const q = tasks.slice(), size = Math.max(1, Math.min(10, Math.round(n) || 1));
  await Promise.all(Array.from({ length: Math.min(size, q.length) }, async () => { while (q.length) { const t = q.shift(); try { await t(); } catch (e) { console.error("task", e); } } }));
}

/* ---------- attention required ---------- */
async function attention(sb: any, cfg: any, a: any) {
  const { data: ex } = await sb.from("admin_attention").select("*").eq("waiting_id", a.waiting_id || "").eq("kind", a.kind).eq("resolved", false).maybeSingle();
  if (ex && a.waiting_id) { await sb.from("admin_attention").update({ detail: a.detail, updated_at: new Date().toISOString() }).eq("id", ex.id); return ex.id; }
  const row = { kind: a.kind, title: a.title, detail: a.detail || "", waiting_id: a.waiting_id || null, referral_id: a.referral_id || null, instructor_id: a.instructor_id || null, student_name: a.student_name || null, resolved: false };
  const { data } = await sb.from("admin_attention").insert([row]).select().single();
  try { await sb.from("admin_activity_log").insert([{ area: "auto_assign", action: "attention_" + a.kind, summary: "⚠️ " + a.title + (a.detail ? " — " + a.detail : ""), actor_role: "system", actor_name: "Auto-assign", instructor_id: a.instructor_id || null, student_name: a.student_name || null, ref_id: a.referral_id || null }]); } catch (_) { /* best effort */ }
  if (cfg.adminAlerts && cfg.adminPhone && !a.quiet) { try { await sendTemplate(sb, { to: cfg.adminPhone, template: "dsq_admin_attention", lang: "en_GB", params: [a.title, a.detail || "Open admin to see it."] }); } catch (_) { /* best effort */ } }
  return data && data.id;
}

/* ---------- locations + distance ---------- */
const geoCache = new Map();
async function geocode(pc: string) {
  const c = String(pc || "").replace(/\s+/g, "").toUpperCase(); if (!c) return null; if (geoCache.has(c)) return geoCache.get(c);
  let g = null, netFail = false;
  try {
    let r = await fetch("https://api.postcodes.io/postcodes/" + encodeURIComponent(c), { signal: AbortSignal.timeout(5000) }); let j = await r.json().catch(() => ({})); if (r.status >= 500) netFail = true;
    if (j && j.result) g = { lat: j.result.latitude, lon: j.result.longitude, exact: true };
    else { const oc = c.replace(/\d[A-Z]{2}$/, ""); r = await fetch("https://api.postcodes.io/outcodes/" + encodeURIComponent(oc), { signal: AbortSignal.timeout(5000) }); j = await r.json().catch(() => ({})); if (r.status >= 500) netFail = true; if (j && j.result) g = { lat: j.result.latitude, lon: j.result.longitude, exact: false }; }
  } catch (_) { netFail = true; }
  if (g || !netFail) geoCache.set(c, g);   // a network hiccup is not remembered, so the next run tries again
  if (!g && netFail) return { error: "lookup" } as any;
  return g;
}
function haversine(a1: number, o1: number, a2: number, o2: number) {
  const R = 3958.8, d = (x: number) => x * Math.PI / 180, dA = d(a2 - a1), dO = d(o2 - o1);
  const a = Math.sin(dA / 2) ** 2 + Math.cos(d(a1)) * Math.cos(d(a2)) * Math.sin(dO / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const drvCache = new Map();
async function drivingMiles(sLat: number, sLon: number, iLat: number, iLon: number) {
  const ck = [sLat, sLon, iLat, iLon].map((x) => x.toFixed(4)).join(","); if (drvCache.has(ck)) return drvCache.get(ck);
  try { const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${sLon},${sLat};${iLon},${iLat}?overview=false`, { signal: AbortSignal.timeout(3500) }); const j = await r.json(); if (j.routes && j.routes[0]) { const m = j.routes[0].distance / 1609.34; drvCache.set(ck, m); return m; } } catch (_) { /* fall back */ }
  return haversine(sLat, sLon, iLat, iLon);
}
const extractPc = (s: string) => { const m = String(s || "").toUpperCase().match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/); return m ? m[0] : ""; };
function instrPc(i: any) {
  const own = String(i.postcode || "").trim(); if (own) return own;
  const full = extractPc(i.area) || extractPc(i.address); if (full) return full;
  const oc = String(i.area || "").toUpperCase().match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\b/); if (oc) return oc[0];
  const cov = String(i.coverage_postcodes || "").toUpperCase().match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\b/); return cov ? cov[0] : "";
}
/* "coverage stated in admin": the instructor's Covered Postcodes include the student's postcode area (e.g. M14) */
const covers = (i: any, pc: string) => { const oc = outward(pc); return !!oc && String(i.coverage_postcodes || "").toUpperCase().split(/[\s,;/]+/).filter(Boolean).some((c: string) => c === oc || outward(c) === oc); };
const canTeach = (t: string, req: string) => t === "Both" || (req === "Automatic" ? t === "Automatic" : t !== "Automatic");

/* line written into the booking when the student says a male instructor is fine */
const MALE_OK = "✅ Student agreed to a male instructor";

/* does this booking need a FEMALE instructor? "female only" does (unless you set the rule to "anyone allowed"), and so does "female preferred": the website promises
   to tell the student before booking a man, so a male instructor is only used after the student agrees */
const needFemale = (cfg: any, b: any) => (b.female === "require" && cfg.femaleRule === "require") || b.female === "prefer";

/* ---------- reading a website booking ---------- */
function readBooking(w: any) {
  const n = String(w.notes || ""), pick = (re: RegExp) => { const m = n.match(re); return m ? m[1].trim() : ""; };
  const pc = fmtPc(w.postcode || pick(/(?:^|\n)\s*Postcode:\s*([^\n]+)/i));
  const gear = pick(/(?:^|\n)\s*(?:Gearbox|Transmission):\s*([^\n]+)/i) || pick(/(?:^|\n)\s*Service:\s*([^\n]+)/i);
  let type = w.lesson_type || (/auto/i.test(gear) ? "Automatic" : "Manual"); if (/auto/i.test(gear)) type = "Automatic"; else if (/manual/i.test(gear) && !/^(Intensive|Mock Test)$/.test(type)) type = "Manual";
  const agreedMale = n.includes(MALE_OK), softWords = /FEMALE PREFERRED|prefer[a-z]*\s+(?:a\s+)?female|female[^.\n]{0,30}(?:prefer|if possible|if you can)/i.test(n);   // "I'd prefer a female instructor if possible" is a preference, not a requirement
  const femalePref = !agreedMale && softWords && !/FEMALE INSTRUCTOR REQUESTED/i.test(n), femaleStrict = !agreedMale && !femalePref && (/FEMALE INSTRUCTOR REQUESTED/i.test(n) || /female instructor/i.test(n));
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
const londonYMD = (t: number) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(t)).map((x) => [x.type, x.value])); return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute }; };
/* the instant it is 00:00 in London on y-m-d (right on the days the clocks change too, when the day is 23 or 25 hours long) */
function londonMidnight(y: number, m: number, d: number) {
  for (const c of [Date.UTC(y, m - 1, d), Date.UTC(y, m - 1, d) - 3600e3]) { const p = londonYMD(c); const want = new Date(Date.UTC(y, m - 1, d)); if (p.h === 0 && p.mi === 0 && p.d === want.getUTCDate() && p.m === want.getUTCMonth() + 1) return c; }
  return Date.UTC(y, m - 1, d);
}
function londonMidnightToday() { const p = londonYMD(Date.now()); return londonMidnight(p.y, p.m, p.d); }
/* Monday 00:00 UK time (a Date) */
function mondayLondon() {
  const p = londonYMD(Date.now()), dow = Math.max(0, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, weekday: "short" }).format(new Date())));
  const mon = new Date(Date.UTC(p.y, p.m - 1, p.d - dow)); return new Date(londonMidnight(mon.getUTCFullYear(), mon.getUTCMonth() + 1, mon.getUTCDate()));
}
(globalThis as any).__waTest = { ...((globalThis as any).__waTest || {}), mondayLondon, londonMidnightToday };

/* same package tiers as admin-packages.js (used when the admin has not edited them) */
const PKG_TIERS: any = { normal: { noGuarantee: true, min: 0 }, silver: { min: 3 }, gold: { min: 5 }, platinum: { min: 7, priority: true, radius: 5 } };
/* what this instructor is owed this week: { started, min, radius } . A package's minimum counts; franchise instructors without one use cfg.franchiseMin. Not started yet = no jobs at all */
function entitlement(i: any, cd: any, cfg: any) {
  const id = String(i.id), p = (cd.packages || {})[id], t = p && p.tier && p.active !== false ? (cd.tiers || {})[p.tier] : null, todayStr = new Date().toISOString().slice(0, 10);
  const start = (cd.frStart || {})[id] || (p && p.start) || "";
  if (start && start > todayStr) return { started: false, min: 0, start, radius: cfg.confirmMiles, why: "starts " + start };
  let min = 0, radius = cfg.confirmMiles, src = "";
  if (t && !t.noGuarantee) { min = p.min != null && p.min !== "" ? +p.min : (t.min || 0); radius = Math.min(cfg.confirmMiles, t.radius || cfg.confirmMiles); src = (t.name || p.tier) + " package"; }
  else if ((!t || t.noGuarantee) && String(i.instructor_model || "").toLowerCase() === "franchise" && cfg.franchiseMin > 0) { min = cfg.franchiseMin; src = "franchise minimum"; }   // a franchise instructor with no package, or on Normal (no guarantee), is still offered students first until they have the franchise minimum
  return { started: true, min, radius, src };
}
/* days since this instructor was last given a student (no student in the last 90 days = 90). A new instructor counts from their start date */
function idleDays(i: any, st: any, ent: any) {
  const base = st && st.last ? st.last : (ent && ent.start ? new Date(ent.start + "T00:00:00").getTime() : Date.now() - 90 * 864e5);
  return Math.max(0, (Date.now() - base) / 864e5);
}
async function candidateData(sb: any) {
  const { data: instrs } = await sb.from("instructors").select("*").eq("status", "approved");
  const since90 = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data: refs } = await sb.from("referrals").select("*").gte("created_at", since90);
  const { data: tr } = await sb.from("growth_settings").select("value").eq("key", "instructor_traits").maybeSingle();
  const { data: pk } = await sb.from("growth_settings").select("value").eq("key", "packages").maybeSingle();
  const traits = (tr && tr.value) || {}, packages = (pk && pk.value && pk.value.by) || {}, mon = mondayLondon().getTime();
  const tiers = { ...PKG_TIERS, ...((pk && pk.value && pk.value.tiers) || {}) }, frStart = (pk && pk.value && pk.value.frStart) || {};
  const stats: any = {}, midnight = londonMidnightToday();
  (refs || []).forEach((r: any) => {
    if (r.is_cancelled || r.is_credit) return; const s = stats[r.instructor_id] = stats[r.instructor_id] || { week: 0, today: 0, bookedWeek: 0, total: 0, booked: 0, unmarked: 0 };
    { const ca = new Date(r.created_at).getTime(); if (!s.last || ca > s.last) s.last = ca; }
    if (new Date(r.created_at).getTime() >= mon) s.week++;
    if (new Date(r.created_at).getTime() >= midnight) s.today++;
    if (isBooked(r) && bookedAt(r) >= mon) s.bookedWeek++;
    const age = (Date.now() - new Date(r.created_at).getTime()) / 864e5; if (age < 7) return;
    s.total++; if (isBooked(r)) s.booked++; else if (!r.flag_color && !r.reply_status && !r.is_paid && age >= 3) s.unmarked++;
  });
  // booked students whose referral fee is not paid yet (all time, not just 90 days)
  const { data: unpaid } = await sb.from("referrals").select("*").eq("is_paid", false);
  (unpaid || []).forEach((r: any) => {
    if (r.is_cancelled || r.is_credit || !isBooked(r)) return; const s = stats[r.instructor_id] = stats[r.instructor_id] || { week: 0, today: 0, bookedWeek: 0, total: 0, booked: 0, unmarked: 0 };
    s.unpaidBooked = (s.unpaidBooked || 0) + 1; s.unpaidAmount = (s.unpaidAmount || 0) + (parseFloat(r.amount) || 0);
  });
  // an offer waiting for a reply already counts as a student for that instructor (it becomes a real referral when they accept), so nobody is flooded with offers
  const { data: pend } = await sb.from("auto_assign_jobs").select("instructor_id,state").eq("state", "pending_accept");
  (pend || []).forEach((j: any) => { if (!j.instructor_id) return; const s = stats[j.instructor_id] = stats[j.instructor_id] || { week: 0, today: 0, bookedWeek: 0, total: 0, booked: 0, unmarked: 0 }; s.today++; s.week++; s.pending = (s.pending || 0) + 1; });
  return { instrs: instrs || [], stats, traits, packages, tiers, frStart, refs: refs || [] };
}


/* a short WhatsApp to the student as soon as a WEBSITE booking is seen (the booking may then wait for you or an instructor) */
async function sendAcks(sb: any, cfg: any) {
  if (!cfg.ackStudent || !TOKEN || !PHONE_ID) return [];
  const since = cfg.ackSince ? new Date(cfg.ackSince).getTime() : Date.now(), MARK = "📱 WhatsApp booking acknowledgement sent", out: any[] = [];
  const { data: waiting } = await sb.from("waiting_list").select("*").eq("status", "waiting").order("created_at", { ascending: true });
  for (const w of (waiting || []).slice(0, 60)) {
    if (new Date(w.created_at).getTime() < since || !/\[WEB\]/i.test(w.notes || "") || String(w.notes || "").includes(MARK) || String(w.notes || "").includes("📱 WhatsApp booking acknowledgement failed")) continue;
    const b = readBooking(w); if (!waNumber(b.phone)) continue;
    const hAck = londonHour(), awake = hAck >= cfg.hours[0] && hAck < cfg.hours[1];   // outside instructor hours the student is told it will be passed on in the morning
    const r = await sendTemplate(sb, { to: b.phone, template: awake ? "dsq_booking_received" : "dsq_booking_received_later", lang: "en_GB", params: [first(b.name)], student_name: b.name });
    const line = r.ok ? `${today()} · ${MARK}` : `${today()} · 📱 WhatsApp booking acknowledgement failed: ${r.error}`;
    await sb.from("waiting_list").update({ notes: [w.notes || "", line].filter(Boolean).join("\n") }).eq("id", w.id);
    if (!r.ok) await attention(sb, cfg, { kind: "msg_failed", title: "WhatsApp to " + b.name + " did not send", detail: `The booking acknowledgement failed: ${r.error}. They have not been told we received their booking.`, waiting_id: "ack-" + w.id, student_name: b.name });
    out.push({ student: b.name, sent: r.ok });
  }
  return out;
}

/* referral instructors with too many booked-but-unpaid students: tell the admin once (the item clears itself when the fees are marked paid) */
async function checkUnpaid(sb: any, cfg: any, cd: any) {
  if (!(cfg.unpaidLimit > 0)) return [];
  const out: any[] = [];
  for (const i of cd.instrs) {
    if (String(i.instructor_model || "").toLowerCase() !== "referral") continue;
    const st = cd.stats[i.id] || {}, n = st.unpaidBooked || 0, amt = Math.round((st.unpaidAmount || 0) * 100) / 100, key = "unpaid-" + i.id;
    if (n >= cfg.unpaidLimit) {
      await attention(sb, cfg, { kind: "unpaid_fees", title: `${i.full_name} has ${n} booked students not paid for (£${amt})`, detail: `New students go to other instructors first until these are marked paid. Send them a statement, or just the balance: £${amt}.`, waiting_id: key, instructor_id: String(i.id) });
      out.push({ instructor: i.full_name, unpaid: n, amount: amt });
    } else {
      await sb.from("admin_attention").update({ resolved: true, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("waiting_id", key).eq("resolved", false);
    }
  }
  return out;
}

/* an approved instructor with no student for droughtDays: tell the admin once and say why (clears itself when they are given one) */
async function checkDrought(sb: any, cfg: any, cd: any) {
  if (!(cfg.droughtDays > 0)) return [];
  const out: any[] = [];
  for (const i of cd.instrs) {
    const key = "drought-" + i.id, tr = cd.traits[i.id] || {}, ent = entitlement(i, cd, cfg), st = cd.stats[i.id] || {}, idl = Math.round(idleDays(i, st, ent));
    if (!ent.started || idl < cfg.droughtDays) { await sb.from("admin_attention").update({ resolved: true, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("waiting_id", key).eq("resolved", false); continue; }
    const why: string[] = [];
    if (tr.noAuto) why.push("marked Never auto-assign");
    if (!instrPc(i)) why.push("no postcode or area on their profile");
    if (!String(i.coverage_postcodes || "").trim()) why.push("no covered postcodes");
    if (!waNumber(i.phone)) why.push("no valid mobile number");
    if (+tr.priority < 0) why.push("priority is set to " + (tr.priority <= -2 ? "Last" : "Low"));
    if (!why.length) why.push("no website booking has been close enough lately (or they are over a limit)");
    await attention(sb, cfg, { kind: "no_jobs", title: `${i.full_name} has had no student for ${idl >= 90 ? "90+" : idl} days`, detail: `Possible reasons: ${why.join("; ")}. Consider a Top priority, or give them a student by hand.`, waiting_id: key, instructor_id: String(i.id), quiet: true });   // listed in Attention, no WhatsApp ping
    out.push({ instructor: i.full_name, idle: idl });
  }
  return out;
}

/* rank the instructors for one booking. exclude = ids already asked */
async function rank(sb: any, cfg: any, b: any, cd: any, exclude: string[], reserve = false) {
  const out: any[] = [];
  const sg = await geocode(b.postcode); if (sg && sg.error) return { error: "The postcode service did not answer just now", transient: true, list: [] }; if (!sg) return { error: 'Postcode "' + b.postcode + '" was not found', list: [] };
  const rows: any[] = [], skipped: any[] = [], skip = (i: any, why: string) => skipped.push({ id: i.id, name: i.full_name, why });   // who was left out, and why (shown in the simulator)
  for (const i of cd.instrs) {
    const tr = cd.traits[i.id] || {};
    if (exclude.includes(String(i.id))) continue;
    if (tr.noAuto) { skip(i, "marked Never auto-assign"); continue; }
    if (!canTeach(i.car_type || "Manual", b.type)) { skip(i, "does not teach " + b.type.toLowerCase() + " lessons"); continue; }
    if (needFemale(cfg, b) && !tr.female) { skip(i, "the booking asks for a female instructor"); continue; }
    const st = cd.stats[i.id] || { week: 0, today: 0, bookedWeek: 0, total: 0, booked: 0, unmarked: 0 }; if (cfg.maxPerWeek > 0 && st.week >= cfg.maxPerWeek) { skip(i, "reached the hard cap of " + cfg.maxPerWeek + " new students this week"); continue; }
    const ent = entitlement(i, cd, cfg); if (!ent.started) { skip(i, "package / franchise " + (ent.why || "has not started yet")); continue; }   // no jobs before the start date
    const pc = instrPc(i); if (!pc) { skip(i, "no postcode or area on their profile"); continue; }
    rows.push({ i, tr, st, ent, pc });
  }
  await Promise.all(rows.map(async (r) => { r.g = await geocode(r.pc); }));   // all instructors' locations at once (cached after the first time)
  for (let k = rows.length - 1; k >= 0; k--) { const r = rows[k]; if (!r.g || r.g.error) { skip(r.i, "their postcode " + r.pc + " could not be found"); rows.splice(k, 1); } else r.crow = haversine(sg.lat, sg.lon, r.g.lat, r.g.lon); }
  rows.sort((a, c) => a.crow - c.crow);
  await Promise.all(rows.slice(0, 8).map(async (r) => { r.dist = await drivingMiles(sg.lat, sg.lon, r.g.lat, r.g.lon); }));   // the 8 nearest road distances at once
  for (const r of rows.slice(8)) r.dist = r.crow * 1.3;
  for (const r of rows) {
    r.st = cd.stats[r.i.id] || r.st;   // the live numbers (other bookings being handled at the same moment may have just reserved this instructor)
    const over: string[] = [];
    // owed a minimum this week and not there yet (and not already holding plenty of unconfirmed students): offered first, even past the daily limit
    const short = Math.max(0, (r.ent.min || 0) - r.st.bookedWeek), owed = short > 0 && r.dist <= r.ent.radius && r.st.week < (r.ent.min || 0) + 2;
    const idl = idleDays(r.i, r.st, r.ent), fb = cfg.fairnessMiles > 0 && idl >= (cfg.fairnessAfterDays || 0) ? Math.min(cfg.fairnessCap || 0, Math.round(idl * cfg.fairnessMiles * 10) / 10) : 0;
    if (!owed && cfg.dailyLimit > 0 && r.st.today >= cfg.dailyLimit) over.push(`already given ${r.st.today} today`);
    if (cfg.weeklyLimit > 0 && r.st.bookedWeek >= cfg.weeklyLimit) over.push(`already ${r.st.bookedWeek} booked this week`);
    if (cfg.unpaidLimit > 0 && String(r.i.instructor_model || "").toLowerCase() === "referral" && (r.st.unpaidBooked || 0) >= cfg.unpaidLimit) over.push(`${r.st.unpaidBooked} booked students not paid yet (£${Math.round(r.st.unpaidAmount || 0)})`);
    out.push({ id: r.i.id, name: r.i.full_name, phone: r.i.phone, model: String(r.i.instructor_model || "").toLowerCase(), dist: Math.round(r.dist * 10) / 10, score: 0, tier: over.length ? 1 : 0, over, owed, short, min: r.ent.min || 0, prio: Math.max(-2, Math.min(2, +r.tr.priority || 0)), idle: Math.round(idleDays(r.i, r.st, r.ent)), boost: fb, eff: Math.round((r.dist - (Math.max(-2, Math.min(2, +r.tr.priority || 0))) * (cfg.priorityMiles || 0) - (owed ? short * (cfg.shortfallMiles || 0) : 0) - fb) * 10) / 10, today: r.st.today, bookedWeek: r.st.bookedWeek, week: r.st.week, female: !!r.tr.female, rate: r.st.total >= 5 ? Math.round(r.st.booked / r.st.total * 100) : null, instr: r.i });
  }
  // the closest instructor first, but anyone over a soft limit is asked LAST (still closest first inside each group)
  // order: (1) not over a soft limit, (2) owed their weekly minimum, (3) closest after priority / shortfall adjustments
  out.sort((a, c) => (a.tier - c.tier) || (b.female ? (a.female ? 0 : 1) - (c.female ? 0 : 1) : 0) || ((a.owed ? 0 : 1) - (c.owed ? 0 : 1)) || (a.eff - c.eff) || (a.dist - c.dist));   // asked for a woman but men allowed by your rule: women first
  const near = out.filter((x) => x.dist <= cfg.confirmMiles);
  // when several bookings are handled at the same time, the chosen instructor is reserved at once (no await in between), so the next booking sees them as already busier
  if (reserve && near[0] && cd.stats) { const sx = cd.stats[near[0].id] = cd.stats[near[0].id] || { week: 0, today: 0, bookedWeek: 0, total: 0, booked: 0, unmarked: 0 }; sx.today++; sx.week++; sx.last = Date.now(); }
  const closest = near.slice().sort((a, c) => a.dist - c.dist)[0];
  if (near[0]) {
    const bestFair = near[0].boost > 0 && !near[0].owed && closest && closest.id !== near[0].id && !closest.over.length;
    const best = near[0], pn = ["Last", "Low", "Equal", "High", "Top"][best.prio + 2];
    best.why = best.owed ? `${best.name} has ${best.bookedWeek} of ${best.min} confirmed booked this week, so is offered first` : closest && closest.id !== best.id ? (closest.over.length ? `${closest.name} is closer (${closest.dist} mi) but ${closest.over.join(" and ")}, so asked after others` : (bestFair && !best.prio ? `${best.name} (${best.dist} mi) has had no student for ${best.idle} days, so is ahead of ${closest.name} (${closest.dist} mi)` : `${best.name} (${best.dist} mi) is ahead of ${closest.name} (${closest.dist} mi) because of priority ${pn}`)) : best.tier === 1 ? `everyone close by is over a limit (${best.over.join(" and ")}), so the closest gets it` : (best.prio ? `closest instructor (priority ${pn})` : "closest instructor");
  }
  return { list: out, geo: sg, skipped };
}

/* ---------- assigning a student to an instructor (same records as Find & Assign) ---------- */
/* the student's welcome. Only sent once (a marker line in the referral notes stops a second one) and only if the student messages are switched on */
async function welcomeStudent(sb: any, cfg: any, ref: any, c: any, waitingId?: any) {
  if (!cfg.messageStudent || !ref.student_phone) return "";
  const { data: wc } = await sb.from("growth_settings").select("value").eq("key", "whatsapp_cfg").maybeSingle(); if (wc && wc.value && wc.value.student === false) return "";
  const { data: cur } = await sb.from("referrals").select("admin_notes").eq("id", ref.id).maybeSingle(); if (String((cur && cur.admin_notes) || ref.notes || "").includes("💬 Student welcomed")) return "";
  const iw = waNumber(c.phone), link = iw ? "https://wa.me/" + iw : "their phone number above";   // a tappable WhatsApp link to the instructor
  const r2 = await sendTemplate(sb, { to: ref.student_phone, template: "dsq_student_welcome_2", lang: "en_GB", params: [first(ref.student_name), c.name, fmtPhone(c.phone) || "their phone", link], instructor_id: c.id, referral_id: ref.id, student_name: ref.student_name });
  if (r2.ok) {
    const n = String((cur && cur.admin_notes) || ""), lines = [`${today()} · 💬 Student welcomed on WhatsApp (after ${c.name} agreed)`];
    // right after the welcome: the terms & conditions link and the key rules (once per student)
    if (!n.includes("📄 Terms")) {
      const rt = await sendTemplate(sb, { to: ref.student_phone, template: "dsq_student_terms", lang: "en_GB", params: [first(ref.student_name)], instructor_id: c.id, referral_id: ref.id, student_name: ref.student_name });
      lines.push(rt.ok ? `${today()} · 📄 Terms & conditions link sent on WhatsApp` : `${today()} · 📄 Terms message could not be sent (${rt.error}). Send them the link: https://www.drivesq.co.uk/terms.html`);
      if (!rt.ok) await attention(sb, cfg, { kind: "msg_failed", title: "Terms link did not send to " + (ref.student_name || "the student"), detail: `${rt.error}. Send them https://www.drivesq.co.uk/terms.html yourself (instructor page: Send terms button).`, waiting_id: String(waitingId || ref.id) + "-terms", referral_id: ref.id, instructor_id: c.id, student_name: ref.student_name, quiet: true });
    }
    await sb.from("referrals").update({ admin_notes: [n, ...lines].filter(Boolean).join("\n") }).eq("id", ref.id); return "student welcomed";
  }
  await attention(sb, cfg, { kind: "msg_failed", title: "WhatsApp to " + (ref.student_name || "the student") + " did not send", detail: `${c.name} agreed, but the welcome failed: ${r2.error}. Message the student by hand.`, waiting_id: String(waitingId || ref.id) + "-stu", referral_id: ref.id, instructor_id: c.id, student_name: ref.student_name });
  return "student message failed: " + r2.error;
}
async function assign(sb: any, cfg: any, b: any, c: any, agreed = false, via = "") {
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
  const { data: ref, error: rerr } = await sb.from("referrals").insert([{ instructor_id: c.id, student_name: b.name, student_phone: b.phone || null, amount, is_paid: false, paid_at: null, is_cancelled: false, is_credit: false, credit_fulfilled: false, notes: ["Auto-assigned (website booking)", b.postcode ? "Postcode: " + b.postcode : "", pickup ? "Address: " + pickup : "", b.avail ? "Availability: " + b.avail : "", b.ref ? "Ref: " + b.ref : ""].filter(Boolean).join("\n"), admin_notes: `${today()} · 🤖 Auto-assigned to ${c.name} (${c.dist} miles)${via ? " — " + via : ""}`, created_at: now }]).select().single();
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
  const offeredAt = new Date().toISOString();   // (stored in expires_at: when the offer was sent; the timers count waking hours from here)
  await sb.from("auto_assign_jobs").update({ state: "pending_accept", instructor_id: c.id, attempt, tried, expires_at: offeredAt, dist: c.dist, updated_at: new Date().toISOString() }).eq("id", job.id);
  const r = await sendTemplate(sb, { to: c.phone, template: "dsq_student_offer", lang: "en_GB", params: [first(c.name), outward(b.postcode) || b.postcode, c.dist.toFixed(1), b.type], buttons: ["OFFER_ACCEPT:" + job.id, "OFFER_DECLINE:" + job.id], instructor_id: c.id, student_name: b.name });
  if (!r.ok) { await sb.from("auto_assign_jobs").update({ state: "attention", note: r.error }).eq("id", job.id); await attention(sb, cfg, { kind: "msg_failed", title: "Could not message " + c.name, detail: `Offer for ${b.name} (${b.postcode}) did not send: ${r.error}`, waiting_id: String(b.id), instructor_id: c.id, student_name: b.name }); return "offer failed"; }
  const { data: wl } = await sb.from("waiting_list").select("notes").eq("id", b.id).maybeSingle();
  await sb.from("waiting_list").update({ notes: [(wl && wl.notes) || "", `${today()} · 🤖 Offered to ${c.name} (${c.dist} miles), waiting for their reply`].filter(Boolean).join("\n") }).eq("id", b.id);
  return "offered";
}

/* an existing student books again: offer it to the instructor they already have, and tell the admin */
async function rebook(sb: any, cfg: any, b: any, cd: any, job: any, prev: any) {
  const i = cd.instrs.find((x: any) => String(x.id) === String(prev.instructor_id)), tr = i ? (cd.traits[i.id] || {}) : {};
  const note = `existing student (${prev.student_name || b.name} was given to ${i ? i.full_name : "an instructor"} on ${new Date(prev.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`;
  if (!i || tr.noAuto || needFemale(cfg, b) && !tr.female) {
    const why = !i ? "their instructor is no longer approved" : tr.noAuto ? "their instructor is marked Never auto-assign" : "they asked for a female instructor and their current instructor is not one";
    await sb.from("auto_assign_jobs").update({ state: "attention", note: "re-booking: " + why }).eq("id", job.id);
    await attention(sb, cfg, { kind: "rebooking", title: `Existing student booked again: ${b.name}`, detail: `${note}. It could not go back to them automatically: ${why}. Assign them by hand.`, waiting_id: String(b.id), student_name: b.name });
    return { action: "attention", reason: why };
  }
  const rk = await rank(sb, cfg, b, cd, [], false), x = (rk.list || []).find((y: any) => String(y.id) === String(i.id));
  const c = { id: i.id, name: i.full_name, phone: i.phone, model: String(i.instructor_model || "").toLowerCase(), dist: x ? x.dist : 0 };
  await attention(sb, cfg, { kind: "rebooking", title: `Existing student booked again: ${b.name}`, detail: `${note}. ${cfg.mode === "assign" ? "It has been offered back to " + i.full_name + "." : "Suggest-only mode: nothing was sent."} Check it is a new booking and not a duplicate.`, waiting_id: String(b.id), instructor_id: String(i.id), student_name: b.name, quiet: true });
  if (cfg.mode === "suggest") { await sb.from("auto_assign_jobs").update({ state: "attention", note: "would offer back to " + i.full_name + " (existing student)" }).eq("id", job.id); return { action: "suggest", instructor: i.full_name, why: "existing student" }; }
  const what = await offer(sb, cfg, b, c, job, 1, []);
  return { action: what === "offered" ? "offered" : "attention", instructor: i.full_name, why: "existing student: offered back to their instructor" };
}

/* decide what to do with one booking. job = its row in auto_assign_jobs. Returns a one-line outcome. */
async function decide(sb: any, cfg: any, b: any, cd: any, job: any, tried: string[], attempt: number, dry: boolean) {
  const rk = await rank(sb, cfg, b, cd, tried, !dry && cfg.mode === "assign");
  const near = (rk.list || []).filter((x: any) => x.dist <= cfg.confirmMiles), nearestAny = (rk.list || []).slice().sort((a: any, c: any) => a.dist - c.dist)[0];
  const top = near.slice(0, 4).map((x: any) => ({ name: x.name, dist: x.dist, today: x.today, bookedWeek: x.bookedWeek, over: x.over, female: x.female }));
  if (rk.transient) { if (!dry) await sb.from("auto_assign_jobs").delete().eq("id", job.id); return { action: "retry", reason: rk.error + ", it will try again on the next run", top }; }   // not the booking's fault: try again in 2 minutes
  if (rk.error) { if (!dry) { await sb.from("auto_assign_jobs").update({ state: "attention", note: rk.error }).eq("id", job.id); await attention(sb, cfg, { kind: "postcode", title: "Check the postcode for " + b.name, detail: rk.error + ". Fix it and assign by hand.", waiting_id: String(b.id), student_name: b.name }); } return { action: "attention", reason: rk.error, top }; }
  const best = near[0];
  const wantF = needFemale(cfg, b);
  if (!best && wantF) {   // a female instructor was required and none is available: tell the admin AND ask the student whether a male instructor is fine
    const reasonF = tried.length ? "every female instructor who could take it has been asked" : nearestAny ? `the nearest female instructor (${nearestAny.name}) is ${nearestAny.dist} miles away, over your ${cfg.confirmMiles} mile limit` : "no female instructor can take this booking";
    if (dry) return { action: "female_ask", reason: reasonF + ". The student would be asked if a male instructor is fine.", top };
    if (cfg.mode === "assign" && cfg.messageStudent && waNumber(b.phone)) {
      const r = await sendTemplate(sb, { to: b.phone, template: "dsq_female_unavailable", lang: "en_GB", params: [first(b.name)], buttons: ["FEM_YES:" + job.id, "FEM_NO:" + job.id], student_name: b.name });
      await sb.from("auto_assign_jobs").update({ state: "attention", note: "female instructor not available: " + (r.ok ? "student asked if a male instructor is fine" : "could not message the student (" + r.error + ")"), updated_at: new Date().toISOString() }).eq("id", job.id);
      const { data: wl } = await sb.from("waiting_list").select("notes").eq("id", b.id).maybeSingle();
      await sb.from("waiting_list").update({ notes: [(wl && wl.notes) || "", `${today()} · 👩 No female instructor available: ${r.ok ? "student asked on WhatsApp if a male instructor is fine" : "could not message the student"}`].filter(Boolean).join("\n") }).eq("id", b.id);
      await attention(sb, cfg, { kind: "female_unavailable", title: `No female instructor for ${b.name} (${b.postcode})`, detail: r.ok ? `${reasonF}. We've asked ${first(b.name)} on WhatsApp whether a male instructor is fine. If they say yes, the closest instructor is assigned automatically.` : `${reasonF}. The WhatsApp to the student failed (${r.error}). Ask them by hand whether a male instructor is fine.`, waiting_id: String(b.id), student_name: b.name });
      return { action: "female_ask", asked: r.ok, reason: reasonF };
    }
  }
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

/* "what would happen to a booking like THIS?" Nothing is saved or sent. Shows every instructor: who is in the running (and why in that order) and who is left out (and why). */
async function simulate(sb: any, body: any) {
  const cfg = await loadCfg(sb), pc = fmtPc(body.postcode || ""); if (!pc) return { ok: false, error: "Enter a postcode" };
  const b = { id: "sim", name: "Test student", phone: "", postcode: pc, type: /auto/i.test(body.type || "") ? "Automatic" : "Manual", female: body.female === "require" ? "require" : body.female === "prefer" ? "prefer" : "" };
  const cd = await candidateData(sb), rk = await rank(sb, cfg, b, cd, [], false);
  if (rk.error) return { ok: true, error: rk.error, list: [], skipped: [] };
  const near = rk.list.filter((x: any) => x.dist <= cfg.confirmMiles), best = near[0];
  const list = rk.list.map((x: any, k: number) => ({ name: x.name, dist: x.dist, within: x.dist <= cfg.confirmMiles, order: k + 1, owed: !!x.owed, short: x.short, min: x.min, over: x.over, prio: x.prio, idle: x.idle, boost: x.boost, eff: x.eff, bookedWeek: x.bookedWeek, today: x.today, why: x.why || "" }));
  const covered = best ? covers(cd.instrs.find((i: any) => String(i.id) === String(best.id)) || {}, pc) : false;
  return { ok: true, postcode: pc, type: b.type, female: b.female, limit: cfg.confirmMiles, mode: cfg.mode, best: best ? { name: best.name, dist: best.dist, why: best.why, direct: best.dist <= cfg.autoMiles, covered } : null, list, skipped: rk.skipped || [], nearestOver: !best && list[0] ? { name: list[0].name, dist: list[0].dist } : null };
}
/* which of OUR message templates Meta has approved. Needs the WhatsApp Business Account ID as the secret WHATSAPP_WABA_ID */
const OUR_TEMPLATES = ["dsq_student_terms", "dsq_female_unavailable", "dsq_new_student", "dsq_student_offer", "dsq_student_welcome_2", "dsq_admin_attention", "dsq_student_checkin", "dsq_instructor_checkin", "dsq_booking_received", "dsq_booking_received_later"];
async function templateStatus() {
  const waba = env("WHATSAPP_WABA_ID") || env("WHATSAPP_BUSINESS_ACCOUNT_ID") || env("WA_BUSINESS_ID");
  if (!TOKEN) return { ok: true, needToken: true, templates: [] };
  if (!waba) return { ok: true, needWaba: true, templates: [] };
  const r = await graph("/" + waba + "/message_templates?fields=name,status,language,category,rejected_reason&limit=200");
  if (!r.ok) return { ok: false, error: (r.j && r.j.error && r.j.error.message) || "Meta error " + r.status };
  const have: any[] = (r.j && r.j.data) || [];
  return { ok: true, templates: OUR_TEMPLATES.map((n) => { const m = have.filter((t: any) => t.name === n), good = m.find((t: any) => t.status === "APPROVED") || m[0]; return { name: n, status: good ? good.status : "MISSING", language: good ? good.language : "", reason: good && good.rejected_reason && good.rejected_reason !== "NONE" ? good.rejected_reason : "" }; }) };
}

async function autoAssign(sb: any, body: any) {
  const cfg = await loadCfg(sb), dry = !!body.dry, now = Date.now(), t0 = Date.now();
  if (body.cron && !dry) { try { await sb.from("growth_settings").upsert({ key: "auto_assign_last_run", value: { at: new Date().toISOString(), enabled: cfg.enabled, mode: cfg.mode, hour: londonHour() }, updated_at: new Date().toISOString() }, { onConflict: "key" }); } catch (_) { /* the admin screen shows "last ran" from this */ } }
  let followups: any[] = [];
  let unpaidAlerts: any[] = [], acks: any[] = [];
  if (!dry && body.cron) {   // these run whether or not auto-assign is on
    try { followups = await runFollowups(sb, cfg); } catch (e) { console.error("followups", e); }
    try { const hh0 = londonHour(); if (hh0 >= cfg.ackHours[0] && hh0 < cfg.ackHours[1]) acks = await sendAcks(sb, cfg); } catch (e) { console.error("acks", e); }
    try { const hh = londonHour(); if (hh >= cfg.hours[0] && hh < cfg.hours[1]) { const cdx = await candidateData(sb); unpaidAlerts = await checkUnpaid(sb, cfg, cdx); await checkDrought(sb, cfg, cdx); } } catch (e) { console.error("unpaid", e); }
  }
  if (!dry && body.cron && !body.force && !cfg.enabled) return { ok: true, off: true, message: "Auto-assign is switched off", followups, unpaidAlerts, acks };
  if (!dry && !body.force) {   // cron AND the "Run now" button: instructors are never messaged outside the offer hours
    const h = londonHour(); if (h < cfg.hours[0] || h >= cfg.hours[1]) return { ok: true, waiting: `It only runs between ${cfg.hours[0]}:00 and ${cfg.hours[1]}:00 UK time, so nobody is messaged at night. It will pick the bookings up from ${cfg.hours[0]}:00.` };
  }
  if (!dry && !cfg.enabled && !body.force) return { ok: true, off: true, message: "Auto-assign is switched off" };
  if (!dry && (!TOKEN || !PHONE_ID) && cfg.mode === "assign") return { ok: false, error: "WhatsApp is not connected, so auto-assign cannot message anyone yet." };
  const results: any[] = [];
  const cd = await candidateData(sb), since = cfg.since ? new Date(cfg.since).getTime() : 0;

  // 1. offers nobody answered in time → next instructor, or ask the admin
  if (!dry) {
    const { data: stale } = await sb.from("auto_assign_jobs").select("*").eq("state", "pending_accept");
    // 1a. no reply after autoAssignAfterMinutes and the instructor covers the student's area: assign them anyway (they are probably in a lesson)
    const replyMin = cfg.replyMinutes > 0 ? cfg.replyMinutes : 60;
    if (cfg.autoAssignAfterMinutes > 0 && cfg.mode === "assign") {
      const cdA = await candidateData(sb);
      const tA: any[] = [];
      for (const j of (stale || []).filter((x: any) => x.expires_at && activeMinutes(new Date(x.expires_at).getTime(), now, cfg.hours[0], cfg.hours[1]) >= cfg.autoAssignAfterMinutes && activeMinutes(new Date(x.expires_at).getTime(), now, cfg.hours[0], cfg.hours[1]) < replyMin)) {
        tA.push(async () => {
        const { data: w } = await sb.from("waiting_list").select("*").eq("id", j.waiting_id).maybeSingle(); if (!w || w.status !== "waiting") { await sb.from("auto_assign_jobs").update({ state: "closed" }).eq("id", j.id); return; }
        const i = cdA.instrs.find((x: any) => String(x.id) === String(j.instructor_id)), b = readBooking(w); if (!i || !covers(i, b.postcode)) return;
        const c = { id: i.id, name: i.full_name, phone: i.phone, model: String(i.instructor_model || "").toLowerCase(), dist: Math.round((j.dist || 0) * 10) / 10 };
        const { data: cl } = await sb.from("auto_assign_jobs").update({ state: "working", updated_at: new Date().toISOString() }).eq("id", j.id).eq("state", "pending_accept").select(); if (!cl || !cl.length) return;   // the instructor answered, or another run has it
        try { const res = await assign(sb, cfg, b, c, true, `no reply after ${cfg.autoAssignAfterMinutes} minutes and they cover ${outward(b.postcode)}`); await sb.from("auto_assign_jobs").update({ state: "assigned", referral_id: res.referral_id, updated_at: new Date().toISOString(), note: `auto-assigned after ${cfg.autoAssignAfterMinutes} min (covers ${outward(b.postcode)}); ` + res.msgs.join("; ") }).eq("id", j.id); results.push({ student: b.name, action: "assigned", instructor: c.name, dist: c.dist, why: `no reply after ${cfg.autoAssignAfterMinutes} minutes, and they cover ${outward(b.postcode)}` }); }
        catch (e) { const m = String((e && e.message) || e); await sb.from("auto_assign_jobs").update({ state: "attention", note: m }).eq("id", j.id); await attention(sb, cfg, { kind: "assign_failed", title: "Auto-assign failed for " + b.name, detail: m + ". Assign them by hand.", waiting_id: String(w.id), student_name: b.name }); }
        });
      }
      await pool(tA, cfg.concurrency);
    }
    const tB: any[] = [];
    for (const j of (stale || []).filter((x: any) => !(cd.instrs || []).some((i: any) => String(i.id) === String(x.instructor_id)) /* instructor blocked since the offer: move on now */ || (x.expires_at && activeMinutes(new Date(x.expires_at).getTime(), now, cfg.hours[0], cfg.hours[1]) >= replyMin))) {
      tB.push(async () => {
      const { data: claimed } = await sb.from("auto_assign_jobs").update({ state: "working", updated_at: new Date().toISOString() }).eq("id", j.id).eq("state", "pending_accept").select(); if (!claimed || !claimed.length) return;   // another run (or the instructor's reply) got there first
      const { data: w } = await sb.from("waiting_list").select("*").eq("id", j.waiting_id).maybeSingle(); if (!w || w.status !== "waiting") { await sb.from("auto_assign_jobs").update({ state: "closed" }).eq("id", j.id); return; }
      const tried = [...(j.tried || []), String(j.instructor_id)];
      if (tried.length > cfg.retries) { await sb.from("auto_assign_jobs").update({ state: "attention", note: "no reply" }).eq("id", j.id); await attention(sb, cfg, { kind: "no_reply", title: "Attention: nobody replied for " + w.student_name, detail: `${tried.length} instructor(s) were asked and did not accept in time. Assign by hand.`, waiting_id: String(w.id), student_name: w.student_name }); results.push({ student: w.student_name, action: "attention", reason: "no reply" }); return; }
      results.push({ student: w.student_name, ...(await decide(sb, cfg, readBooking(w), cd, j, tried, tried.length + 1, false)) });
      });
    }
    await pool(tB, cfg.concurrency);
  }

  // 1b. a job stuck "working" for 10+ minutes means a run died half way: tell the admin rather than leave the student waiting for nobody
  if (!dry) { const { data: stuck } = await sb.from("auto_assign_jobs").select("*").eq("state", "working"); for (const j of (stuck || []).filter((x: any) => Date.now() - new Date(x.updated_at || x.created_at).getTime() > 10 * 60000)) { await sb.from("auto_assign_jobs").update({ state: "attention", note: "stuck: a run stopped part-way" }).eq("id", j.id); await attention(sb, cfg, { kind: "assign_failed", title: "A booking got stuck in auto-assign", detail: "A run stopped half way. Open the booking in Find & Assign, or press Retry.", waiting_id: String(j.waiting_id) }); } }

  // 2. new website bookings
  const { data: waiting } = await sb.from("waiting_list").select("*").eq("status", "waiting").order("created_at", { ascending: true });
  const { data: jobs } = await sb.from("auto_assign_jobs").select("waiting_id,state");
  const handled = new Set((jobs || []).map((j: any) => String(j.waiting_id)));
  const tags = (cfg.sources || ["[WEB]"]).map((t: string) => t.toLowerCase());
  let dayLeft = 1e9;
  if (!dry && cfg.maxPerDay > 0) { const { data: dj } = await sb.from("auto_assign_jobs").select("id,created_at").gte("created_at", new Date(londonMidnightToday()).toISOString()); dayLeft = Math.max(0, cfg.maxPerDay - (dj || []).length); }
  const todo: any[] = [], deadline = t0 + 110000; const maxRun = Math.min(dayLeft, cfg.maxPerRun > 0 ? cfg.maxPerRun : 10), seenPhone = new Map<string, string>();
  const recentRefs = (cd.refs || []).filter((r: any) => !r.is_cancelled && Date.now() - new Date(r.created_at).getTime() < 14 * 864e5);
  for (const w of waiting || []) {
    const ph10 = last10(w.student_phone || "");
    if (handled.has(String(w.id))) { if (ph10.length === 10 && !seenPhone.has(ph10)) seenPhone.set(ph10, w.student_name || ""); continue; }
    if (new Date(w.created_at).getTime() < since && !body.includeOlder) continue;
    if (!tags.some((t: string) => String(w.notes || "").toLowerCase().includes(t))) continue;
    const b = readBooking(w);
    // the same student sending the booking twice (or already placed with an instructor in the last 2 weeks) must never be given to a second instructor
    const dup = ph10.length === 10 && seenPhone.has(ph10) ? "another booking from the same phone number is already being handled" : "";
    // an existing student booking again (given to an instructor in the last 14 days, and not marked left): it goes back to THEIR instructor, and you are told
    const prev = !dup && ph10.length === 10 ? recentRefs.filter((r: any) => last10(r.student_phone || "") === ph10 && r.reply_status !== "left" && r.flag_color !== "red").sort((a: any, c: any) => String(c.created_at).localeCompare(String(a.created_at)))[0] : null;
    if (prev && (Date.now() - new Date(prev.created_at).getTime() < 6 * 3600e3 || /UPDATED request/i.test(String(w.notes || "")))) {   // an edited / re-sent form right after assignment: hold it, never offer the student twice
      seenPhone.set(ph10, b.name);
      if (dry) { results.push({ student: b.name, action: "duplicate", reason: "a request from this phone number was handled in the last few hours (or this is an updated request)" }); continue; }
      const { data: dj2 } = await sb.from("auto_assign_jobs").insert([{ waiting_id: String(w.id), state: "attention", attempt: 1, tried: [], note: "duplicate: updated or re-sent request" }]).select().single();
      if (dj2) await attention(sb, cfg, { kind: "duplicate", title: "Possible duplicate booking: " + b.name, detail: "This phone number was given to an instructor in the last few hours, or the form was updated and sent again. Not assigned automatically. If it is a different student, open it in Find & Assign; otherwise mark it done.", waiting_id: String(w.id), student_name: b.name, quiet: true });
      continue;
    }
    if (prev) {
      seenPhone.set(ph10, b.name);
      if (dry) { const ix = cd.instrs.find((x: any) => String(x.id) === String(prev.instructor_id)); results.push({ student: b.name, action: "rebook", instructor: ix ? ix.full_name : "their instructor", reason: "existing student: goes back to their current instructor" }); continue; }
      if (todo.length >= maxRun) break;
      todo.push(async () => {
        const { data: job, error } = await sb.from("auto_assign_jobs").insert([{ waiting_id: String(w.id), state: "working", attempt: 1, tried: [] }]).select().single(); if (error || !job) return;
        try { results.push({ student: b.name, ...(await rebook(sb, cfg, b, cd, job, prev)) }); } catch (e) { const m = String((e && e.message) || e); await sb.from("auto_assign_jobs").update({ state: "attention", note: "error: " + m }).eq("id", job.id); await attention(sb, cfg, { kind: "assign_failed", title: "Auto-assign hit an error for " + b.name, detail: m + ". Assign them by hand.", waiting_id: String(w.id), student_name: b.name }); }
      });
      continue;
    }
    if (dup) {
      if (dry) results.push({ student: b.name, action: "duplicate", reason: dup }); else {
        const { data: dj } = await sb.from("auto_assign_jobs").insert([{ waiting_id: String(w.id), state: "attention", attempt: 1, tried: [], note: "duplicate: " + dup }]).select().single();
        if (dj) await attention(sb, cfg, { kind: "duplicate", title: "Possible duplicate booking: " + b.name, detail: `Not assigned automatically: ${dup}. If it is a different student, open it in Find & Assign; if it is a repeat, mark it done.`, waiting_id: String(w.id), student_name: b.name, quiet: true });
      }
      continue;
    }
    if (ph10.length === 10) seenPhone.set(ph10, b.name);
    if (dry) { results.push({ student: b.name, postcode: b.postcode, type: b.type, female: b.female || "", ...(await decide(sb, cfg, b, cd, { id: "dry" }, [], 1, true)) }); continue; }
    if (!dry && todo.length >= maxRun) { if (dayLeft <= todo.length && cfg.maxPerDay > 0) await attention(sb, cfg, { kind: "daily_cap", title: `Daily safety limit reached (${cfg.maxPerDay} bookings)`, detail: "Auto-assign has stopped for today so a runaway can't message everyone. The remaining bookings wait. Raise the limit in Settings or assign them by hand.", waiting_id: "cap-" + new Date().toISOString().slice(0, 10) }); break; }   // never flood the instructors: the rest wait for the next run (2 minutes)
    todo.push(async () => {
      if (Date.now() > deadline) return;   // out of time: the booking is simply picked up by the next run
      const { data: job, error } = await sb.from("auto_assign_jobs").insert([{ waiting_id: String(w.id), state: "working", attempt: 1, tried: [] }]).select().single();
      if (error || !job) return;   // someone else is already handling it
      try { results.push({ student: b.name, ...(await decide(sb, cfg, b, cd, job, [], 1, false)) }); }
      catch (e) { const m = String((e && e.message) || e); console.error("decide", m); await sb.from("auto_assign_jobs").update({ state: "attention", note: "error: " + m }).eq("id", job.id); await attention(sb, cfg, { kind: "assign_failed", title: "Auto-assign hit an error for " + b.name, detail: m + ". Assign them by hand in Find & Assign.", waiting_id: String(w.id), student_name: b.name }); }
    });
  }
  if (!dry) await pool(todo, cfg.concurrency);   // several bookings are worked on AT THE SAME TIME
  return { ok: true, dry, enabled: cfg.enabled, mode: cfg.mode, results, followups, unpaidAlerts, acks, summary: { assigned: results.filter((r) => r.action === "assigned").length, offered: results.filter((r) => r.action === "offered").length, attention: results.filter((r) => r.action === "attention").length } };
}

/* ---------- replies from instructors ---------- */
async function instructorByPhone(sb: any, from: string) { const { data } = await sb.from("instructors").select("*").eq("status", "approved"); return (data || []).find((i: any) => last10(i.phone) === last10(from)) || null; }
const YES = ["yes", "y", "yep", "yeah", "ok", "okay", "sure", "accept", "confirm", "confirmed", "ican", "cantake"], NO = ["no", "nope", "n", "cant", "cannot", "decline", "declined", "reject", "sorry"];
const norm = (t: string) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
/* the student answers "male instructor is fine" / "I'll wait" */
async function femaleReply(sb: any, yes: boolean, jobId: string, from: string) {
  const cfg = await loadCfg(sb); const { data: job } = await sb.from("auto_assign_jobs").select("*").eq("id", jobId).maybeSingle(); if (!job) return;
  const { data: w } = await sb.from("waiting_list").select("*").eq("id", job.waiting_id).maybeSingle(); if (!w || w.status !== "waiting") { try { await sendText(from, "Thanks, we already have this one in hand 👍"); } catch (_) { /* window */ } return; }
  if (String(w.notes || "").includes(MALE_OK) || /Student prefers to wait for a female/.test(String(w.notes || ""))) { try { await sendText(from, "Thanks, we already have your answer 👍"); } catch (_) { /* window */ } return; }
  const stamp = (t: string) => [w.notes || "", `${today()} · ${t}`].join("\n");
  if (!yes) {
    await sb.from("waiting_list").update({ notes: stamp("👩 Student prefers to wait for a female instructor") }).eq("id", w.id);
    await attention(sb, cfg, { kind: "female_wait", title: `${w.student_name} wants to wait for a female instructor`, detail: "They said no to a male instructor. Assign a female instructor by hand when one is free, or keep them on the waiting list.", waiting_id: "fw-" + w.id, student_name: w.student_name });
    try { await sendText(from, "No problem, we'll keep looking for a female instructor and message you as soon as one is free 👍"); } catch (_) { /* window */ }
    return;
  }
  await sb.from("waiting_list").update({ notes: stamp(MALE_OK) }).eq("id", w.id);
  try { await sendText(from, "Thanks! We'll find you the closest instructor now and they'll be in touch shortly 👍"); } catch (_) { /* window */ }
  await sb.from("auto_assign_jobs").update({ state: "working", updated_at: new Date().toISOString() }).eq("id", jobId);
  const { data: w2 } = await sb.from("waiting_list").select("*").eq("id", w.id).maybeSingle(); const cd = await candidateData(sb);
  await sb.from("admin_attention").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("waiting_id", String(w.id)).eq("kind", "female_unavailable").eq("resolved", false);
  try { await decide(sb, cfg, readBooking(w2), cd, { ...job, tried: [] }, [], 1, false); } catch (e) { await sb.from("auto_assign_jobs").update({ state: "attention", note: "error: " + String((e && e.message) || e) }).eq("id", jobId); }
}
async function offerReply(sb: any, accept: boolean, jobId: string, from: string) {
  const cfg = await loadCfg(sb); const { data: job } = await sb.from("auto_assign_jobs").select("*").eq("id", jobId).maybeSingle(); if (!job || job.state !== "pending_accept") { try { await sendText(from, "Thanks. That student has already been dealt with."); } catch (_) { /* window */ } return; }
  const { data: w } = await sb.from("waiting_list").select("*").eq("id", job.waiting_id).maybeSingle(); if (!w || w.status !== "waiting") { await sb.from("auto_assign_jobs").update({ state: "closed" }).eq("id", jobId); return; }
  const b = readBooking(w), cd = await candidateData(sb), i = cd.instrs.find((x: any) => String(x.id) === String(job.instructor_id)); if (!i) return;   // not approved any more: the next run moves the offer on
  const { data: claim } = await sb.from("auto_assign_jobs").update({ state: "working", updated_at: new Date().toISOString() }).eq("id", jobId).eq("state", "pending_accept").select();
  if (!claim || !claim.length) { try { await sendText(from, "Thanks. That student has already been dealt with."); } catch (_) { /* window */ } return; }   // another run moved it on at the same moment
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
  if (!ok) await attention(sb, cfg, { kind: "declined_after", title: `Attention: ${name} can't cover ${r.student_name || "a student"}`, detail: "They were already assigned. Reassign them in Find & Assign.", waiting_id: "ra-" + refId, referral_id: refId, instructor_id: r.instructor_id, student_name: r.student_name });
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
      if (ins && ins.phone) await sendTemplate(sb, { to: ins.phone, template: "dsq_instructor_checkin", lang: "en_GB", params: [first(iName), stu], buttons: ["INS_BOOKED:" + f.id, "INS_NOTYET:" + f.id, "INS_LEFT:" + f.id], instructor_id: String(f.instructor_id), referral_id: f.referral_id, student_name: stu });
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
    try { await sendButtons(from, `Thanks! Has ${iName} been in touch with you yet?`, [{ id: "CONTACT_YES:" + f.id, title: "Yes, in touch" }, { id: "CONTACT_NO:" + f.id, title: "No, not yet" }]); } catch (_) { /* window */ }
  } else {
    try { await sendText(from, "Thanks, noted. We'll check again in a few days."); } catch (_) { /* window */ }
  }
}
async function runFollowups(sb: any, cfg: any) {
  const f = cfg.followups; if (!f.enabled || !TOKEN || !PHONE_ID) return [];
  const h = londonHour(), fh = cfg.anytime ? [8, 21] : cfg.hours; if (h < fh[0] || h >= fh[1]) return [];   // check-ins to students/instructors are not sent in the middle of the night, even in 24/7 mode
  const { data: rows } = await sb.from("student_followups").select("*");
  const due = (rows || []).filter((r: any) => !["done", "attention", "closed"].includes(r.state) && r.next_due && new Date(r.next_due).getTime() <= Date.now());
  const { data: instrs } = await sb.from("instructors").select("id,full_name,phone,status"); const out: any[] = [];
  for (const r of due) {
    const insX = (instrs || []).find((i: any) => String(i.id) === String(r.instructor_id));
    if (insX && insX.status === "suspended") { await setF(sb, r.id, { state: "closed", result: "instructor blocked" }); continue; }   // blocked = no messages to them or about them
    const { data: ref } = await sb.from("referrals").select("*").eq("id", r.referral_id).maybeSingle(); const ins = (instrs || []).find((i: any) => String(i.id) === String(r.instructor_id)) || { full_name: "your instructor", phone: "" }, stu = r.student_name || "the student";
    if (!ref || ref.is_cancelled || isBooked(ref) || ref.reply_status === "left") { await setF(sb, r.id, { state: "done", result: "settled in admin" }); continue; }
    // student AND instructor are asked at the same time (no waiting for the student), each at most maxPerWeek times in any 7 days
    const cap = f.maxPerWeek > 0 ? f.maxPerWeek : 2, CHK = ["dsq_student_checkin", "dsq_instructor_checkin"];
    const { data: past } = await sb.from("wa_log").select("to_phone,template,status,created_at").eq("referral_id", String(r.referral_id));
    const weekCount = (to: string) => (past || []).filter((x: any) => x.direction !== "in" && CHK.includes(x.template) && x.status !== "failed" && last10(x.to_phone) === last10(to) && Date.now() - new Date(x.created_at).getTime() < 7 * 864e5).length;
    const both = async (round: number) => {
      const one = async (who: "student" | "instructor") => {
        const to = who === "student" ? r.student_phone : ins.phone; if (!waNumber(to)) return "no number";
        if (weekCount(to) >= cap) return "capped";
        const t = who === "student"
          ? await sendTemplate(sb, { to, template: "dsq_student_checkin", lang: "en_GB", params: [first(stu), ins.full_name], buttons: ["STU_BOOKED:" + r.id, "STU_NOTYET:" + r.id, "STU_LEFT:" + r.id], instructor_id: String(r.instructor_id), referral_id: r.referral_id, student_name: stu })
          : await sendTemplate(sb, { to, template: "dsq_instructor_checkin", lang: "en_GB", params: [first(ins.full_name), stu], buttons: ["INS_BOOKED:" + r.id, "INS_NOTYET:" + r.id, "INS_LEFT:" + r.id], instructor_id: String(r.instructor_id), referral_id: r.referral_id, student_name: stu });
        if (!t.ok) { await attention(sb, cfg, { kind: "msg_failed", title: "WhatsApp check-in to " + (who === "student" ? stu : ins.full_name) + " did not send", detail: t.error + (who === "student" ? ". Ask them by hand whether they booked." : `. Ask them whether ${stu} booked.`), waiting_id: "chk-" + who + "-" + r.id, referral_id: r.referral_id, instructor_id: r.instructor_id, student_name: stu }); return "failed"; }
        return "sent";
      };
      const a = await one("student"), b = await one("instructor");
      if (a !== "sent" && b !== "sent") {
        if (a === "capped" || b === "capped") { await setF(sb, r.id, { next_due: new Date(Date.now() + 864e5).toISOString() }); return "waiting (weekly limit)"; }   // asked twice this week already: try again tomorrow
        await setF(sb, r.id, { state: "attention", result: "check-in messages could not be sent" }); await attention(sb, cfg, { kind: "no_confirm", title: `Attention: could not ask anyone whether ${stu} booked`, detail: `The student check-in: ${a}. The instructor check-in: ${b}. Check with them directly.`, referral_id: r.referral_id, instructor_id: r.instructor_id, student_name: stu }); return "attention";
      }
      await setF(sb, r.id, { state: "asked_both", round, student_asked_at: new Date().toISOString(), next_due: new Date(Date.now() + f.repeatDays * 864e5).toISOString() }); return `asked student (${a}) and instructor (${b})`;
    };
    if (r.state === "waiting_accept") { await setF(sb, r.id, { state: "attention", result: "no accept" }); await attention(sb, cfg, { kind: "no_accept", title: `Attention: ${ins.full_name} has not accepted ${stu}`, detail: `They were assigned ${f.acceptWaitHours} hours ago and haven't tapped Accept, so the student hasn't been welcomed. Chase them or reassign.`, referral_id: r.referral_id, instructor_id: r.instructor_id, student_name: stu }); out.push({ student: stu, step: "attention (not accepted)" }); }
    else if (r.state === "waiting_student") out.push({ student: stu, step: await both(r.round || 1) });
    else {   // asked_both (or an older state): the next round, or tell the admin nobody has answered
      const round = (r.round || 1) + 1;
      if (round > f.rounds) { await setF(sb, r.id, { state: "attention", result: "no confirmation" }); await attention(sb, cfg, { kind: "no_confirm", title: `Attention: nobody has confirmed whether ${stu} booked`, detail: `${f.rounds} rounds of check-ins went to the student and to ${ins.full_name} and nobody gave a clear answer. Check with them directly.`, referral_id: r.referral_id, instructor_id: r.instructor_id, student_name: stu }); out.push({ student: stu, step: "attention (no confirmation)" }); }
      else out.push({ student: stu, step: "round " + round + ": " + await both(round) });
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
      { const { data: seen } = await sb.from("wa_log").select("id").eq("wa_message_id", m.id).eq("direction", "in").maybeSingle(); if (seen) continue; }   // Meta re-sends a message if we are slow to answer: never process the same one twice
      await sb.from("wa_log").insert([{ direction: "in", wa_message_id: m.id, to_phone: m.from, body: String(text).slice(0, 900), payload, status: "received", raw: m }]);
      const fm = payload && String(payload).match(/^(STU_BOOKED|STU_NOTYET|STU_LEFT|INS_BOOKED|INS_NOTYET|INS_LEFT|CONTACT_YES|CONTACT_NO):(.+)$/);
      if (fm) { await followupReply(sb, fm[1], fm[2], m.from); continue; }
      const fe = payload && String(payload).match(/^(FEM_YES|FEM_NO):(.+)$/); if (fe) { await femaleReply(sb, fe[1] === "FEM_YES", fe[2], m.from); continue; }
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
    if (b.action === "simulate") return json(await simulate(sb, b));
    if (b.action === "templates") return json(await templateStatus());
  } catch (e) { return json({ ok: false, error: String((e && e.message) || e) }, 500); }
  return json({ ok: false, error: "Unknown action" }, 400);
});
