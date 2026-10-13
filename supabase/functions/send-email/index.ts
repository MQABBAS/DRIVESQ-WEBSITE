// DriveSQ — send-email
// 1. POST { action: "send", messages: [...] }  — sends up to 100 emails in one Resend batch call.
//    Requires header x-admin-key = EMAIL_ADMIN_KEY. Skips unsubscribed contacts, adds a personal
//    one-click unsubscribe link + List-Unsubscribe headers to every email, records results in email_sends.
// 2. POST { action: "status" } (with x-admin-key)  — checks the function is configured.
// 3. GET/POST ?unsubscribe=1&e=<email>&t=<token>   — unsubscribe link (public, signed token).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY     your Resend API key
//   EMAIL_ADMIN_KEY    a long random password; you enter the same value once in admin → Email → Settings
//   EMAIL_FROM         e.g.  DriveSQ <hello@drivesq.co.uk>   (domain verified in Resend)
//   EMAIL_REPLY_TO     optional, e.g. qaimabbasmohammed@gmail.com
//   UNSUBSCRIBE_SECRET optional; defaults to EMAIL_ADMIN_KEY
// Deploy without JWT verification so mailbox one-click unsubscribe POSTs work:
//   supabase functions deploy send-email --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vwvbfqrlumvoabzkjxoa.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_KEY = Deno.env.get("EMAIL_ADMIN_KEY") || "";
const FROM = Deno.env.get("EMAIL_FROM") || "DriveSQ <hello@drivesq.co.uk>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") || "";
const UNSUB_SECRET = Deno.env.get("UNSUBSCRIBE_SECRET") || ADMIN_KEY;
const FN_URL = SUPABASE_URL + "/functions/v1/send-email";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const norm = (e: string) => String(e || "").trim().toLowerCase();

async function sign(email: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(UNSUB_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("unsub:" + norm(email)));
  return Array.from(new Uint8Array(sig)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function unsubUrl(email: string) {
  return FN_URL + "?unsubscribe=1&e=" + encodeURIComponent(norm(email)) + "&t=" + (await sign(email));
}
function esc(s: string) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)); }

function page(title: string, msg: string, ok = true) {
  return new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — DriveSQ</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0204;color:#f3eeee;font-family:Inter,Arial,sans-serif;padding:20px}
.c{max-width:460px;text-align:center;background:#16080a;border:1px solid rgba(209,10,17,.35);border-radius:22px;padding:34px 26px}
h1{font-family:'Barlow Condensed',Oswald,Arial Narrow,sans-serif;text-transform:uppercase;font-size:2rem;margin:10px 0}
a{color:#F5C518}.i{font-size:2.6rem}</style></head><body><div class="c"><div class="i">${ok ? "✅" : "⚠️"}</div><h1>${esc(title)}</h1><p>${msg}</p><p><a href="https://www.drivesq.co.uk/">drivesq.co.uk</a></p></div></body></html>`,
    { status: ok ? 200 : 400, headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // ---------- unsubscribe (GET from the link in the email, POST from Gmail/Yahoo one-click) ----------
  if (url.searchParams.get("unsubscribe")) {
    const email = norm(url.searchParams.get("e") || ""), t = url.searchParams.get("t") || "";
    if (!email || !t || !safeEqual(t, await sign(email))) return page("Link not valid", "This unsubscribe link isn't valid. Reply to any DriveSQ email and we'll remove you straight away.", false);
    if (req.method === "GET" && !url.searchParams.get("confirm")) {
      return page("Unsubscribe?", `Stop DriveSQ marketing emails to <b>${esc(email)}</b>?<br><br>
        <form method="post" action="${esc(url.pathname + url.search)}&confirm=1"><button style="background:#D10A11;color:#fff;border:0;border-radius:999px;padding:12px 22px;font-weight:700;font-size:1rem;cursor:pointer">Yes, unsubscribe me</button></form>`);
    }
    const now = new Date().toISOString();
    const { data: ex } = await sb.from("email_contacts").select("id").eq("email_key", email).maybeSingle();
    if (ex) await sb.from("email_contacts").update({ status: "unsubscribed", unsubscribed_at: now, unsubscribe_note: req.method === "POST" && !url.searchParams.get("confirm") ? "one-click (mailbox)" : "unsubscribe link", updated_at: now }).eq("id", ex.id);
    else await sb.from("email_contacts").insert([{ email, status: "unsubscribed", unsubscribed_at: now, sources: ["unsubscribe"], unsubscribe_note: "unsubscribe link" }]);
    if (req.method === "POST" && !url.searchParams.get("confirm")) return new Response("ok", { headers: CORS });
    return page("You're unsubscribed", `We won't send marketing emails to <b>${esc(email)}</b> any more. You'll still hear from us about lessons you've booked.`);
  }

  // ---------- admin actions ----------
  const key = req.headers.get("x-admin-key") || "";
  if (!ADMIN_KEY || !safeEqual(key, ADMIN_KEY)) return json({ ok: false, error: "Wrong or missing admin email key" }, 401);
  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "Bad JSON" }, 400); }

  if (body.action === "status") return json({ ok: true, from: FROM, replyTo: REPLY_TO || null, resend: !!RESEND_KEY, service: !!SERVICE_KEY });
  if (body.action !== "send") return json({ ok: false, error: "Unknown action" }, 400);
  if (!RESEND_KEY) return json({ ok: false, error: "RESEND_API_KEY is not set" }, 500);

  const msgs: any[] = Array.isArray(body.messages) ? body.messages : [];
  if (!msgs.length) return json({ ok: false, error: "No messages" }, 400);
  if (msgs.length > 100) return json({ ok: false, error: "Max 100 emails per call" }, 400);

  // skip invalid + unsubscribed
  const emails = msgs.map((m) => norm(m.to));
  const { data: unsubRows } = await sb.from("email_contacts").select("email_key").in("email_key", emails).neq("status", "subscribed");
  const blocked = new Set((unsubRows || []).map((r: any) => r.email_key));
  const results: any[] = [], toSend: any[] = [], idx: number[] = [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i], e = emails[i];
    if (!EMAIL_RE.test(e)) { results[i] = { to: e, status: "failed", error: "Invalid email address" }; continue; }
    if (blocked.has(e) && !body.test) { results[i] = { to: e, status: "skipped", error: "Unsubscribed" }; continue; }
    const u = await unsubUrl(e);
    const html = String(m.html || "").split("{{unsubscribe_url}}").join(u);
    const text = String(m.text || "").split("{{unsubscribe_url}}").join(u);
    const mail: any = {
      from: FROM, to: [e], subject: String(m.subject || "DriveSQ").slice(0, 250), html, text,
      headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      tags: [{ name: "campaign", value: String(body.campaign_id || "test").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "test" }],
    };
    if (REPLY_TO) mail.reply_to = REPLY_TO;
    toSend.push(mail); idx.push(i);
  }

  if (toSend.length) {
    let r: Response | null = null, out: any = null, tries = 0;
    while (tries++ < 3) {
      r = await fetch((Deno.env.get("RESEND_API_URL") || "https://api.resend.com") + "/emails/batch", { method: "POST", headers: { Authorization: "Bearer " + RESEND_KEY, "Content-Type": "application/json" }, body: JSON.stringify(toSend) });
      out = await r.json().catch(() => ({}));
      if (r.status !== 429) break;
      await new Promise((res) => setTimeout(res, 1100 * tries));
    }
    const ids = (out && Array.isArray(out.data)) ? out.data : [];
    idx.forEach((i, k) => {
      if (r && r.ok && ids[k]?.id) results[i] = { to: emails[i], status: "sent", id: ids[k].id };
      else results[i] = { to: emails[i], status: "failed", error: (out && (out.message || out.error?.message || out.name)) || ("Resend " + (r ? r.status : "error")) };
    });
  }

  // record results
  const now = new Date().toISOString();
  if (body.campaign_id && !body.test) {
    for (let i = 0; i < msgs.length; i++) {
      const res = results[i]; if (!res) continue;
      const patch: any = { status: res.status, provider_id: res.id || null, error: res.error || null, sent_at: res.status === "sent" ? now : null };
      if (msgs[i].send_id) await sb.from("email_sends").update(patch).eq("id", msgs[i].send_id);
    }
    const sentKeys = results.filter((r) => r && r.status === "sent").map((r) => r.to);
    if (sentKeys.length) await sb.from("email_contacts").update({ last_sent_at: now }).in("email_key", sentKeys);
  }
  return json({ ok: true, results });
});
