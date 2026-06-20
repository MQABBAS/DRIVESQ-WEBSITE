import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BImUHUO2z_Qk-7X_57bNY7YgIazbzp2DelfO9yH5EQ2bASguRNbA4o9wD-A4GCruJfYvEPYvxhvXMbQQIHaghN0";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

webpush.setVapidDetails(
  "mailto:qaimabbasmohammed@gmail.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST" },
    });
  }

  try {
    const { endpoint, keys, title, body: msgBody, url } = await req.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return new Response(JSON.stringify({ error: "Missing endpoint or keys" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const subscription = { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
    const payload = JSON.stringify({
      title: title || "DriveSQ",
      body: msgBody || "You have a new notification",
      url: url || "/student.html",
      icon: "https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png",
    });

    const result = await webpush.sendNotification(subscription, payload, { TTL: 86400 });

    return new Response(JSON.stringify({ success: true, status: result.statusCode }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e: any) {
    const status = e.statusCode || 500;
    return new Response(JSON.stringify({ error: e.message, status }), {
      status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
