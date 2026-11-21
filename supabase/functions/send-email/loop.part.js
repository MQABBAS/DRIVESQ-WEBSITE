
// ===================== EMAIL LOOP: send one email to a list, N a day, round after round =====================
// Settings (admin → Email loop) are in growth_settings "emailloop"; progress is kept in growth_settings "emailloop_state".
// POST { action: "loop", dry: true }              — preview today's batch (sends nothing)
// POST { action: "loop", test_to: "me@x.com" }    — send ONE sample of the chosen email to that address
// POST { action: "loop", cron: true }             — from Supabase Cron (run it hourly; it sends once a day, from the chosen UK hour)
// Rules, always: only SUBSCRIBED contacts on the chosen list; never anyone who unsubscribed; nobody twice within the cooldown
// (minimum 7 days); a person is only sent the email once per round; every email has an unsubscribe link.
// ===================== NEW STUDENTS, MONTH BY MONTH (rolling) =====================
// listTag "__monthly_new__" in the loop settings. Every new student (Student Portal sign-up, or a website booking that was assigned) is added to the
// contacts with a month tag new-YYYY-MM. The oldest month is the TOP of the queue: its students get the chosen email, perDay a day. When everyone in a
// finished month has had it, that month is REMOVED from the queue (nobody's record is deleted) and the next month moves up. Each month can have its own email
// (monthlyDesigns["2026-12"]); a month without one uses the latest email chosen. Only subscribed people; nobody who unsubscribed; every email has an unsubscribe link.
const MONTHLY = "__monthly_new__", monthTag = (k) => "new-" + k, monthOf = (iso) => { const p = londonParts(new Date(iso)); return p.y + "-" + String(p.m).padStart(2, "0"); };
async function monthlyNew(sb, req, body, cfg, fallbackDesign, base, now, lp, today, perDay, cooldownMs) {
  const keep = Math.min(12, Math.max(1, parseInt(cfg.keepMonths, 10) || 3)), curKey = lp.y + "-" + String(lp.m).padStart(2, "0");
  const stRow = await sb.from("growth_settings").select("value").eq("key", "emailloop_monthly_state").maybeSingle();
  const st = Object.assign({ doneKeys: [], retired: [], history: [], totalSent: 0, lastRunDate: "" }, (stRow.data && stRow.data.value) || {});
  if (body.cron && !body.force) {
    if (!cfg.enabled) return { ok: true, off: true, message: "Email loop is switched off" };
    if (lp.h < (parseInt(cfg.hour, 10) || 10) || lp.h > 21) return { ok: true, waiting: `Sends from ${cfg.hour}:00 UK time`, london: lp };
    if (st.lastRunDate === today) return { ok: true, already: true, message: "Already ran today" };
  }
  if (!cfg.enabled && !body.dry && !body.force) return { ok: true, off: true, message: "Email loop is switched off" };

  // 1. bring this window's new students in as contacts (an unsubscribed person stays unsubscribed)
  const since = new Date(Date.UTC(lp.y, lp.m - 1 - (keep - 1), 1) - 864e5).toISOString(), found = new Map();
  const add = (email, name, iso) => { const e = norm(email); if (!EMAIL_RE.test(e) || !iso) return; const mk = monthOf(iso); if (!found.has(e) || mk < found.get(e).mk) found.set(e, { email: e, name: name || null, mk }); };
  try { const r = await sb.from("student_accounts").select("full_name,email,created_at").gte("created_at", since).limit(5000); (r.data || []).forEach((x) => add(x.email, x.full_name, x.created_at)); } catch (_) { /* table missing: skip */ }
  try { const r = await sb.from("waiting_list").select("student_name,notes,created_at,status").eq("status", "assigned").gte("created_at", since).limit(5000); (r.data || []).forEach((x) => { const m = String(x.notes || "").match(/(?:^|\n)\s*Email:\s*(\S+@\S+)/i); if (m) add(m[1], x.student_name, x.created_at); }); } catch (_) { /* skip */ }
  const emails = Array.from(found.keys()); let added = 0, tagged = 0;
  for (let i = 0; i < emails.length; i += 150) {
    const chunk = emails.slice(i, i + 150), { data: have } = await sb.from("email_contacts").select("id,email_key,tags,status").in("email_key", chunk), by = new Map((have || []).map((c) => [c.email_key, c]));
    for (const e of chunk) {
      const f = found.get(e), c = by.get(e), tag = monthTag(f.mk);
      if (!c) { added++; if (!body.dry) await sb.from("email_contacts").insert([{ email: e, name: f.name, sources: ["students"], tags: [tag], status: "subscribed", consent_note: "Became a DriveSQ student (soft opt-in: existing customer, similar services, opt-out in every email)" }]); }
      else if (c.status === "subscribed" && !(c.tags || []).some((t) => /^new-\d{4}-\d{2}$/.test(t))) { tagged++; if (!body.dry) await sb.from("email_contacts").update({ tags: (c.tags || []).concat(tag), updated_at: now.toISOString() }).eq("id", c.id); }
    }
  }

  // 2. the queue: oldest month first
  const { data: rows } = await sb.from("email_contacts").select("id,email,email_key,name,status,tags,last_sent_at,created_at").order("created_at", { ascending: true }).limit(20000);
  const key = (c) => c.email_key || norm(c.email), oldest = (() => { const d = new Date(Date.UTC(lp.y, lp.m - 1 - (keep - 1), 1)); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"); })();
  const cohorts = new Map(), retired = new Set((st.retired || []).map((x) => x.month));
  (rows || []).forEach((c) => {
    if (c.status !== "subscribed" || !EMAIL_RE.test(norm(c.email)) || (c.tags || []).includes("opt_out_all")) return;
    const ms = (c.tags || []).map((t) => (t.match(/^new-(\d{4}-\d{2})$/) || [])[1]).filter(Boolean).sort(); if (!ms.length) return;
    const mk = ms[0]; if (mk < oldest || retired.has(mk)) return;
    if (!cohorts.has(mk)) cohorts.set(mk, []); cohorts.get(mk).push(c);
  });
  const done = new Set(st.doneKeys || []), months = Array.from(cohorts.keys()).sort();
  const tooSoon = (c) => c.last_sent_at && now.getTime() - new Date(c.last_sent_at).getTime() < cooldownMs;
  const designFor = (mk) => (cfg.monthlyDesigns && cfg.monthlyDesigns[mk]) || fallbackDesign;
  const batch = []; let waiting = 0;
  for (const mk of months) for (const c of cohorts.get(mk)) { if (done.has(key(c))) continue; if (tooSoon(c)) { waiting++; continue; } if (batch.length < perDay) batch.push({ c, mk }); }
  const queue = () => months.map((mk) => { const all = cohorts.get(mk), dn = all.filter((c) => done.has(key(c))).length; return { month: mk, size: all.length, done: dn, remaining: all.length - dn, email: (designFor(mk) || {}).subject || "" }; });
  const info = { listTag: MONTHLY, monthly: true, keepMonths: keep, currentMonth: curKey, newStudentsFound: emails.length, newContacts: added, tagged, queue: queue(), wouldSend: batch.length, waitingCooldown: waiting, perDay, retired: (st.retired || []).slice(0, 12), enabled: !!cfg.enabled };
  if (body.dry) return { ok: true, dry: true, ...info, sample: batch.slice(0, 5).map((b) => String(b.c.email).replace(/^(.).*(@.*)$/, "$1***$2")) };

  const out = [], groups = new Map(); batch.forEach((b) => { if (!groups.has(b.mk)) groups.set(b.mk, []); groups.get(b.mk).push(b.c); });
  for (const [mk, list] of groups) {
    const d = designFor(mk); if (!d || !d.subject || !d.body) { out.push(...list.map((c) => ({ email: c.email, status: "no email chosen for " + mk }))); continue; }
    for (let i = 0; i < list.length; i += 50) {
      const chunk = list.slice(i, i + 50), mails = [];
      for (const c of chunk) {
        const e = norm(c.email), u = await unsubUrl(e, base), cc = { name: c.name || "", email: e };
        mails.push({ from: FROM, to: [e], subject: personalise(d.subject, cc), html: personalise(build(d), cc).split("{{unsubscribe_url}}").join(u), text: personalise(text(d), cc).split("{{unsubscribe_url}}").join(u),
          headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, tags: [{ name: "campaign", value: "monthly-new" }], ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) });
      }
      const rs = await resendBatch(mails), okIds = [];
      rs.forEach((r, k) => { out.push({ email: chunk[k].email, status: r.status }); if (r.status === "sent") { okIds.push(chunk[k].id); done.add(key(chunk[k])); } });
      if (okIds.length) await sb.from("email_contacts").update({ last_sent_at: now.toISOString() }).in("id", okIds);
    }
  }
  const sent = out.filter((r) => r.status === "sent").length, failed = out.length - sent, notes = [];
  // a PAST month where everyone has had the email leaves the queue; the next month moves to the top
  for (const mk of months) { if (mk < curKey && cohorts.get(mk).every((c) => done.has(key(c)))) { st.retired = [{ month: mk, date: today, students: cohorts.get(mk).length }].concat(st.retired || []).slice(0, 36); notes.push(`${mk} finished and removed from the queue`); } }
  st.doneKeys = Array.from(done); st.lastRunDate = today; st.totalSent = (st.totalSent || 0) + sent;
  st.history = [{ date: today, sent, failed, round: 1 }].concat(st.history || []).slice(0, 30);
  await sb.from("growth_settings").upsert({ key: "emailloop_monthly_state", value: st, updated_at: now.toISOString() }, { onConflict: "key" });
  return { ok: true, sent, failed, roundNote: notes.join(". "), ...info, queue: undefined, remainingAfter: undefined };
}

const LOOP_MAX_PER_DAY = 1000, LOOP_MIN_COOLDOWN = 7;
async function loop(sb, req, body) {
  const now = new Date(), lp = londonParts(now), today = `${lp.y}-${String(lp.m).padStart(2, "0")}-${String(lp.d).padStart(2, "0")}`;
  if (!RESEND_KEY && !body.dry) return { ok: false, error: "RESEND_API_KEY is not set" };
  const base = fnUrl(req, String(body.fn_name || ""));
  const [cfgRow, stRow] = await Promise.all([sb.from("growth_settings").select("value").eq("key", "emailloop").maybeSingle(), sb.from("growth_settings").select("value").eq("key", "emailloop_state").maybeSingle()]);
  const cfg = Object.assign({ enabled: false, listTag: "", perDay: 100, hour: 10, cooldownDays: 30, autoLoop: true, design: null }, (cfgRow.data && cfgRow.data.value) || {});
  let st = Object.assign({ round: 1, doneKeys: [], listTag: cfg.listTag, history: [], totalSent: 0, lastRunDate: "", finished: false }, (stRow.data && stRow.data.value) || {});
  const d = body.design || cfg.design;
  if (!d || !d.subject || !d.body) return { ok: false, error: "No email chosen yet. Pick one in admin → Email loop." };
  const perDay = Math.min(LOOP_MAX_PER_DAY, Math.max(1, parseInt(cfg.perDay, 10) || 100)), cooldownMs = Math.max(LOOP_MIN_COOLDOWN, parseInt(cfg.cooldownDays, 10) || 30) * 864e5;

  if (body.test_to) {
    const to = norm(String(body.test_to)); if (!EMAIL_RE.test(to)) return { ok: false, error: "That test email address doesn't look right" };
    const u = await unsubUrl(to, base), c = { name: "Sara", email: to };
    const res = await resendBatch([{ from: FROM, to: [to], subject: "[TEST] " + personalise(d.subject, c), html: personalise(build(d), c).split("{{unsubscribe_url}}").join(u), text: personalise(text(d), c).split("{{unsubscribe_url}}").join(u), headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }]);
    return { ok: res[0].status === "sent", test: true, to, status: res[0].status, error: res[0].error || null };
  }
  if (!cfg.listTag) return { ok: false, error: "No list chosen yet. Pick one in admin → Email loop." };
  if (cfg.listTag === "__monthly_new__") return await monthlyNew(sb, req, body, cfg, d, base, now, lp, today, perDay, cooldownMs);   // new students, month by month
  if (st.listTag !== cfg.listTag) st = { round: 1, doneKeys: [], listTag: cfg.listTag, history: st.history || [], totalSent: st.totalSent || 0, lastRunDate: "", finished: false };   // a new list starts from the beginning
  if (body.restart) { st = Object.assign(st, { round: (st.round || 1) + (st.finished ? 1 : 0), doneKeys: [], finished: false, lastRunDate: "" }); }

  if (body.cron && !body.force) {
    if (!cfg.enabled) return { ok: true, off: true, message: "Email loop is switched off" };
    if (lp.h < (parseInt(cfg.hour, 10) || 10) || lp.h > 21) return { ok: true, waiting: `Sends from ${cfg.hour}:00 UK time`, london: lp };
    if (st.lastRunDate === today) return { ok: true, already: true, message: "Already ran today" };
  }
  if (!cfg.enabled && !body.dry && !body.force) return { ok: true, off: true, message: "Email loop is switched off" };

  const { data: rows } = await sb.from("email_contacts").select("id,email,email_key,name,status,tags,last_sent_at,created_at").order("created_at", { ascending: true }).limit(20000);
  const key = (c) => c.email_key || norm(c.email);
  const inList = (rows || []).filter((c) => c.status === "subscribed" && EMAIL_RE.test(norm(c.email)) && !(c.tags || []).includes("opt_out_all") && (cfg.listTag === "__all__" || (c.tags || []).includes(cfg.listTag)));
  const done = new Set(st.doneKeys || []), notDone = inList.filter((c) => !done.has(key(c)));
  const tooSoon = (c) => c.last_sent_at && now.getTime() - new Date(c.last_sent_at).getTime() < cooldownMs;
  const batch = [], skipKeys = []; let waiting = 0, earliest = null;
  for (const c of notDone) { if (tooSoon(c)) { waiting++; skipKeys.push(key(c)); continue; } if (batch.length < perDay) batch.push(c); }
  const info = { listTag: cfg.listTag, round: st.round || 1, listSize: inList.length, doneThisRound: inList.length - notDone.length, remaining: notDone.length, wouldSend: batch.length, waitingCooldown: waiting, perDay, cooldownDays: Math.round(cooldownMs / 864e5), autoLoop: !!cfg.autoLoop, enabled: !!cfg.enabled, finished: !!st.finished, skippedRecent: waiting };
  if (body.dry) return { ok: true, dry: true, ...info, sample: batch.slice(0, 5).map((c) => String(c.email).replace(/^(.).*(@.*)$/, "$1***$2")) };
  if (st.finished && !body.force) return { ok: true, finished: true, ...info, message: "Round finished. Turn on auto-loop, use a new list or press Start again." };

  skipKeys.forEach((k) => done.add(k));   // recently emailed by another campaign: counted as done for this round, not emailed
  const out = [];
  for (let i = 0; i < batch.length; i += 50) {
    const chunk = batch.slice(i, i + 50), mails = [];
    for (const c of chunk) {
      const e = norm(c.email), u = await unsubUrl(e, base), cc = { name: c.name || "", email: e };
      mails.push({ from: FROM, to: [e], subject: personalise(d.subject, cc), html: personalise(build(d), cc).split("{{unsubscribe_url}}").join(u), text: personalise(text(d), cc).split("{{unsubscribe_url}}").join(u),
        headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, tags: [{ name: "campaign", value: "loop" }], ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) });
    }
    const rs = await resendBatch(mails);
    const okIds = [];
    rs.forEach((r, k) => { out.push({ email: chunk[k].email, status: r.status }); if (r.status === "sent") { okIds.push(chunk[k].id); done.add(key(chunk[k])); } });
    if (okIds.length) await sb.from("email_contacts").update({ last_sent_at: now.toISOString() }).in("id", okIds);
  }
  const sent = out.filter((r) => r.status === "sent").length, failed = out.length - sent;
  st.doneKeys = Array.from(done); st.lastRunDate = today; st.totalSent = (st.totalSent || 0) + sent; st.listTag = cfg.listTag;
  const roundDone = inList.length > 0 && inList.every((c) => done.has(key(c)));
  let roundNote = "";
  if (roundDone) { if (cfg.autoLoop) { roundNote = `Round ${st.round} finished. Starting round ${st.round + 1} from the beginning.`; st.round = (st.round || 1) + 1; st.doneKeys = []; } else { st.finished = true; roundNote = `Round ${st.round} finished. Stopped (auto-loop is off).`; } }
  st.history = [{ date: today, sent, failed, round: info.round }].concat(st.history || []).slice(0, 30);
  await sb.from("growth_settings").upsert({ key: "emailloop_state", value: st, updated_at: now.toISOString() }, { onConflict: "key" });
  return { ok: true, sent, failed, roundNote, ...info, remainingAfter: inList.length - (roundDone && cfg.autoLoop ? 0 : done.size) };
}
