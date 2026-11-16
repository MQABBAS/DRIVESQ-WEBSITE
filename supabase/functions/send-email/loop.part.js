
// ===================== EMAIL LOOP: send one email to a list, N a day, round after round =====================
// Settings (admin → Email loop) are in growth_settings "emailloop"; progress is kept in growth_settings "emailloop_state".
// POST { action: "loop", dry: true }              — preview today's batch (sends nothing)
// POST { action: "loop", test_to: "me@x.com" }    — send ONE sample of the chosen email to that address
// POST { action: "loop", cron: true }             — from Supabase Cron (run it hourly; it sends once a day, from the chosen UK hour)
// Rules, always: only SUBSCRIBED contacts on the chosen list; never anyone who unsubscribed; nobody twice within the cooldown
// (minimum 7 days); a person is only sent the email once per round; every email has an unsubscribe link.
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
