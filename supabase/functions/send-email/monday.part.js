// ===================== MONDAY INSTRUCTOR EMAILS =====================
// POST { action: "monday" }                      — send this week's Monday emails (each one only once per week)
// POST { action: "monday", dry: true }           — preview: returns every email without sending anything
// POST { action: "monday", cron: true }          — from Supabase Cron; waits until 7am UK time on Monday
//   • every approved instructor  → 📋 DriveSQ weekly reminders (rules + this week's focus)
//   • franchise instructors      → 💰 weekly franchise fee reminder (fee from admin → Growth settings)
//   • referral instructors       → 🧾 statement of students marked BOOKED and not yet paid, with each referral's amount
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
    preheader: `Good morning ${firstName(ins.full_name)} — your weekly franchise fee is due today.`,
    headline: "Weekly franchise **fee**", greeting: `Good morning ${firstName(ins.full_name) || "there"},`,
    body: `Just a friendly reminder that this week's DriveSQ franchise fee is due today.\n\n- **Week:** commencing ${wc}\n- **Amount:** ${money(fee)}\n- **Due:** today\n\nPlease pay the usual way. If you've already paid, thank you — you can ignore this email.`,
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
    preheader: `${n} booked student${n > 1 ? "s" : ""} · ${money(total)} in referral fees`,
    headline: "Referral **statement**", greeting: `Good morning ${firstName(ins.full_name) || "there"},`,
    body: `Here's your weekly statement of students you've marked as **booked**, with the referral fee for each one.\n\n` + rows.map(line).join("\n") +
      `\n\n**Total: ${money(total)}**` +
      (paid.length ? `\n\n**Paid since last week — thank you**\n` + paid.map((r) => `- ${r.student_name || "Student"} · ${money(r._amt)}`).join("\n") : "") +
      `\n\nIf anything looks wrong — for example a student didn't actually book — just reply to this email or update their status in your portal and we'll correct it.`,
    highlightValue: money(total), highlightLabel: `Referral fees for ${n} booked student${n > 1 ? "s" : ""}`,
    buttonText: "Open my Instructor Portal", buttonUrl: PORTAL_URL,
    secondaryText: "Questions? Reply to this email or [WhatsApp us](https://wa.me/447352932003).",
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
  const refAmt = (r) => { if (r.amount === null || r.amount === undefined || r.amount === "") return parseFloat(cfg.refFee) || 25; const a = parseFloat(r.amount); return isNaN(a) ? parseFloat(cfg.refFee) || 25 : a; };

  let insQ = sb.from("instructors").select("*").eq("status", "approved");
  if (body.instructor_id) insQ = insQ.eq("id", body.instructor_id);
  const { data: instructors, error: iErr } = await insQ;
  if (iErr) return { ok: false, error: "instructors: " + iErr.message };
  const ids = (instructors || []).map((i) => i.id);
  const { data: refs } = ids.length ? await sb.from("referrals").select("*").in("instructor_id", ids).limit(10000) : { data: [] };
  const { data: done } = ids.length ? await sb.from("admin_messages").select("instructor_id,subject").in("instructor_id", ids).gte("created_at", since) : { data: [] };
  const already = (iid, prefix) => (done || []).some((m) => m.instructor_id === iid && String(m.subject || "").startsWith(prefix));
  const { data: unsubRows } = await sb.from("email_contacts").select("email_key").neq("status", "subscribed").limit(10000);
  const unsub = new Set((unsubRows || []).map((r) => r.email_key));

  const isBooked = (r) => r.reply_status === "booked" || r.flag_color === "green";
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
