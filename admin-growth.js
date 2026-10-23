/* DriveSQ admin — Growth tab + Smart Match.
   Growth tab:
     Chase      auto-chase instructors about referral students who haven't booked, with one-tap reply links (ref.html)
     Leads      waiting enquiries scored by how likely they are to book, with a live reply-time timer
     Instructors league table (booking rate, speed, replies, fees) + franchise pitch builder
     Money      fee forecast, profit by source (enquiries → booked → fees − ad spend), lost-lead reasons
     Weekly     last 7 days summary, sent to your phone every Monday (database cron) or from here
   Smart Match: upgrades Find Closest Instructor with a map, match scores, priority modes, filters and compare.
   Booked = the referral is marked paid. Franchise instructors are left out of chasing.
   SQL: supabase/migrations/20261023_growth_tools.sql (works without it in a reduced mode). */
(function () {
  "use strict";
  if (window.DSQG) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const db = () => { try { return typeof sb !== "undefined" ? sb : null; } catch (e) { return null; } };
  const toast = (m, t, ms) => { try { window.showToast(m, t || "", ms); } catch (e) { console.log(m); } };
  const instrs = () => { try { return (typeof allInstrs !== "undefined" ? allInstrs : []) || []; } catch (e) { return []; } };
  const DAY = 864e5, now = () => Date.now();
  const SITE = /drivesq\.co\.uk$/.test(location.hostname) ? location.origin : "https://www.drivesq.co.uk";
  const SB_URL = "https://vwvbfqrlumvoabzkjxoa.supabase.co";
  const SQL_FILE = "supabase/migrations/20261023_growth_tools.sql";
  const LOST = ["Price", "Too far / no instructor nearby", "Booked with another school", "Couldn't reach them", "Times didn't suit", "Wanted automatic/manual we couldn't offer", "Not ready yet / browsing", "Other"];
  const REPLY = { booked: ["✅", "Booked", "g"], not_yet: ["⏳", "Not booked yet", "a"], unreachable: ["📵", "Can't reach them", "r"], not_interested: ["🚫", "Not going ahead", "r"] };
  const DEF = { autoChase: true, firstAfter: 3, every: 3, max: 3, useEmail: true, useApp: true, refFee: 20, franchiseDef: 45, franchiseBy: {}, channels: ["Google Ads"] };

  const G = { cfg: Object.assign({}, DEF), refs: [], wl: [], spend: {}, followups: {}, push: new Set(), hasRefCols: null, hasWlCols: null, hasSpend: null, hasCfg: null, loaded: false, loading: null, tab: "chase", month: "this", timer: null, running: false, lastRun: 0 };
  const LSK = k => "dsqg_" + k;
  const ls = { get(k, d) { try { const v = localStorage.getItem(LSK(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(LSK(k), JSON.stringify(v)); } catch (e) {} } };
  G.tab = ls.get("tab", "chase");

  /* ───────── helpers ───────── */
  const first = n => String(n || "").trim().split(/\s+/)[0] || "there";
  const normPhone = p => { let d = String(p || "").replace(/\D/g, ""); if (d.indexOf("44") === 0) d = "0" + d.slice(2); return d.length >= 10 ? d : ""; };
  const normName = n => String(n || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  const waNum = p => { try { if (typeof buildWaNum === "function") return buildWaNum(p || ""); } catch (e) {} let d = String(p || "").replace(/\D/g, ""); if (d[0] === "0") d = "44" + d.slice(1); return d; };
  const wa = (p, t) => { const n = waNum(p); return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(t) : ""; };
  const days = d => d ? (now() - new Date(d).getTime()) / DAY : 0;
  const ago = d => { if (!d) return ""; const m = (now() - new Date(d).getTime()) / 6e4; return m < 60 ? Math.max(1, Math.round(m)) + " min" : m < 2880 ? Math.round(m / 60) + " h" : Math.round(m / 1440) + " days"; };
  const money = v => "£" + (Math.round((v || 0) * 100) / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const pct = v => v == null || isNaN(v) ? "—" : Math.round(v * 100) + "%";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const iById = id => instrs().find(i => i.id === id) || {};
  const isFr = id => (iById(id).instructor_model || "") === "franchise";
  const open = r => !r.is_paid && !r.is_cancelled && !r.is_credit;
  const amt = r => { const a = parseFloat(r.amount); return isNaN(a) || a <= 0 ? G.cfg.refFee : a; };
  const refLink = (r, a) => SITE + "/ref.html?r=" + encodeURIComponent(r.id) + (a ? "&a=" + a : "");
  const line = (n, k) => { const m = String(n || "").match(new RegExp("(?:^|\\n)\\s*" + k + ":\\s*([^\\n]+)", "i")); return m ? m[1].trim() : ""; };
  function sourceOf(r) { const s = line(r.notes, "Source"); if (s) return s.replace(/^Referral: /, "Website link: ").replace(/\s*\(.*\)$/, ""); if (/\[CALL\]/i.test(r.notes || "")) return "Phone call (source not asked)"; if (/\[WEB\]/i.test(r.notes || "")) return "Website (before tracking)"; return "Not recorded"; }
  function lessonType(r) { const n = String(r.notes || "") + " " + (r.lesson_type || ""); return /auto/i.test(n) ? "Automatic" : "Manual"; }
  function outward(pc) { const c = String(pc || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(c) ? c.slice(0, -3) : (c.match(/^[A-Z]{1,2}\d[A-Z\d]?/) || [""])[0]; }
  function wlPostcode(r) { return r.postcode || line(r.notes, "Postcode") || ""; }
  const missingCol = e => !!e && /column|schema cache|does not exist|PGRST204|42703/i.test((e.message || "") + (e.code || ""));
  const missingTable = e => !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|could not find the table|schema cache/i.test(e.message || ""));
  async function q(p) { try { const r = await p; return r && !r.error ? (r.data || []) : []; } catch (e) { return []; } }
  const monthKey = d => { const x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-01"; };
  function ring(score, size, color) {
    const s = size || 46, r = s / 2 - 4, c = 2 * Math.PI * r, v = clamp(score, 0, 100);
    const col = color || (v >= 70 ? "#22c55e" : v >= 45 ? "#f59e0b" : "#ef4444");
    return `<div class="gx-ring" style="width:${s}px;height:${s}px" role="img" aria-label="Score ${Math.round(v)} out of 100"><svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="var(--dk3)" stroke-width="5"/><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}" style="transition:stroke-dashoffset .6s ease"/></svg><b style="font-size:${s > 50 ? "1.15rem" : ".9rem"}">${Math.round(v)}</b></div>`;
  }

  /* ───────── data ───────── */
  async function loadCfg() {
    const c = db(); const local = ls.get("cfg", null);
    if (local) Object.assign(G.cfg, local);
    if (!c) return;
    try { const r = await c.from("growth_settings").select("value").eq("key", "config").maybeSingle(); if (r.error) { G.hasCfg = !missingTable(r.error) ? true : false; return; } G.hasCfg = true; if (r.data && r.data.value) Object.assign(G.cfg, r.data.value); } catch (e) {}
  }
  async function saveCfg() {
    ls.set("cfg", G.cfg); const c = db(); if (!c || G.hasCfg === false) return;
    try { const r = await c.from("growth_settings").upsert({ key: "config", value: G.cfg, updated_at: new Date().toISOString() }, { onConflict: "key" }); if (r.error && missingTable(r.error)) G.hasCfg = false; } catch (e) {}
  }
  async function load(force) {
    if (G.loading && !force) return G.loading;
    G.loading = (async () => {
      const c = db(); if (!c) return;
      await loadCfg();
      const since = new Date(now() - 200 * DAY).toISOString();
      const r1 = await c.from("referrals").select("*").or("created_at.gte." + since + ",is_paid.eq.false").order("created_at", { ascending: false }).limit(3000);
      G.refs = r1.error ? await q(c.from("referrals").select("*").gte("created_at", since).limit(3000)) : (r1.data || []);
      if (G.hasRefCols === null) { const t = await c.from("referrals").select("reply_status,chase_count,last_chased_at,lost_reason").limit(1); G.hasRefCols = !(t.error && missingCol(t.error)); }
      const r2 = await c.from("waiting_list").select("*").gte("created_at", new Date(now() - 130 * DAY).toISOString()).order("created_at", { ascending: false }).limit(3000);
      G.wl = r2.data || [];
      if (G.hasWlCols === null) { const t = await c.from("waiting_list").select("first_contact_at,lost_reason").limit(1); G.hasWlCols = !(t.error && missingCol(t.error)); }
      const sp = await c.from("ad_spend").select("*");
      if (sp.error) { G.hasSpend = false; G.spend = ls.get("spend", {}); } else { G.hasSpend = true; G.spend = {}; (sp.data || []).forEach(x => { (G.spend[x.month] = G.spend[x.month] || {})[x.channel] = parseFloat(x.amount) || 0; }); }
      const ps = await q(c.from("push_subscriptions").select("instructor_id"));
      G.push = new Set(ps.map(x => x.instructor_id));
      const fu = await q(c.from("admin_followups").select("key,note,updated_at").like("key", "weekly:%"));
      G.followups = {}; fu.forEach(x => { G.followups[x.key] = x; });
      matchEnquiries(); G.loaded = true;
    })();
    try { await G.loading; } finally { G.loading = null; }
  }

  /* each enquiry → its referral (same phone, else same name), created on/after the enquiry day */
  function matchEnquiries() {
    const byPhone = {}, byName = {};
    G.refs.forEach(f => { if (f.is_cancelled && !f.lost_reason) return; const p = normPhone(f.student_phone), n = normName(f.student_name); if (p) (byPhone[p] = byPhone[p] || []).push(f); if (n) (byName[n] = byName[n] || []).push(f); });
    const seen = {};
    G.wl.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).forEach(r => {
      const p = normPhone(r.student_phone); r._dup = !!(p && seen[p]); if (p && !seen[p]) seen[p] = r; if (r._dup) seen[p]._repeats = (seen[p]._repeats || 0) + 1;
      const t0 = new Date(r.created_at).getTime() - DAY;
      const c = (byPhone[p] || byName[normName(r.student_name)] || []).filter(f => new Date(f.created_at).getTime() >= t0).sort((a, b) => (b.is_paid ? 1 : 0) - (a.is_paid ? 1 : 0));
      r._ref = c[0] || null; r._booked = !!(r._ref && r._ref.is_paid && !r._ref.is_cancelled); r._src = sourceOf(r);
    });
  }

  /* per-instructor stats from referrals */
  function stats(id, sinceDays) {
    const lim = now() - (sinceDays || 90) * DAY;
    const all = G.refs.filter(r => r.instructor_id === id && !r.is_credit);
    const g = all.filter(r => new Date(r.created_at).getTime() >= lim && !(r.is_cancelled && !r.lost_reason && !r.reply_status));
    const decided = g.filter(r => r.is_paid || r.is_cancelled || days(r.created_at) > 14);
    const booked = g.filter(r => r.is_paid);
    const speeds = booked.filter(r => r.paid_at).map(r => Math.max(0, (new Date(r.paid_at) - new Date(r.created_at)) / DAY));
    const chased = g.filter(r => (r.chase_count || 0) > 0), replied = chased.filter(r => r.replied_at);
    const unpaidOld = all.filter(r => open(r) && days(r.created_at) > 14);
    const wk = all.filter(r => days(r.created_at) <= 7 && !r.is_cancelled).length;
    const rate = decided.length ? booked.filter(r => decided.includes(r)).length / decided.length : null;
    const smooth = (booked.length + 1.5) / (Math.max(decided.length, booked.length) + 3); // pulls small samples toward 50%
    return { n: g.length, booked: booked.length, decided: decided.length, rate, smooth, speed: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
      chased: chased.length, replied: replied.length, replyRate: chased.length ? replied.length / chased.length : null,
      unpaid: unpaidOld.reduce((s, r) => s + amt(r), 0), unpaidN: unpaidOld.length, week: wk, fees: booked.reduce((s, r) => s + amt(r), 0), last: all.reduce((m, r) => !m || r.created_at > m ? r.created_at : m, null) };
  }
  window.DSQG_stats = stats;

  /* ───────── chase ───────── */
  const emailKey = () => { try { const v = localStorage.getItem("dsqm_key"); return v ? JSON.parse(v) : ""; } catch (e) { return ""; } };
  function chaseState(r) {
    if (!open(r) || isFr(r.instructor_id)) return null;
    const age = days(r.created_at);
    if (age > 45) return null;
    if (r.reply_status === "booked") return "replied";
    if (r.reply_status === "not_interested" || r.reply_status === "unreachable") return r.lost_reason ? null : "replied";
    const n = r.chase_count || 0;
    if (n >= G.cfg.max) return "maxed";
    const dueAt = r.last_chased_at ? new Date(r.last_chased_at).getTime() + G.cfg.every * DAY : new Date(r.created_at).getTime() + G.cfg.firstAfter * DAY;
    if (r.reply_status === "not_yet" && r.replied_at && new Date(r.replied_at).getTime() + G.cfg.every * DAY > now()) return "waiting";
    return dueAt <= now() ? "due" : (n ? "waiting" : "soon");
  }
  function chaseText(instr, list) {
    const one = list.length === 1;
    return "Hi " + first(instr.full_name) + " 👋 Quick check from DriveSQ — " + (one ? "has " + (list[0].student_name || "the student we sent you") + " booked a lesson yet?" : "have these students booked yet?") + "\n\n" +
      list.map(r => (one ? "" : "• " + (r.student_name || "Student") + " (sent " + ago(r.created_at) + " ago)\n") + "Tap to update: " + refLink(r)).join("\n\n") +
      "\n\nOne tap, no login. Thanks!";
  }
  function chaseEmail(instr, list) {
    const btn = (r, a, label, bg, col) => `<a href="${refLink(r, a)}" style="display:inline-block;margin:4px 6px 4px 0;padding:10px 14px;border-radius:9px;background:${bg};color:${col};text-decoration:none;font-weight:600;font-size:14px">${label}</a>`;
    const rows = list.map(r => `<div style="border:1px solid #e5e5e5;border-radius:12px;padding:14px;margin:12px 0"><div style="font-size:16px;font-weight:700;color:#111">${h(r.student_name || "Student")}</div><div style="font-size:13px;color:#666;margin:2px 0 8px">Sent to you ${h(ago(r.created_at))} ago</div>${btn(r, "booked", "✅ Booked", "#16a34a", "#fff")}${btn(r, "not_yet", "⏳ Not yet", "#f3f4f6", "#111")}${btn(r, "unreachable", "📵 Can't reach", "#f3f4f6", "#111")}${btn(r, "not_interested", "🚫 Not going ahead", "#f3f4f6", "#111")}</div>`).join("");
    return { subject: list.length === 1 ? "Has " + (list[0].student_name || "your student") + " booked yet? — DriveSQ" : list.length + " students — have they booked? — DriveSQ",
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#111"><div style="font-size:22px;font-weight:800;margin-bottom:8px">Drive<span style="color:#D10A11">SQ</span></div><p style="font-size:15px">Hi ${h(first(instr.full_name))},</p><p style="font-size:15px">Quick check on the student${list.length > 1 ? "s" : ""} we sent you. Just tap one button — no login needed.</p>${rows}<p style="font-size:13px;color:#666">Thanks — DriveSQ admin</p></div>`,
      text: chaseText(instr, list) };
  }
  async function claim(r) { // stops two admin devices chasing the same referral at once
    const c = db(); const n = r.chase_count || 0;
    let qy = c.from("referrals").update({ chase_count: n + 1, last_chased_at: new Date().toISOString() }).eq("id", r.id);
    qy = r.chase_count == null ? qy.is("chase_count", null) : qy.eq("chase_count", n);
    const res = await qy.select("id");
    if (res.error || !res.data || !res.data.length) return false;
    r.chase_count = n + 1; r.last_chased_at = new Date().toISOString(); return true;
  }
  async function sendEmail(to, m) {
    const key = emailKey(); if (!key || !to) return false;
    try {
      const resp = await fetch(SB_URL + "/functions/v1/send-email", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": key, Authorization: "Bearer " + (typeof SB_KEY !== "undefined" ? SB_KEY : "") }, body: JSON.stringify({ action: "send", campaign_id: "chase", messages: [{ to, subject: m.subject, html: m.html, text: m.text }] }) });
      const j = await resp.json().catch(() => ({})); return !!(resp.ok && j.ok && j.results && j.results[0] && j.results[0].status === "sent");
    } catch (e) { return false; }
  }
  function canAuto(instr) { return (G.cfg.useApp && G.push.has(instr.id)) || (G.cfg.useEmail && !!emailKey() && /@/.test(instr.email || "")); }
  async function autopilot(manual) {
    if (G.running || !G.hasRefCols) return 0;
    if (!manual && (!G.cfg.autoChase || now() - G.lastRun < 4 * 6e4)) return 0;
    G.running = true; G.lastRun = now(); let sent = 0;
    try {
      if (!G.loaded) await load();
      const due = G.refs.filter(r => chaseState(r) === "due");
      const byI = {}; due.forEach(r => (byI[r.instructor_id] = byI[r.instructor_id] || []).push(r));
      for (const id of Object.keys(byI)) {
        const instr = iById(id); if (!instr.id || !canAuto(instr)) continue;
        const mine = []; for (const r of byI[id]) if (await claim(r)) mine.push(r);
        if (!mine.length) continue;
        const ch = [];
        if (G.cfg.useApp && G.push.has(id)) {
          mine.forEach(r => { try { sendPushToInstructor(id, instr.full_name, "📝 Has " + first(r.student_name) + " booked yet?", "One tap to update DriveSQ — no login.", refLink(r)); } catch (e) {} });
          ch.push("app");
        }
        if (G.cfg.useEmail && /@/.test(instr.email || "") && await sendEmail(instr.email, chaseEmail(instr, mine))) ch.push("email");
        const c = db(); await c.from("referrals").update({ chase_channel: ch.join("+") || "none" }).in("id", mine.map(r => r.id));
        mine.forEach(r => { r.chase_channel = ch.join("+"); }); if (ch.length) sent += mine.length;
      }
      if (sent && manual !== "silent") toast("Chased " + sent + " referral" + (sent > 1 ? "s" : "") + " automatically ✓", "success", 3000);
    } catch (e) { console.warn("growth autopilot", e); } finally { G.running = false; }
    return sent;
  }
  async function markChased(ids, channel) {
    const c = db(); if (!c || !G.hasRefCols) return;
    for (const id of ids) { const r = G.refs.find(x => x.id === id); if (!r) continue; if (await claim(r)) { await c.from("referrals").update({ chase_channel: channel }).eq("id", id); r.chase_channel = channel; } }
    render(); badge();
  }

  /* ───────── leads ───────── */
  function sourceRates() {
    const m = {}; G.wl.filter(r => !r._dup && days(r.created_at) > 3).forEach(r => { const s = r._src; m[s] = m[s] || { n: 0, b: 0 }; m[s].n++; if (r._booked) m[s].b++; });
    const all = Object.values(m).reduce((a, x) => ({ n: a.n + x.n, b: a.b + x.b }), { n: 0, b: 0 });
    const base = all.n ? all.b / all.n : .4;
    Object.keys(m).forEach(k => { m[k].rate = (m[k].b + base * 4) / (m[k].n + 4); }); m._base = base; return m;
  }
  function coverageFor(pc, type) {
    const oc = outward(pc); if (!oc) return { n: 0, oc };
    const n = instrs().filter(i => i.status === "approved").filter(i => {
      const lt = i.car_type || "Manual"; if (type === "Automatic" ? !(lt === "Automatic" || lt === "Both") : lt === "Automatic") return false;
      const txt = ((i.coverage_postcodes || "") + " " + (i.area || "") + " " + (i.postcode || "")).toUpperCase();
      return txt.split(/[\s,;/]+/).some(c => outward(c) === oc || c === oc);
    }).length;
    return { n, oc };
  }
  function leadScore(r, rates) {
    const sr = rates[r._src] || { rate: rates._base, n: 0 };
    const type = lessonType(r), cov = coverageFor(wlPostcode(r), type);
    const ageH = (now() - new Date(r.created_at)) / 36e5;
    const fresh = clamp(1 - ageH / 72, 0, 1);
    let s = 35 * clamp(sr.rate / .7, 0, 1) + 25 * clamp(cov.n / 3, 0, 1) + 25 * fresh + (r.student_phone ? 10 : 0) + (r._repeats ? 5 : 0);
    const why = [];
    why.push([sr.n >= 3 ? r._src + " books " + pct(sr.rate) : r._src, sr.rate >= .5 ? "g" : sr.rate >= .3 ? "a" : "r"]);
    why.push([cov.n ? cov.n + " instructor" + (cov.n > 1 ? "s" : "") + " cover " + cov.oc : (cov.oc ? "No one covers " + cov.oc : "No postcode"), cov.n >= 2 ? "g" : cov.n ? "a" : "r"]);
    if (type === "Automatic") why.push(["Automatic", "b"]);
    if (r._repeats) why.push(["Contacted us " + (r._repeats + 1) + "×", "p"]);
    if (!r.student_phone) why.push(["No phone", "r"]);
    return { score: Math.round(clamp(s, 0, 100)), why, type };
  }
  function replyStats(from, to) {
    const rows = G.wl.filter(r => !r._dup && new Date(r.created_at) >= from && new Date(r.created_at) < to);
    const t = rows.map(r => r.first_contact_at ? (new Date(r.first_contact_at) - new Date(r.created_at)) / 6e4 : null).filter(v => v != null && v >= 0);
    t.sort((a, b) => a - b);
    return { n: rows.length, timed: t.length, median: t.length ? t[Math.floor(t.length / 2)] : null, within5: t.length ? t.filter(v => v <= 5).length / t.length : null };
  }
  const fmtMins = m => m == null ? "—" : m < 1 ? "<1 min" : m < 60 ? Math.round(m) + " min" : m < 1440 ? (m / 60).toFixed(1).replace(/\.0$/, "") + " h" : Math.round(m / 1440) + " d";
  async function markContacted(phoneOrId, byId) {
    if (!G.hasWlCols) return;
    const p = byId ? null : normPhone(phoneOrId);
    const hits = G.wl.filter(r => !r.first_contact_at && days(r.created_at) < 14 && (byId ? r.id === phoneOrId : p && normPhone(r.student_phone) === p));
    if (!hits.length) return;
    const t = new Date().toISOString(), c = db();
    hits.forEach(r => { r.first_contact_at = t; });
    try { await c.from("waiting_list").update({ first_contact_at: t }).in("id", hits.map(r => r.id)).is("first_contact_at", null); } catch (e) {}
    if (G.tab === "leads" && visible()) render(); badge();
  }
  // any call / WhatsApp tap anywhere in admin counts as first contact for that enquiry
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="tel:"],a[href*="wa.me/"]'); if (!a) return;
    const m = a.getAttribute("href").match(/(?:tel:|wa\.me\/)\+?([\d\s]+)/); if (m) markContacted(m[1]);
  }, true);

  /* ───────── money ───────── */
  function monthRange(which) { const d = new Date(); const a = which === "last" ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : new Date(d.getFullYear(), d.getMonth(), 1); const b = new Date(a.getFullYear(), a.getMonth() + 1, 1); return [a, b]; }
  const frFee = id => { const v = parseFloat(G.cfg.franchiseBy[id]); return isNaN(v) ? G.cfg.franchiseDef : v; };
  function forecast() {
    const [a, b] = monthRange("this"), [la, lb] = monthRange("last");
    const paidIn = (x, y) => G.refs.filter(r => r.is_paid && !r.is_cancelled && !r.is_credit && new Date(r.paid_at || r.created_at) >= x && new Date(r.paid_at || r.created_at) < y);
    const paid = paidIn(a, b), paidLast = paidIn(la, lb);
    const openRefs = G.refs.filter(r => open(r) && days(r.created_at) <= 30 && !isFr(r.instructor_id) && r.reply_status !== "not_interested");
    const rateCache = {}; const rateOf = id => (rateCache[id] = rateCache[id] || stats(id, 120).smooth);
    let expected = 0; openRefs.forEach(r => { const p = r.reply_status === "booked" ? .95 : r.reply_status === "unreachable" ? .15 : rateOf(r.instructor_id) * (days(r.created_at) > 14 ? .5 : 1); expected += amt(r) * p; });
    const daysIn = (b - a) / DAY, elapsed = (now() - a) / DAY, left = Math.max(0, daysIn - elapsed);
    // new referrals still to come this month, at the last 30 days' pace
    const pace = G.refs.filter(r => days(r.created_at) <= 30 && !r.is_credit && !r.is_cancelled && !isFr(r.instructor_id)).length / 30;
    const avgRate = (() => { const ids = [...new Set(G.refs.map(r => r.instructor_id))]; const v = ids.map(rateOf); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : .45; })();
    const future = pace * left * G.cfg.refFee * avgRate * .8;
    const fr = instrs().filter(i => i.status === "approved" && i.instructor_model === "franchise");
    const frMonth = fr.reduce((s, i) => s + frFee(i.id) * daysIn / 7, 0);
    const got = paid.reduce((s, r) => s + amt(r), 0);
    const frSoFar = fr.reduce((s, i) => s + frFee(i.id) * Math.min(elapsed, daysIn) / 7, 0);
    return { got, expected, future, frMonth, frSoFar, total: got + expected + future + frMonth, last: paidLast.reduce((s, r) => s + amt(r), 0) + fr.reduce((s, i) => s + frFee(i.id) * ((lb - la) / DAY) / 7, 0), openN: openRefs.length, paidN: paid.length, fr: fr.length, left: Math.round(left) };
  }
  function bySource(which) {
    const [a, b] = monthRange(which); const mk = monthKey(a);
    const rows = G.wl.filter(r => !r._dup && new Date(r.created_at) >= a && new Date(r.created_at) < b);
    const m = {}; rows.forEach(r => { const s = r._src; m[s] = m[s] || { n: 0, b: 0, fees: 0 }; m[s].n++; if (r._booked) { m[s].b++; m[s].fees += amt(r._ref); } });
    const spend = G.spend[mk] || {};
    const list = Object.keys(m).map(k => { const sp = spendFor(k, spend); return { k, ...m[k], spend: sp, profit: m[k].fees - sp, cpb: sp && m[k].b ? sp / m[k].b : null }; }).sort((x, y) => y.n - x.n);
    return { list, mk, spend, total: rows.length };
  }
  function spendFor(src, spend) { const c = Object.keys(spend).find(ch => src.toLowerCase().indexOf(ch.toLowerCase()) === 0 || (/google ads/i.test(ch) && /google ads|paid|ppc|gclid/i.test(src))); return c ? spend[c] || 0 : 0; }
  async function saveSpend(mk, ch, v) {
    G.spend[mk] = G.spend[mk] || {}; G.spend[mk][ch] = v; ls.set("spend", G.spend);
    const c = db(); if (c && G.hasSpend) { const r = await c.from("ad_spend").upsert({ month: mk, channel: ch, amount: v, updated_at: new Date().toISOString() }, { onConflict: "month,channel" }); if (r.error) toast("Couldn't save spend: " + r.error.message, "error"); }
  }
  function lostReasons(sinceDays) {
    const lim = now() - sinceDays * DAY, m = {};
    G.refs.filter(r => new Date(r.created_at).getTime() >= lim && (r.lost_reason || r.reply_status === "not_interested" || r.reply_status === "unreachable") && !r.is_paid).forEach(r => { const k = r.lost_reason || (r.reply_status === "unreachable" ? "Couldn't reach them" : "No reason given"); m[k] = (m[k] || 0) + 1; });
    G.wl.filter(r => !r._dup && new Date(r.created_at).getTime() >= lim && r.lost_reason).forEach(r => { m[r.lost_reason] = (m[r.lost_reason] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  /* ───────── weekly ───────── */
  function week(off) {
    const to = now() - off * 7 * DAY, from = to - 7 * DAY, inR = d => { const t = new Date(d).getTime(); return t >= from && t < to; };
    const enq = G.wl.filter(r => !r._dup && inR(r.created_at)).length;
    const refd = G.refs.filter(r => inR(r.created_at) && !r.is_credit && !r.is_cancelled).length;
    const bk = G.refs.filter(r => r.is_paid && inR(r.paid_at || r.created_at));
    const rs = replyStats(new Date(from), new Date(to));
    return { enq, refd, booked: bk.length, fees: bk.reduce((s, r) => s + amt(r), 0), reply: rs.median, within5: rs.within5 };
  }
  function weeklyText() {
    const w = week(0), owed = G.refs.filter(r => open(r) && days(r.created_at) > 3 && !isFr(r.instructor_id));
    const worst = (() => { const m = {}; owed.filter(r => days(r.created_at) > 7).forEach(r => { m[r.instructor_id] = (m[r.instructor_id] || 0) + 1; }); const k = Object.keys(m).sort((a, b) => m[b] - m[a])[0]; return k ? iById(k).full_name : ""; })();
    return w.enq + " enquiries · " + w.refd + " referred · " + w.booked + " booked (" + money(w.fees) + "). " + money(owed.reduce((s, r) => s + amt(r), 0)) + " outstanding (" + owed.length + ")" + (worst ? ". Chase first: " + worst : "") + ".";
  }
  const isoWeek = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); const y = t.getUTCFullYear(); const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / DAY + 1) / 7); return y + "-" + String(w).padStart(2, "0"); };
  async function sendWeekly(auto) {
    const msg = weeklyText(), key = "weekly:" + isoWeek(new Date());
    try { if (typeof pushToAdmin === "function") await pushToAdmin("📊 DriveSQ weekly summary", msg, "/admin.html#growth"); } catch (e) {}
    try { await db().from("admin_followups").upsert({ key, note: msg, done: true, updated_at: new Date().toISOString() }, { onConflict: "key" }); } catch (e) {}
    G.followups[key] = { key, note: msg, updated_at: new Date().toISOString() };
    if (!auto) toast("Weekly summary sent to your phone ✓", "success", 2500);
  }
  async function weeklyFallback() { // if the Monday database job isn't set up, the first admin open after 9am Monday sends it
    const d = new Date(); if (d.getDay() !== 1 || d.getHours() < 9) return;
    const key = "weekly:" + isoWeek(d); if (G.followups[key]) return;
    const c = db(); const r = await c.from("admin_followups").select("key").eq("key", key).maybeSingle(); if (r.error || r.data) return;
    await sendWeekly(true);
  }

  /* ───────── UI ───────── */
  function mount() {
    if ($("#panel-growth")) return true;
    const today = $("#panel-today"), tabs = $(".dsq-tabs"); if (!today || !tabs) return false;
    const p = document.createElement("div"); p.id = "panel-growth"; p.className = "hidden";
    p.innerHTML = `<div class="gx-head"><div class="page-title mb-0"><i class="bi bi-rocket-takeoff-fill me-2" style="color:var(--gold)"></i>Growth</div><button class="gx-btn" id="gxRefresh"><i class="bi bi-arrow-clockwise"></i>Refresh</button></div>
      <p class="gx-sub">Chase instructors automatically, reply to the best leads first, and see what each source and instructor is really worth. Booked = referral marked paid.</p>
      <div class="gx-nav" role="tablist" id="gxNav"></div><div id="gxBody"><div class="gx-empty"><i class="bi bi-hourglass-split me-2"></i>Loading…</div></div>`;
    today.insertAdjacentElement("afterend", p);
    const tb = $("#tab-today");
    if (!$("#tab-growth")) {
    const b = document.createElement("button"); b.className = "dsq-tab"; b.id = "tab-growth"; b.title = "Growth — auto-chase, leads, instructor league, profit by source"; b.setAttribute("onclick", "switchTab('growth')");
    b.innerHTML = '<i class="bi bi-rocket-takeoff-fill"></i><span class="d-none d-sm-inline ms-1">Growth</span><span id="gxTabBadge" style="display:none;margin-left:5px;background:#D10A11;color:#fff;border-radius:99px;padding:0 6px;font-size:.62rem;font-weight:700"></span>';
    (tb || tabs.firstElementChild).insertAdjacentElement("afterend", b);
    }
    try { if (typeof TABS !== "undefined" && TABS.indexOf("growth") < 0) TABS.push("growth"); } catch (e) {}
    $("#gxRefresh").addEventListener("click", async () => { await load(true); render(); badge(); });
    p.addEventListener("click", onClick); p.addEventListener("change", onChange);
    return true;
  }
  const visible = () => { const p = $("#panel-growth"); return p && !p.classList.contains("hidden"); };
  function counts() {
    const ch = G.refs.map(r => [r, chaseState(r)]);
    return { due: ch.filter(x => x[1] === "due").length, replied: ch.filter(x => x[1] === "replied").length,
      leads: G.wl.filter(r => r.status === "waiting" && !r._dup && days(r.created_at) < 21).length,
      late: G.wl.filter(r => r.status === "waiting" && !r._dup && !r.first_contact_at && days(r.created_at) < 3 && (now() - new Date(r.created_at)) > 5 * 6e4).length };
  }
  function badge() {
    const c = counts(), n = c.replied + c.late + (G.cfg.autoChase ? 0 : c.due), el = $("#gxTabBadge");
    if (el) { el.textContent = n; el.style.display = n ? "" : "none"; }
  }
  function nav() {
    const c = counts();
    const T = [["chase", "bi-send-check-fill", "Chase", c.due + c.replied], ["leads", "bi-lightning-charge-fill", "Leads", c.late || c.leads], ["instructors", "bi-trophy-fill", "Instructors", 0], ["money", "bi-cash-coin", "Money", 0], ["weekly", "bi-calendar-week-fill", "Weekly", 0]];
    $("#gxNav").innerHTML = T.map(t => `<button role="tab" aria-selected="${G.tab === t[0]}" data-gtab="${t[0]}"><i class="bi ${t[1]}"></i>${t[2]}${t[3] ? `<span class="gx-n">${t[3]}</span>` : ""}</button>`).join("");
  }
  function dbBanner() {
    if (G.hasRefCols && G.hasWlCols && G.hasSpend !== false) return "";
    return `<div class="gx-banner"><i class="bi bi-database-fill-gear"></i><div><b>One-time database update needed.</b> Run <code>${SQL_FILE}</code> in Supabase → SQL Editor so chasing, instructor replies, reply times, lost reasons and ad spend are saved. Until then these work in a reduced mode.
      <div class="gx-acts"><button class="gx-btn gold" data-act="copysql"><i class="bi bi-clipboard"></i>Copy SQL</button><a class="gx-btn" href="https://supabase.com/dashboard/project/vwvbfqrlumvoabzkjxoa/sql/new" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i>Open SQL Editor</a></div></div></div>`;
  }
  function render() {
    if (!mount()) return; nav();
    const body = $("#gxBody"); if (!G.loaded) { body.innerHTML = '<div class="gx-empty"><i class="bi bi-hourglass-split me-2"></i>Loading…</div>'; return; }
    const f = { chase: rChase, leads: rLeads, instructors: rInstructors, money: rMoney, weekly: rWeekly }[G.tab] || rChase;
    try { body.innerHTML = dbBanner() + f(); } catch (e) { console.error(e); body.innerHTML = '<div class="gx-empty">Something went wrong drawing this page — tap Refresh.</div>'; }
    tick();
  }

  /* Chase */
  function rChase() {
    const by = { due: [], replied: [], waiting: [], soon: [], maxed: [] };
    G.refs.forEach(r => { const s = chaseState(r); if (s) by[s].push(r); });
    const key = !!emailKey(), cfg = G.cfg;
    const groups = {}; by.due.forEach(r => (groups[r.instructor_id] = groups[r.instructor_id] || []).push(r));
    const repliedThisMonth = G.refs.filter(r => r.replied_at && days(r.replied_at) <= 30).length, chasedMonth = G.refs.filter(r => r.last_chased_at && days(r.last_chased_at) <= 30).length;
    let html = `<div class="gx-kpis">
      <div class="gx-kpi ${by.due.length ? "hl" : ""}"><div class="l">Due a chase</div><div class="n">${by.due.length}</div><div class="s">${cfg.autoChase ? "autopilot is on" : "autopilot is off"}</div></div>
      <div class="gx-kpi"><div class="l">Instructor replies</div><div class="n">${by.replied.length}</div><div class="s">need you</div></div>
      <div class="gx-kpi"><div class="l">Waiting for reply</div><div class="n">${by.waiting.length}</div><div class="s">${by.soon.length} more not due yet</div></div>
      <div class="gx-kpi"><div class="l">Reply rate · 30 days</div><div class="n">${chasedMonth ? pct(repliedThisMonth / chasedMonth) : "—"}</div><div class="s">${repliedThisMonth} replies</div></div></div>`;
    html += `<div class="gx-card"><div class="gx-row" style="justify-content:space-between"><label class="gx-switch"><input type="checkbox" data-cfg="autoChase" ${cfg.autoChase ? "checked" : ""}><span class="tr"></span><span><b>Auto-chase</b><br><small style="color:var(--txt3)">Runs every few minutes while admin is open on any device</small></span></label>
        <button class="gx-btn" data-act="runnow" ${G.hasRefCols ? "" : "disabled"}><i class="bi bi-play-fill"></i>Run now</button></div>
      <div class="gx-row" style="margin-top:12px"><label class="gx-field">First chase after<select class="dsq-inp" data-cfg="firstAfter">${[2, 3, 4, 5, 7].map(v => `<option value="${v}" ${cfg.firstAfter == v ? "selected" : ""}>${v} days</option>`).join("")}</select></label>
        <label class="gx-field">Then every<select class="dsq-inp" data-cfg="every">${[2, 3, 4, 7].map(v => `<option value="${v}" ${cfg.every == v ? "selected" : ""}>${v} days</option>`).join("")}</select></label>
        <label class="gx-field">Stop after<select class="dsq-inp" data-cfg="max">${[1, 2, 3, 4, 5].map(v => `<option value="${v}" ${cfg.max == v ? "selected" : ""}>${v} chase${v > 1 ? "s" : ""}</option>`).join("")}</select></label></div>
      <div style="margin-top:10px">
        <div class="gx-ch"><span class="dot" style="background:${G.push.size ? "#22c55e" : "#64748b"}"></span><div><label class="gx-chk"><input type="checkbox" data-cfg="useApp" ${cfg.useApp ? "checked" : ""}> Instructor app notification</label><div class="gx-chs">${instrs().filter(i => G.push.has(i.id)).length} instructors have the app alerts on</div></div></div>
        <div class="gx-ch"><span class="dot" style="background:${key ? "#22c55e" : "#f59e0b"}"></span><div><label class="gx-chk"><input type="checkbox" data-cfg="useEmail" ${cfg.useEmail ? "checked" : ""}> Email with one-tap buttons</label><div class="gx-chs">${key ? instrs().filter(i => /@/.test(i.email || "") && i.status === "approved").length + " instructors have an email address" : "Set up Email first (Email → Setup)"}</div></div></div>
        <div class="gx-ch"><span class="dot" style="background:#25d366"></span><div><span class="gx-chk">WhatsApp</span><div class="gx-chs">One tap below for instructors with no app alerts or email. WhatsApp doesn't allow fully automatic messages from a normal number.</div></div></div>
      </div></div>`;
    if (by.replied.length) {
      html += `<div class="gx-sec">Instructor replies · ${by.replied.length}</div>` + by.replied.sort((a, b) => new Date(b.replied_at || 0) - new Date(a.replied_at || 0)).map(r => {
        const i = iById(r.instructor_id), rp = REPLY[r.reply_status] || ["💬", r.reply_status, "b"], col = { g: "#22c55e", a: "#f59e0b", r: "#ef4444", b: "#60a5fa" }[rp[2]];
        const acts = r.reply_status === "booked"
          ? `<button class="gx-btn g" data-act="markbooked" data-id="${h(r.id)}"><i class="bi bi-check2-circle"></i>Confirm booked (mark paid)</button>`
          : `${wa(r.student_phone, "Hi " + first(r.student_name) + ", it's DriveSQ 👋 " + first(i.full_name) + " has been trying to reach you about your driving lessons. Are you still looking to start? Reply here and we'll sort it.") ? `<a class="gx-btn wa" target="_blank" rel="noopener" href="${h(wa(r.student_phone, "Hi " + first(r.student_name) + ", it's DriveSQ 👋 " + first(i.full_name) + " has been trying to reach you about your driving lessons. Are you still looking to start? Reply here and we'll sort it."))}"><i class="bi bi-whatsapp"></i>WhatsApp student</a>` : ""}
             ${r.student_phone ? `<a class="gx-btn" href="tel:${h(r.student_phone)}"><i class="bi bi-telephone-fill"></i>Call</a>` : ""}
             <button class="gx-btn" data-act="lost" data-id="${h(r.id)}"><i class="bi bi-x-circle"></i>Mark lost…</button>`;
        return `<div class="gx-item" style="--c:${col}"><div class="ic">${rp[0]}</div><div class="mn"><div class="t">${h(r.student_name || "Student")} — ${h(rp[1])}</div><div class="d">${h(i.full_name || "Instructor")} replied ${h(ago(r.replied_at))} ago · referred ${h(ago(r.created_at))} ago</div>${r.reply_note ? `<div class="note">💬 ${h(r.reply_note)}</div>` : ""}<div class="gx-acts">${acts}<button class="gx-btn" data-act="dismissreply" data-id="${h(r.id)}" title="Hide this reply">Hide</button></div></div></div>`;
      }).join("");
    }
    const manual = Object.keys(groups).filter(id => !canAuto(iById(id)) || !cfg.autoChase);
    if (by.due.length) {
      html += `<div class="gx-sec">Due a chase · ${by.due.length}</div>` + Object.keys(groups).map(id => {
        const i = iById(id), list = groups[id], txt = chaseText(i, list), auto = cfg.autoChase && canAuto(i);
        return `<div class="gx-item" style="--c:${auto ? "#60a5fa" : "#f59e0b"}"><div class="ic">${auto ? "🤖" : "📨"}</div><div class="mn"><div class="t">${h(i.full_name || "Instructor")} · ${list.length} student${list.length > 1 ? "s" : ""}</div>
          <div class="d">${list.map(r => h(r.student_name || "Student") + " (" + h(ago(r.created_at)) + (r.chase_count ? ", chased " + r.chase_count + "×" : "") + ")").join(" · ")}</div>
          <div class="gx-chips">${auto ? '<span class="gx-chip b">Autopilot will send this</span>' : '<span class="gx-chip a">Needs one tap — no app or email</span>'}</div>
          <div class="gx-acts">${wa(i.phone, txt) ? `<a class="gx-btn wa" target="_blank" rel="noopener" href="${h(wa(i.phone, txt))}" data-chased="${h(list.map(r => r.id).join(","))}"><i class="bi bi-whatsapp"></i>WhatsApp chase</a>` : '<span class="gx-chip r">No phone</span>'}
          <button class="gx-btn" data-act="copylink" data-text="${h(txt)}"><i class="bi bi-clipboard"></i>Copy message</button>
          <button class="gx-btn" data-act="snoozechase" data-ids="${h(list.map(r => r.id).join(","))}" title="Count as chased without sending">Skip this round</button></div></div></div>`;
      }).join("");
    }
    if (by.waiting.length) {
      html += `<div class="gx-sec">Waiting for a reply · ${by.waiting.length}</div><div class="gx-card" style="padding:6px 12px">` + by.waiting.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(r => { const i = iById(r.instructor_id), rp = REPLY[r.reply_status]; return `<div class="gx-row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bdr)"><div style="min-width:0"><b style="font-size:.84rem">${h(r.student_name || "Student")}</b> <span style="font-size:.74rem;color:var(--txt3)">· ${h(i.full_name || "")} · chased ${r.chase_count || 0}× · last ${h(ago(r.last_chased_at || r.created_at))} ago${r.chase_channel ? " by " + h(r.chase_channel) : ""}</span></div>${rp ? `<span class="gx-chip ${rp[2]}">${rp[0]} ${h(rp[1])}</span>` : `<button class="gx-btn" data-act="copylink" data-text="${h(refLink(r))}" title="Copy this student's reply link"><i class="bi bi-link-45deg"></i>Link</button>`}</div>`; }).join("") + "</div>";
    }
    if (by.maxed.length) html += `<div class="gx-sec">No reply after ${cfg.max} chases · ${by.maxed.length}</div>` + by.maxed.map(r => { const i = iById(r.instructor_id); return `<div class="gx-item" style="--c:#ef4444"><div class="ic">🔕</div><div class="mn"><div class="t">${h(r.student_name || "Student")}</div><div class="d">${h(i.full_name || "")} hasn't replied · referred ${h(ago(r.created_at))} ago</div><div class="gx-acts">${i.phone ? `<a class="gx-btn" href="tel:${h(i.phone)}"><i class="bi bi-telephone-fill"></i>Call instructor</a>` : ""}${wa(r.student_phone, "Hi " + first(r.student_name) + ", it's DriveSQ 👋 Have you managed to book your first lesson with " + first(i.full_name) + " yet?") ? `<a class="gx-btn wa" target="_blank" rel="noopener" href="${h(wa(r.student_phone, "Hi " + first(r.student_name) + ", it's DriveSQ 👋 Have you managed to book your first lesson with " + first(i.full_name) + " yet?"))}"><i class="bi bi-whatsapp"></i>Ask student</a>` : ""}<button class="gx-btn" data-act="lost" data-id="${h(r.id)}">Mark lost…</button></div></div></div>`; }).join("");
    if (!by.due.length && !by.replied.length && !by.waiting.length && !by.maxed.length) html += `<div class="gx-empty">🎉 Nothing to chase — every recent referral has booked or isn't due yet.</div>`;
    return html;
  }

  /* Leads */
  function rLeads() {
    const rates = sourceRates();
    const leads = G.wl.filter(r => r.status === "waiting" && !r._dup && days(r.created_at) < 21).map(r => ({ r, ...leadScore(r, rates) })).sort((a, b) => (!a.r.first_contact_at && !b.r.first_contact_at ? 0 : a.r.first_contact_at ? 1 : -1) || b.score - a.score);
    const wk = replyStats(new Date(now() - 7 * DAY), new Date()), pw = replyStats(new Date(now() - 14 * DAY), new Date(now() - 7 * DAY));
    const delta = (a, b, lowerBetter) => a == null || b == null ? "" : `<span class="gx-delta ${(lowerBetter ? a < b : a > b) ? "up" : "dn"}">${(lowerBetter ? a < b : a > b) ? "▲ better" : "▼ worse"} than last week</span>`;
    let html = `<div class="gx-kpis">
      <div class="gx-kpi hl"><div class="l">Waiting to be called</div><div class="n">${leads.filter(x => !x.r.first_contact_at).length}</div><div class="s">${leads.length} open enquiries</div></div>
      <div class="gx-kpi"><div class="l">Median reply · 7 days</div><div class="n">${fmtMins(wk.median)}</div><div class="s">${delta(wk.median, pw.median, true) || (wk.timed ? wk.timed + " timed" : "times start once you reply")}</div></div>
      <div class="gx-kpi"><div class="l">Replied within 5 min</div><div class="n">${pct(wk.within5)}</div><div class="s">${delta(wk.within5, pw.within5) || "target: most of them"}</div></div>
      <div class="gx-kpi"><div class="l">Best source · 120 days</div><div class="n" style="font-size:1.05rem;padding-top:6px">${h((Object.entries(rates).filter(e => e[0] !== "_base" && e[1].n >= 4).sort((a, b) => b[1].rate - a[1].rate)[0] || ["—"])[0])}</div><div class="s">by booking rate</div></div></div>`;
    if (!G.hasWlCols) html += `<div class="gx-banner"><i class="bi bi-stopwatch"></i><div>Reply times are only recorded after the database update. Any WhatsApp or call you tap in admin then counts as your first reply.</div></div>`;
    html += `<p class="gx-sub">Most likely to book first. The timer counts from when they enquired — learners usually go with whoever replies first. Tapping WhatsApp or Call stops it.</p>`;
    if (!leads.length) return html + `<div class="gx-empty">🎉 No open enquiries waiting.</div>`;
    html += leads.map(({ r, score, why, type }) => {
      const msg = "Hi " + first(r.student_name) + ", thanks for contacting DriveSQ! 🚗 I'm finding you an instructor near " + (wlPostcode(r) || "you") + " for " + type.toLowerCase() + " lessons. When are you free to start?";
      return `<div class="gx-item" style="--c:${score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#64748b"}">${ring(score, 46)}<div class="mn"><div class="t">${h(r.student_name || "New learner")}${wlPostcode(r) ? " · " + h(wlPostcode(r)) : ""}</div>
        <div class="d">${h(type)} · ${h(r._src)} · ${h(ago(r.created_at))} ago</div><div class="gx-chips">${why.map(w => `<span class="gx-chip ${w[1]}">${h(w[0])}</span>`).join("")}</div>
        <div class="gx-acts">${wa(r.student_phone, msg) ? `<a class="gx-btn wa" target="_blank" rel="noopener" href="${h(wa(r.student_phone, msg))}"><i class="bi bi-whatsapp"></i>WhatsApp</a>` : ""}${r.student_phone ? `<a class="gx-btn" href="tel:${h(r.student_phone)}"><i class="bi bi-telephone-fill"></i>Call</a>` : ""}
        <button class="gx-btn p" data-act="match" data-id="${h(r.id)}"><i class="bi bi-geo-alt-fill"></i>Match instructor</button>
        ${!r.first_contact_at ? `<button class="gx-btn" data-act="contacted" data-id="${h(r.id)}" title="Replied another way">Replied ✓</button>` : ""}
        <button class="gx-btn" data-act="lostlead" data-id="${h(r.id)}">Lost…</button></div></div>
        <div class="gx-timer ${r.first_contact_at ? "n" : "g"}" data-since="${h(r.created_at)}" data-done="${h(r.first_contact_at || "")}"></div></div>`;
    }).join("");
    return html;
  }
  function tick() {
    $$("#panel-growth .gx-timer").forEach(t => {
      const d = t.getAttribute("data-done"), s = new Date(t.getAttribute("data-since")).getTime();
      if (d) { t.className = "gx-timer n"; t.innerHTML = fmtMins((new Date(d) - s) / 6e4) + "<small>replied</small>"; return; }
      const sec = Math.max(0, (now() - s) / 1000), m = Math.floor(sec / 60);
      t.className = "gx-timer " + (m < 5 ? "g" : m < 30 ? "a" : "r");
      t.innerHTML = (m < 60 ? m + ":" + String(Math.floor(sec % 60)).padStart(2, "0") : m < 2880 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : Math.floor(m / 1440) + " days") + "<small>" + (m < 5 ? "reply now" : "waiting") + "</small>";
    });
  }

  /* Instructors: league + franchise */
  function rInstructors() {
    const list = instrs().filter(i => i.status === "approved").map(i => ({ i, s: stats(i.id, 90), fr: i.instructor_model === "franchise" }));
    const ref = list.filter(x => !x.fr && x.s.n > 0);
    ref.forEach(x => { const s = x.s; x.score = Math.round(100 * (.5 * s.smooth + .2 * (s.speed == null ? .5 : clamp(1 - (s.speed - 1) / 13, 0, 1)) + .15 * (s.replyRate == null ? .6 : s.replyRate) + .15 * clamp(s.n / 10, 0, 1)) - clamp(s.unpaid / 10, 0, 15)); });
    ref.sort((a, b) => b.score - a.score);
    const medal = k => ["🥇", "🥈", "🥉"][k] || `<span style="color:var(--txt4);font-family:Oswald">${k + 1}</span>`;
    let html = `<div class="gx-card"><h4><i class="bi bi-trophy-fill"></i>Instructor league · last 90 days</h4><p class="gx-sub">Send more students to the top of the table. Score = booking rate 50% · speed to book 20% · replies to chases 15% · volume 15%, minus unpaid fees over 14 days.</p>
      <div class="gx-scroll"><table class="gx-table"><thead><tr><th></th><th>Instructor</th><th class="n">Score</th><th class="n">Sent</th><th class="n">Booked</th><th class="n gx-hide-s">Days to book</th><th class="n gx-hide-s">Replies</th><th class="n">Unpaid</th></tr></thead><tbody>
      ${ref.map((x, k) => `<tr><td>${medal(k)}</td><td><div style="font-weight:600">${h(x.i.full_name)}</div><div class="gx-bar" style="margin-top:5px;max-width:160px"><span style="width:${clamp(x.score, 3, 100)}%;background:${x.score >= 65 ? "#22c55e" : x.score >= 45 ? "#f59e0b" : "#ef4444"}"></span></div></td><td class="n"><b>${x.score}</b></td><td class="n">${x.s.n}</td><td class="n">${x.s.booked}${x.s.rate != null ? ` <span style="color:var(--txt3);font-size:.7rem">${pct(x.s.rate)}</span>` : ""}</td><td class="n gx-hide-s">${x.s.speed == null ? "—" : x.s.speed.toFixed(1)}</td><td class="n gx-hide-s">${x.s.replyRate == null ? "—" : pct(x.s.replyRate)}</td><td class="n" style="color:${x.s.unpaid ? "#f87171" : "var(--txt3)"}">${x.s.unpaid ? money(x.s.unpaid) : "—"}</td></tr>`).join("") || `<tr><td colspan="8" style="color:var(--txt3)">No referrals in the last 90 days.</td></tr>`}
      </tbody></table></div></div>`;
    // franchise pitch builder
    const perMonth = 52 / 12, cands = list.filter(x => !x.fr).map(x => { const s = stats(x.i.id, 90); const fee = frFee(x.i.id); const feesM = s.fees / 3, studentsM = s.n / 3; return { ...x, s, fee, feesM, studentsM, frM: fee * perMonth, gain: fee * perMonth - feesM, fit: studentsM >= 2 && fee * perMonth >= feesM ? "Strong" : studentsM >= 1 ? "Possible" : "Too few students yet" }; }).sort((a, b) => b.studentsM - a.studentsM);
    const pros = prospects(), ready = pros.filter(x => x.ratio >= 1);
    html += frBenefitCard();
    html += `<div class="gx-card"><h4><i class="bi bi-bar-chart-line-fill"></i>Who to move to franchise</h4><p class="gx-sub">Each bar is how many learners an instructor books a month from you. Past the purple line, a flat weekly fee is cheaper for them than paying per learner — that's your easiest pitch.${ready.length ? ` <b style="color:#4ade80">${ready.length} instructor${ready.length > 1 ? "s" : ""} would already save money.</b>` : ""}</p>
      <div class="gx-scroll">${prospectsChart(pros)}</div>
      ${pros.length ? `<div class="gx-acts" style="margin-top:8px">${pros.slice(0, 6).map(x => `<button class="gx-btn ${x.ratio >= 1 ? "p" : ""}" data-act="frreport" data-id="${h(x.i.id)}"><i class="bi bi-file-earmark-bar-graph"></i>${h(first(x.i.full_name))} · report</button>`).join("")}</div>` : ""}</div>`;
    html += `<div class="gx-card"><h4><i class="bi bi-arrow-up-right-circle-fill"></i>Franchise pitch builder</h4><p class="gx-sub">Compares what each referral instructor pays you now with a weekly franchise fee. A strong fit gets plenty of students from you and would pay you the same or more on franchise.</p>
      <div class="gx-row" style="margin-bottom:10px"><label class="gx-field">Default weekly fee<input class="dsq-inp" type="number" min="0" step="5" data-cfg="franchiseDef" value="${h(G.cfg.franchiseDef)}"></label></div>
      ${cands.map(x => { const tone = x.fit === "Strong" ? "g" : x.fit === "Possible" ? "a" : ""; return `<div class="gx-item" style="--c:${x.fit === "Strong" ? "#22c55e" : x.fit === "Possible" ? "#f59e0b" : "var(--bdr)"}"><div class="mn"><div class="t">${h(x.i.full_name)} <span class="gx-chip ${tone}">${x.fit}</span></div>
        <div class="d">Last 3 months: ${x.s.n} students sent, ${x.s.booked} booked → paid you ${money(x.s.fees)} (≈${money(x.feesM)}/month). On franchise at ${money(x.fee)}/week ≈ ${money(x.frM)}/month <b style="color:${x.gain >= 0 ? "#4ade80" : "#f87171"}">(${x.gain >= 0 ? "+" : "−"}${money(Math.abs(x.gain))}/month for DriveSQ)</b></div>
        <div class="gx-acts"><label class="gx-field" style="flex-direction:row;align-items:center;gap:6px">£/week <input class="dsq-inp" style="width:76px" type="number" min="0" step="5" data-frfee="${h(x.i.id)}" value="${h(x.fee)}"></label>
        <button class="gx-btn p" data-act="frreport" data-id="${h(x.i.id)}"><i class="bi bi-file-earmark-bar-graph"></i>Franchise report</button>
        <button class="gx-btn gold" data-act="frmsg" data-id="${h(x.i.id)}"><i class="bi bi-chat-quote-fill"></i>Build message</button></div></div></div>`; }).join("") || '<div class="gx-empty">No referral instructors.</div>'}</div>`;
    const frs = list.filter(x => x.fr);
    if (frs.length) html += `<div class="gx-card"><h4><i class="bi bi-shield-check"></i>Franchise instructors · value check</h4><p class="gx-sub">Keep them happy: make sure the students you send are worth their weekly fee.</p>${frs.map(x => { const s = stats(x.i.id, 90); return `<div class="gx-row" style="justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bdr);font-size:.82rem"><b>${h(x.i.full_name)}</b><span style="color:var(--txt3)">${s.n} students in 3 months · ${(s.n / 13).toFixed(1)}/week for ${money(frFee(x.i.id))}/week · <label>£/week <input class="dsq-inp" style="width:70px;display:inline-block;min-height:30px;padding:3px 6px" type="number" data-frfee="${h(x.i.id)}" value="${h(frFee(x.i.id))}"></label></span></div>`; }).join("")}</div>`;
    return html;
  }
  /* ── franchise: convince referral instructors with their own numbers ── */
  const WK_M = 52 / 12;
  const bookedRef = r => !r.is_cancelled && !r.is_credit && (r.is_paid || r.flag_color === "green");
  // what this instructor's referral fees look like month by month (booked students only — that's what they pay for)
  function frMonths(id, n) {
    const out = [], d = new Date();
    for (let k = n - 1; k >= 0; k--) {
      const a = new Date(d.getFullYear(), d.getMonth() - k, 1), b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
      const rs = G.refs.filter(r => r.instructor_id === id && !r.is_credit && new Date(r.created_at) >= a && new Date(r.created_at) < b);
      const bk = rs.filter(bookedRef);
      out.push({ lbl: a.toLocaleDateString("en-GB", { month: "short" }), sent: rs.filter(r => !r.is_cancelled).length, booked: bk.length, fees: bk.reduce((s2, r) => s2 + amt(r), 0), part: k === 0 ? Math.min(1, (now() - a) / (b - a)) : 1 });
    }
    return out;
  }
  function frNumbers(id) {
    const months = frMonths(id, 6), fee = frFee(id), frM = fee * WK_M;
    const full = months.filter(m => m.part === 1).slice(-3);
    const bookedM = full.length ? full.reduce((a, m) => a + m.booked, 0) / full.length : 0;
    const feesM = full.length ? full.reduce((a, m) => a + m.fees, 0) / full.length : 0;
    const allBk = G.refs.filter(r => r.instructor_id === id && bookedRef(r));
    const avgFee = allBk.length ? allBk.reduce((a, r) => a + amt(r), 0) / allBk.length : G.cfg.refFee;
    const breakEvenM = avgFee ? frM / avgFee : 0; // booked students a month at which franchise costs the same
    const tot6 = months.reduce((a, m) => ({ sent: a.sent + m.sent, booked: a.booked + m.booked, fees: a.fees + m.fees }), { sent: 0, booked: 0, fees: 0 });
    return { months, fee, frM, bookedM, feesM, avgFee, breakEvenM, saveM: feesM - frM, tot6 };
  }
  function prospects() {
    return instrs().filter(i => i.status === "approved" && i.instructor_model !== "franchise").map(i => ({ i, n: frNumbers(i.id) }))
      .filter(x => x.n.tot6.sent > 0).map(x => { const r = x.n.breakEvenM ? x.n.bookedM / x.n.breakEvenM : 0; return { ...x, ratio: r, tier: r >= 1 ? "Saves them money" : r >= .7 ? "Nearly there" : "Grow first" }; })
      .sort((a, b) => b.ratio - a.ratio);
  }
  // month by month since they started (max 24 months): what they paid in referral fees vs what franchise would have cost
  function frHistory(id) {
    const mine = G.refs.filter(r => r.instructor_id === id && !r.is_credit);
    if (!mine.length) return [];
    const firstAt = new Date(Math.min(...mine.map(r => new Date(r.created_at).getTime()))), d = new Date(), fee = frFee(id), out = [];
    for (let k = 23; k >= 0; k--) {
      const a = new Date(d.getFullYear(), d.getMonth() - k, 1), b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
      if (b <= firstAt) continue;
      const rs = mine.filter(r => new Date(r.created_at) >= a && new Date(r.created_at) < b), bk = rs.filter(bookedRef);
      const part = k === 0 ? Math.min(1, (now() - a) / (b - a)) : 1;
      const fees = bk.reduce((t, r) => t + amt(r), 0), paid = bk.filter(r => r.is_paid).reduce((t, r) => t + amt(r), 0), frCost = fee * WK_M * part;
      out.push({ a, lbl: a.toLocaleDateString("en-GB", { month: "short", year: k > d.getMonth() ? "2-digit" : undefined }), sent: rs.filter(r => !r.is_cancelled).length, booked: bk.length, fees, paid, owed: fees - paid, frCost, saved: fees - frCost, part });
    }
    return out;
  }
  function frWin(hist, months) {
    const w = hist.slice(-months), t = w.reduce((a, m) => ({ fees: a.fees + m.fees, paid: a.paid + m.paid, owed: a.owed + m.owed, booked: a.booked + m.booked, sent: a.sent + m.sent, fr: a.fr + m.frCost }), { fees: 0, paid: 0, owed: 0, booked: 0, sent: 0, fr: 0 });
    return Object.assign(t, { months: w.length, saved: t.fees - t.fr, from: w[0] ? w[0].a : null });
  }
  // who is most likely to benefit from (and say yes to) franchise — from the fees they actually pay
  function frBenefit(id) {
    const N = frNumbers(id), hist = frHistory(id), full = hist.filter(m => m.part === 1);
    const last3 = full.slice(-3), prev3 = full.slice(-6, -3), avg = xs => xs.length ? xs.reduce((a, m) => a + m.fees, 0) / xs.length : 0;
    const feesM = avg(last3), prevM = avg(prev3), trend = prevM ? (feesM - prevM) / prevM : null;
    const w3 = frWin(hist, 3), w6 = frWin(hist, 6), w12 = frWin(hist, 12), all = frWin(hist, 24);
    const best = hist.reduce((b, m) => !b || m.saved > b.saved ? m : b, null);
    const active = full.slice(-6), steady = active.length ? active.filter(m => m.booked > 0).length / active.length : 0;
    const cover = N.frM ? feesM / N.frM : 0;
    const score = Math.round(clamp(50 * Math.min(cover, 1.5) / 1.5 + (w6.saved > 0 ? 20 : w6.saved > -N.frM ? 8 : 0) + (trend == null ? 5 : trend > .1 ? 15 : trend > -.1 ? 8 : 0) + 15 * steady, 0, 100));
    const tier = cover >= 1 && w6.saved >= 0 ? ["Very likely to benefit", "g"] : cover >= .75 || w6.saved >= 0 ? ["Likely to benefit", "g"] : cover >= .4 ? ["Could benefit as they grow", "a"] : ["Not yet", ""];
    return { id, N, hist, feesM, prevM, trend, w3, w6, w12, all, best, steady, cover, score, tier, perLearner: N.bookedM ? N.frM / N.bookedM : null };
  }
  function frRanked() {
    return instrs().filter(i => i.status === "approved" && i.instructor_model !== "franchise").map(i => Object.assign({ i }, frBenefit(i.id)))
      .filter(x => x.all.sent > 0).sort((a, b) => b.score - a.score || b.w6.saved - a.w6.saved);
  }
  const winLbl = m => m === 3 ? "3 months" : m === 6 ? "6 months" : m === 12 ? "12 months" : "since they started";
  // the WhatsApp message: what they paid, what franchise would have cost, what they could have saved — honest either way
  function frMessage(id, months, opts) {
    const o = Object.assign({ monthly: true, perks: true }, opts || {});
    const i = iById(id), B = frBenefit(id), w = months >= 24 ? B.all : frWin(B.hist, months), fee = frFee(id), fm = v => money(v);
    const ms = B.hist.slice(-(months >= 24 ? 24 : months));
    // never claim a longer period than they've actually been with us
    const since = w.from ? w.from.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "";
    const period = (months >= 24 || w.months < months) && since ? "since you started with us in " + since + " (" + w.months + " month" + (w.months === 1 ? "" : "s") + ")" : "over the last " + winLbl(months);
    let t = "Hi " + (first(i.full_name) || "there") + " 👋\n\nHere's a quick look at your DriveSQ referrals " + period + ":\n\n";
    t += "👥 " + w.sent + " learner" + (w.sent === 1 ? "" : "s") + " sent to you · " + w.booked + " booked\n";
    t += "💷 Referral fees: *" + fm(w.fees) + "*" + (w.owed > 0 ? " (" + fm(w.paid) + " paid, " + fm(w.owed) + " still due)" : "") + "\n";
    if (w.booked) t += "That's " + fm(w.fees / w.booked) + " for each learner who booked.\n";
    if (o.monthly && ms.length > 1) t += "\n📅 Month by month:\n" + ms.map(m => "• " + m.lbl + (m.part < 1 ? " (so far)" : "") + ": " + fm(m.fees) + (m.booked ? " — " + m.booked + " booked" : "")).join("\n") + "\n";
    t += "\n🔑 *On a DriveSQ franchise* you'd pay one flat " + fm(fee) + " a week (about " + fm(fee * WK_M) + " a month) — no fee per learner, however many we send.\n\n";
    if (w.saved > 0) t += "✅ Over " + (w.months === 1 ? "that month" : "those " + w.months + " months") + " franchise would have cost " + fm(w.fr) + " — *you could have saved " + fm(w.saved) + "*.\n";
    else if (B.best && B.best.saved > 0) t += "✅ In " + B.best.lbl + " alone you'd have saved " + fm(B.best.saved) + " on franchise.\n";
    else t += "📈 You're building up nicely — franchise pays for itself from about " + (B.N.breakEvenM / WK_M).toFixed(1) + " booked learners a week, and every learner after that costs you nothing extra.\n";
    if (B.feesM > 0) t += B.feesM >= B.N.frM ? "At your current pace (about " + fm(B.feesM) + " a month in fees) that's roughly " + fm(B.feesM - B.N.frM) + " a month back in your pocket.\n" : "Right now you average about " + fm(B.feesM) + " a month in fees — franchise starts saving you money from " + (B.N.breakEvenM / WK_M).toFixed(1) + " booked learners a week.\n";
    if (B.trend != null && B.trend > .1) t += "Your referrals are up " + Math.round(B.trend * 100) + "% on the 3 months before — the more we send, the more franchise saves you.\n";
    if (o.perks) t += "\nFranchise also includes:\n• Priority for new learners in your area\n• DriveSQ branding, the instructor app and admin support\n";
    return t + "\nWould you like me to hold a franchise place for you? Happy to chat it through this week.\n— DriveSQ";
  }
  function frMsgModal(id, months0) {
    const i = iById(id); let months = months0 || 6, opts = { monthly: true, perks: true };
    const m = modal(`<div class="gxm-sheet-hd"><h4>Franchise message · ${h(i.full_name)}</h4><button class="gx-btn" data-close aria-label="Close"><i class="bi bi-x-lg"></i></button></div>
      <p class="gx-sub">Built from their own referral fees. Edit anything before sending.</p>
      <div class="gx-row" style="gap:8px;margin-bottom:8px;align-items:center"><div class="gxm-seg" role="group" aria-label="Period" id="gxfmPer">${[[3, "3 months"], [6, "6 months"], [12, "12 months"], [24, "All"]].map(([v, l]) => `<button type="button" data-per="${v}" aria-pressed="${v === months}">${l}</button>`).join("")}</div>
        <label class="gx-field" style="flex-direction:row;align-items:center;gap:5px"><input type="checkbox" id="gxfmMonthly" checked>Month by month</label><label class="gx-field" style="flex-direction:row;align-items:center;gap:5px"><input type="checkbox" id="gxfmPerks" checked>What's included</label></div>
      <div id="gxfmSum" class="gxf-sum"></div>
      <textarea class="dsq-inp gx-msg" id="gxfmTxt" style="min-height:260px"></textarea>
      <div class="gx-acts" style="margin-top:8px">${i.phone ? `<a class="gx-btn wa" id="gxfmWa" target="_blank" rel="noopener" href="#"><i class="bi bi-whatsapp"></i>Send on WhatsApp</a>` : `<span class="gx-chip a">No phone number saved</span>`}<button class="gx-btn" id="gxfmCopy"><i class="bi bi-clipboard"></i>Copy</button><button class="gx-btn p" data-act="frreport" data-id="${h(id)}"><i class="bi bi-image"></i>Picture report</button></div>`);
    m.querySelector(".gxm-sheet").classList.add("gxf-sheet");
    const ta = m.querySelector("#gxfmTxt"), sync = () => { const a = m.querySelector("#gxfmWa"); if (a) a.href = wa(i.phone, ta.value); };
    const draw = () => {
      const B = frBenefit(id), w = months >= 24 ? B.all : frWin(B.hist, months);
      m.querySelector("#gxfmSum").innerHTML = `<span>Paid in fees <b>${money(w.fees)}</b></span><span>Franchise would be <b>${money(w.fr)}</b></span><span class="${w.saved >= 0 ? "g" : "r"}">${w.saved >= 0 ? "Could have saved" : "Franchise would cost"} <b>${money(Math.abs(w.saved))}</b>${w.saved >= 0 ? "" : " more"}</span><span>${w.booked} booked · ${w.months} months</span>`;
      ta.value = frMessage(id, months, opts); sync();
    };
    m.querySelector("#gxfmPer").addEventListener("click", e => { const b = e.target.closest("[data-per]"); if (!b) return; months = +b.getAttribute("data-per"); m.querySelectorAll("#gxfmPer button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); draw(); });
    m.querySelector("#gxfmMonthly").addEventListener("change", e => { opts.monthly = e.target.checked; draw(); });
    m.querySelector("#gxfmPerks").addEventListener("change", e => { opts.perks = e.target.checked; draw(); });
    ta.addEventListener("input", sync);
    m.querySelector("#gxfmCopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(ta.value); toast("Message copied", "success", 1500); } catch (e) { ta.select(); } });
    draw();
  }
  function frBenefitCard() {
    const list = frRanked(), win = G.frWin || 6;
    if (!list.length) return `<div class="gx-card"><h4><i class="bi bi-stars"></i>Most likely to benefit from franchise</h4><div class="gx-empty">No referral instructors with referrals yet.</div></div>`;
    const tot = list.reduce((a, x) => { const w = win >= 24 ? x.all : frWin(x.hist, win); return { fees: a.fees + w.fees, saved: a.saved + Math.max(0, w.saved), n: a.n + (w.saved > 0 ? 1 : 0) }; }, { fees: 0, saved: 0, n: 0 });
    return `<div class="gx-card"><div class="gx-row" style="justify-content:space-between;align-items:center"><h4 style="margin:0"><i class="bi bi-stars"></i>Most likely to benefit from franchise</h4>
        <div class="gxm-seg" role="group" aria-label="Period">${[[3, "3m"], [6, "6m"], [12, "12m"], [24, "All"]].map(([v, l]) => `<button type="button" data-act="frwin" data-id="${v}" aria-pressed="${v === win}">${l}</button>`).join("")}</div></div>
      <p class="gx-sub">Ranked by the referral fees they really pay (booked learners, paid or still due) against your weekly franchise fee, how steady their learners are and whether it's growing. "Could have saved" = their fees over the period minus what franchise would have cost.${tot.n ? ` <b style="color:#4ade80">${tot.n} instructor${tot.n > 1 ? "s" : ""} could have saved ${money(tot.saved)} between them over the last ${winLbl(win)}.</b>` : ""}</p>
      <div class="gxf-list">${list.map((x, k) => { const w = win >= 24 ? x.all : frWin(x.hist, win); return `<div class="gxf-row">
        <div class="gxf-rank">${k + 1}</div>
        <div class="gxf-main"><div class="gxf-nm">${h(x.i.full_name)} <span class="gx-chip ${x.tier[1]}">${x.tier[0]}</span>${x.trend != null && Math.abs(x.trend) > .1 ? ` <span class="gx-chip ${x.trend > 0 ? "g" : "r"}">${x.trend > 0 ? "▲" : "▼"} ${Math.round(Math.abs(x.trend) * 100)}%</span>` : ""}</div>
          <div class="gxf-stats"><span>Paid in fees <b>${money(w.fees)}</b>${w.owed > 0 ? ` <small>(${money(w.owed)} due)</small>` : ""}</span><span>Franchise <b>${money(w.fr)}</b></span><span class="${w.saved >= 0 ? "g" : "r"}">${w.saved >= 0 ? "Could have saved" : "Would cost"} <b>${money(Math.abs(w.saved))}</b>${w.saved >= 0 ? "" : " more"}</span><span>${w.booked} booked · ${money(x.feesM)}/month now</span>${x.perLearner ? `<span>On franchise ≈ <b>${money(x.perLearner)}</b>/learner vs ${money(x.N.avgFee)}</span>` : ""}</div>
          <div class="gx-bar" style="margin-top:6px;max-width:320px" title="Fees per month vs franchise per month"><span style="width:${clamp(x.cover * 66, 2, 100)}%;background:${x.cover >= 1 ? "#22c55e" : x.cover >= .75 ? "#f59e0b" : "#64748b"}"></span></div></div>
        <div class="gxf-side"><div class="gxf-score" title="Benefit score">${x.score}</div>
          ${x.i.phone ? `<button class="gx-btn wa" data-act="frmsg" data-id="${h(x.i.id)}"><i class="bi bi-whatsapp"></i>Message</button>` : `<button class="gx-btn" data-act="frmsg" data-id="${h(x.i.id)}"><i class="bi bi-chat-text"></i>Message</button>`}
          <button class="gx-btn" data-act="frreport" data-id="${h(x.i.id)}"><i class="bi bi-image"></i>Report</button></div></div>`; }).join("")}</div></div>`;
  }
  function prospectsChart(list) {
    if (!list.length) return '<div class="gx-empty">No referral instructors with students in the last 6 months.</div>';
    const W = 640, row = 34, top = 26, H = top + list.length * row + 26, L = 150, R = 70, max = Math.max(2, ...list.map(x => Math.max(x.n.bookedM, x.n.breakEvenM))) * 1.1, X = v => L + (W - L - R) * v / max;
    const col = x => x.ratio >= 1 ? "#22c55e" : x.ratio >= .7 ? "#f59e0b" : "#64748b";
    return `<svg class="gxf-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Booked students a month compared with the franchise break-even point for each referral instructor">
      <text x="${L}" y="14" class="gxf-ax">Booked students a month (last 3 full months) · ┆ = point where franchise is cheaper for them</text>
      ${list.map((x, k) => { const y = top + k * row; return `<text x="${L - 8}" y="${y + 19}" text-anchor="end" class="gxf-nm">${h(first(x.i.full_name))} ${h((x.i.full_name || "").split(/\s+/)[1] ? (x.i.full_name.split(/\s+/)[1][0] + ".") : "")}</text>
        <rect x="${L}" y="${y + 6}" width="${Math.max(2, X(x.n.bookedM) - L)}" height="18" rx="5" fill="${col(x)}"/>
        <line x1="${X(x.n.breakEvenM)}" x2="${X(x.n.breakEvenM)}" y1="${y + 2}" y2="${y + 28}" stroke="#a78bfa" stroke-width="2.5" stroke-dasharray="3 3"/>
        <text x="${Math.max(X(x.n.bookedM), X(x.n.breakEvenM)) + 6}" y="${y + 19}" class="gxf-v">${x.n.bookedM.toFixed(1)} / ${x.n.breakEvenM.toFixed(1)}</text>`; }).join("")}
      <text x="${L}" y="${H - 6}" class="gxf-ax">Green = franchise already saves them money · amber = close · grey = needs more students first</text></svg>`;
  }
  // a self-contained picture of the case for franchise, built only from this instructor's own referral history
  function frReportSvg(id, perWeek) {
    const i = iById(id), N = frNumbers(id), m = N.months, W = 720, fm = v => "£" + Math.round(v).toLocaleString("en-GB");
    const pw = perWeek != null ? perWeek : Math.max(.5, Math.round(N.bookedM / WK_M * 2) / 2);
    const refCostM = pw * WK_M * N.avgFee, diff = refCostM - N.frM, HW = frWin(frHistory(id), 6);
    const cx = 60, cy = 300, cw = 600, ch = 190, maxV = Math.max(N.frM, ...m.map(x => x.fees), 1) * 1.15, bw = cw / m.length;
    const Y = v => cy + ch - ch * v / maxV;
    const bars = m.map((x, k) => { const bx = cx + k * bw + bw * .2, w = bw * .6; return `<rect x="${bx}" y="${Y(x.fees)}" width="${w}" height="${cy + ch - Y(x.fees)}" rx="6" fill="#F5C518"${x.part < 1 ? ' opacity=".55"' : ""}/>
      <text x="${bx + w / 2}" y="${Y(x.fees) - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="#111">${fm(x.fees)}</text>
      <text x="${bx + w / 2}" y="${cy + ch + 18}" text-anchor="middle" font-size="12" fill="#555">${x.lbl}${x.part < 1 ? " (so far)" : ""}</text>
      <text x="${bx + w / 2}" y="${cy + ch + 34}" text-anchor="middle" font-size="11" fill="#888">${x.booked} booked</text>`; }).join("");
    const kpi = (x, lbl, v) => `<rect x="${x}" y="150" width="152" height="74" rx="12" fill="#f6f6f6"/><text x="${x + 14}" y="180" font-size="24" font-weight="800" fill="#111" font-family="Oswald,Inter,sans-serif">${v}</text><text x="${x + 14}" y="206" font-size="12" fill="#666">${lbl}</text>`;
    const good = diff >= 0;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 930" width="${W}" height="930" font-family="Inter,Arial,sans-serif">
      <rect width="${W}" height="930" rx="0" fill="#fff"/><rect width="${W}" height="96" fill="#111"/><rect y="96" width="${W}" height="5" fill="#D10A11"/>
      <text x="32" y="44" font-size="26" font-weight="800" fill="#fff" font-family="Oswald,Inter,sans-serif">Drive<tspan fill="#D10A11">SQ</tspan> · your franchise numbers</text>
      <text x="32" y="74" font-size="14" fill="#ccc">Prepared for ${h(i.full_name || "you")} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</text>
      <text x="32" y="136" font-size="15" font-weight="700" fill="#111">Last 6 months with DriveSQ</text>
      ${kpi(32, "learners sent to you", N.tot6.sent)}${kpi(196, "booked with you", N.tot6.booked)}${kpi(360, "referral fees", fm(N.tot6.fees))}${kpi(524, "a month, recently", fm(N.feesM))}
      <text x="32" y="262" font-size="15" font-weight="700" fill="#111">What you pay us each month</text>
      <text x="32" y="282" font-size="12" fill="#666">Gold bars = referral fees for booked learners · purple line = flat franchise fee (${fm(N.fee)} a week ≈ ${fm(N.frM)} a month)</text>
      <line x1="${cx}" x2="${cx + cw}" y1="${cy + ch}" y2="${cy + ch}" stroke="#ddd"/>
      ${bars}
      <line x1="${cx}" x2="${cx + cw}" y1="${Y(N.frM)}" y2="${Y(N.frM)}" stroke="#7c3aed" stroke-width="3" stroke-dasharray="8 6"/>
      <text x="${cx + cw}" y="${Y(N.frM) - 7}" text-anchor="end" font-size="12" font-weight="700" fill="#7c3aed">Franchise ${fm(N.frM)}/month</text>
      <rect x="32" y="560" width="656" height="148" rx="14" fill="${good ? "#ecfdf5" : "#f5f3ff"}" stroke="${good ? "#22c55e" : "#a78bfa"}"/>
      <text x="52" y="690" font-size="14" fill="${HW.saved >= 0 ? "#15803d" : "#555"}" font-weight="700">${HW.saved >= 0 ? "Last " + HW.months + " months: you paid " + fm(HW.fees) + " — franchise would have been " + fm(HW.fr) + ", saving you " + fm(HW.saved) : "Last " + HW.months + " months: you paid " + fm(HW.fees) + " in referral fees (franchise " + fm(HW.fr) + ")"}</text>
      <text x="52" y="592" font-size="15" font-weight="700" fill="#111">At ${pw} booked learner${pw === 1 ? "" : "s"} a week:</text>
      <text x="52" y="620" font-size="14" fill="#333">Referral fees ≈ ${fm(refCostM)} a month · Franchise = ${fm(N.frM)} a month</text>
      <text x="52" y="652" font-size="19" font-weight="800" fill="${good ? "#15803d" : "#6d28d9"}">${good ? "You'd save about " + fm(diff) + " a month on franchise" : "Franchise pays off from " + (N.breakEvenM / WK_M).toFixed(1) + " booked learners a week"}</text>
      <text x="32" y="746" font-size="15" font-weight="700" fill="#111">What franchise includes</text>
      ${["One flat weekly fee — no fee per learner, however many we send", "Priority for new learners in your area", "DriveSQ branding, the instructor app and admin support"].map((t, k) => `<circle cx="42" cy="${774 + k * 30}" r="5" fill="#D10A11"/><text x="56" y="${779 + k * 30}" font-size="14" fill="#222">${h(t)}</text>`).join("")}
      <text x="32" y="892" font-size="11" fill="#888">Figures come from the referrals DriveSQ has recorded for you. Break-even: ${(N.breakEvenM / WK_M).toFixed(1)} booked learners a week at ${fm(N.avgFee)} per learner.</text>
    </svg>`;
  }
  function frReport(id) {
    const i = iById(id), N = frNumbers(id);
    const pw0 = Math.max(.5, Math.round(N.bookedM / WK_M * 2) / 2);
    const m = modal(`<div class="gxm-sheet-hd"><h4>Franchise report · ${h(i.full_name)}</h4><button class="gx-btn" data-close aria-label="Close"><i class="bi bi-x-lg"></i></button></div>
      <p class="gx-sub">Their own numbers: what they've paid you in referral fees against a flat weekly fee. Move the slider to show "if we send you more".</p>
      <div class="gx-row" style="gap:12px;margin:6px 0 10px;align-items:center"><label class="gx-field" style="flex:1;min-width:200px">Booked learners a week: <b id="gxfPwV">${pw0}</b><input type="range" id="gxfPw" min="0.5" max="6" step="0.5" value="${pw0}"></label>
        <label class="gx-field">£/week<input class="dsq-inp" style="width:84px" type="number" min="0" step="5" id="gxfFee" value="${h(N.fee)}"></label></div>
      <div id="gxfImg" class="gxf-img">${frReportSvg(id, pw0)}</div>
      <div class="gx-acts" style="margin-top:10px"><button class="gx-btn p" id="gxfPng"><i class="bi bi-image"></i>Download picture</button>
        ${i.phone ? `<a class="gx-btn wa" id="gxfWa" target="_blank" rel="noopener" href="#"><i class="bi bi-whatsapp"></i>WhatsApp summary</a>` : ""}
        <button class="gx-btn" id="gxfShare"><i class="bi bi-share"></i>Share</button><button class="gx-btn" data-act="frmsg" data-id="${h(id)}"><i class="bi bi-chat-quote-fill"></i>Full message</button></div>`);
    const sheet = m.querySelector(".gxm-sheet"); sheet.classList.add("gxf-sheet");
    const pwEl = m.querySelector("#gxfPw"), feeEl = m.querySelector("#gxfFee");
    const summary = () => { const n2 = frNumbers(id), pw = parseFloat(pwEl.value), ref = pw * WK_M * n2.avgFee, d = ref - n2.frM;
      return "Hi " + first(i.full_name) + " 👋 Here are your DriveSQ numbers for the last 6 months:\n\n• " + n2.tot6.sent + " learners sent to you, " + n2.tot6.booked + " booked\n• " + money(n2.tot6.fees) + " paid in referral fees (≈" + money(n2.feesM) + " a month recently)\n\nOn franchise it's a flat " + money(n2.fee) + " a week (≈" + money(n2.frM) + " a month), with no fee per learner.\nAt " + pw + " booked learner" + (pw === 1 ? "" : "s") + " a week: referral fees ≈ " + money(ref) + "/month vs franchise " + money(n2.frM) + "/month" + (d >= 0 ? " — you'd save about " + money(d) + " a month." : ". Franchise pays off from " + (n2.breakEvenM / WK_M).toFixed(1) + " booked learners a week.") + "\n\nFancy a quick chat this week?\n— DriveSQ"; };
    const redraw = () => { m.querySelector("#gxfPwV").textContent = pwEl.value; m.querySelector("#gxfImg").innerHTML = frReportSvg(id, parseFloat(pwEl.value)); const w = m.querySelector("#gxfWa"); if (w) w.href = wa(i.phone, summary()); };
    pwEl.addEventListener("input", redraw);
    feeEl.addEventListener("change", () => { G.cfg.franchiseBy[id] = parseFloat(feeEl.value) || 0; saveCfg(); redraw(); });
    redraw();
    const png = () => new Promise((res, rej) => { const svg = frReportSvg(id, parseFloat(pwEl.value)), img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = 1440; c.height = 1860; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => b ? res(b) : rej(new Error("no image")), "image/png"); }; img.onerror = () => rej(new Error("render failed")); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
    const fname = "DriveSQ-franchise-" + (i.full_name || "instructor").replace(/\W+/g, "-") + ".png";
    m.querySelector("#gxfPng").addEventListener("click", async () => { try { const b = await png(), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast("Picture saved — send it with the WhatsApp summary", "success", 3000); } catch (e) { toast("Couldn't make the picture: " + e.message, "error"); } });
    m.querySelector("#gxfShare").addEventListener("click", async () => { try { const b = await png(), f = new File([b], fname, { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], text: summary() }); else { await navigator.clipboard.writeText(summary()); toast("Summary copied — use Download picture for the image", "info", 3500); } } catch (e) { if (e && e.name !== "AbortError") toast("Couldn't share: " + e.message, "error"); } });
  }
  function pitchText(id) {
    const i = iById(id), s = stats(id, 90), fee = frFee(id), wk = (s.n / 13);
    return "Hi " + first(i.full_name) + " 👋\n\nThanks for working with DriveSQ. Over the last 3 months we've sent you " + s.n + " learner" + (s.n === 1 ? "" : "s") + (s.booked ? " (" + s.booked + " booked)" : "") + " — about " + wk.toFixed(1) + " a week.\n\n" +
      "We're opening a few franchise places: a flat " + money(fee) + " a week instead of paying per student. That means:\n• No fee per student, however many we send\n• Priority for new learners in your area\n• DriveSQ branding, the instructor app and admin support\n\n" +
      (s.fees ? "You've paid " + money(s.fees) + " in referral fees in 3 months. " : "") + "Fancy a quick chat about it this week?\n\n— DriveSQ";
  }

  /* Money */
  function rMoney() {
    const f = forecast(), mk = G.month, sr = bySource(mk), lost = lostReasons(90), lostM = lostReasons(31);
    const totalBar = Math.max(f.total, f.last, 1), seg = v => (v / totalBar * 100).toFixed(1) + "%";
    let html = `<div class="gx-card"><h4><i class="bi bi-graph-up-arrow"></i>Fee forecast · ${new Date().toLocaleDateString("en-GB", { month: "long" })}</h4>
      <div class="gx-row" style="align-items:flex-end;gap:16px"><div><div class="gx-big">${money(f.total)}</div><div style="font-size:.74rem;color:var(--txt3)">expected this month · last month ${money(f.last)}</div></div>
      <div style="font-size:.78rem;color:var(--txt2);line-height:1.6">${money(f.got)} already paid (${f.paidN}) · ${money(f.expected)} likely from ${f.openN} open referrals · ${money(f.future)} from referrals still to come (${f.left} days left) · ${money(f.frMonth)} franchise (${f.fr})</div></div>
      <div class="gx-progress" role="img" aria-label="Forecast breakdown"><span style="left:0;width:${seg(f.got)};background:#22c55e"></span><span style="left:${seg(f.got)};width:${seg(f.frMonth)};background:#a78bfa"></span><span style="left:${seg(f.got + f.frMonth)};width:${seg(f.expected)};background:rgba(245,197,24,.75)"></span><span style="left:${seg(f.got + f.frMonth + f.expected)};width:${seg(f.future)};background:rgba(245,197,24,.3)"></span></div>
      <div class="gx-legend"><span><i style="background:#22c55e"></i>Paid</span><span><i style="background:#a78bfa"></i>Franchise</span><span><i style="background:rgba(245,197,24,.75)"></i>Open referrals × each instructor's booking rate</span><span><i style="background:rgba(245,197,24,.3)"></i>Still to come</span></div></div>`;
    html += `<div class="gx-card"><div class="gx-row" style="justify-content:space-between"><h4><i class="bi bi-pie-chart-fill"></i>Profit by source</h4><div class="gxm-seg" role="group">${[["this", "This month"], ["last", "Last month"]].map(m => `<button data-month="${m[0]}" aria-pressed="${mk === m[0]}">${m[1]}</button>`).join("")}</div></div>
      <p class="gx-sub">Enquiries per source → how many booked → referral fees earned, minus what you spent on ads that month.</p>
      <div class="gx-row" style="margin-bottom:10px">${G.cfg.channels.map(ch => `<label class="gx-field">${h(ch)} spend<input class="dsq-inp" type="number" min="0" step="1" inputmode="decimal" data-spend="${h(ch)}" data-mk="${h(sr.mk)}" value="${h(sr.spend[ch] != null ? sr.spend[ch] : "")}" placeholder="£"></label>`).join("")}</div>
      <div class="gx-scroll"><table class="gx-table"><thead><tr><th>Source</th><th class="n">Enq.</th><th class="n">Booked</th><th class="n">Fees</th><th class="n gx-hide-s">Spend</th><th class="n">Profit</th><th class="n gx-hide-s">Per booking</th></tr></thead><tbody>
      ${sr.list.map(x => `<tr><td>${h(x.k)}</td><td class="n">${x.n}</td><td class="n">${x.b} <span style="color:var(--txt3);font-size:.7rem">${x.n ? pct(x.b / x.n) : ""}</span></td><td class="n">${money(x.fees)}</td><td class="n gx-hide-s">${x.spend ? money(x.spend) : "—"}</td><td class="n" style="font-weight:700;color:${x.profit >= 0 ? "#4ade80" : "#f87171"}">${x.profit < 0 ? "−" : ""}${money(Math.abs(x.profit))}</td><td class="n gx-hide-s">${x.cpb != null ? money(x.cpb) : "—"}</td></tr>`).join("") || `<tr><td colspan="7" style="color:var(--txt3)">No enquiries in this month.</td></tr>`}
      </tbody></table></div>${(() => { const ga = sr.list.find(x => /google ads/i.test(x.k)); return ga && ga.spend ? `<div class="gx-banner ${ga.profit >= 0 ? "ok" : ""}" style="margin:10px 0 0"><i class="bi ${ga.profit >= 0 ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}"></i><div>Google Ads ${ga.profit >= 0 ? "is paying for itself" : "is costing more than it earns"} this month: ${ga.b} booked for ${money(ga.spend)} → ${ga.cpb ? money(ga.cpb) + " per booking" : "no bookings yet"}, against a ${money(G.cfg.refFee)} fee. Calls and messages from the ads that didn't come through a form aren't counted here.</div></div>` : ""; })()}</div>`;
    const maxL = Math.max(1, ...lost.map(x => x[1]));
    html += `<div class="gx-card"><h4><i class="bi bi-x-octagon-fill"></i>Why students didn't book</h4><p class="gx-sub">From "Mark lost" and instructor replies. Last 90 days · this month in brackets.</p>
      ${lost.length ? lost.map(([k, v]) => `<div class="gx-hbar"><span class="lab" title="${h(k)}">${h(k)}</span><div class="gx-bar"><span style="width:${v / maxL * 100}%;background:${/price/i.test(k) ? "#f59e0b" : /reach/i.test(k) ? "#60a5fa" : /far|nearby|automatic/i.test(k) ? "#a78bfa" : "#ef4444"}"></span></div><span class="v">${v} <span style="color:var(--txt3);font-weight:400">(${(lostM.find(x => x[0] === k) || [0, 0])[1]})</span></span></div>`).join("") : '<div class="gx-empty" style="padding:16px">No lost reasons recorded yet — use "Mark lost…" on Chase or Leads.</div>'}</div>`;
    return html;
  }

  /* Weekly */
  function rWeekly() {
    const w = week(0), p = week(1), key = "weekly:" + isoWeek(new Date()), last = Object.values(G.followups).sort((a, b) => String(b.key).localeCompare(String(a.key)))[0];
    const d = (a, b, lower) => b == null || a == null || a === b ? "" : `<span class="gx-delta ${(lower ? a < b : a > b) ? "up" : "dn"}">${a > b ? "▲" : "▼"} ${typeof a === "number" && typeof b === "number" && b ? Math.abs(Math.round((a - b) / b * 100)) + "%" : ""}</span>`;
    return `<div class="gx-weekly"><div class="gx-row" style="justify-content:space-between"><div><div style="font-family:Oswald,sans-serif;font-size:1.15rem;color:var(--txt)">📊 Last 7 days</div><div style="font-size:.74rem;color:var(--txt3)">compared with the 7 days before</div></div><button class="gx-btn gold" data-act="sendweekly"><i class="bi bi-phone-vibrate-fill"></i>Send to my phone</button></div>
      <div class="gx-kpis"><div class="gx-kpi"><div class="l">Enquiries</div><div class="n">${w.enq}</div><div class="s">${d(w.enq, p.enq)} was ${p.enq}</div></div>
      <div class="gx-kpi"><div class="l">Referred</div><div class="n">${w.refd}</div><div class="s">${d(w.refd, p.refd)} was ${p.refd}</div></div>
      <div class="gx-kpi"><div class="l">Booked</div><div class="n" style="color:#4ade80">${w.booked}</div><div class="s">${d(w.booked, p.booked)} was ${p.booked}</div></div>
      <div class="gx-kpi"><div class="l">Fees</div><div class="n">${money(w.fees)}</div><div class="s">${d(w.fees, p.fees)} was ${money(p.fees)}</div></div>
      <div class="gx-kpi"><div class="l">Median reply</div><div class="n">${fmtMins(w.reply)}</div><div class="s">${d(w.reply, p.reply, true)} was ${fmtMins(p.reply)}</div></div></div>
      <div style="font-size:.82rem;color:var(--txt2);margin-top:12px;line-height:1.5">${h(weeklyText())}</div></div>
      <div class="gx-card" style="margin-top:12px"><h4><i class="bi bi-alarm-fill"></i>Every Monday morning</h4><p class="gx-sub">The database update sets this up to arrive on your phone at about 8am every Monday, even if admin is closed. If that part isn't set up, the first time you open admin after 9am on a Monday sends it instead. Turn on phone alerts on the Dashboard to receive it.</p>
      <div class="gx-ch"><span class="dot" style="background:${G.followups[key] ? "#22c55e" : "#64748b"}"></span>${G.followups[key] ? "This week's summary was sent " + h(new Date(G.followups[key].updated_at).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })) : last ? "Last sent " + h(new Date(last.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })) : "Not sent yet"}</div></div>`;
  }

  /* modal (lost reason / pitch) */
  function modal(html) {
    let m = $("#gxModal"); if (!m) { m = document.createElement("div"); m.id = "gxModal"; m.className = "gxm-modal"; m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) m.classList.remove("open"); }); document.body.appendChild(m); m.addEventListener("click", onClick); }
    m.innerHTML = `<div class="gxm-sheet" role="dialog" aria-modal="true">${html}</div>`; m.classList.add("open"); const f = m.querySelector("button,textarea,select"); if (f) f.focus(); return m;
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") { const m = $("#gxModal"); if (m) m.classList.remove("open"); } });
  function lostModal(kind, id) {
    const r = kind === "ref" ? G.refs.find(x => x.id === id) : G.wl.find(x => x.id === id); if (!r) return;
    modal(`<h4 style="font-family:Oswald;margin:0 0 4px">Why didn't ${h(r.student_name || "they")} book?</h4><p class="gx-sub">${kind === "ref" ? "The referral is cancelled, so no fee is owed for it." : "The enquiry is closed."} The reason goes into your monthly totals.</p>
      <div style="display:grid;gap:8px">${LOST.map(l => `<button class="gx-btn" style="justify-content:flex-start;min-height:44px;font-size:.85rem" data-act="setlost" data-kind="${kind}" data-id="${h(id)}" data-reason="${h(l)}">${h(l)}</button>`).join("")}</div>
      <button class="gx-btn" data-close style="margin-top:12px;width:100%;justify-content:center">Cancel</button>`);
  }

  async function onClick(e) {
    const t = e.target.closest("[data-gtab],[data-act],[data-month],[data-chased]"); if (!t) return;
    if (t.hasAttribute("data-chased")) { markChased(t.getAttribute("data-chased").split(","), "whatsapp"); return; }
    if (t.hasAttribute("data-gtab")) { G.tab = t.getAttribute("data-gtab"); ls.set("tab", G.tab); render(); return; }
    if (t.hasAttribute("data-month")) { G.month = t.getAttribute("data-month"); render(); return; }
    const act = t.getAttribute("data-act"), id = t.getAttribute("data-id"), c = db();
    if (act === "copysql") { try { const r = await fetch("/" + SQL_FILE, { cache: "no-store" }); await navigator.clipboard.writeText(await r.text()); toast("SQL copied — paste it into the Supabase SQL Editor and press Run", "success", 5000); } catch (x) { toast("Copy failed — open " + SQL_FILE + " on GitHub", "error"); } }
    else if (act === "runnow") { t.disabled = true; const n = await autopilot("manual"); if (!n) toast("Nothing could be sent automatically — use the WhatsApp buttons below", "info", 4000); render(); badge(); }
    else if (act === "copylink") { try { await navigator.clipboard.writeText(t.getAttribute("data-text")); toast("Copied ✓", "success", 1500); } catch (x) { prompt("Copy this:", t.getAttribute("data-text")); } }
    else if (act === "snoozechase") { markChased(t.getAttribute("data-ids").split(","), "skipped"); }
    else if (act === "markbooked") { const r = G.refs.find(x => x.id === id); const at = new Date().toISOString(); const res = await c.from("referrals").update({ is_paid: true, paid_at: at }).eq("id", id); if (res.error) return toast("Couldn't update: " + res.error.message, "error"); Object.assign(r, { is_paid: true, paid_at: at }); try { const k = (typeof _refData !== "undefined" ? _refData : []).find(x => x.id === id); if (k) Object.assign(k, { is_paid: true, paid_at: at }); if (typeof _buildUnpaidRefIndex === "function") _buildUnpaidRefIndex(); } catch (x) {} toast((r.student_name || "Student") + " marked booked ✓", "success"); render(); badge(); }
    else if (act === "dismissreply") { const r = G.refs.find(x => x.id === id); if (r && r.reply_status === "booked") { if (!confirm("Hide this reply without marking the student booked?")) return; } const res = await c.from("referrals").update({ reply_status: null }).eq("id", id); if (!res.error && r) r.reply_status = null; render(); badge(); }
    else if (act === "lost") lostModal("ref", id);
    else if (act === "lostlead") lostModal("wl", id);
    else if (act === "setlost") {
      const kind = t.getAttribute("data-kind"), reason = t.getAttribute("data-reason"); $("#gxModal").classList.remove("open");
      if (kind === "ref") { const patch = G.hasRefCols ? { lost_reason: reason, is_cancelled: true } : { is_cancelled: true }; const res = await c.from("referrals").update(patch).eq("id", id); if (res.error) return toast("Couldn't save: " + res.error.message, "error"); Object.assign(G.refs.find(x => x.id === id) || {}, patch); }
      else { const patch = G.hasWlCols ? { lost_reason: reason, status: "cancelled" } : { status: "cancelled" }; const res = await c.from("waiting_list").update(patch).eq("id", id); if (res.error) return toast("Couldn't save: " + res.error.message, "error"); Object.assign(G.wl.find(x => x.id === id) || {}, patch); }
      toast("Marked lost — " + reason, "success", 2000); render(); badge();
    }
    else if (act === "contacted") markContacted(id, true);
    else if (act === "match") { const r = G.wl.find(x => x.id === id); if (!r) return; markContacted(id, true); try { waitlistAssign(r.id, r.student_name || "", wlPostcode(r), r.lesson_type || lessonType(r), r.student_phone || "", r.notes || "", r.area || ""); } catch (x) { switchTab("find"); } }
    else if (act === "pitch") { const i = iById(id), txt = pitchText(id); modal(`<h4 style="font-family:Oswald;margin:0 0 4px">Franchise pitch for ${h(i.full_name)}</h4><p class="gx-sub">Edit it, then send.</p><textarea class="dsq-inp gx-msg" id="gxPitch">${h(txt)}</textarea><div class="gx-acts"><a class="gx-btn wa" id="gxPitchWa" target="_blank" rel="noopener" href="${h(wa(i.phone, txt))}"><i class="bi bi-whatsapp"></i>Send on WhatsApp</a><button class="gx-btn" data-act="copylink" data-text="${h(txt)}" id="gxPitchCopy"><i class="bi bi-clipboard"></i>Copy</button><button class="gx-btn" data-close>Close</button></div>`); const ta = $("#gxPitch"); ta.addEventListener("input", () => { $("#gxPitchWa").href = wa(i.phone, ta.value); $("#gxPitchCopy").setAttribute("data-text", ta.value); }); }
    else if (act === "sendweekly") sendWeekly();
    else if (act === "frreport") frReport(id);
    else if (act === "frmsg") frMsgModal(id, G.frWin || 6);
    else if (act === "frwin") { G.frWin = +id; render(); }
  }
  function onChange(e) {
    const t = e.target;
    if (t.hasAttribute("data-cfg")) { const k = t.getAttribute("data-cfg"); G.cfg[k] = t.type === "checkbox" ? t.checked : (parseFloat(t.value) || 0); saveCfg(); if (k === "autoChase" && t.checked) autopilot("silent").then(() => { render(); badge(); }); else render(); badge(); }
    else if (t.hasAttribute("data-frfee")) { G.cfg.franchiseBy[t.getAttribute("data-frfee")] = parseFloat(t.value) || 0; saveCfg(); }
    else if (t.hasAttribute("data-spend")) { saveSpend(t.getAttribute("data-mk"), t.getAttribute("data-spend"), parseFloat(t.value) || 0).then(render); }
  }

  /* boot */
  function hookTab() {
    const sw = window.switchTab; if (typeof sw !== "function" || sw.__gx) return;
    const w = function (t) { const r = sw.apply(this, arguments); if (t === "growth") { render(); load(true).then(() => { render(); badge(); }); } return r; };
    Object.keys(sw).forEach(k => { w[k] = sw[k]; }); w.__gx = true; window.switchTab = w;
  }
  function boot() {
    let tries = 0;
    (function wait() {
      const mp = $("#mainPage");
      if (mp && !mp.classList.contains("hidden") && db() && instrs().length) {
        mount(); hookTab();
        load().then(() => { badge(); autopilot("silent"); weeklyFallback(); if (location.hash === "#growth") switchTab("growth"); });
        setInterval(() => { if (document.visibilityState !== "visible") return; load(true).then(() => { badge(); if (visible()) render(); autopilot("silent"); }); }, 5 * 6e4);
        setInterval(() => { if (visible() && G.tab === "leads") tick(); }, 1000);
        return;
      }
      if (++tries < 900) setTimeout(wait, 1000);
    })();
  }
  window.DSQG = { G, load, render, autopilot, stats, chaseState, forecast, bySource, leadScore, sourceRates, weeklyText };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

/* ══════════ Smart Match — upgrades Find Closest Instructor ══════════
   After the normal search, adds a ranked "Smart Match" panel on top: best match with reasons, a live map,
   priority modes (Balanced / Closest / Most likely to book / Share fairly), filters, compare and a WhatsApp intro.
   The original full list and Area Intelligence stay underneath ("Show full list"). */
(function () {
  "use strict";
  if (window.DSQSM) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const instrs = () => { try { return (typeof allInstrs !== "undefined" ? allInstrs : []) || []; } catch (e) { return []; } };
  const stu = () => { try { return typeof fcStudentData !== "undefined" ? fcStudentData : null; } catch (e) { return null; } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const first = n => String(n || "").trim().split(/\s+/)[0] || "there";
  const MODES = { balanced: ["Balanced", { d: .35, b: .3, f: .15, s: .1, c: .1 }], closest: ["Closest", { d: .7, b: .1, f: .05, s: .05, c: .1 }], book: ["Most likely to book", { d: .2, b: .55, f: .05, s: .15, c: .05 }], fair: ["Share fairly", { d: .3, b: .15, f: .45, s: .05, c: .05 }] };
  const COMP0 = [["d", "Distance", "#60a5fa"], ["b", "Books", "#22c55e"], ["f", "Fair share", "#a78bfa"], ["s", "Speed", "#f59e0b"], ["c", "Covers area", "#F5C518"]];
  const TC = () => (S.student && S.student.testCentre) || null;
  // the test-centre part only shows when a test centre was picked on the Find form
  const comps = () => TC() ? COMP0.concat([["t", "Test centre", "#f472b6"]]) : COMP0;
  const mapsUrl = r => { const s = S.student, tc = TC(), o = _fcInstrPc(r.i) || r.i.area || ""; try { return _fcMapsUrl(o, s.postcode, tc ? tc.postcode : ""); } catch (e) { return "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=" + encodeURIComponent(o) + "&destination=" + encodeURIComponent(s.postcode); } };
  const S = { mode: localStorage.getItem("gxm_mode") || "balanced", filters: new Set(JSON.parse(localStorage.getItem("gxm_f") || "[]")), cmp: new Set(), rows: [], student: null, geo: null, map: null, compact: true, showAll: false, osrm: {}, key: "" };
  const save = () => { try { localStorage.setItem("gxm_mode", S.mode); localStorage.setItem("gxm_f", JSON.stringify([...S.filters])); } catch (e) {} };
  const canTeach = (lt, want) => lt === "Both" || (want === "Automatic" ? lt === "Automatic" : lt !== "Automatic");
  const outward = pc => { const c = String(pc || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(c) ? c.slice(0, -3) : (c.match(/^[A-Z]{1,2}\d[A-Z\d]?/) || [""])[0]; };
  const covers = (i, oc) => !!oc && String((i.coverage_postcodes || "") + " " + (i.area || "")).toUpperCase().split(/[\s,;/]+/).some(c => c && outward(c) === oc);
  const waNum = p => { try { return buildWaNum(p || ""); } catch (e) { return ""; } };

  async function compute() {
    let s = stu(); if (!s || !s.postcode) return false;
    let g = null; try { g = await _fcGeo(s.postcode); } catch (e) {} if (!g) return false;
    s = Object.assign({}, s, { postcode: (() => { const c = String(s.postcode || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return c.length >= 5 ? c.slice(0, -3) + " " + c.slice(-3) : c; })() });
    S.student = s; S.geo = g; S.key = s.name + "|" + String(s.postcode).replace(/\s/g, "").toUpperCase() + "|" + s.type;
    const G = window.DSQG; if (G && !G.G.loaded) { try { await G.load(); } catch (e) {} }
    const oc = outward(s.postcode);
    const rows = await Promise.all(instrs().filter(i => i.status === "approved").map(async i => {
      const pc = _fcInstrPc(i); let ig = null; if (pc) { try { ig = await _fcGeo(pc); } catch (e) {} }
      if (!ig) return null;
      const st = G ? G.stats(i.id, 120) : { smooth: .5, speed: null, week: 0, unpaid: 0, n: 0, rate: null };
      return { i, g: ig, miles: haversine(g.lat, g.lon, ig.lat, ig.lon), mins: null, st, lt: i.car_type || "Manual", ok: canTeach(i.car_type || "Manual", s.type), cov: covers(i, oc), credits: (typeof _creditIndex !== "undefined" && _creditIndex[i.id]) || 0, fr: i.instructor_model === "franchise" };
    }));
    S.rows = rows.filter(Boolean).sort((a, b) => a.miles - b.miles);
    const tc = s.testCentre;
    if (tc && tc.lat != null) {
      const toc = outward(tc.postcode);
      S.rows.forEach(r => { const crow = r.miles, dT = haversine(r.g.lat, r.g.lon, tc.lat, tc.lon), cov = covers(r.i, toc);
        r.tc = { dist: dT, covers: cov, between: crow < tc.fromHome && dT < tc.fromHome, cost: _fcTestCost(crow, dT) - (cov ? 2 : 0) }; });
      S.tcBest = Math.min(...S.rows.map(r => r.tc.cost));
    }
    await Promise.all(S.rows.slice(0, 10).map(async r => {
      const k = [g.lat, g.lon, r.g.lat, r.g.lon].map(v => v.toFixed(4)).join(",");
      if (S.osrm[k] === undefined) { try { const ctl = new AbortController(); setTimeout(() => ctl.abort(), 3500); const j = await (await fetch(`https://router.project-osrm.org/route/v1/driving/${g.lon},${g.lat};${r.g.lon},${r.g.lat}?overview=false`, { signal: ctl.signal })).json(); S.osrm[k] = j.routes && j.routes[0] ? { mi: j.routes[0].distance / 1609.34, mins: Math.round(j.routes[0].duration / 60) } : null; } catch (e) { S.osrm[k] = null; } }
      if (S.osrm[k]) { r.miles = S.osrm[k].mi; r.mins = S.osrm[k].mins; }
    }));
    S.cmp.clear(); S.sel = null; return true;
  }
  function score(r) {
    const tc = TC() && r.tc, w0 = MODES[S.mode][1], st = r.st;
    const w = tc ? Object.assign(Object.fromEntries(Object.entries(w0).map(([k, v]) => [k, v * .55])), { t: .45 }) : w0;
    const c = {
      d: r.mins != null ? clamp(1 - (r.mins - 5) / 35, 0, 1) : clamp(1 - (r.miles - 1) / 9, 0, 1),
      b: clamp(st.smooth, 0, 1),
      f: r.credits ? 1 : [1, .7, .45, .25][st.week] != null ? [1, .7, .45, .25][st.week] : .1,
      s: st.speed == null ? .5 : clamp(1 - (st.speed - 1) / 13, 0, 1),
      c: r.cov ? 1 : r.miles <= 3 ? .6 : 0
    };
    if (tc) { const D = TC().fromHome || 0; c.t = clamp(1 - (r.tc.cost - S.tcBest) / Math.max(3, D * .25), 0, 1); if (r.tc.covers) c.t = Math.max(c.t, .9); }
    const parts = {}; let tot = 0; comps().forEach(([k]) => { parts[k] = w[k] * c[k] * 100; tot += parts[k]; });
    const pen = st.unpaid > 40 ? 8 : st.unpaid > 0 ? 3 : 0;
    return { total: Math.round(clamp(tot - pen, 0, 100)), parts, c, pen };
  }
  function ranked() {
    let list = S.rows.slice();
    if (!S.filters.has("type")) list = list.filter(r => r.ok);
    if (S.filters.has("near")) list = list.filter(r => r.miles <= 5);
    if (S.filters.has("referral")) list = list.filter(r => !r.fr);
    if (S.filters.has("fast")) list = list.filter(r => r.st.speed != null && r.st.speed <= 3);
    if (S.filters.has("free")) list = list.filter(r => r.st.week === 0);
    list.forEach(r => { r.sc = score(r); });
    return list.sort((a, b) => b.sc.total - a.sc.total || a.miles - b.miles);
  }
  function why(r) {
    const s = S.student, st = r.st, out = [];
    out.push(["📍", r.miles.toFixed(1) + " miles" + (r.mins != null ? " · about " + r.mins + " min drive" : "") + " from " + s.postcode]);
    out.push([r.ok ? "✅" : "⚠️", r.ok ? "Teaches " + s.type : "Teaches " + r.lt + " only"]);
    if (r.cov) out.push(["🗺️", "Says they cover " + outward(s.postcode)]);
    if (TC() && r.tc) out.push(["🏁", r.tc.dist.toFixed(1) + " miles from " + TC().name + (r.tc.covers ? " · covers " + outward(TC().postcode) : "") + (r.tc.between ? " · between home and the test" : r.tc.dist > TC().fromHome ? " · further from the test than the student is" : "")]);
    if (st.n) out.push(["📈", Math.round(st.smooth * 100) + "% of students they get go on to book" + (st.n < 4 ? " (few so far)" : "")]); else out.push(["🆕", "No referrals yet — a good chance to try them"]);
    if (st.speed != null) out.push(["⚡", "Usually books within " + (st.speed < 1.5 ? "a day" : Math.round(st.speed) + " days")]);
    out.push([st.week ? "📅" : "🙋", st.week ? st.week + " student" + (st.week > 1 ? "s" : "") + " from you this week" : "No students from you this week"]);
    if (r.credits) out.push(["🔄", "Owed " + r.credits + " replacement student" + (r.credits > 1 ? "s" : "")]);
    if (st.unpaid) out.push(["💷", "£" + Math.round(st.unpaid) + " in fees overdue"]);
    if (r.i.assign_note) out.push(["📝", r.i.assign_note]);
    return out;
  }
  const ringSvg = (v, size) => { const s = size || 44, rr = s / 2 - 4, c = 2 * Math.PI * rr, col = v >= 70 ? "#22c55e" : v >= 45 ? "#f59e0b" : "#ef4444"; return `<div class="gx-ring" style="width:${s}px;height:${s}px" role="img" aria-label="Match ${v} out of 100"><svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${rr}" fill="none" stroke="var(--dk3)" stroke-width="5"/><circle cx="${s / 2}" cy="${s / 2}" r="${rr}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}"/></svg><b style="font-size:${s > 50 ? "1.2rem" : ".88rem"}">${v}</b></div>`; };
  const av = (i, cls) => i.profile_photo_url ? `<img class="${cls}" src="${h(i.profile_photo_url)}" alt="">` : `<div class="${cls}">${h((i.full_name || "?").charAt(0))}</div>`;
  function intro(r) {
    const s = S.student;
    return "Hi " + first(r.i.full_name) + " 👋 New learner near you from DriveSQ:\n\n👤 " + s.name + "\n📍 " + s.postcode + (r.mins != null ? " (about " + r.mins + " min from you)" : "") + "\n🚗 " + s.type + (TC() ? "\n🏁 Test at " + TC().name : "") + (s.avail ? "\n🕐 " + s.avail : "") + (s.notes ? "\n📝 " + s.notes : "") + "\n\nCan you take them? Reply YES and I'll send their number.";
  }
  function trayInner() {
    const n = S.cmp.size, names = S.rows.filter(r => S.cmp.has(r.i.id)).map(r => first(r.i.full_name)).join(", ");
    return `<span class="gxm-tray-txt"><b>${n}</b> selected${names ? ": " + h(names) : ""}<small>${n < 2 ? "Tick one more to compare (up to 3)" : n < 3 ? "You can add one more" : "Maximum 3"}</small></span><button class="gx-btn" data-gxm-cmpclear>Clear</button><button class="gx-btn gold" data-gxm-cmpgo ${n < 2 ? "disabled" : ""}><i class="bi bi-layout-three-columns"></i>Compare</button>`;
  }
  function bar(sc) { return `<div class="gx-bar" title="${comps().map(([k, n]) => n + " " + Math.round(sc.parts[k])).join(" · ")}">${comps().map(([k, , col]) => `<span style="width:${sc.parts[k]}%;background:${col}"></span>`).join("")}</div>`; }

  function render() {
    const res = $("#findResults"); if (!res || !S.student) return;
    let box = $("#gxMatch", res); if (!box) { box = document.createElement("div"); box.id = "gxMatch"; res.prepend(box); }
    res.classList.toggle("gx-compact", S.compact);
    const list = ranked(), best = list[0], n = S.showAll ? list.length : Math.min(list.length, 6);
    const mode = Object.keys(MODES).map(k => `<button data-gxm-mode="${k}" aria-pressed="${S.mode === k}">${MODES[k][0]}</button>`).join("");
    const F = [["near", "Within 5 miles"], ["referral", "Referral only"], ["free", "No student this week"], ["fast", "Books fast"], ["type", "Include other lesson type"]];
    let html = `<div class="gxm-top"><div class="gxm-title"><i class="bi bi-stars" style="color:var(--gold)"></i>Smart Match <span class="ai">${list.length} RANKED</span></div><div class="gxm-seg" role="group" aria-label="Priority">${mode}</div></div>
      <div class="gxm-filters">${F.map(f => `<button data-gxm-f="${f[0]}" aria-pressed="${S.filters.has(f[0])}">${f[1]}</button>`).join("")}</div>`;
    if (!best) { html += `<div class="gx-empty">No instructor matches these filters. <button class="gx-btn" data-gxm-clear>Clear filters</button></div>`; }
    else {
      html += `<div class="gxm-hero"><div class="gxm-best"><div class="lbl"><i class="bi bi-trophy-fill"></i>Best match · ${h(MODES[S.mode][0])}</div>
        <div class="gxm-who">${av(best.i, "gxm-av")}<div style="flex:1;min-width:0"><div class="gxm-name">${h(best.i.full_name)}</div><div class="gxm-meta">${h(best.i.area || "")} · ${h(best.lt === "Both" ? "Manual & Auto" : best.lt)} · ${h(best.i.instructor_model || "unsure")}</div></div>${ringSvg(best.sc.total, 60)}</div>
        <ul class="gxm-why">${why(best).map(w => `<li><span>${w[0]}</span><span>${h(w[1])}</span></li>`).join("")}</ul>
        ${bar(best.sc)}<div class="gxm-legend">${comps().map(([, n, col]) => `<span><i style="background:${col}"></i>${n}</span>`).join("")}</div>
        <div class="gx-acts" style="margin-top:12px"><button class="gx-btn p" data-gxm-assign="${h(best.i.id)}"><i class="bi bi-person-plus-fill"></i>Create &amp; Assign</button>
        ${waNum(best.i.phone) ? `<a class="gx-btn wa" target="_blank" rel="noopener" href="https://wa.me/${waNum(best.i.phone)}?text=${encodeURIComponent(intro(best))}"><i class="bi bi-whatsapp"></i>Ask if they can take them</a>` : ""}
        <a class="gx-btn" target="_blank" rel="noopener" href="${h(mapsUrl(best))}" title="Driving route on Google Maps"><i class="bi bi-google"></i>${TC() ? "Route via test centre" : "Distance on Maps"}</a>
        ${best.i.phone ? `<a class="gx-btn" href="tel:${h(best.i.phone)}"><i class="bi bi-telephone-fill"></i>Call</a>` : ""}</div></div>
        <div class="gxm-map" id="gxmMap"><div class="gxm-map-ph">Loading map…</div></div></div>`;
      html += `<div class="gxm-list">${list.slice(0, n).map((r, k) => `<div class="gxm-row" data-gxm-row="${h(r.i.id)}"><div class="gxm-rank">${k + 1}</div>${ringSvg(r.sc.total, 40)}<div style="min-width:0"><div class="nm">${h(r.i.full_name)}${r.fr ? ' <span class="gx-chip p">Franchise</span>' : ""}${!r.ok ? ' <span class="gx-chip a">' + h(r.lt) + " only</span>" : ""}</div>
          <div class="pills"><span class="gx-chip b">${r.miles.toFixed(1)} mi${r.mins != null ? " · " + r.mins + " min" : ""}</span><span class="gx-chip ${r.st.smooth >= .55 ? "g" : r.st.smooth >= .4 ? "a" : "r"}">${r.st.n ? Math.round(r.st.smooth * 100) + "% book" : "new"}</span>${r.st.speed != null ? `<span class="gx-chip">~${Math.max(1, Math.round(r.st.speed))}d</span>` : ""}<span class="gx-chip ${r.st.week ? "" : "g"}">${r.st.week} this wk</span>${r.cov ? '<span class="gx-chip" style="color:var(--gold)">covers</span>' : ""}${r.tc ? `<span class="gx-chip ${r.tc.covers || r.tc.between ? "g" : r.tc.dist > TC().fromHome ? "a" : ""}" title="Distance from ${h(TC().name)}">🏁 ${r.tc.dist.toFixed(1)} mi${r.tc.covers ? " · covers" : r.tc.between ? " · between" : ""}</span>` : ""}${r.st.unpaid ? `<span class="gx-chip r">£${Math.round(r.st.unpaid)} owed</span>` : ""}${r.credits ? '<span class="gx-chip a">credit owed</span>' : ""}</div>${bar(r.sc)}</div>
          <div class="gxm-side"><button class="gx-btn p" data-gxm-assign="${h(r.i.id)}" aria-label="Assign to ${h(r.i.full_name)}"><i class="bi bi-person-plus-fill"></i><span class="gx-hide-s">Assign</span></button><a class="gx-btn gxm-maps" target="_blank" rel="noopener" href="${h(mapsUrl(r))}" aria-label="Route to ${h(r.i.full_name)} on Google Maps" title="Google Maps route"><i class="bi bi-google"></i><span class="gx-hide-s">Maps</span></a><label class="gxm-cmp"><input type="checkbox" data-gxm-cmp="${h(r.i.id)}" ${S.cmp.has(r.i.id) ? "checked" : ""}>Compare</label></div></div>`).join("")}</div>
        ${list.length > 6 ? `<button class="gx-btn gxm-more" data-gxm-all>${S.showAll ? "Show top 6" : "Show all " + list.length}</button>` : ""}
        <div class="gxm-tray ${S.cmp.size ? "show" : ""}" id="gxmTray">${trayInner()}</div>`;
    }
    html += `<button class="gx-btn gxm-more" data-gxm-toggle><i class="bi ${S.compact ? "bi-chevron-down" : "bi-chevron-up"}"></i>${S.compact ? "Show full list, other drivers &amp; area intelligence" : "Hide full list"}</button>`;
    box.innerHTML = html;
    if (best) drawMap(list.slice(0, Math.max(n, 6)));
  }
  let _lf = null;
  // one shared loader — admin.html's own maps load the same Leaflet, so wait for that copy instead of adding a second
  function leaflet() {
    if (window.L && window.L.map) return Promise.resolve(true);
    if (_lf) return _lf;
    if (!document.getElementById("leaflet-css")) { const lc = document.createElement("link"); lc.id = "leaflet-css"; lc.rel = "stylesheet"; lc.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(lc); }
    _lf = new Promise(res => {
      const done = () => res(!!(window.L && window.L.map));
      const old = document.querySelector('script[src*="leaflet@1.9.4/dist/leaflet.js"]');
      if (old) { let n = 0; (function w() { if (window.L && window.L.map) return res(true); if (++n > 100) return res(false); setTimeout(w, 100); })(); return; }
      const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"; sc.onload = done; sc.onerror = () => { _lf = null; res(false); }; document.head.appendChild(sc);
    });
    return _lf;
  }
  const pinCol = v => v >= 70 ? "#22c55e" : v >= 45 ? "#f59e0b" : "#ef4444";
  function popupHtml(r) {
    const tc = TC();
    return `<div class="gxm-pop"><b>${h(r.i.full_name)}</b><div>${r.sc.total}/100 · ${r.miles.toFixed(1)} mi${r.mins != null ? " · " + r.mins + " min" : ""} to student</div>${tc && r.tc ? `<div>🏁 ${r.tc.dist.toFixed(1)} mi to ${h(tc.name)}${r.tc.covers ? " · covers" : r.tc.between ? " · in between" : ""}</div>` : ""}
      <div class="gxm-pop-acts"><button class="gx-btn p" data-gxm-assign="${h(r.i.id)}"><i class="bi bi-person-plus-fill"></i>Assign</button><a class="gx-btn" target="_blank" rel="noopener" href="${h(mapsUrl(r))}"><i class="bi bi-google"></i>Maps</a></div></div>`;
  }
  // highlight one instructor: bigger pin, a line to the student (and on to the test centre) with the distance on it
  function selectOnMap(id, open) {
    const M = S.mapCtx; if (!M) return;
    const r = M.list.find(x => x.i.id === id); if (!r) return;
    S.sel = id;
    M.markers.forEach((m, k) => { const on = M.list[k].i.id === id; m.setIcon(M.icon(M.list[k], k, on)); m.setZIndexOffset(on ? 800 : 0); });
    M.link.clearLayers();
    const st = [S.geo.lat, S.geo.lon], ip = [r.g.lat, r.g.lon];
    L.polyline([ip, st], { color: "#F5C518", weight: 4, opacity: .9 }).addTo(M.link)
      .bindTooltip(`${first(r.i.full_name)} → student: ${r.miles.toFixed(1)} mi${r.mins != null ? " · " + r.mins + " min" : ""}`, { permanent: true, direction: "center", className: "gxm-dist" });
    const tc = TC();
    if (tc && tc.lat != null && r.tc) L.polyline([ip, [tc.lat, tc.lon]], { color: "#f472b6", weight: 2, opacity: .8, dashArray: "2 6" }).addTo(M.link)
      .bindTooltip(`${r.tc.dist.toFixed(1)} mi to test`, { permanent: true, direction: "center", className: "gxm-dist tc" });
    $$(".gxm-row.on").forEach(x => x.classList.remove("on")); const row = $(`[data-gxm-row="${CSS.escape(id)}"]`); if (row) row.classList.add("on");
    const lbl = $("#gxmMapSel"); if (lbl) lbl.innerHTML = `<b>${h(r.i.full_name)}</b> · ${r.miles.toFixed(1)} mi${r.mins != null ? " · " + r.mins + " min" : ""}${tc && r.tc ? " · 🏁 " + r.tc.dist.toFixed(1) + " mi" : ""} <a target="_blank" rel="noopener" href="${h(mapsUrl(r))}">Open in Google Maps</a>`;
    if (open) { const k = M.list.indexOf(r); M.markers[k].openPopup(); M.map.panInside(ip, { padding: [40, 40] }); }
  }
  async function drawMap(list) {
    const el = $("#gxmMap"); if (!el) return;
    if (!(await leaflet())) { el.innerHTML = '<div class="gxm-map-ph">Map couldn\'t load — check the connection. Use the Maps buttons instead.</div>'; return; }
    if (!el.isConnected || !S.geo) return;
    try { if (S.map) S.map.remove(); } catch (e) {} S.map = null; S.mapCtx = null;
    if (S.mapRO) { try { S.mapRO.disconnect(); } catch (e) {} }
    el.innerHTML = "";
    const touch = window.matchMedia && matchMedia("(pointer:coarse)").matches;
    const map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, dragging: !touch, tap: false });
    // normal street map in both themes (the old dark basemap looked like a black box); falls back to CARTO if OSM tiles fail
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
    let errs = 0, swapped = false;
    osm.on("tileerror", () => { if (swapped || ++errs < 4) return; swapped = true; map.removeLayer(osm); L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 18, subdomains: "abcd", attribution: "© OpenStreetMap © CARTO" }).addTo(map); });
    const c = [S.geo.lat, S.geo.lon];
    [3, 5, 10].forEach((mi, k) => L.circle(c, { radius: mi * 1609.34, color: "#F5C518", weight: 1, opacity: .5 - k * .12, fillOpacity: .03, dashArray: "4 6", interactive: false }).addTo(map));
    L.marker(c, { icon: L.divIcon({ className: "", html: '<div class="gxm-pin me">●</div>', iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 1000 }).addTo(map).bindTooltip("Student · " + h(S.student.postcode), { direction: "top", offset: [0, -10] });
    const pts = [c], tc = TC();
    if (tc && tc.lat != null) { L.marker([tc.lat, tc.lon], { icon: L.divIcon({ className: "", html: '<div class="gxm-pin tc">🏁</div>', iconSize: [28, 28], iconAnchor: [14, 14] }), zIndexOffset: 900 }).addTo(map).bindTooltip(h(tc.name), { direction: "top", offset: [0, -12] }); L.polyline([c, [tc.lat, tc.lon]], { color: "#f472b6", weight: 2, opacity: .6, dashArray: "6 6", interactive: false }).addTo(map); pts.push([tc.lat, tc.lon]); }
    const icon = (r, k, on) => L.divIcon({ className: "", html: `<div class="gxm-pin${on ? " sel" : ""}" style="background:${pinCol(r.sc.total)}">${k + 1}</div>`, iconSize: on ? [36, 36] : [28, 28], iconAnchor: on ? [18, 18] : [14, 14] });
    const markers = list.map((r, k) => {
      const m = L.marker([r.g.lat, r.g.lon], { icon: icon(r, k, false), title: r.i.full_name, riseOnHover: true }).addTo(map);
      m.bindTooltip(`${k + 1}. ${h(first(r.i.full_name))}`, { direction: "top", offset: [0, -14] });
      m.bindPopup(popupHtml(r), { maxWidth: 230, autoPanPaddingTopLeft: [52, 16], autoPanPaddingBottomRight: [16, 70] });
      m.on("click", () => { selectOnMap(r.i.id, false); const row = $(`[data-gxm-row="${CSS.escape(r.i.id)}"]`); if (row) { row.classList.add("flash"); setTimeout(() => row.classList.remove("flash"), 1000); } });
      if (k < 5) pts.push([r.g.lat, r.g.lon]);
      return m;
    });
    S.mapCtx = { map, list, markers, icon, link: L.layerGroup().addTo(map), pts };
    const cap = L.DomUtil.create("div", "gxm-mapcap", el); cap.id = "gxmMapSel"; L.DomEvent.disableClickPropagation(cap);
    const fit = () => { try { map.invalidateSize(); map.fitBounds(L.latLngBounds(pts), { padding: [34, 34], maxZoom: 13 }); } catch (e) {} };
    fit();
    // fit-all button
    const Fit = L.Control.extend({ onAdd() { const b = L.DomUtil.create("button", "gxm-fit"); b.type = "button"; b.title = "Show everyone"; b.innerHTML = '<i class="bi bi-arrows-fullscreen"></i>'; L.DomEvent.on(b, "click", e => { L.DomEvent.stop(e); fit(); }); return b; } });
    map.addControl(new Fit({ position: "topright" }));
    // desktop: wheel zoom only after clicking the map, so the page still scrolls
    map.on("click", () => map.scrollWheelZoom.enable()); el.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
    // phones: one finger scrolls the page; tap the map to move it
    if (touch) {
      const hint = L.DomUtil.create("button", "gxm-touch", el); hint.type = "button"; hint.textContent = "Tap to move the map";
      L.DomEvent.on(hint, "click", e => { L.DomEvent.stop(e); map.dragging.enable(); hint.remove(); });
    }
    // a map drawn while the tab was hidden has no size — fix it when it becomes visible
    if (window.ResizeObserver) { let last = ""; S.mapRO = new ResizeObserver(() => { const k = el.clientWidth + "x" + el.clientHeight; if (k === last || !el.clientWidth) return; const first0 = !last; last = k; map.invalidateSize(); if (!first0) fit(); }); S.mapRO.observe(el); }
    S.map = map; setTimeout(fit, 250);
    const keep = list.find(r => r.i.id === S.sel);
    selectOnMap((keep || list[0]).i.id, false);
  }
  function compareModal() {
    const rows = ranked().filter(r => S.cmp.has(r.i.id));
    // a ticked instructor can drop out of the list when a filter changes — compare whoever is still selected
    if (rows.length < 2) { try { showToast(S.cmp.size >= 2 ? "Some ticked instructors are hidden by a filter — clear filters or tick another" : "Tick at least 2 instructors to compare", "info", 3000); } catch (x) {} return; }
    const best = (vals, low) => { const v = vals.filter(x => x != null); const t = low ? Math.min(...v) : Math.max(...v); return x => v.length > 1 && x === t && !v.every(y => y === t); };
    const line = (lab, vals, fmt, low) => { const isB = best(vals, low); return `<tr><th scope="row">${lab}</th>${vals.map(v => `<td class="${v != null && isB(v) ? "best" : ""}">${v == null ? "—" : fmt(v)}</td>`).join("")}</tr>`; };
    const tc = TC();
    const html = `<div class="gxm-sheet-hd"><h4>Compare instructors</h4><button class="gx-btn" data-close aria-label="Close"><i class="bi bi-x-lg"></i></button></div>
      <div class="gxm-sheet-sub">${h(S.student.name)} · ${h(S.student.postcode)} · ${h(S.student.type)}${tc ? " · test at " + h(tc.name) : ""}. <span style="color:#4ade80">Green</span> = best.</div>
      <table class="gxm-cmpt"><thead><tr><th></th>${rows.map(r => `<th scope="col">${av(r.i, "gxm-cav")}<span>${h(r.i.full_name)}</span></th>`).join("")}</tr></thead><tbody>
      ${line("Match", rows.map(r => r.sc.total), v => v + "/100")}${line("Miles to student", rows.map(r => r.miles), v => v.toFixed(1), true)}${line("Drive", rows.map(r => r.mins), v => v + " min", true)}
      ${tc ? line("Miles to test centre", rows.map(r => r.tc ? r.tc.dist : null), v => v.toFixed(1), true) + `<tr><th scope="row">Test centre fit</th>${rows.map(r => `<td>${!r.tc ? "—" : r.tc.covers ? "✓ Covers it" : r.tc.between ? "✓ In between" : r.tc.dist > tc.fromHome ? "Far side" : "—"}</td>`).join("")}</tr>` : ""}
      ${line("Booking rate", rows.map(r => r.st.n ? r.st.smooth : null), v => Math.round(v * 100) + "%")}${line("Days to book", rows.map(r => r.st.speed), v => v.toFixed(1), true)}
      ${line("Students this week", rows.map(r => r.st.week), v => v, true)}${line("Overdue fees", rows.map(r => r.st.unpaid), v => "£" + Math.round(v), true)}
      <tr><th scope="row">Teaches</th>${rows.map(r => `<td>${h(r.lt === "Both" ? "Manual & Auto" : r.lt)}</td>`).join("")}</tr><tr><th scope="row">Covers area</th>${rows.map(r => `<td>${r.cov ? "✓" : "—"}</td>`).join("")}</tr>
      <tr><th scope="row">Type</th>${rows.map(r => `<td>${h(r.i.instructor_model || "unsure")}</td>`).join("")}</tr>
      <tr class="gxm-cmpt-acts"><th></th>${rows.map(r => `<td><button class="gx-btn p" data-gxm-assign="${h(r.i.id)}"><i class="bi bi-person-plus-fill"></i>Assign</button><a class="gx-btn" target="_blank" rel="noopener" href="${h(mapsUrl(r))}"><i class="bi bi-google"></i>Maps</a></td>`).join("")}</tr></tbody></table>
      <button class="gx-btn" data-close style="margin-top:12px;width:100%;justify-content:center">Close</button>`;
    // own modal: #gxModal belongs to the Growth tab (its buttons are wired when it is created)
    let m = $("#gxmCmpModal"); if (!m) { m = document.createElement("div"); m.id = "gxmCmpModal"; m.className = "gxm-modal"; document.body.appendChild(m); m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) m.classList.remove("open"); }); document.addEventListener("keydown", e => { if (e.key === "Escape") m.classList.remove("open"); }); }
    m.innerHTML = `<div class="gxm-sheet" role="dialog" aria-modal="true" aria-label="Compare instructors">${html}</div>`; m.classList.add("open");
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-gxm-mode],[data-gxm-f],[data-gxm-assign],[data-gxm-all],[data-gxm-toggle],[data-gxm-cmpgo],[data-gxm-cmpclear],[data-gxm-clear]"); if (!t) return;
    if (t.hasAttribute("data-gxm-mode")) { S.mode = t.getAttribute("data-gxm-mode"); save(); render(); }
    else if (t.hasAttribute("data-gxm-f")) { const f = t.getAttribute("data-gxm-f"); S.filters.has(f) ? S.filters.delete(f) : S.filters.add(f); save(); render(); }
    else if (t.hasAttribute("data-gxm-clear")) { S.filters.clear(); save(); render(); }
    else if (t.hasAttribute("data-gxm-all")) { S.showAll = !S.showAll; render(); }
    else if (t.hasAttribute("data-gxm-toggle")) { S.compact = !S.compact; $("#findResults").classList.toggle("gx-compact", S.compact); render(); }
    else if (t.hasAttribute("data-gxm-cmpgo")) compareModal();
    else if (t.hasAttribute("data-gxm-cmpclear")) { S.cmp.clear(); render(); }
    else if (t.hasAttribute("data-gxm-assign")) { const i = instrs().find(x => x.id === t.getAttribute("data-gxm-assign")); const m = $("#gxmCmpModal"); if (m) m.classList.remove("open"); if (i) openCreateAndAssign(i.id, i.full_name); }
  });
  document.addEventListener("click", e => {
    const row = e.target.closest("[data-gxm-row]"); if (!row || e.target.closest("button,a,label,input")) return;
    selectOnMap(row.getAttribute("data-gxm-row"), true); const m = $("#gxmMap"); if (m && m.getBoundingClientRect().bottom < 0) m.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  document.addEventListener("change", e => { const t = e.target; if (!t.hasAttribute || !t.hasAttribute("data-gxm-cmp")) return; const id = t.getAttribute("data-gxm-cmp"); if (t.checked) { if (S.cmp.size >= 3) { t.checked = false; try { showToast("Compare up to 3 at a time", "info", 2000); } catch (x) {} return; } S.cmp.add(id); } else S.cmp.delete(id); const tray = $("#gxmTray"); if (tray) { tray.classList.toggle("show", S.cmp.size > 0); tray.innerHTML = trayInner(); } });

  function hook() {
    const orig = window.findClosest; if (typeof orig !== "function" || orig.__gxm) return false;
    const w = async function () {
      const out = await orig.apply(this, arguments);
      try { S.compact = true; S.showAll = false; if (await compute()) render(); } catch (e) { console.warn("Smart Match", e); }
      return out;
    };
    Object.keys(orig).forEach(k => { w[k] = orig[k]; }); w.__gxm = true; w.__xd = orig.__xd; window.findClosest = w; return true;
  }
  // the search box and other tools sometimes redraw the results — put Smart Match back when they do (unless the admin is searching)
  function watch() {
    const res = $("#findResults"); if (!res || res.__gxmObs) return; res.__gxmObs = true;
    new MutationObserver(() => {
      if (!S.student || $("#gxMatch", res)) return;
      const s = stu(); if (!s || s.name + "|" + String(s.postcode).replace(/\s/g, "").toUpperCase() + "|" + s.type !== S.key) { res.classList.remove("gx-compact"); return; }
      const q = ($("#fcInstrSearch") || {}).value; if (q) { res.classList.remove("gx-compact"); return; }
      render();
    }).observe(res, { childList: true });
  }
  function boot() { let n = 0; (function t() { const ok = hook(); watch(); if (!ok && ++n < 120) setTimeout(t, 1000); else if (ok) setTimeout(() => { if (window.findClosest && !window.findClosest.__gxm) hook(); }, 3000); })(); }
  window.DSQSM = { S, render, compute, ranked };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 500)); else setTimeout(boot, 500);
})();
