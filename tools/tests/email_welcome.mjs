
const LONDON="Europe/London";
const ukDate=(d)=>d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:LONDON});
const norm=(e)=>String(e||"").trim().toLowerCase(), EMAIL_RE=/^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/, firstName=(n)=>String(n||"").trim().split(/\s+/)[0]||"";
const RESEND_KEY="k", FROM="DriveSQ <hello@drivesq.co.uk>", REPLY_TO=""; const fnUrl=()=>"https://f"; const unsubUrl=async(e)=>"https://u/"+e;
const SENT=[]; const resendBatch=async(m)=>{m.forEach(x=>SENT.push(x));return m.map(()=>({status:"sent"}));};
const {build,text,personalise}=(function(){  var ASSET = "https://www.drivesq.co.uk/email/";
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
    voucher: { file: "banner-voucher.gif", alt: "£10 off your first 10 driving lesson hours with DriveSQ" },
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
      '<br>DriveSQ Driving School · Greater Manchester &amp; Solihull, UK<br><a href="https://www.drivesq.co.uk/terms.html" style="color:' + th.foot + ';text-decoration:underline">Terms &amp; conditions</a> · <a href="{{unsubscribe_url}}" style="color:' + th.foot + ';text-decoration:underline">Unsubscribe</a> from DriveSQ emails</td></tr></table>' +
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
      strip(d.footerNote || "You're getting this email because you booked or asked about driving lessons with DriveSQ."), "Terms and conditions: https://www.drivesq.co.uk/terms.html", "Unsubscribe: {{unsubscribe_url}}"].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* personalise one email */
  function personalise(s, c) {
    var full = String((c && c.name) || "").trim(), first = full.split(/\s+/)[0] || "";
    first = first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
    return String(s).replace(/\{\{first_name\}\}/g, esc(first || "there")).replace(/\{\{name\}\}/g, esc(full || "there")).replace(/\{\{email\}\}/g, esc((c && c.email) || ""));
  }

  return {build:build,text:text,personalise:personalise};})();
const londonParts=()=>({}); const londonMidnight=()=>0;

// ===================== FOLLOW-UP EMAILS TO ENQUIRIES WHO HAVEN'T BOOKED =====================
// POST { action: "nurture", dry: true }                       — preview who is due what (sends nothing)
// POST { action: "nurture", test_to: "me@x.com", step: 1|2|3 } — send ONE sample to that address (no records touched)
// POST { action: "nurture", cron: true }                      — daily from Supabase Cron (9am–7pm UK only)
// OFF until switched on in admin (growth_settings "nurture_config" → enabled). Rules, every time:
//   • only website/WhatsApp enquiries created on or after the start date (default 15 Nov 2026) that left an email
//   • 3 emails at most: about 1 day, 4 days and 9 days after the enquiry (each sent once; each needs the one before)
//   • never to: students already booked (admin ✅ or paid), flagged 🚩, signed up to the Student Portal, cancelled, unsubscribed
//   • one sequence per email address; every email has an unsubscribe link
const NURTURE_AFTER_H = [0, 24, 96, 216], NURTURE_WINDOW_H = 72;
const waLink = (num, text) => "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
const ukWa = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.startsWith("44") ? d : d.startsWith("0") ? "44" + d.slice(1) : d.length >= 10 ? d : ""; };
function nurtureDesign(step, first, ins, place) {
  const hi = `Hi ${first || "there"},`, insFirst = ins ? firstName(ins.full_name) : "", insWa = ins ? ukWa(ins.phone) : "";
  const schoolWa = waLink("447352932003", `Hi DriveSQ, it's ${first || "a learner"} — I'd like to book driving lessons`);
  if (step === 1) {
    const body = ins
      ? `Thanks for getting in touch with DriveSQ.\n\n**${ins.full_name}** is your local instructor${place ? " for " + place : ""}. They have your details and will contact you to arrange your first lesson as soon as they're free. You're very welcome to message them first to say hello and tell them which days and times suit you.\n\nNot sure about anything yet? Just reply to this email or [WhatsApp us](${schoolWa}). No pressure.`
      : `Thanks for getting in touch with DriveSQ.\n\nWe're matching you with the best instructor${place ? " near " + place : " for you"} and they'll be in touch to arrange your first lesson. If you haven't heard from us yet, [WhatsApp us on 07352 932003](${schoolWa}) and we'll get straight back to you.\n\nNot sure about anything yet? Just reply to this email. No pressure.`;
    return { theme: "clean", banner: "welcome", subject: `Ready to start your driving lessons, ${first || "there"}?`, preheader: ins ? `${insFirst} has your details and will be in touch.` : "We're matching you with an instructor near you.",
      headline: "Ready for your **first lesson**?", greeting: hi, body, buttonText: ins && insWa ? `Message ${insFirst} on WhatsApp` : "Message us on WhatsApp",
      buttonUrl: ins && insWa ? waLink(insWa, `Hi ${insFirst}, it's ${first || "a new student"} from DriveSQ`) : schoolWa, signoff: "Best wishes,\nThe DriveSQ team", footerNote: "You're getting this because you asked DriveSQ about driving lessons." };
  }
  if (step === 2) {
    return { theme: "clean", banner: "none", subject: `${first || "Your"}${first ? "," : ""} first 10 hours for £330`, preheader: "Manual or automatic, same price, in every area we cover.",
      headline: "Your first 10 hours for **£330**", greeting: hi,
      body: `New learners at DriveSQ get their **first 10 hours for £330**, paid in advance, in every area we cover.\n\n- Manual or automatic: the same price\n- Your instructor picks you up from home, college or work\n- Patient, friendly instructors\n- 180+ five-star Google reviews\n\nWhenever you're ready, just message us and we'll get your first lesson booked.`,
      highlightValue: "£330", highlightLabel: "first 10 hours · new learners · paid in advance",
      buttonText: "Book my first lesson", buttonUrl: schoolWa, signoff: "Best wishes,\nThe DriveSQ team", footerNote: "You're getting this because you asked DriveSQ about driving lessons." };
  }
  return { theme: "clean", banner: "none", subject: `Still thinking about learning to drive, ${first || "there"}?`, preheader: "This is our last email about your enquiry.",
    headline: "Still thinking about **learning to drive**?", greeting: hi,
    body: `This is the last email from us about your enquiry, so we won't keep filling your inbox.\n\nIf you've already started lessons somewhere else, or you're just not ready yet, that's completely fine and you don't need to reply.\n\nIf you'd still like to learn with us, message us on WhatsApp and we'll pick it up straight away. Good luck, whatever you decide!`,
    buttonText: "Message us on WhatsApp", buttonUrl: schoolWa, signoff: "All the best,\nThe DriveSQ team", footerNote: "You're getting this because you asked DriveSQ about driving lessons." };
}
async function nurture(sb, req, body) {
  const now = new Date(), lp = londonParts(now);
  if (body.cron && !body.force && (lp.h < 9 || lp.h > 19)) return { ok: true, waiting: "Runs between 9am and 7pm UK time", london: lp };
  if (!RESEND_KEY && !body.dry) return { ok: false, error: "RESEND_API_KEY is not set" };
  const base = fnUrl(req, String(body.fn_name || ""));
  const cfgRow = await sb.from("growth_settings").select("value").eq("key", "nurture_config").maybeSingle();
  const cfg = Object.assign({ enabled: false, start: "2026-11-15" }, (cfgRow.data && cfgRow.data.value) || {});

  // one sample email to a test address: nothing is recorded and nobody else is emailed
  if (body.test_to) {
    const to = norm(String(body.test_to)); if (!EMAIL_RE.test(to)) return { ok: false, error: "That test email address doesn't look right" };
    const step = [1, 2, 3].includes(+body.step) ? +body.step : 1, d = nurtureDesign(step, "Sara", body.test_assigned === false ? null : { full_name: "Dawood Khan", phone: "07700900001" }, "M19");
    const u = await unsubUrl(to, base), c = { name: "Sara", email: to };
    const res = await resendBatch([{ from: FROM, to: [to], subject: "[TEST] " + d.subject, html: personalise(build(d), c).split("{{unsubscribe_url}}").join(u), text: personalise(text(d), c).split("{{unsubscribe_url}}").join(u), headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }]);
    return { ok: res[0].status === "sent", test: true, step, to, status: res[0].status, error: res[0].error || null };
  }
  if (!cfg.enabled && !body.dry) return { ok: true, off: true, message: "Follow-up emails are switched off in admin" };

  const startMs = new Date(String(cfg.start) + "T00:00:00Z").getTime();
  const { data: wl } = await sb.from("waiting_list").select("*").gte("created_at", new Date(startMs).toISOString()).order("created_at", { ascending: true }).limit(3000);
  const [{ data: refs }, { data: accts }, { data: ins }, { data: contacts }] = await Promise.all([
    sb.from("referrals").select("*").limit(10000), sb.from("student_accounts").select("phone,email").limit(10000),
    sb.from("instructors").select("*"), sb.from("email_contacts").select("email_key,status").limit(10000)]);
  const p10 = (p) => String(p || "").replace(/\D/g, "").slice(-10);
  const unsub = new Set((contacts || []).filter((r) => r.status && r.status !== "subscribed").map((r) => r.email_key));
  const isBooked = (r) => { if (r.is_paid) return true; if (r.flag_color !== "green") return false; const n = String(r.admin_notes || ""), a = Math.max(n.lastIndexOf("✅ Booked — confirmed by admin"), n.lastIndexOf("✅ Booked — confirmed by instructor"), n.lastIndexOf("✅ Booked — confirmed by student")), b = n.lastIndexOf("↩️ Booked mark removed by admin"); return a > b || (a < 0 && r.reply_status !== "booked"); };
  const closed = new Set(), booked = new Set();
  (refs || []).forEach((r) => { if (r.is_cancelled) return; const k = p10(r.student_phone); if (!k) return; if (isBooked(r)) booked.add(k); else if (r.flag_color === "red") closed.add(k); });
  const hasAcct = new Set(), hasAcctEmail = new Set();
  (accts || []).forEach((a) => { if (p10(a.phone)) hasAcct.add(p10(a.phone)); if (a.email) hasAcctEmail.add(norm(a.email)); });
  const insById = {}; (ins || []).forEach((i) => { insById[i.id] = i; });

  const jobs = [], seen = new Set(), skipped = { noEmail: 0, booked: 0, closed: 0, account: 0, unsubscribed: 0, cancelled: 0, notDue: 0 };
  for (const w of wl || []) {
    if (w.status === "cancelled" || w.status === "removed") { skipped.cancelled++; continue; }
    const m = String(w.notes || "").match(/^Email:\s*(\S+@\S+)/mi), e = m ? norm(m[1]) : "";
    if (!EMAIL_RE.test(e)) { skipped.noEmail++; continue; }
    if (seen.has(e)) continue; seen.add(e);
    const ph = p10(w.student_phone);
    if (ph && booked.has(ph)) { skipped.booked++; continue; }
    if (ph && closed.has(ph)) { skipped.closed++; continue; }
    if ((ph && hasAcct.has(ph)) || hasAcctEmail.has(e)) { skipped.account++; continue; }
    if (unsub.has(e)) { skipped.unsubscribed++; continue; }
    const sent = {}; String(w.notes || "").replace(/📧 Follow-up (\d) email sent/g, (_, n) => { sent[+n] = true; return ""; });
    const ageH = (now.getTime() - new Date(w.created_at).getTime()) / 36e5;
    let step = 0;
    for (const n of [3, 2, 1]) { if (!sent[n] && ageH >= NURTURE_AFTER_H[n] && ageH < NURTURE_AFTER_H[n] + NURTURE_WINDOW_H && (n === 1 || sent[n - 1])) { step = n; break; } }
    if (!step) { skipped.notDue++; continue; }
    const insr = w.assigned_instructor_id ? insById[w.assigned_instructor_id] : null, place = w.postcode ? String(w.postcode).toUpperCase().split(" ")[0] : (w.area || "");
    jobs.push({ w, e, step, d: nurtureDesign(step, firstName(w.student_name), insr, place) });
  }
  if (body.dry) return { ok: true, dry: true, enabled: !!cfg.enabled, start: cfg.start, skipped, jobs: jobs.map((j) => ({ student: j.w.student_name, email: j.e, step: j.step, subject: j.d.subject, assigned: !!j.w.assigned_instructor_id })) };

  const out = [];
  for (let i = 0; i < jobs.length; i += 50) {
    const chunk = jobs.slice(i, i + 50), mails = [], at = [];
    for (const j of chunk) {
      const u = await unsubUrl(j.e, base), c = { name: j.w.student_name, email: j.e };
      mails.push({ from: FROM, to: [j.e], subject: j.d.subject, html: personalise(build(j.d), c).split("{{unsubscribe_url}}").join(u), text: personalise(text(j.d), c).split("{{unsubscribe_url}}").join(u),
        headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, tags: [{ name: "campaign", value: "followup_" + j.step }], ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) });
      const res = { student: j.w.student_name, email: j.e, step: j.step, status: "pending" }; out.push(res); at.push({ res, j });
    }
    const rs = await resendBatch(mails);
    for (let k = 0; k < rs.length; k++) {
      at[k].res.status = rs[k].status; if (rs[k].error) at[k].res.error = rs[k].error;
      if (rs[k].status === "sent") {   // note it on the enquiry: this is what stops a repeat and what the student profile shows
        const w = at[k].j.w, line = `${ukDate(now)} · 📧 Follow-up ${at[k].j.step} email sent`;
        await sb.from("waiting_list").update({ notes: (w.notes ? w.notes + "\n" : "") + line }).eq("id", w.id);
      }
    }
  }
  const summary = { at: now.toISOString(), sent: out.filter((r) => r.status === "sent").length, failed: out.filter((r) => r.status === "failed").length, due: jobs.length, skipped };
  if (out.length || body.cron) await sb.from("growth_settings").upsert({ key: "nurture_last", value: summary, updated_at: now.toISOString() }, { onConflict: "key" });
  return { ok: true, ...summary, results: out };
}

// ===================== WELCOME EMAIL WHEN A WEBSITE BOOKING COMES IN =====================
// POST { action: "welcome", cron: true }   — from Supabase Cron every 2-5 minutes: emails every NEW website booking that left an email address
// POST { action: "welcome", dry: true }    — preview
// POST { action: "welcome", test_to: "me@x.com" } — one sample
// Rules: only bookings tagged [WEB] created in the last 3 days and on/after the start date; one welcome per email address (never twice);
// never to someone who unsubscribed; noted on the booking as "📧 Welcome email sent (booking received)" so admin does not send it again.
const WELCOME_PORTAL = "https://www.drivesq.co.uk/drivesq-student-portal.html", WELCOME_WA = "https://wa.me/447352932003";
function welcomeSummary(notes) {
  const n = String(notes || ""), get = (k) => { const m = n.match(new RegExp("^" + k + ":\\s*(.+)$", "mi")); return m ? m[1].trim() : ""; };
  const pc = get("Postcode").toUpperCase().replace(/\s+/g, " "), area = pc ? pc.split(" ")[0] : "";
  return { ref: get("Ref"), rows: [["Reference", get("Ref")], ["Lessons", get("Gearbox")], ["Package", get("Package")], ["Area", area], ["Preferred start", get("Start")], ["Test date", get("Test date")]].filter((r) => r[1]) };
}
function welcomeDesign(notes) {
  const bs = welcomeSummary(notes);
  return { theme: "night", banner: "welcome", greeting: "Hi {{first_name}},", signoff: "Speak soon,\nThe DriveSQ team",
    subject: "Welcome to DriveSQ, {{first_name}} — we've received your booking" + (bs.ref ? " (" + bs.ref + ")" : ""), preheader: "Your instructor will be in touch shortly. In the meantime, explore your free Student Portal.",
    headline: "We've got your **booking request**",
    body: "Thank you for choosing DriveSQ. We've received your details and we're already matching you with an instructor." + (bs.rows.length ? "\n\n**Your booking**\n" + bs.rows.map((r) => "- " + r[0] + ": **" + r[1] + "**").join("\n") : "") +
      "\n\n**What happens next**\n- We match you with a DVSA-approved instructor near you\n- Your instructor will contact you shortly to arrange your first lesson\n- Questions? Reply to this email or WhatsApp us — a real person will answer\n\n**In the meantime — explore the Student Portal**\n- 700+ theory questions across all 14 DVSA categories\n- 14 full mock tests with instant results\n- Hazard perception practice — and your lesson progress once you start\n\nDon't have your provisional licence yet? Apply on GOV.UK — you'll need it for your first lesson.",
    highlightValue: "10 hours for £330", highlightLabel: "New learner offer — your first 10-hour block, paid in advance (normally £350). Manual or automatic.", buttonText: "Explore the Student Portal", buttonUrl: WELCOME_PORTAL,
    secondaryText: "[Apply for a provisional licence (GOV.UK)](https://www.gov.uk/apply-first-provisional-driving-licence) · [WhatsApp us](" + WELCOME_WA + ")" + (bs.ref ? " · Please quote **" + bs.ref + "** if you contact us." : "") };
}
async function welcome(sb, req, body) {
  const now = new Date();
  if (!RESEND_KEY && !body.dry) return { ok: false, error: "RESEND_API_KEY is not set" };
  const base = fnUrl(req, String(body.fn_name || ""));
  const cfgRow = await sb.from("growth_settings").select("value").eq("key", "welcome_config").maybeSingle();
  const cfg = Object.assign({ enabled: true, start: "2026-11-22" }, (cfgRow.data && cfgRow.data.value) || {});
  if (body.test_to) {
    const to = norm(String(body.test_to)); if (!EMAIL_RE.test(to)) return { ok: false, error: "That test email address doesn't look right" };
    const d = welcomeDesign("Ref: DSQ-TEST1\nGearbox: Manual\nPackage: 10-hour block\nPostcode: M14 5AB\nStart: This week"), u = await unsubUrl(to, base), c = { name: "Sara", email: to };
    const res = await resendBatch([{ from: FROM, to: [to], subject: "[TEST] " + personalise(d.subject, c), html: personalise(build(d), c).split("{{unsubscribe_url}}").join(u), text: personalise(text(d), c).split("{{unsubscribe_url}}").join(u), headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }]);
    return { ok: res[0].status === "sent", test: true, to, status: res[0].status, error: res[0].error || null };
  }
  if (!cfg.enabled && !body.dry) return { ok: true, off: true, message: "Welcome emails are switched off" };
  const since = new Date(Math.max(now.getTime() - 3 * 864e5, new Date(String(cfg.start) + "T00:00:00Z").getTime())).toISOString();
  const { data: wl } = await sb.from("waiting_list").select("id,student_name,notes,status,created_at").gte("created_at", since).order("created_at", { ascending: true }).limit(500);
  const { data: contacts } = await sb.from("email_contacts").select("email_key,status").limit(10000);
  const unsub = new Set((contacts || []).filter((r) => r.status && r.status !== "subscribed").map((r) => r.email_key));
  const emailOf = (w) => { const m = String(w.notes || "").match(/^Email:\s*(\S+@\S+)/mi); return m ? norm(m[1]) : ""; };
  const welcomed = new Set(); (wl || []).forEach((w) => { if (/Welcome email sent/.test(w.notes || "")) { const e = emailOf(w); if (e) welcomed.add(e); } });   // one welcome per address
  const jobs = [], skipped = { noEmail: 0, already: 0, unsubscribed: 0, notWeb: 0, cancelled: 0 };
  for (const w of wl || []) {
    if (!/\[WEB\]/i.test(w.notes || "")) { skipped.notWeb++; continue; }
    if (w.status === "cancelled" || w.status === "removed") { skipped.cancelled++; continue; }
    if (/Welcome email sent/.test(w.notes || "")) { skipped.already++; continue; }
    const e = emailOf(w); if (!EMAIL_RE.test(e)) { skipped.noEmail++; continue; }
    if (welcomed.has(e)) { skipped.already++; jobs.push({ w, e, mark: "dup" }); continue; }   // same address already welcomed: just note it, no second email
    if (unsub.has(e)) { skipped.unsubscribed++; jobs.push({ w, e, mark: "unsub" }); continue; }
    welcomed.add(e); jobs.push({ w, e, d: welcomeDesign(w.notes) });
  }
  if (body.dry) return { ok: true, dry: true, enabled: !!cfg.enabled, would_send: jobs.filter((j) => j.d).length, skipped, sample: jobs.filter((j) => j.d).slice(0, 5).map((j) => ({ student: j.w.student_name, email: String(j.e).replace(/^(.).*(@.*)$/, "$1***$2"), subject: j.d.subject })) };
  const real = jobs.filter((j) => j.d), out = [];
  for (let i = 0; i < real.length; i += 50) {
    const chunk = real.slice(i, i + 50), mails = [];
    for (const j of chunk) {
      const u = await unsubUrl(j.e, base), c = { name: j.w.student_name, email: j.e };
      mails.push({ from: FROM, to: [j.e], subject: personalise(j.d.subject, c), html: personalise(build(j.d), c).split("{{unsubscribe_url}}").join(u), text: personalise(text(j.d), c).split("{{unsubscribe_url}}").join(u),
        headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, tags: [{ name: "campaign", value: "booking_welcome" }], ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) });
    }
    const rs = await resendBatch(mails);
    for (let k = 0; k < rs.length; k++) { out.push({ student: chunk[k].w.student_name, status: rs[k].status, error: rs[k].error || null }); if (rs[k].status === "sent") await sb.from("waiting_list").update({ notes: (chunk[k].w.notes ? chunk[k].w.notes + "\n" : "") + `${ukDate(now)} · 📧 Welcome email sent (booking received) to ${chunk[k].e}` }).eq("id", chunk[k].w.id); }
  }
  for (const j of jobs.filter((x) => x.mark)) await sb.from("waiting_list").update({ notes: (j.w.notes ? j.w.notes + "\n" : "") + `${ukDate(now)} · 📧 Welcome email sent (booking received) — ${j.mark === "dup" ? "not sent again: this address was already welcomed" : "not sent: unsubscribed"}` }).eq("id", j.w.id);
  const sent = out.filter((r) => r.status === "sent").length, failed = out.length - sent;
  if (body.cron || sent || failed) await sb.from("growth_settings").upsert({ key: "welcome_last", value: { at: now.toISOString(), sent, failed, skipped }, updated_at: now.toISOString() }, { onConflict: "key" });
  return { ok: true, sent, failed, skipped, results: out };
}

const DB={waiting_list:[],email_contacts:[],growth_settings:[]};
const sb={from:(t)=>{const st={f:[],op:"select",patch:null,rows:null,lim:1e9};const T=()=>(DB[t]=DB[t]||[]);const match=(r)=>st.f.every(([k,o,v])=>o==="eq"?String(r[k])===String(v):o==="gte"?String(r[k])>=String(v):true);
 const run=()=>{const A=T();if(st.op==="update"){A.filter(match).forEach(r=>Object.assign(r,st.patch));return{data:null,error:null};}if(st.op==="upsert"){const e=A.find(r=>r.key===st.rows.key);if(e)Object.assign(e,st.rows);else A.push(st.rows);return{data:null,error:null};}return{data:A.filter(match).slice(0,st.lim),error:null};};
 const o={select:()=>o,eq:(k,v)=>(st.f.push([k,"eq",v]),o),gte:(k,v)=>(st.f.push([k,"gte",v]),o),order:()=>o,limit:(n)=>(st.lim=n,o),update:(p)=>(st.op="update",st.patch=p,o),upsert:(r)=>(st.op="upsert",st.rows=r,o),maybeSingle:async()=>{const r=run();return{data:r.data[0]||null,error:null};},then:(res)=>res(run())};return o;}};
const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
const now=new Date(), iso=(mins)=>new Date(now-mins*60000).toISOString();
const W=(id,name,email,mins,extra="")=>({id,student_name:name,status:"waiting",created_at:iso(mins),notes:"[WEB] Homepage booking\nRef: DSQ-"+id+"\nGearbox: Manual\nPostcode: M14 5AB\n"+(email?"Email: "+email+"\n":"")+extra});
DB.waiting_list=[W("a1","Sara Khan","sara@x.com",3),W("a2","No Email","",5),W("a3","Old Olly","olly@x.com",60*24*10),W("a4","Sara Again","sara@x.com",1),W("a5","Unsub Una","una@x.com",4),W("a6","Done Dee","dee@x.com",30,"2026-11-22 · 📧 Welcome email sent (booking received) to dee@x.com"),{id:"a7",student_name:"Phone Pete",status:"waiting",created_at:iso(2),notes:"[WHATSAPP] chat\nEmail: pete@x.com"}];
DB.email_contacts=[{email_key:"una@x.com",status:"unsubscribed"}]; DB.growth_settings=[{key:"welcome_config",value:{enabled:true,start:"2026-01-01"}}];
const dry=await welcome(sb,{},{dry:true,fn_name:"x"}); ok(dry.would_send===1&&dry.skipped.noEmail===1&&dry.skipped.unsubscribed===1,"dry run: only Sara's first booking would get a welcome ("+JSON.stringify(dry.skipped)+" would_send "+dry.would_send+")");
const r1=await welcome(sb,{},{cron:true,fn_name:"x"});
ok(r1.sent===1&&SENT.length===1&&SENT[0].to[0]==="sara@x.com","one welcome email goes to the new booking: "+SENT.map(m=>m.to[0]).join(","));
ok(/Welcome to DriveSQ, Sara/.test(SENT[0].subject)&&/DSQ-a1/.test(SENT[0].subject),"subject has the first name and booking reference: "+SENT[0].subject);
ok(/Your booking/.test(SENT[0].html)&&/M14/.test(SENT[0].html)&&/Unsubscribe/.test(SENT[0].html)&&/terms/i.test(SENT[0].html),"the email shows their booking, has an unsubscribe link and the terms link");
ok(/Welcome email sent \(booking received\)/.test(DB.waiting_list[0].notes),"the booking is noted so admin (and the next run) will not send it again");
ok(!SENT.some(m=>m.to[0]==="olly@x.com")&&!SENT.some(m=>m.to[0]==="una@x.com")&&!SENT.some(m=>m.to[0]==="pete@x.com"),"old bookings, unsubscribed people and non-website chats get nothing");
const r2=await welcome(sb,{},{cron:true,fn_name:"x"}); ok(r2.sent===0&&SENT.length===1,"running again sends nothing (no second welcome)");
ok(/not sent again: this address was already welcomed/.test(DB.waiting_list[3].notes),"the repeat booking from the same address is noted, not emailed");
DB.growth_settings=[{key:"welcome_config",value:{enabled:false,start:"2026-01-01"}}];DB.waiting_list.push(W("b1","New Nat","nat@x.com",1));const r3=await welcome(sb,{},{cron:true,fn_name:"x"});ok(r3.off===true&&SENT.length===1,"switched off in settings -> nothing sent");
const t=await welcome(sb,{},{test_to:"me@x.com",fn_name:"x"}); ok(t.ok&&SENT[SENT.length-1].subject.startsWith("[TEST]"),"a test email can be sent to yourself");
