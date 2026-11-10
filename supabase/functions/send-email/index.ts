// @ts-nocheck — plain JavaScript in a .ts file (the email designer is shared with admin.html)
// DriveSQ — send-email
// 1. POST { action: "send", messages: [...] }  — sends up to 100 emails in one Resend batch call.
//    Requires header x-admin-key = EMAIL_ADMIN_KEY. Skips unsubscribed contacts, adds a personal
//    one-click unsubscribe link + List-Unsubscribe headers to every email, records results in email_sends.
// 2. POST { action: "status" } (with x-admin-key)  — checks the function is configured.
// 4. POST { action: "monday" } (with x-admin-key)  — Monday instructor emails (weekly reminders, franchise fee, referral statement).
//    Schedule it: Supabase → Integrations → Cron → job "0 6,7 * * 1" → this function, POST body {"action":"monday","cron":true},
//    header x-admin-key. It only sends from 7am UK time and never twice in the same week.
// 3. GET/POST ?unsubscribe=1&e=<email>&t=<token>   — unsubscribe link (public, signed token).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY     your Resend API key
//   EMAIL_ADMIN_KEY    a long random password; you enter the same value once in admin → Email → Settings
//   EMAIL_FROM         e.g.  DriveSQ <hello@drivesq.co.uk>   (domain verified in Resend)
//   EMAIL_REPLY_TO     optional, e.g. qaimabbasmohammed@gmail.com
//   UNSUBSCRIBE_SECRET optional; defaults to EMAIL_ADMIN_KEY
//   EMAIL_FUNCTION_NAME optional; the name you deployed this function as (send-email, sendemail…). Admin also sends it.
// Turn OFF "Verify JWT" for this function (dashboard: function → Details/Settings) so the unsubscribe link and
// mailbox one-click unsubscribe work. CLI:  supabase functions deploy send-email --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vwvbfqrlumvoabzkjxoa.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_KEY = Deno.env.get("EMAIL_ADMIN_KEY") || "";
const FROM = Deno.env.get("EMAIL_FROM") || "DriveSQ <hello@drivesq.co.uk>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") || "";
const UNSUB_SECRET = Deno.env.get("UNSUBSCRIBE_SECRET") || ADMIN_KEY;
// The function can be deployed as send-email, sendemail or send_email — unsubscribe links use whichever name it runs under.
const FN_NAME_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;
function fnUrl(req: Request, hint?: string) {
  let name = Deno.env.get("EMAIL_FUNCTION_NAME") || "";
  if (!FN_NAME_RE.test(name) && hint && FN_NAME_RE.test(hint)) name = hint;
  if (!FN_NAME_RE.test(name)) {
    const seg = new URL(req.url).pathname.split("/").filter(Boolean);
    const i = seg.indexOf("v1"); const g = i >= 0 ? seg[i + 1] : seg[0];
    name = g && FN_NAME_RE.test(g) ? g : "send-email";
  }
  return SUPABASE_URL + "/functions/v1/" + name;
}

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
async function unsubUrl(email: string, base: string) {
  return base + "?unsubscribe=1&e=" + encodeURIComponent(norm(email)) + "&t=" + (await sign(email));
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

// ==== GENERATED by tools/build_send_email.py — edit admin.html / monday.part.js, not here ==== START
const { build, text, personalise } = (function () {
  var ASSET = "https://www.drivesq.co.uk/email/";
  var esc = function (v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var THEMES = {
    classic: { name: "Classic", page: "#f3eee8", card: "#ffffff", ink: "#1f1714", soft: "#5d534d", head: "#0b0204", accent: "#D10A11", gold: "#b07d00", box: "#fff7d6", boxInk: "#3d2f05", line: "#eee3d8", foot: "#8a7f78" },
    night: { name: "Night drive", page: "#0b0204", card: "#16080a", ink: "#f4eeee", soft: "#c9bcbc", head: "#0b0204", accent: "#D10A11", gold: "#F5C518", box: "#2a0a0d", boxInk: "#ffe680", line: "#2e1416", foot: "#8f7f80" },
    bold: { name: "Bold red", page: "#f6f1ec", card: "#ffffff", ink: "#1f1714", soft: "#5d534d", head: "#8f0007", accent: "#D10A11", gold: "#b07d00", box: "#fde8e9", boxInk: "#7a0006", line: "#f1d6d7", foot: "#8a7f78" },
    clean: { name: "Clean & professional", page: "#f4f5f7", card: "#ffffff", ink: "#1a1d21", soft: "#5b6168", head: "#111317", accent: "#C8102E", gold: "#8a6d00", box: "#f6f7f9", boxInk: "#1a1d21", line: "#e6e8eb", foot: "#8b9097" }
  };
  var BANNERS = {
    drive: { file: "banner-drive.gif", alt: "DriveSQ — Pass First Time" },
    gift: { file: "banner-gift.gif", alt: "DriveSQ Free Hour Draw — chance to win a free lesson" },
    pass: { file: "banner-pass.gif", alt: "Congratulations — another DriveSQ pass" },
    welcome: { file: "banner-welcome.gif", alt: "Welcome to DriveSQ — booking received" },
    booked: { file: "banner-booked.gif", alt: "You're booked in with DriveSQ" },
    ready: { file: "banner-ready.gif", alt: "Ready to start your driving lessons with DriveSQ?" },
    review: { file: "banner-review.gif", alt: "Help learners find DriveSQ — leave a Google review" },
    camera: { file: "banner-camera.gif", alt: "Share your DriveSQ pass photos" },
    weekly: { file: "banner-weekly.gif", alt: "DriveSQ weekly reminders for instructors" },
    none: null
  };
  var FONT = "'Barlow Condensed','Arial Narrow',Arial,Helvetica,sans-serif", BODYF = "Inter,'Segoe UI',Arial,Helvetica,sans-serif";

  /* tiny formatting: **bold**, [text](url), blank line = new paragraph, lines starting "- " = bullets */
  function fmtInline(t, th) {
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|tel:[^)\s]+)\)/g, '<a href="$2" style="color:' + th.accent + ';font-weight:700;text-decoration:underline">$1</a>')
      .replace(/\{\{(first_name|name|email)\}\}/g, "{{$1}}");
  }
  function fmtBody(src, th, opt) {
    var isLi = function (l) { return /^\s*[-•]\s+/.test(l); };
    var list = function (lines) {
      return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px">' + lines.map(function (l) {
        return '<tr><td width="26" valign="top" style="padding:3px 0;font-family:' + BODYF + ';font-size:16px;line-height:24px;color:' + th.accent + ';font-weight:700">✓</td><td style="padding:3px 0;font-family:' + BODYF + ';font-size:16px;line-height:24px;color:' + th.ink + '">' + fmtInline(l.replace(/^\s*[-•]\s+/, ""), th) + "</td></tr>";
      }).join("") + "</table>";
    };
    var para = function (lines, last) { return '<p style="margin:0 0 ' + (last ? 18 : 8) + 'px;font-family:' + BODYF + ';font-size:16px;line-height:26px;color:' + th.ink + '">' + lines.map(function (l) { return fmtInline(l, th); }).join("<br>") + "</p>"; };
    var IMG = /^\s*!\[([^\]]*)\]\(((?:https?:\/\/|email\/)[^)\s]+)\)(\{(small|medium|full)\})?\s*$/;
    var img = function (l) {
      var m = l.match(IMG), size = m[4] || "medium", w = size === "small" ? 200 : size === "full" ? 520 : 340;
      var src = /^email\//.test(m[2]) ? (opt && opt.base ? opt.base : ASSET) + m[2].slice(6) : m[2];
      return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px"><tr><td align="center"><img src="' + esc(src) + '" width="' + w + '" alt="' + esc(m[1]) + '" style="width:100%;max-width:' + w + 'px;height:auto;border-radius:14px;display:block"></td></tr></table>';
    };
    var hr = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 22px"><tr><td style="border-top:1px solid ' + th.line + ';font-size:0;line-height:0">&nbsp;</td></tr></table>';
    return String(src || "").replace(/\r/g, "").split(/\n{2,}/).map(function (b) {
      var lines = b.split("\n").filter(function (l) { return l.trim(); }), out = "", run = [], mode = null;
      var flush = function (end) { if (!run.length) return; out += mode === "li" ? list(run) : para(run, end); run = []; };
      lines.forEach(function (l, i) {
        if (IMG.test(l)) { flush(true); mode = null; out += img(l); return; }
        if (/^\s*-{3,}\s*$/.test(l)) { flush(true); mode = null; out += hr; return; }
        var m = isLi(l) ? "li" : "p"; if (m !== mode) { flush(false); mode = m; } run.push(l);
      });
      flush(true);
      return out;
    }).join("");
  }
  function button(text, url, th) {
    if (!text || !url) return "";
    var t = esc(text), u = esc(url);
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 22px"><tr><td align="center" bgcolor="' + th.accent + '" style="border-radius:999px" class="dsq-btn">' +
      '<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="' + u + '" style="height:54px;v-text-anchor:middle;width:300px" arcsize="50%" stroke="f" fillcolor="' + th.accent + '"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold">' + t + "</center></v:roundrect><![endif]-->" +
      '<!--[if !mso]><!-- --><a href="' + u + '" target="_blank" style="display:inline-block;padding:17px 34px;font-family:' + BODYF + ';font-size:17px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px;background:' + th.accent + ';mso-padding-alt:0">' + t + " &rarr;</a><!--<![endif]-->" +
      "</td></tr></table>";
  }

  /* d: { theme, banner, subject, preheader, headline, greeting, body, highlightValue, highlightLabel, buttonText, buttonUrl, secondaryText, signoff, footerNote } */
  function build(d, opt) {
    opt = opt || {};
    var th = THEMES[d.theme] || THEMES.classic, base = opt.base || ASSET, bn = BANNERS[d.banner] || null;
    var pre = esc(d.preheader || "") + "&zwnj;&nbsp;".repeat(60);
    var hl = d.highlightValue ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 22px"><tr><td align="center" style="background:' + th.box + ';border-radius:16px;padding:20px 16px;border:1px solid ' + th.line + '">' +
      '<div style="font-family:' + FONT + ';font-size:44px;line-height:46px;font-weight:800;color:' + (d.theme === "night" ? th.gold : th.accent) + ';text-transform:uppercase" class="dsq-pop">' + esc(d.highlightValue) + "</div>" +
      (d.highlightLabel ? '<div style="font-family:' + BODYF + ';font-size:14px;line-height:20px;color:' + th.boxInk + ';margin-top:4px">' + fmtInline(d.highlightLabel, th) + "</div>" : "") + "</td></tr></table>" : "";
    var html = '<!DOCTYPE html><html lang="en-GB" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>' +
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">' +
      '<meta name="color-scheme" content="' + (d.theme === "night" ? "dark" : "light") + '"><meta name="supported-color-schemes" content="' + (d.theme === "night" ? "dark" : "light") + '">' +
      "<title>" + esc(d.subject || "DriveSQ") + "</title>" +
      '<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->' +
      '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">' +
      "<style>body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%}img{border:0;outline:none;text-decoration:none;display:block}a{color:" + th.accent + "}" +
      "@media (max-width:620px){.dsq-wrap{width:100%!important}.dsq-pad{padding-left:22px!important;padding-right:22px!important}.dsq-h1{font-size:34px!important;line-height:36px!important}}" +
      /* gentle animation in clients that support CSS animation (Apple Mail, iOS Mail, some others) — everyone else sees the static design */
      "@keyframes dsqpulse{0%,100%{box-shadow:0 0 0 0 rgba(209,10,17,.45)}50%{box-shadow:0 0 0 10px rgba(209,10,17,0)}}" +
      "@keyframes dsqpop{0%{transform:scale(.92);opacity:.6}60%{transform:scale(1.04);opacity:1}100%{transform:scale(1)}}" +
      "@keyframes dsqshine{0%{background-position:-200% 0}100%{background-position:200% 0}}" +
      ".dsq-btn{animation:dsqpulse 2.2s ease-in-out infinite}.dsq-pop{animation:dsqpop .9s ease-out both}" +
      ".dsq-shine{background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.35) 50%,transparent 100%) no-repeat;background-size:50% 100%;animation:dsqshine 3.5s ease-in-out infinite}" +
      "@media (prefers-reduced-motion:reduce){.dsq-btn,.dsq-pop,.dsq-shine{animation:none!important}}</style></head>" +
      '<body style="margin:0;padding:0;background:' + th.page + '">' +
      '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:' + th.page + '">' + pre + "</div>" +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + th.page + '"><tr><td align="center" style="padding:24px 12px">' +
      '<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->' +
      '<table role="presentation" class="dsq-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:' + th.card + ';border-radius:22px;overflow:hidden;border:1px solid ' + th.line + '">' +
      /* header (the animated banners already carry the logo, so the header only shows without a banner) */
      (bn ? "" : '<tr><td style="background:' + (d.theme === "bold" ? "linear-gradient(135deg,#1a0204,#8f0007 60%,#D10A11)" : th.head) + ';background-color:' + th.head + ';padding:18px 26px" class="dsq-pad">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td valign="middle" width="56"><img src="' + base + 'logo-96.png" width="44" height="44" alt="DriveSQ" style="width:44px;height:44px"></td>' +
      '<td valign="middle" style="font-family:' + FONT + ';font-size:26px;line-height:28px;font-weight:800;color:#ffffff;letter-spacing:.5px">Drive<span style="color:#ff2d35">SQ</span></td>' +
      '<td valign="middle" align="right" style="font-family:' + FONT + ';font-size:14px;line-height:16px;font-weight:700;letter-spacing:2px;color:#F5C518;text-transform:uppercase">Pass First Time</td></tr></table></td></tr>') +
      (bn ? '<tr><td style="background:' + th.head + ';line-height:0;font-size:0"><img src="' + base + bn.file + '" width="600" alt="' + esc(bn.alt) + '" style="width:100%;max-width:600px;height:auto"></td></tr>' : "") +
      /* body */
      '<tr><td class="dsq-pad" style="padding:34px 40px 10px">' +
      (d.headline ? '<h1 class="dsq-h1" style="margin:0 0 18px;font-family:' + FONT + ';font-size:40px;line-height:42px;font-weight:800;color:' + th.ink + ';text-transform:uppercase;letter-spacing:.3px">' + fmtInline(d.headline, th) + "</h1>" : "") +
      (d.greeting !== "" ? '<p style="margin:0 0 16px;font-family:' + BODYF + ';font-size:16px;line-height:26px;color:' + th.ink + ';font-weight:600">' + fmtInline(d.greeting || "Hi {{first_name}},", th) + "</p>" : "") +
      fmtBody(d.body, th, opt) + hl + button(d.buttonText, d.buttonUrl, th) +
      (d.secondaryText ? '<p style="margin:0 0 20px;font-family:' + BODYF + ';font-size:14px;line-height:22px;color:' + th.soft + ';text-align:center">' + fmtInline(d.secondaryText, th) + "</p>" : "") +
      '<p style="margin:6px 0 26px;font-family:' + BODYF + ';font-size:16px;line-height:26px;color:' + th.ink + '">' + fmtInline(d.signoff || "Speak soon,\n**The DriveSQ team**", th).replace(/\n/g, "<br>") + "</p>" +
      "</td></tr>" +
      /* contact strip */
      '<tr><td class="dsq-pad" style="padding:0 40px 26px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ' + th.line + '"><tr>' +
      '<td style="padding-top:18px;font-family:' + BODYF + ';font-size:14px;line-height:22px;color:' + th.soft + '">' +
      '<a href="https://wa.me/447352932003" style="color:' + th.accent + ';font-weight:700;text-decoration:none">WhatsApp 07352 932003</a> &nbsp;·&nbsp; <a href="https://www.drivesq.co.uk/" style="color:' + th.accent + ';font-weight:700;text-decoration:none">drivesq.co.uk</a>' +
      "</td></tr></table></td></tr>" +
      "</table>" +
      /* footer */
      '<table role="presentation" class="dsq-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px"><tr><td class="dsq-pad" align="center" style="padding:20px 30px 6px;font-family:' + BODYF + ';font-size:12px;line-height:19px;color:' + th.foot + '">' +
      esc(d.footerNote || "You're getting this email because you booked or asked about driving lessons with DriveSQ.") +
      '<br>DriveSQ Driving School · Greater Manchester &amp; Solihull, UK<br><a href="{{unsubscribe_url}}" style="color:' + th.foot + ';text-decoration:underline">Unsubscribe</a> from DriveSQ emails</td></tr></table>' +
      "<!--[if mso]></td></tr></table><![endif]-->" +
      "</td></tr></table></body></html>";
    return html;
  }

  function text(d) {
    var strip = function (s) { return String(s || "").replace(/^\s*!\[[^\]]*\]\([^)]*\)(\{\w+\})?\s*$/gm, "").replace(/^\s*-{3,}\s*$/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)"); };
    return [d.headline ? strip(d.headline).toUpperCase() : "", "", strip(d.greeting || "Hi {{first_name}},"), "", strip(d.body),
      d.highlightValue ? "\n" + d.highlightValue + (d.highlightLabel ? " — " + strip(d.highlightLabel) : "") : "",
      d.buttonText && d.buttonUrl ? "\n" + d.buttonText + ": " + d.buttonUrl : "", d.secondaryText ? "\n" + strip(d.secondaryText) : "",
      "\n" + strip(d.signoff || "Speak soon,\nThe DriveSQ team"), "\n—\nDriveSQ Driving School · WhatsApp 07352 932003 · https://www.drivesq.co.uk/",
      strip(d.footerNote || "You're getting this email because you booked or asked about driving lessons with DriveSQ."), "Unsubscribe: {{unsubscribe_url}}"].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* personalise one email */
  function personalise(s, c) {
    var full = String((c && c.name) || "").trim(), first = full.split(/\s+/)[0] || "";
    first = first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
    return String(s).replace(/\{\{first_name\}\}/g, esc(first || "there")).replace(/\{\{name\}\}/g, esc(full || "there")).replace(/\{\{email\}\}/g, esc((c && c.email) || ""));
  }

  return { build: build, text: text, personalise: personalise };
})();
const { STANDING, FOCUS } = (function () {
  const STANDING = "**Every lesson — the basics**\n- **Provisional licence:** check it's valid and the details match before the first drive\n- **Eyesight:** before the first lesson, check they can read a number plate from 20 metres (with glasses or lenses if they wear them)\n- **No phone:** you MUST NOT use a hand-held phone while supervising a learner (Highway Code rule 149) — put it on Do Not Disturb\n- **L plates** on the front and back, dual controls checked, seat belts on (rule 99)\n- **ADI badge** (or trainee licence) on display in the car\n- **Update the portal** after each lesson — status, lesson log and progress\n\n📘 [Open the Lesson Quality Guide](https://www.drivesq.co.uk/instructor-lesson-guide.html) — DVSA's 17 competencies and a 1-minute self-check";
  const FOCUS = [
    ["First lessons", "- Start somewhere quiet and explain the controls clearly\n- Set expectations for the first few lessons and agree a plan\n- Leave time at the end to talk through progress"],
    ["New referrals", "- Contact new students within 24 hours of being referred\n- Update their status straight away: Booked / Not booked yet / Can't reach / Not going ahead\n- If you can't take a student, tell us so we can reassign them quickly"],
    ["Rest and fatigue", "- Don't teach tired — tiredness increases the risk of collision (Highway Code rule 91)\n- Build breaks into long teaching days and keep water in the car"],
    ["Professional standards", "- Be on time and let students know early if you're running late\n- Keep messages and conversations professional and respectful\n- Take payments only as agreed with DriveSQ and the student"],
    ["Test preparation", "- Use mock tests on local routes before booking or confirming a test\n- Practise show me / tell me questions\n- Point students to the 14 theory mock tests in their Student Portal"],
    ["Weather and visibility", "- Check lights, demisting and tyres before lessons in bad weather\n- Teach longer stopping distances on wet and icy roads\n- Reschedule if conditions aren't safe for a learner"],
    ["Google reviews", "- At the end of the lesson, once you've parked and the engine is off, ask for an honest Google review before they go home\n- Hand them the DriveSQ Google review tag to tap with their phone, show the QR code in your portal, or send the link on WhatsApp — your portal reminds you when a lesson finishes\n- Ask every learner, not only the happy ones; never offer discounts or free lessons for a review, and never write one for them"],
    ["Reviews and passes", "- After a pass, ask the student for a Google review — it helps every DriveSQ instructor\n- Send us pass photos (with the student's permission) for the website"],
    ["Lesson records", "- Log every lesson in the portal so students can see their progress\n- Note the topics covered and what to work on next time"],
    ["Planning a quality lesson", "- Read last lesson's notes and agree one or two clear goals with the learner at the start\n- Choose a practice area that suits their level, and adapt the plan if it's too easy or too hard\n- Finish with the learner reflecting on their own performance (DVSA looks for this)"],
    ["Risk management", "- Agree at the start how responsibility for risk is shared, including when you'll use the dual controls\n- Give directions clearly and in good time; intervene early and in proportion\n- Debrief every intervention so it becomes a learning point. On a standards check, 7 or less on risk management is an automatic fail"],
    ["Coaching, not just instructing", "- Ask before you tell: \"What did you notice at that junction?\"\n- Match their learning style; give specific, timely feedback\n- Follow up their questions and keep a respectful, non-discriminatory manner"]];
  return { STANDING, FOCUS };
})();
// ===================== MONDAY INSTRUCTOR EMAILS =====================
// POST { action: "monday" }                      — send this week's Monday emails (each one only once per week)
// POST { action: "monday", dry: true }           — preview: returns every email without sending anything
// POST { action: "monday", cron: true }          — from Supabase Cron; waits until 7am UK time on Monday
//   • every approved instructor  → 📋 DriveSQ weekly reminders (rules + this week's focus)
//   • franchise instructors      → 💰 weekly franchise fee reminder (fee from admin → Growth settings)
//   • referral instructors       → 🧾 statement of students CONFIRMED BOOKED BY ADMIN and not yet paid, with each referral's amount
// Each one also goes to the Instructor Portal (admin_messages) and as a push notification.
const LONDON = "Europe/London";
function londonParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}
function londonMidnight(y, m, d) {            // the instant it is 00:00 in London on y-m-d
  const guess = Date.UTC(y, m - 1, d);
  const lp = londonParts(new Date(guess));
  const shownAsUTC = Date.UTC(lp.y, lp.m - 1, lp.d, lp.h);
  return new Date(guess - (shownAsUTC - guess));
}
function mondayStart(now = new Date()) {
  const p = londonParts(now), back = (p.dow + 6) % 7;
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d) - back * 864e5);
  return londonMidnight(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
const ukDate = (d, o) => new Date(d).toLocaleDateString("en-GB", Object.assign({ timeZone: LONDON }, o || { day: "numeric", month: "short", year: "numeric" }));
const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "";
const money = (v) => "£" + (Math.round(v * 100) / 100).toFixed(v % 1 ? 2 : 0);
const fmtPhone = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.length === 11 && d[0] === "0" ? d.slice(0, 5) + " " + d.slice(5) : String(p || "").trim(); };
const PORTAL_URL = "https://www.drivesq.co.uk/dashboard.html";

function weeklyDesign(ins, ws) {
  const weekNo = Math.floor(ws.getTime() / (7 * 864e5)), f = FOCUS[weekNo % FOCUS.length], wc = ukDate(ws, { day: "numeric", month: "short" });
  return { theme: "clean", banner: "weekly", subject: `📋 DriveSQ weekly reminders: ${f[0]} (w/c ${wc})`, preheader: `This week's focus: ${f[0]} — plus the basics for every lesson.`,
    headline: `${f[0]}`, greeting: `Hi ${firstName(ins.full_name) || "there"},`,
    body: `**This week's focus: ${f[0]}**\n${f[1]}\n\n${STANDING}`, buttonText: "Open my Instructor Portal", buttonUrl: PORTAL_URL,
    signoff: "Thanks for all you do,\nThe DriveSQ team", footerNote: "You're getting this because you're a DriveSQ instructor." };
}
function franchiseDesign(ins, ws, fee) {
  const wc = ukDate(ws, { weekday: "long", day: "numeric", month: "long" });
  return { theme: "classic", banner: "none", transactional: true,
    subject: `💰 DriveSQ franchise fee: ${money(fee)} due today (w/c ${ukDate(ws, { day: "numeric", month: "short" })})`,
    preheader: `Hi ${firstName(ins.full_name)} — your weekly franchise fee is due today. Already paid? Please ignore this email.`,
    headline: "Weekly franchise **fee**", greeting: `Hi ${firstName(ins.full_name) || "there"},`,
    body: `Just a friendly reminder that this week's DriveSQ franchise fee is due today.\n\n✅ **Already paid? Please ignore this email** — thank you.\n\n- **Week:** commencing ${wc}\n- **Amount:** ${money(fee)}\n- **Due:** today\n\nPlease pay the usual way.\n\n` +
      `**How this amount is worked out**\n- It's your weekly franchise fee as agreed with DriveSQ: **${money(fee)} a week**\n- One fee per week (Monday to Sunday) — it doesn't change with the number of students or lessons that week\n- This reminder is sent automatically every Monday, so a payment made over the weekend may not show yet — if you've paid, please ignore it\n- Think the amount is wrong? Just reply and we'll check it`,
    highlightValue: money(fee), highlightLabel: `Franchise fee · week commencing ${wc}`,
    buttonText: "Open my Instructor Portal", buttonUrl: PORTAL_URL,
    secondaryText: "Any questions about your fee? Just reply to this email or [WhatsApp us](https://wa.me/447352932003).",
    signoff: "Thank you,\nThe DriveSQ team", footerNote: "You're getting this because you're a DriveSQ franchise instructor." };
}
function statementDesign(ins, ws, rows, paid) {
  const total = rows.reduce((s, r) => s + r._amt, 0), n = rows.length, wc = ukDate(ws, { day: "numeric", month: "short" });
  const line = (r, i) => `${i + 1}. **${r.student_name || "Student"}**` + (r.student_phone ? ` · ${fmtPhone(r.student_phone)}` : "") +
    (r.postcode || r.area ? ` · ${r.postcode || r.area}` : "") + ` · referred ${ukDate(r.created_at)} · **${money(r._amt)}**`;
  return { theme: "classic", banner: "none", transactional: true,
    subject: `🧾 Your DriveSQ referral statement: ${money(total)} for ${n} booked student${n > 1 ? "s" : ""} (w/c ${wc})`,
    preheader: `${n} booked student${n > 1 ? "s" : ""} · ${money(total)} in referral fees · already paid? Please ignore this email.`,
    headline: "Referral **statement**", greeting: `Hi ${firstName(ins.full_name) || "there"},`,
    body: `Here's your weekly statement of students we have down as **booked**, with the referral fee for each one.\n\n` +
      `✅ **Already paid? Please ignore this email** — thank you, and sorry for the reminder.\n\n` +
      `⚠️ **Please check this list — we may have made a mistake.** Tell us for each student whether they **booked** a lesson with you or **not**.\n\n` +
      rows.map(line).join("\n") +
      `\n\n**Total: ${money(total)}**` +
      `\n\n**Did any of these students NOT book?**\n- Just reply to this email or [WhatsApp us](https://wa.me/447352932003) with their name\n- If a student didn't book, their fee is **£0** — we'll remove it and send you a corrected total\n- If they all booked, there's nothing else you need to do` +
      (paid.length ? `\n\n**Paid since last week — thank you**\n` + paid.map((r) => `- ${r.student_name || "Student"} · ${money(r._amt)}`).join("\n") : "") +
      `\n\n**How your total is worked out**\n` +
      `- **Who is on the list:** students we referred to you who we've confirmed have booked a lesson with you (we check with you and with the student), and whose fee hasn't been paid yet\n` +
      `- **The fee for each student:** the referral fee recorded for that student in our referral records — it's shown next to each name (usually £25)\n` +
      `- **The total:** those fees added together — ${rows.map((r) => money(r._amt)).join(" + ")} = **${money(total)}**\n` +
      `- **Not included:** students who haven't booked, students who cancelled or didn't go ahead, students moved to another instructor, replacement students we owe you, and any fee you've already paid\n` +
      `- **When it's made:** automatically every Monday from our records at that moment — so a payment made over the weekend may not show yet. If you've paid, please ignore this email`,
    highlightValue: money(total), highlightLabel: `Referral fees for ${n} student${n > 1 ? "s" : ""} marked booked · not booked = **£0**, just tell us`,
    buttonText: "Open my Instructor Portal", buttonUrl: PORTAL_URL,
    secondaryText: "Not booked, or something not right? Reply to this email or [WhatsApp us](https://wa.me/447352932003) — no charge for students who didn't book.",
    signoff: "Thank you,\nThe DriveSQ team", footerNote: "You're getting this because you're a DriveSQ referral instructor." };
}

async function resendBatch(mails) {
  if (!mails.length) return [];
  let r = null, out = null, tries = 0;
  while (tries++ < 3) {
    r = await fetch((Deno.env.get("RESEND_API_URL") || "https://api.resend.com") + "/emails/batch", { method: "POST", headers: { Authorization: "Bearer " + RESEND_KEY, "Content-Type": "application/json" }, body: JSON.stringify(mails) });
    out = await r.json().catch(() => ({}));
    if (r.status !== 429) break;
    await new Promise((res) => setTimeout(res, 1100 * tries));
  }
  const ids = out && Array.isArray(out.data) ? out.data : [];
  return mails.map((m, k) => (r && r.ok && ids[k]?.id ? { status: "sent", id: ids[k].id } : { status: "failed", error: (out && (out.message || out.error?.message)) || "Resend " + (r ? r.status : "error") }));
}

async function monday(sb, req, body) {
  const now = new Date(), lp = londonParts(now);
  if (body.cron && !body.force && (lp.dow !== 1 || lp.h < 7)) return { ok: true, waiting: "Runs from 7am UK time on Monday", london: lp };
  if (!SERVICE_KEY) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY isn't available to the function" };
  if (!RESEND_KEY && !body.dry) return { ok: false, error: "RESEND_API_KEY is not set" };
  const ws = mondayStart(now), since = ws.toISOString(), base = fnUrl(req, String(body.fn_name || ""));
  const only = Array.isArray(body.only) ? body.only : ["W", "F", "R"];

  const cfgRow = await sb.from("growth_settings").select("value").eq("key", "config").maybeSingle();
  const cfg = Object.assign({ franchiseDef: 50, franchiseBy: {}, refFee: 25 }, (cfgRow.data && cfgRow.data.value) || {});
  const feeFor = (id) => { const v = parseFloat((cfg.franchiseBy || {})[id]); return isNaN(v) ? parseFloat(cfg.franchiseDef) || 0 : v; };
  const refAmt = (r) => parseFloat(r.amount) || 0;   // the amount in the Referrals section, exactly as admin shows it (blank = no fee)

  let insQ = sb.from("instructors").select("*").eq("status", "approved");
  if (body.instructor_id) insQ = insQ.eq("id", body.instructor_id);
  const { data: instructors, error: iErr } = await insQ;
  if (iErr) return { ok: false, error: "instructors: " + iErr.message };
  const ids = (instructors || []).map((i) => i.id);
  const { data: refs } = ids.length ? await sb.from("referrals").select("*").in("instructor_id", ids).limit(10000) : { data: [] };
  const { data: done } = ids.length ? await sb.from("admin_messages").select("instructor_id,subject").in("instructor_id", ids).gte("created_at", since) : { data: [] };
  const already = (iid, prefix) => (done || []).some((m) => m.instructor_id === iid && String(m.subject || "").startsWith(prefix));
  const { data: unsubRows } = await sb.from("email_contacts").select("email_key,tags").neq("status", "subscribed").limit(10000);
  const unsub = new Set((unsubRows || []).map((r) => r.email_key));
  const optOutAll = new Set((unsubRows || []).filter((r) => (r.tags || []).includes("opt_out_all")).map((r) => r.email_key));   // admin → instructor profile → "Opt out of emails"

  // booked = confirmed by admin (same rule as _refAdminBooked in admin.html): admin's ✅, not just the instructor saying so
  const isBooked = (r) => { if (r.flag_color !== "green") return false; const n = String(r.admin_notes || ""), a = n.lastIndexOf("✅ Booked — confirmed by admin"), b = n.lastIndexOf("↩️ Booked mark removed by admin"); return a > b || (a < 0 && r.reply_status !== "booked"); };
  const lastWeek = ws.getTime() - 7 * 864e5;
  const jobs = [];
  for (const ins of instructors || []) {
    const model = String(ins.instructor_model || "").toLowerCase();
    if (only.includes("F") && model === "franchise") {
      const fee = feeFor(ins.id);
      if (fee > 0 && !already(ins.id, "💰 DriveSQ franchise fee")) jobs.push({ ins, kind: "F", d: franchiseDesign(ins, ws, fee), type: "franchise_fee", amount: fee });
    }
    if (only.includes("R") && model === "referral") {
      const mine = (refs || []).filter((r) => r.instructor_id === ins.id && !r.is_cancelled && !r.is_credit && !/Reassigned to /.test(r.admin_notes || ""));
      const rows = mine.filter((r) => isBooked(r) && !r.is_paid).map((r) => Object.assign({}, r, { _amt: refAmt(r) })).filter((r) => r._amt > 0)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const paid = mine.filter((r) => r.is_paid && r.paid_at && new Date(r.paid_at).getTime() >= lastWeek).map((r) => Object.assign({}, r, { _amt: refAmt(r) }));
      if (rows.length && !already(ins.id, "🧾 Your DriveSQ referral statement")) jobs.push({ ins, kind: "R", d: statementDesign(ins, ws, rows, paid), type: "general", amount: rows.reduce((s, r) => s + r._amt, 0), students: rows.length });
    }
    if (only.includes("W") && !already(ins.id, "📋 DriveSQ weekly reminders")) jobs.push({ ins, kind: "W", d: weeklyDesign(ins, ws), type: "general" });
  }

  if (body.dry) return { ok: true, dry: true, week: since, jobs: jobs.map((j) => ({ instructor_id: j.ins.id, name: j.ins.full_name, email: j.ins.email || null, kind: j.kind, subject: j.d.subject, amount: j.amount || null, students: j.students || null, html: personalise(build(j.d), { name: j.ins.full_name, email: j.ins.email }) })) };

  const out = [];
  for (let i = 0; i < jobs.length; i += 50) {
    const chunk = jobs.slice(i, i + 50), mails = [], at = [];
    for (let k = 0; k < chunk.length; k++) {
      const j = chunk[k], e = norm(j.ins.email || ""), d = j.d;
      // portal message first — it is also what stops a second send this week
      const plainBody = text(d).split("\n—\n")[0];
      await sb.from("admin_messages").insert([{ instructor_id: j.ins.id, subject: d.subject, body: j.kind === "W" ? d.body : plainBody, message_type: j.type, is_read: false, dismissed: false, created_at: new Date().toISOString() }]);
      try {
        await fetch(SUPABASE_URL + "/functions/v1/send-push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + SERVICE_KEY },
          body: JSON.stringify({ instructor_id: j.ins.id, title: d.subject, body: String(d.preheader || "").slice(0, 120), url: "/dashboard.html" }) });
      } catch (_) { /* push is best effort */ }
      const res = { instructor: j.ins.full_name, kind: j.kind, subject: d.subject, email: e || null, status: "portal only" };
      out.push(res);
      if (!EMAIL_RE.test(e)) continue;
      if (optOutAll.has(e)) { res.status = "portal only (opted out of emails)"; continue; }
      if (!d.transactional && unsub.has(e)) { res.status = "skipped (unsubscribed)"; continue; }
      const u = await unsubUrl(e, base), c = { name: j.ins.full_name, email: e };
      const mail = { from: FROM, to: [e], subject: d.subject, html: personalise(build(d), c).split("{{unsubscribe_url}}").join(u), text: personalise(text(d), c).split("{{unsubscribe_url}}").join(u),
        tags: [{ name: "campaign", value: "monday_" + j.kind }] };
      if (!d.transactional) mail.headers = { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
      if (REPLY_TO) mail.reply_to = REPLY_TO;
      mails.push(mail); at.push(res);
    }
    const rs = await resendBatch(mails);
    rs.forEach((r, k) => { at[k].status = r.status; if (r.error) at[k].error = r.error; });
  }
  const summary = { at: now.toISOString(), week: since, sent: out.filter((r) => r.status === "sent").length, portal: out.length, F: out.filter((r) => r.kind === "F").length, R: out.filter((r) => r.kind === "R").length, W: out.filter((r) => r.kind === "W").length, failed: out.filter((r) => r.status === "failed").length, by: body.cron ? "cron" : "admin" };
  if (out.length || body.cron) await sb.from("growth_settings").upsert({ key: "monday_last", value: summary, updated_at: now.toISOString() }, { onConflict: "key" });
  return { ok: true, ...summary, results: out };
}

// ==== GENERATED ==== END

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

  if (body.action === "status") {
    const last = await sb.from("growth_settings").select("value").eq("key", "monday_last").maybeSingle();
    return json({ ok: true, from: FROM, replyTo: REPLY_TO || null, resend: !!RESEND_KEY, service: !!SERVICE_KEY, features: ["monday"], monday_last: (last.data && last.data.value) || null });
  }
  if (body.action === "monday") { try { return json(await monday(sb, req, body)); } catch (e) { return json({ ok: false, error: String((e && e.message) || e) }, 500); } }
  if (body.action !== "send") return json({ ok: false, error: "Unknown action" }, 400);
  if (!RESEND_KEY) return json({ ok: false, error: "RESEND_API_KEY is not set" }, 500);

  const base = fnUrl(req, String(body.fn_name || ""));
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
    const u = await unsubUrl(e, base);
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
