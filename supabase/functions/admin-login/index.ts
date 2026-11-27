// @ts-nocheck
/* admin-login: checks the admin email + password on the SERVER (the browser never sees the stored password).
   Deploy: Supabase → Edge Functions → Deploy a new function → name it exactly  admin-login  → paste this file → turn OFF "Verify JWT" (the admin is not signed in yet) → Deploy.
   Needs no extra secrets (uses the project's built-in service role key).
   Passwords are stored as PBKDF2-SHA256 (210,000 rounds, random salt) in admins.pw_hash. The first successful login with the OLD password upgrades the account and wipes the old readable copy. */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FN_VERSION = "2026-11-28-admin-login";
const env = (k: string) => Deno.env.get(k) || "";
const SUPABASE_URL = env("SUPABASE_URL") || "https://vwvbfqrlumvoabzkjxoa.supabase.co";
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY") || env("SERVICE_ROLE_KEY");
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const ITER = 210000, MAX_FAILS = 8, WINDOW_MIN = 15;

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
function same(a: Uint8Array, b: Uint8Array) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i]; return r === 0; }
async function derive(pw: string, salt: Uint8Array, iter: number) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, k, 256));
}
export async function hashPassword(pw: string) { const salt = crypto.getRandomValues(new Uint8Array(16)); return "pbkdf2$" + ITER + "$" + b64(salt) + "$" + b64(await derive(pw, salt, ITER)); }
export async function checkPassword(pw: string, stored: string) {
  const p = String(stored || "").split("$"); if (p[0] !== "pbkdf2" || p.length !== 4) return false;
  try { return same(await derive(pw, unb64(p[2]), parseInt(p[1], 10)), unb64(p[3])); } catch (_) { return false; }
}
/* the old way: Base64 of the password (readable by anyone). Only used once, to upgrade an account. */
function oldMatch(pw: string, stored: string) { try { const a = new TextEncoder().encode(btoa(pw)), b = new TextEncoder().encode(String(stored || "")); return stored && stored !== "migrated" && same(a, b); } catch (_) { return false; } }

globalThis.__adminLoginHandler = async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!SERVICE_KEY) return json({ ok: false, error: "Function is missing its service role key" }, 500);
  let b: any = {}; try { b = await req.json(); } catch (_) { }
  if (b.ping) return json({ ok: true, version: FN_VERSION });
  const email = String(b.email || "").trim().toLowerCase(), pw = String(b.password || "");
  if (!email || !pw || pw.length > 200) return json({ ok: false, error: "Please enter email and password." }, 400);
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
  const { data: fails, error: fe } = await sb.from("admin_login_attempts").select("id").eq("email", email).gte("at", since);
  if (fe) return json({ ok: false, error: "Run the admin-login SQL first (table admin_login_attempts is missing)." }, 500);
  if ((fails || []).length >= MAX_FAILS) return json({ ok: false, locked: true, error: "Too many wrong attempts. Wait " + WINDOW_MIN + " minutes and try again." }, 429);
  const { data: a } = await sb.from("admins").select("*").eq("email", email).maybeSingle();
  let ok = false;
  if (a) {
    if (a.pw_hash) ok = await checkPassword(pw, a.pw_hash);
    else if (oldMatch(pw, a.password_hash)) { ok = true; const h = await hashPassword(pw); await sb.from("admins").update({ pw_hash: h, password_hash: "migrated" }).eq("email", email); }
  } else { await derive(pw, new Uint8Array(16), ITER); }   // same delay whether or not the email exists
  if (!ok) { await sb.from("admin_login_attempts").insert([{ email }]); return json({ ok: false, error: a ? "Incorrect password." : "Admin account not found. Check your email address." }, 401); }
  await sb.from("admin_login_attempts").delete().eq("email", email);
  return json({ ok: true, email, name: a.name || a.full_name || "" });
};
serve(globalThis.__adminLoginHandler);
