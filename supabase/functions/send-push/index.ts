import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BIerv6j2J-h4et1fNrVOoHWYRX6qsobXSqgQ6H5Qsm1-l3HYDn_Xon-UPT2-r-vSmJCs78PnL-I5r3XzASbTNFU";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vwvbfqrlumvoabzkjxoa.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

webpush.setVapidDetails("mailto:qaimabbasmohammed@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function sendToSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) {
  try {
    await webpush.sendNotification(sub, payload, { TTL: 86400 });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, status: e.statusCode, message: e.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json();
    const { title, body: msgBody, url, tag } = body;

    const payload = JSON.stringify({
      title: title || "DriveSQ",
      body: msgBody || "You have a new notification",
      url: url || "/dashboard.html",
      icon: "https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png",
      badge: "https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png",
      tag: tag || "drivesq",
    });

    // Mode 1: Send to a specific subscription provided directly
    if (body.endpoint && body.keys) {
      const result = await sendToSubscription({ endpoint: body.endpoint, keys: body.keys }, payload);
      return new Response(JSON.stringify(result), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Mode 2: Send to an instructor by instructor_id (looks up from push_subscriptions table)
    if (body.instructor_id) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: rows, error } = await sb
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("instructor_id", body.instructor_id);

      if (error) throw new Error("DB error: " + error.message);
      if (!rows || rows.length === 0) {
        return new Response(JSON.stringify({ ok: false, message: "No subscription found for this instructor" }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const results = await Promise.all(
        rows.map((r: any) => sendToSubscription({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload))
      );

      // Prune expired/invalid subscriptions (410 = gone, 404 = not found)
      const expired = rows.filter((_: any, i: number) => results[i].status === 410 || results[i].status === 404);
      if (expired.length) {
        await sb.from("push_subscriptions").delete().in("endpoint", expired.map((r: any) => r.endpoint));
      }

      return new Response(JSON.stringify({ ok: true, sent: results.filter((r: any) => r.ok).length, total: rows.length }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Provide instructor_id or {endpoint, keys}" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
