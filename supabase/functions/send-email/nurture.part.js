
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
  const isBooked = (r) => { if (r.is_paid) return true; if (r.flag_color !== "green") return false; const n = String(r.admin_notes || ""), a = n.lastIndexOf("✅ Booked — confirmed by admin"), b = n.lastIndexOf("↩️ Booked mark removed by admin"); return a > b || (a < 0 && r.reply_status !== "booked"); };
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
