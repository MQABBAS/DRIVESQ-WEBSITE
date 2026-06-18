import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsRequest {
  to: string;
  type: "lesson_booked" | "reminder_24hr" | "confirm_request" | "student_confirmed" | "student_declined" | "reschedule" | "custom";
  data?: Record<string, string>;
  message?: string;
}

function normaliseUK(phone: string): string {
  let p = phone.replace(/[\s\-\(\)]/g, "");
  if (p.startsWith("07")) p = "+44" + p.slice(1);
  if (p.startsWith("44") && !p.startsWith("+")) p = "+" + p;
  return p;
}

function buildMessage(type: string, data: Record<string, string> = {}): string {
  const d = data;
  switch (type) {
    case "lesson_booked":
      return `DriveSQ: Your driving lesson has been booked for ${d.date || "TBC"} at ${d.time || "TBC"}. ${d.duration || "1"}hr ${d.type || "Manual"} lesson. Pickup: ${d.address || "TBC"}. Open your student portal to confirm: ${d.portal_url || "https://www.drivesq.co.uk/student.html"}`;
    case "reminder_24hr":
      return `DriveSQ Reminder: You have a driving lesson tomorrow (${d.date || ""}) at ${d.time || "TBC"}. ${d.duration || "1"}hr ${d.type || "Manual"} lesson. Pickup: ${d.address || "TBC"}. Please confirm attendance in your student portal if you haven't already.`;
    case "confirm_request":
      return `DriveSQ: Please confirm your lesson on ${d.date || "TBC"} at ${d.time || "TBC"}. Open your student portal to confirm or reschedule: ${d.portal_url || "https://www.drivesq.co.uk/student.html"}`;
    case "student_confirmed":
      return `DriveSQ: ${d.student_name || "Your student"} has confirmed their lesson on ${d.date || "TBC"} at ${d.time || "TBC"}.`;
    case "student_declined":
      return `DriveSQ: ${d.student_name || "Your student"} has requested to reschedule their lesson on ${d.date || "TBC"} at ${d.time || "TBC"}. Reason: ${d.reason || "Not specified"}. Check your dashboard for details.`;
    case "reschedule":
      return `DriveSQ: Your lesson on ${d.date || "TBC"} has been rescheduled. New date: ${d.new_date || "TBC"} at ${d.new_time || "TBC"}. Check your student portal for details.`;
    case "custom":
      return data.message || "";
    default:
      return `DriveSQ notification: ${data.message || "You have a new update. Check your portal for details."}`;
  }
}

async function sendSms(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
  });

  const result = await resp.json();
  if (resp.ok) {
    return { success: true, sid: result.sid };
  }
  return { success: false, error: result.message || "Failed to send SMS" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: SmsRequest | SmsRequest[] = await req.json();
    const requests = Array.isArray(payload) ? payload : [payload];
    const results = [];

    for (const sms of requests) {
      const to = normaliseUK(sms.to);
      const body = sms.message || buildMessage(sms.type, sms.data);

      if (!to || !body) {
        results.push({ to, success: false, error: "Missing phone or message" });
        continue;
      }

      const result = await sendSms(to, body);
      results.push({ to, ...result });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
