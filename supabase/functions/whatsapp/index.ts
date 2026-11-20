// @ts-nocheck — plain JavaScript in a .ts file
// DriveSQ — whatsapp (Meta WhatsApp Business Platform / Cloud API)
// Admin calls (header x-admin-key = EMAIL_ADMIN_KEY, the same key as the email function):
//   { action: "status" }                                              → is it set up, and which number is connected
//   { action: "send_template", to, template, lang, params:[...], buttons:[payload,...], instructor_id, referral_id, student_name }
//   { action: "test", to }                                            → sends Meta's built-in "hello_world" template to that number
// Meta calls this same URL as the webhook:
//   GET  ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…        → verification
//   POST (header x-hub-signature-256)                                  → delivery receipts + replies. A tap on "Accept" / "Can't take"
//                                                                        on a new-student message updates the referral automatically.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   WHATSAPP_TOKEN         permanent access token (System User token from Meta Business settings)
//   WHATSAPP_PHONE_ID      the "Phone number ID" shown in WhatsApp Manager → API setup
//   WHATSAPP_VERIFY_TOKEN  any long random text; you type the same text into Meta when adding the webhook
//   WHATSAPP_APP_SECRET    the app secret (Meta App → Settings → Basic); used to check that webhook calls really come from Meta
//   EMAIL_ADMIN_KEY        already set for the email function (reused here)
// Turn OFF "Verify JWT" for this function, otherwise Meta cannot reach the webhook.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vwvbfqrlumvoabzkjxoa.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "";
const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") || "";
const VERIFY = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") || "";
const ADMIN_KEY = Deno.env.get("EMAIL_ADMIN_KEY") || "";
const API = "https://graph.facebook.com/" + (Deno.env.get("WHATSAPP_API_VERSION") || "v21.0");

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

/* UK-friendly phone → digits with country code, e.g. 07700 900123 / +44 7700 900123 → 447700900123 */
function waNumber(raw: string) {
  let d = String(raw || "").replace(/\(0\)/g, "").replace(/\D/g, "");
  if (d.startsWith("0044")) d = d.slice(2);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "44" + d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : "";
}
/* Meta rejects template parameters with new lines, tabs or runs of spaces, and empty values */
const param = (v: unknown) => ({ type: "text", text: (String(v == null ? "" : v).replace(/[\r\n\t]+/g, " | ").replace(/ {5,}/g, "    ").replace(/( \| )+/g, " | ").trim().slice(0, 900)) || "-" });

async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function graph(path: string, body?: unknown) {
  const r = await fetch(API + path, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

async function sendTemplate(sb: any, b: any) {
  if (!TOKEN || !PHONE_ID) return { ok: false, error: "WhatsApp is not set up yet (missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID)." };
  const to = waNumber(b.to); if (!to) return { ok: false, error: "That phone number doesn't look right." };
  const name = String(b.template || "").trim(); if (!/^[a-z0-9_]{1,512}$/.test(name)) return { ok: false, error: "Bad template name." };
  const components: any[] = [];
  if (Array.isArray(b.params) && b.params.length) components.push({ type: "body", parameters: b.params.map(param) });
  (Array.isArray(b.buttons) ? b.buttons : []).forEach((p: string, i: number) => components.push({ type: "button", sub_type: "quick_reply", index: String(i), parameters: [{ type: "payload", payload: String(p).slice(0, 256) }] }));
  const r = await graph("/" + PHONE_ID + "/messages", { messaging_product: "whatsapp", to, type: "template", template: { name, language: { code: b.lang || "en_GB" }, ...(components.length ? { components } : {}) } });
  const id = r.j && r.j.messages && r.j.messages[0] && r.j.messages[0].id || null;
  const err = r.ok ? null : ((r.j && r.j.error && (r.j.error.error_user_msg || r.j.error.message)) || "WhatsApp error " + r.status);
  await sb.from("whatsapp_messages").insert([{ direction: "out", wa_message_id: id, to_phone: to, template: name, body: (b.params || []).map((x: any) => String(x == null ? "" : x).replace(/\s+/g, " ")).join(" · ").slice(0, 900), status: r.ok ? "sent" : "failed", error: err, instructor_id: b.instructor_id || null, referral_id: b.referral_id || null, student_name: b.student_name || null }]);
  return r.ok ? { ok: true, id, to } : { ok: false, error: err, code: r.j && r.j.error && r.j.error.code };
}

async function sendText(to: string, text: string) { return graph("/" + PHONE_ID + "/messages", { messaging_product: "whatsapp", to, type: "text", text: { body: text } }); }

const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

/* an instructor tapped Accept / Can't take on a new-student message */
async function decision(sb: any, kind: string, refId: string, from: string) {
  const { data: r } = await sb.from("referrals").select("*").eq("id", refId).maybeSingle(); if (!r) return;
  const { data: ins } = await sb.from("instructors").select("full_name").eq("id", r.instructor_id).maybeSingle();
  const name = (ins && ins.full_name) || "Instructor", accept = kind === "ACCEPT";
  const line = accept ? `${today()} · 👨‍🏫 ${name} accepted this student on WhatsApp` : `${today()} · 🚫 ${name} can't take this student (WhatsApp) — please reassign`;
  const patch: any = { admin_notes: [r.admin_notes || "", line].filter(Boolean).join("\n") };
  if (!accept && !r.flag_color) patch.flag_color = "purple";   // shows up under 🟣 Unsure so you see it in Referrals
  await sb.from("referrals").update(patch).eq("id", refId);
  try { await sb.from("admin_activity_log").insert([{ area: "referral", action: accept ? "wa_accepted" : "wa_declined", summary: `${name} ${accept ? "accepted" : "can't take"} ${r.student_name || "a student"} (WhatsApp)`, actor_role: "instructor", actor_name: name, instructor_id: r.instructor_id, student_name: r.student_name, ref_id: refId }]); } catch (_) { /* log is best effort */ }
  try { await sendText(from, accept ? "Thanks, noted ✅ Please contact the student to arrange the first lesson." : "No problem, thanks for letting us know. We'll find another instructor for them."); } catch (_) { /* free reply inside the 24-hour window */ }
}

async function webhook(sb: any, raw: string) {
  let body: any = {}; try { body = JSON.parse(raw); } catch (_) { return; }
  for (const en of body.entry || []) for (const ch of en.changes || []) {
    const v = ch.value || {};
    for (const s of v.statuses || []) {
      const err = s.errors && s.errors[0] && (s.errors[0].title || s.errors[0].message) || null;
      await sb.from("whatsapp_messages").update({ status: s.status, ...(err ? { error: err } : {}) }).eq("wa_message_id", s.id);
    }
    for (const m of v.messages || []) {
      const payload = (m.button && m.button.payload) || (m.interactive && m.interactive.button_reply && m.interactive.button_reply.id) || null;
      const text = (m.text && m.text.body) || (m.button && m.button.text) || (m.interactive && m.interactive.button_reply && m.interactive.button_reply.title) || "[" + m.type + "]";
      await sb.from("whatsapp_messages").insert([{ direction: "in", wa_message_id: m.id, to_phone: m.from, body: String(text).slice(0, 900), payload, status: "received", raw: m }]);
      const mm = payload && String(payload).match(/^(ACCEPT|DECLINE):(.+)$/);
      if (mm) await decision(sb, mm[1], mm[2], m.from);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url), sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Meta's webhook verification
  if (req.method === "GET" && url.searchParams.get("hub.mode") === "subscribe") {
    if (VERIFY && url.searchParams.get("hub.verify_token") === VERIFY) return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
    return new Response("Forbidden", { status: 403 });
  }

  const sig = req.headers.get("x-hub-signature-256");
  if (req.method === "POST" && sig) {                      // a call from Meta
    const raw = await req.text();
    if (!APP_SECRET || !safeEqual(sig, "sha256=" + await hmacHex(APP_SECRET, raw))) return new Response("Bad signature", { status: 401 });
    try { await webhook(sb, raw); } catch (e) { console.error("webhook", e); }
    return new Response("ok", { status: 200 });            // always answer 200 so Meta does not retry endlessly
  }

  // admin calls
  const key = req.headers.get("x-admin-key") || "";
  if (!ADMIN_KEY || !safeEqual(key, ADMIN_KEY)) return json({ ok: false, error: "Wrong or missing admin key" }, 401);
  let b: any = {}; try { b = await req.json(); } catch { return json({ ok: false, error: "Bad JSON" }, 400); }

  if (b.action === "status") {
    const have = { token: !!TOKEN, phone_id: !!PHONE_ID, verify_token: !!VERIFY, app_secret: !!APP_SECRET };
    let phone = null, err = null;
    if (TOKEN && PHONE_ID) { const r = await graph("/" + PHONE_ID + "?fields=display_phone_number,verified_name,quality_rating,code_verification_status"); if (r.ok) phone = r.j; else err = (r.j && r.j.error && r.j.error.message) || "Meta rejected the token"; }
    return json({ ok: true, configured: have, ready: have.token && have.phone_id, webhook_ready: have.verify_token && have.app_secret, phone, error: err });
  }
  if (b.action === "send_template") return json(await sendTemplate(sb, b));
  if (b.action === "test") return json(await sendTemplate(sb, { to: b.to, template: "hello_world", lang: "en_US", params: [] }));
  return json({ ok: false, error: "Unknown action" }, 400);
});
