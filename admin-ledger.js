/* DriveSQ admin — Money overview (referral ledger)
   One place that joins referral fees, the booking flags and the paid tool:
     paid            = fee collected (is_paid)
     booked, owed    = ✅ green flag, not paid yet → money the instructor owes
     unsure          = 🟣 purple → expected at that instructor's booking rate
     no flag yet     = expected at that instructor's booking rate
     not booked      = 🚩 red → no fee due (void it)
   Estimates: month-end cash, next 3 months, profit after expenses, tax set-aside,
   aged debts, per-instructor statements and data checks. Lives at the top of
   Accounting, with a short money strip on the Referrals tab. */
(function () {
  "use strict";
  if (window.DSQL) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const DAY = 864e5;
  const h = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = v => (v < 0 ? "−" : "") + "£" + Math.abs(Math.round(v || 0)).toLocaleString("en-GB");
  const money2 = v => "£" + (v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const refs = () => { try { return _refData || []; } catch (e) { return []; } };
  const exps = () => { try { return _expData || []; } catch (e) { return []; } };
  const incs = () => { try { return _incData || []; } catch (e) { return []; } };
  const instrs = () => { try { return allInstrs || []; } catch (e) { return []; } };
  const iById = id => instrs().find(i => i.id === id) || {};
  const first = n => String(n || "").trim().split(/\s+/)[0] || "";
  const amt = r => parseFloat(r.amount) || 0;
  const age = r => (Date.now() - new Date(r.created_at)) / DAY;
  const toast = (m, t, ms) => { try { showToast(m, t || "info", ms || 2500); } catch (e) {} };
  const CFG_KEY = "dsq_ledger_cfg";
  const cfg = (() => { try { return Object.assign({ taxPct: 20 }, JSON.parse(localStorage.getItem(CFG_KEY) || "{}")); } catch (e) { return { taxPct: 20 }; } })();
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
  const S = { view: "statements", openInstr: null };

  // instructor's one-tap reply counts until a flag is set by hand (same rule as the Referrals tab)
  const RF = { booked: "green", not_yet: "purple", unreachable: "red", not_interested: "red" };
  const flagOf = r => { const rf = RF[r.reply_status]; return rf && (!r.flag_color || r.flag_color === "purple") ? rf : r.flag_color || null; };
  function status(r) {
    if (r.is_cancelled || r.is_credit) return null;
    if (r.is_paid) return "paid";
    const f = flagOf(r);
    return f === "green" ? "owed" : f === "purple" ? "unsure" : f === "red" ? "notbooked" : "pending";
  }
  const ST = {
    paid: ["Paid", "#22c55e", "✅"], owed: ["Booked · owed", "#F5C518", "💷"], unsure: ["Unsure", "#a855f7", "🟣"],
    pending: ["No flag yet", "#94a3b8", "⚪"], notbooked: ["Not booked · no fee", "#ef4444", "🚩"]
  };
  // what share of a booked-but-unpaid fee usually gets paid, by how old it is
  const collectP = d => d <= 30 ? .95 : d <= 60 ? .8 : d <= 90 ? .6 : .35;

  function compute() {
    const all = refs().filter(r => !r.is_cancelled && !r.is_credit);
    const now = new Date(), m0 = new Date(now.getFullYear(), now.getMonth(), 1), m1 = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysLeft = Math.max(0, (m1 - now) / DAY), daysIn = (m1 - m0) / DAY;

    // booking rate per instructor (last 180 days): booked = paid or green; decided = booked + not booked + anything older than 30 days
    const rate = {}, rateAll = { b: 0, d: 0 };
    all.filter(r => age(r) <= 180).forEach(r => {
      const st = status(r), x = rate[r.instructor_id] = rate[r.instructor_id] || { b: 0, d: 0 };
      const booked = st === "paid" || st === "owed", decided = booked || st === "notbooked" || age(r) > 30;
      if (decided) { x.d++; rateAll.d++; } if (booked) { x.b++; rateAll.b++; }
    });
    const pAll = (rateAll.b + 1.5) / (rateAll.d + 3);
    const pOf = id => { const x = rate[id]; return x ? (x.b + 3 * pAll) / (x.d + 3) : pAll; }; // small samples lean towards the school average

    // days from referral to payment
    const payDays = all.filter(r => r.is_paid && r.paid_at).map(r => Math.max(0, (new Date(r.paid_at) - new Date(r.created_at)) / DAY)).sort((a, b) => a - b);
    const dPay = payDays.length ? payDays[Math.floor(payDays.length / 2)] : 14;
    const fees = all.map(amt).filter(v => v > 0), avgFee = fees.length ? fees.reduce((a, b) => a + b, 0) / fees.length : 0;

    const rows = all.map(r => {
      const st = status(r), a = amt(r), d = age(r), p = pOf(r.instructor_id);
      let exp = 0;
      if (st === "owed") exp = a * collectP(d);
      else if (st === "unsure") exp = a * p * .75;
      else if (st === "pending") exp = a * p * (d > 30 ? .4 : 1);
      return { r, st, a, d, p, exp };
    });
    const sum = (st, f) => rows.filter(x => x.st === st).reduce((s, x) => s + (f ? f(x) : x.a), 0);
    const cnt = st => rows.filter(x => x.st === st).length;

    // cash in by month (fees by paid date + manual income)
    const mk = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const cash = {}, spend = {};
    all.filter(r => r.is_paid).forEach(r => { const k = mk(new Date(r.paid_at || r.created_at)); cash[k] = (cash[k] || 0) + amt(r); });
    incs().forEach(r => { const k = mk(new Date(r.income_date + "T00:00:00")); cash[k] = (cash[k] || 0) + (parseFloat(r.amount) || 0); });
    exps().forEach(r => { const k = mk(new Date(r.expense_date + "T00:00:00")); spend[k] = (spend[k] || 0) + (parseFloat(r.amount) || 0); });
    const thisK = mk(now);
    const burnMonths = [1, 2, 3].map(k => mk(new Date(now.getFullYear(), now.getMonth() - k, 1)));
    const burn = burnMonths.reduce((s, k) => s + (spend[k] || 0), 0) / 3;

    // new referrals per day (last 30 days) → future fees
    const pace = all.filter(r => age(r) <= 30).length / 30;
    const runRate = pace * 30 * pAll * avgFee * .92; // fees a month at the current pace

    // franchise weekly fees, from the Growth tab settings (if it is loaded)
    let frMonth = 0, frN = 0;
    try { const G = window.DSQG && window.DSQG.G, c = G && G.cfg; if (c) instrs().filter(i => i.status === "approved" && i.instructor_model === "franchise").forEach(i => { const v = parseFloat((c.franchiseBy || {})[i.id]); frMonth += (isNaN(v) ? c.franchiseDef || 0 : v) * 52 / 12; frN++; }); } catch (e) {}

    // this month: collected so far + what should land before month end
    const dueByEnd = x => { const payAt = new Date(x.r.created_at).getTime() + dPay * DAY; return payAt <= m1.getTime() ? 1 : .35; };
    const openExp = rows.filter(x => x.exp > 0).reduce((s, x) => s + x.exp * dueByEnd(x), 0);
    const newThisMonth = pace * daysLeft * pAll * avgFee * clamp((daysLeft - dPay) / Math.max(daysLeft, 1), 0, 1);
    const collected = cash[thisK] || 0;
    const otherIn = incs().filter(r => mk(new Date(r.income_date + "T00:00:00")) === thisK).reduce((t, r) => t + (parseFloat(r.amount) || 0), 0);
    const frLeft = frMonth * daysLeft / daysIn;
    const monthEnd = collected + openExp + newThisMonth + frLeft;
    const spentThis = spend[thisK] || 0, spendEnd = Math.max(spentThis, burn);

    const months = [];
    for (let k = -5; k <= 3; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() + k, 1), key = mk(d);
      if (k < 0) months.push({ key, lbl: d.toLocaleDateString("en-GB", { month: "short" }), cash: cash[key] || 0, spend: spend[key] || 0, kind: "past" });
      else if (k === 0) months.push({ key, lbl: d.toLocaleDateString("en-GB", { month: "short" }), cash: collected, fc: Math.max(0, monthEnd - collected), spend: spendEnd, kind: "now" });
      else {
        // later months: current pace + what is left of today's open fees (the part not landing this month)
        const carry = k === 1 ? rows.filter(x => x.exp > 0).reduce((s, x) => s + x.exp * (1 - dueByEnd(x)), 0) : 0;
        months.push({ key, lbl: d.toLocaleDateString("en-GB", { month: "short" }), fc: runRate + frMonth + carry, spend: burn, kind: "future" });
      }
    }
    const next3 = months.filter(m => m.kind === "future").reduce((s, m) => s + m.fc, 0);
    const profitMonth = monthEnd - spendEnd;
    const breakEven = avgFee && pAll ? burn / (avgFee * pAll * .92) : null; // referrals a month to cover costs

    // aged debts (booked, unpaid)
    const owed = rows.filter(x => x.st === "owed");
    const AGES = [["0–7 days", 0, 7], ["8–14", 8, 14], ["15–30", 15, 30], ["31–60", 31, 60], ["60+ days", 61, 1e9]];
    const aged = AGES.map(([l, a, b]) => { const xs = owed.filter(x => x.d >= a && x.d < b + 1); return { l, n: xs.length, v: xs.reduce((s, x) => s + x.a, 0) }; });

    // per instructor
    const by = {};
    rows.forEach(x => {
      const id = x.r.instructor_id, b = by[id] = by[id] || { id, paid: 0, owed: 0, owedN: 0, unsure: 0, unsureN: 0, pending: 0, pendingN: 0, notbooked: 0, notbookedN: 0, exp: 0, oldest: null, rows: [] };
      b.rows.push(x); b[x.st] += x.a; if (x.st !== "paid") b[x.st + "N"]++; b.exp += x.exp;
      if (x.st === "owed" && (!b.oldest || x.d > b.oldest)) b.oldest = x.d;
    });
    Object.values(by).forEach(b => { const pd = b.rows.filter(x => x.st === "paid" && x.r.paid_at).map(x => Math.max(0, (new Date(x.r.paid_at) - new Date(x.r.created_at)) / DAY)); b.days = pd.length ? pd.reduce((a, c) => a + c, 0) / pd.length : null; b.rate = pOf(b.id); b.i = iById(b.id); });

    // things to fix
    const issues = [];
    rows.forEach(x => {
      const r = x.r, f = flagOf(r);
      if (r.is_paid && f === "red") issues.push({ k: "paidred", x, t: "Paid but flagged not booked", fix: "green" });
      if (x.st === "notbooked" && x.d > 3) issues.push({ k: "void", x, t: "Not booked — no fee due, still open", fix: "void" });
      if (x.st === "owed" && x.d > 30) issues.push({ k: "late", x, t: "Booked, unpaid for " + Math.round(x.d) + " days", fix: "chase" });
      if (x.st === "pending" && x.d > 7) issues.push({ k: "noflag", x, t: "No booking flag after " + Math.round(x.d) + " days", fix: "flag" });
      if (!x.a && x.st !== "notbooked") issues.push({ k: "zero", x, t: "No fee amount set", fix: "edit" });
      if (r.is_paid && !r.paid_at) issues.push({ k: "nodate", x, t: "Paid without a payment date (month totals use the referral date)", fix: null });
    });
    const seen = {};
    rows.forEach(x => { const key = x.r.instructor_id + "|" + String(x.r.student_name || "").trim().toLowerCase(); if (!x.r.student_name) return; if (seen[key]) issues.push({ k: "dup", x, t: "Same student listed twice for this instructor", fix: "edit" }); else seen[key] = 1; });

    return { rows, all, sum, cnt, otherIn, pAll, dPay, avgFee, pace, runRate, frMonth, frN, collected, monthEnd, openExp, newThisMonth, frLeft, spentThis, spendEnd, burn, profitMonth, next3, breakEven, months, aged, by, issues, daysLeft: Math.round(daysLeft) };
  }

  /* ───────── chart ───────── */
  function chart(C) {
    const W = 760, H = 250, L = 46, R = 10, T = 18, B = 34, ms = C.months, n = ms.length, bw = (W - L - R) / n;
    const top = Math.max(1, ...ms.map(m => (m.cash || 0) + (m.fc || 0)), ...ms.map(m => m.spend || 0)) * 1.15;
    const Y = v => T + (H - T - B) * (1 - v / top);
    const ticks = [0, .25, .5, .75, 1].map(f => top * f);
    let svg = `<svg class="dl-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Money in by month: actual for past months, forecast for this and the next 3 months, with expenses">
      <defs><pattern id="dlHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="rgba(245,197,24,.18)"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(245,197,24,.7)" stroke-width="2"/></pattern></defs>
      ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="dl-grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="dl-ax">${money(v)}</text>`).join("")}`;
    ms.forEach((m, k) => {
      const x = L + k * bw + bw * .18, w = bw * .64;
      if (m.kind !== "future") svg += `<rect x="${x}" y="${Y(m.cash)}" width="${w}" height="${Y(0) - Y(m.cash)}" rx="4" fill="#22c55e"><title>${m.lbl}: ${money(m.cash)} collected</title></rect>`;
      if (m.fc) { const base = m.kind === "now" ? m.cash : 0; svg += `<rect x="${x}" y="${Y(base + m.fc)}" width="${w}" height="${Y(base) - Y(base + m.fc)}" rx="4" fill="url(#dlHatch)" stroke="rgba(245,197,24,.8)"><title>${m.lbl}: ${money(m.fc)} forecast</title></rect>`; }
      const tot = (m.cash || 0) + (m.fc || 0);
      svg += `<text x="${x + w / 2}" y="${Y(tot) - 5}" text-anchor="middle" class="dl-v">${money(tot)}</text>
        <text x="${x + w / 2}" y="${H - 14}" text-anchor="middle" class="dl-ax${m.kind === "now" ? " now" : ""}">${m.lbl}${m.kind === "now" ? " (now)" : ""}</text>`;
    });
    const pts = ms.map((m, k) => [L + k * bw + bw / 2, Y(m.spend || 0)]);
    svg += `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="${ms.map(m => m.kind === "future" ? "" : "").join("")}"/>` + pts.map((p, k) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#ef4444"><title>${ms[k].lbl}: ${money(ms[k].spend)} expenses${ms[k].kind === "future" ? " (average)" : ""}</title></circle>`).join("");
    return svg + "</svg>";
  }
  function pipeline(C) {
    const parts = ["paid", "owed", "unsure", "pending", "notbooked"].map(k => [k, C.sum(k), C.cnt(k)]);
    const tot = parts.reduce((s, p) => s + p[1], 0) || 1;
    return `<div class="dl-pipe" role="img" aria-label="Referral fees by status">${parts.filter(p => p[1] > 0).map(([k, v]) => `<span style="width:${(v / tot * 100).toFixed(2)}%;background:${ST[k][1]}" title="${ST[k][0]}: ${money(v)}"></span>`).join("")}</div>
      <div class="dl-pipe-l">${parts.map(([k, v, n]) => `<button type="button" class="dl-pl" data-dl-filter="${k}"><i style="background:${ST[k][1]}"></i>${ST[k][0]} <b>${money(v)}</b> <small>${n}</small></button>`).join("")}</div>`;
  }

  /* ───────── main view ───────── */
  function kpi(lbl, v, sub, col, tip) { return `<div class="dl-kpi" style="--c:${col}"${tip ? ` title="${h(tip)}"` : ""}><div class="l">${lbl}</div><div class="v">${v}</div><div class="s">${sub}</div></div>`; }
  function render() {
    const box = $("#ledgerBox"); if (!box) return;
    const C = compute(), tax = Math.max(0, C.profitMonth) * cfg.taxPct / 100;
    const ins = Object.values(C.by).filter(b => b.owed || b.unsure || b.pending || b.notbooked || b.paid).sort((a, b) => b.owed - a.owed || b.exp - a.exp);
    const issues = C.issues;
    let html = `<div class="dl-head"><div><h3><i class="bi bi-cash-stack"></i>Money overview</h3><div class="dl-sub">Referral fees joined to the booking flags and the paid tool · estimates update as you flag or mark paid</div></div>
      <div class="dl-head-a"><button class="btn-s" data-dl="csv"><i class="bi bi-filetype-csv me-1"></i>Ledger CSV</button><button class="btn-s" data-dl="refs"><i class="bi bi-cash-coin me-1"></i>Referrals</button></div></div>
      <div class="dl-kpis">
        ${kpi("Collected this month", money(C.collected), C.otherIn ? money(C.collected - C.otherIn) + " fees + " + money(C.otherIn) + " other income" : "referral fees paid", "#22c55e")}
        ${kpi("Booked · owed to you", money(C.sum("owed")), C.cnt("owed") + " booked, not paid yet", "#F5C518", "✅ green-flagged referrals that are not marked paid")}
        ${kpi("Expected from open", money(C.rows.filter(x => x.st === "unsure" || x.st === "pending").reduce((s, x) => s + x.exp, 0)), (C.cnt("unsure") + C.cnt("pending")) + " unsure / no flag × booking rate", "#a855f7", "Each fee × that instructor's booking rate")}
        ${kpi("Not owed", money(C.sum("notbooked")), C.cnt("notbooked") + " flagged not booked", "#ef4444", "🚩 red-flagged: no lesson, so no fee")}
        ${kpi("Month-end forecast", money(C.monthEnd), C.daysLeft + " days left · " + money(C.monthEnd - C.collected) + " still to come", "#60a5fa", "Collected + open fees likely to land this month + new referrals at the current pace" + (C.frMonth ? " + franchise fees" : ""))}
        ${kpi("Profit this month (est.)", money(C.profitMonth), "after " + money(C.spendEnd) + " expenses", C.profitMonth >= 0 ? "#22c55e" : "#ef4444")}
        ${kpi("Next 3 months (est.)", money(C.next3), money(C.runRate) + "/month at today's pace" + (C.frMonth ? " + " + money(C.frMonth) + " franchise" : ""), "#38bdf8")}
        ${kpi("Set aside for tax", money(tax), `<label class="dl-tax">${cfg.taxPct}% of profit <input type="number" min="0" max="60" step="1" value="${cfg.taxPct}" data-dl-tax aria-label="Tax set-aside percentage"></label>`, "#f59e0b", "A rough amount to keep aside — check the real figure with your accountant")}
      </div>
      <div class="dl-card"><div class="dl-ct">Where every referral fee stands <span>(active referrals, all time)</span></div>${pipeline(C)}
        <div class="dl-facts"><span>Booking rate <b>${Math.round(C.pAll * 100)}%</b></span><span>Usually paid <b>${Math.round(C.dPay)} days</b> after referral</span><span>Average fee <b>${money2(C.avgFee)}</b></span><span>New referrals <b>${(C.pace * 7).toFixed(1)}/week</b></span>${C.breakEven != null && C.burn ? `<span>Covers costs at <b>${Math.ceil(C.breakEven)} referrals/month</b></span>` : ""}</div></div>
      <div class="dl-card"><div class="dl-ct">Money in by month <span>green = collected · gold stripes = forecast · red line = expenses</span></div><div class="dl-scroll">${chart(C)}</div>
        <div class="dl-note">This month: ${money(C.collected)} in so far + ${money(C.openExp)} from open fees + ${money(C.newThisMonth)} from referrals still to come${C.frLeft ? " + " + money(C.frLeft) + " franchise" : ""}. Later months use today's pace (${(C.pace * 30).toFixed(0)} referrals/month × ${Math.round(C.pAll * 100)}% booking × ${money2(C.avgFee)}) and your 3-month average expenses (${money(C.burn)}).</div></div>
      <div class="dl-tabs" role="tablist">${[["statements", "Instructor statements", ins.filter(b => b.owed).length], ["aged", "Aged debts", C.cnt("owed")], ["issues", "Needs fixing", issues.length], ["ledger", "Full ledger", C.rows.length]].map(([k, l, n]) => `<button role="tab" aria-selected="${S.view === k}" data-dl-view="${k}">${l}${n ? `<b>${n}</b>` : ""}</button>`).join("")}</div>
      <div class="dl-card dl-body">${S.view === "aged" ? agedView(C) : S.view === "issues" ? issuesView(issues) : S.view === "ledger" ? ledgerView(C) : statementsView(ins)}</div>`;
    box.innerHTML = html;
  }
  function statementsView(ins) {
    if (!ins.length) return '<div class="dl-empty">No referral fees yet.</div>';
    return `<div class="dl-scroll"><table class="dl-t"><thead><tr><th>Instructor</th><th class="n">Paid</th><th class="n">Owed (booked)</th><th class="n">Unsure</th><th class="n">No flag</th><th class="n">Not booked</th><th class="n">Expected</th><th class="n">Pays in</th><th></th></tr></thead><tbody>
      ${ins.map(b => `<tr class="${S.openInstr === b.id ? "on" : ""}"><td><b>${h(b.i.full_name || "Instructor")}</b>${b.i.instructor_model === "franchise" ? ' <span class="dl-chip">Franchise</span>' : ""}<div class="dl-mini">${Math.round(b.rate * 100)}% book${b.oldest != null && b.owed ? ` · oldest owed ${Math.round(b.oldest)}d` : ""}</div></td>
        <td class="n g">${b.paid ? money(b.paid) : "—"}</td><td class="n y">${b.owed ? money(b.owed) + ` <small>${b.owedN}</small>` : "—"}</td><td class="n p">${b.unsureN ? money(b.unsure) + ` <small>${b.unsureN}</small>` : "—"}</td><td class="n">${b.pendingN ? money(b.pending) + ` <small>${b.pendingN}</small>` : "—"}</td><td class="n r">${b.notbookedN ? money(b.notbooked) + ` <small>${b.notbookedN}</small>` : "—"}</td>
        <td class="n">${money(b.exp)}</td><td class="n">${b.days != null ? Math.round(b.days) + "d" : "—"}</td>
        <td class="dl-acts">${b.owed ? `<button class="dl-b y" data-dl="stmt" data-id="${h(b.id)}"><i class="bi bi-whatsapp"></i>Statement</button><button class="dl-b g" data-dl="paidall" data-id="${h(b.id)}"><i class="bi bi-check2-all"></i>Paid ${money(b.owed)}</button>` : ""}${b.unsureN + b.pendingN ? `<button class="dl-b" data-dl="ask" data-id="${h(b.id)}"><i class="bi bi-question-circle"></i>Ask ${b.unsureN + b.pendingN}</button>` : ""}<button class="dl-b" data-dl="open" data-id="${h(b.id)}"><i class="bi bi-list-ul"></i>Items</button></td></tr>
        ${S.openInstr === b.id ? `<tr class="dl-sub-row"><td colspan="9">${itemsTable(b.rows)}</td></tr>` : ""}`).join("")}
      </tbody></table></div>`;
  }
  function itemsTable(rows) {
    const list = rows.slice().sort((a, b) => b.d - a.d);
    return `<table class="dl-t dl-items"><tbody>${list.map(x => `<tr><td><span class="dl-st" style="--c:${ST[x.st][1]}">${ST[x.st][2]} ${ST[x.st][0]}</span></td><td>${h(x.r.student_name || "Student")}</td><td class="n">${new Date(x.r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td><td class="n">${money2(x.a)}</td>
      <td class="dl-acts">${x.st === "owed" ? `<button class="dl-b g" data-dl="paid" data-ref="${h(x.r.id)}">Mark paid</button>` : ""}${x.st === "unsure" || x.st === "pending" ? `<button class="dl-b" data-dl="flag" data-ref="${h(x.r.id)}" data-c="green">✅ Booked</button><button class="dl-b" data-dl="flag" data-ref="${h(x.r.id)}" data-c="red">🚩 Not booked</button>` : ""}${x.st === "notbooked" ? `<button class="dl-b r" data-dl="void" data-ref="${h(x.r.id)}">Void fee</button>` : ""}</td></tr>`).join("")}</tbody></table>`;
  }
  function agedView(C) {
    const tot = C.aged.reduce((s, a) => s + a.v, 0) || 1, cols = ["#22c55e", "#84cc16", "#f59e0b", "#f97316", "#ef4444"];
    const owed = C.rows.filter(x => x.st === "owed").sort((a, b) => b.d - a.d);
    return `<div class="dl-aged">${C.aged.map((a, k) => `<div class="dl-age" style="--c:${cols[k]}"><div class="l">${a.l}</div><div class="v">${money(a.v)}</div><div class="s">${a.n} fee${a.n === 1 ? "" : "s"}</div><div class="bar"><span style="width:${(a.v / tot * 100).toFixed(1)}%"></span></div></div>`).join("")}</div>
      <div class="dl-note">Only ✅ booked fees that are not marked paid. Older debts are less likely to be paid — the forecast counts 95% up to 30 days, 80% to 60, 60% to 90, then 35%.</div>
      ${owed.length ? `<div class="dl-scroll"><table class="dl-t"><thead><tr><th>Student</th><th>Instructor</th><th class="n">Days</th><th class="n">Fee</th><th></th></tr></thead><tbody>${owed.map(x => `<tr><td>${h(x.r.student_name || "Student")}</td><td>${h(iById(x.r.instructor_id).full_name || "")}</td><td class="n" style="color:${x.d > 60 ? "#ef4444" : x.d > 30 ? "#f97316" : "inherit"}">${Math.round(x.d)}</td><td class="n">${money2(x.a)}</td><td class="dl-acts"><button class="dl-b g" data-dl="paid" data-ref="${h(x.r.id)}">Mark paid</button><button class="dl-b y" data-dl="stmt" data-id="${h(x.r.instructor_id)}"><i class="bi bi-whatsapp"></i>Chase</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="dl-empty">Nothing owed — every booked fee is paid. 👍</div>'}`;
  }
  function issuesView(issues) {
    if (!issues.length) return '<div class="dl-empty">All clean — flags, payments and amounts line up. 👍</div>';
    const voids = issues.filter(x => x.fix === "void");
    return `${voids.length > 1 ? `<div class="dl-bulk"><span>${voids.length} not-booked referrals still open (${money(voids.reduce((s, x) => s + x.x.a, 0))} that isn't owed)</span><button class="dl-b r" data-dl="voidall">Void all ${voids.length}</button></div>` : ""}
      <div class="dl-scroll"><table class="dl-t"><tbody>${issues.map(it => { const r = it.x.r; return `<tr><td><span class="dl-st" style="--c:${ST[it.x.st] ? ST[it.x.st][1] : "#94a3b8"}">${h(it.t)}</span></td><td>${h(r.student_name || "Student")}</td><td>${h(iById(r.instructor_id).full_name || "")}</td><td class="n">${money2(it.x.a)}</td>
        <td class="dl-acts">${it.fix === "green" ? `<button class="dl-b g" data-dl="flag" data-ref="${h(r.id)}" data-c="green">Set ✅ Booked</button>` : it.fix === "void" ? `<button class="dl-b r" data-dl="void" data-ref="${h(r.id)}">Void fee</button><button class="dl-b" data-dl="reassign" data-ref="${h(r.id)}">Reassign</button>` : it.fix === "chase" ? `<button class="dl-b y" data-dl="stmt" data-id="${h(r.instructor_id)}"><i class="bi bi-whatsapp"></i>Chase</button><button class="dl-b g" data-dl="paid" data-ref="${h(r.id)}">Mark paid</button>` : it.fix === "flag" ? `<button class="dl-b" data-dl="flag" data-ref="${h(r.id)}" data-c="green">✅</button><button class="dl-b" data-dl="flag" data-ref="${h(r.id)}" data-c="purple">🟣</button><button class="dl-b" data-dl="flag" data-ref="${h(r.id)}" data-c="red">🚩</button>` : it.fix === "edit" ? `<button class="dl-b" data-dl="edit" data-ref="${h(r.id)}">Edit</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>`;
  }
  function ledgerView(C) {
    const f = S.filter, list = C.rows.filter(x => !f || x.st === f).sort((a, b) => new Date(b.r.created_at) - new Date(a.r.created_at));
    return `<div class="dl-filters">${[["", "All"], ...Object.keys(ST).map(k => [k, ST[k][2] + " " + ST[k][0]])].map(([k, l]) => `<button data-dl-filter="${k}" aria-pressed="${(f || "") === k}">${l}</button>`).join("")}</div>
      <div class="dl-scroll"><table class="dl-t"><thead><tr><th>Date</th><th>Student</th><th>Instructor</th><th>Status</th><th class="n">Fee</th><th class="n">Expected</th><th class="n">Paid on</th></tr></thead><tbody>
      ${list.slice(0, 300).map(x => `<tr><td>${new Date(x.r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</td><td>${h(x.r.student_name || "")}</td><td>${h(iById(x.r.instructor_id).full_name || "")}</td><td><span class="dl-st" style="--c:${ST[x.st][1]}">${ST[x.st][2]} ${ST[x.st][0]}</span></td><td class="n">${money2(x.a)}</td><td class="n">${x.st === "paid" ? "—" : money2(x.exp)}</td><td class="n">${x.r.paid_at ? new Date(x.r.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</td></tr>`).join("")}
      </tbody></table></div>${list.length > 300 ? `<div class="dl-note">Showing the latest 300 of ${list.length} — use Ledger CSV for everything.</div>` : ""}`;
  }

  /* ───────── Referrals tab strip ───────── */
  function strip() {
    const host = $("#refFlagMonitor"); if (!host) return;
    let el = $("#refMoneyStrip"); if (!el) { el = document.createElement("div"); el.id = "refMoneyStrip"; host.parentNode.insertBefore(el, host); }
    // the Referrals tab doesn't load manual income — fetch it once so both views show the same totals
    if (!S.incTried && typeof window.loadIncome === "function" && !incs().length) { S.incTried = true; window.loadIncome().then(strip).catch(() => {}); }
    const C = compute();
    el.innerHTML = `<button type="button" class="dl-strip" data-dl="acct" title="Open the full money overview in Accounting">
      <span><i style="background:#22c55e"></i>Collected this month <b>${money(C.collected)}</b></span>
      <span><i style="background:#F5C518"></i>Booked · owed <b>${money(C.sum("owed"))}</b></span>
      <span><i style="background:#a855f7"></i>Expected from open <b>${money(C.rows.filter(x => x.st === "unsure" || x.st === "pending").reduce((s, x) => s + x.exp, 0))}</b></span>
      <span><i style="background:#ef4444"></i>Not owed <b>${money(C.sum("notbooked"))}</b></span>
      <span><i style="background:#60a5fa"></i>Month-end forecast <b>${money(C.monthEnd)}</b></span>
      <em>Full overview <i class="bi bi-arrow-right"></i></em></button>`;
  }

  /* ───────── actions ───────── */
  async function upd(ids, patch) {
    const q = sb.from("referrals").update(patch); const r = await (Array.isArray(ids) ? q.in("id", ids) : q.eq("id", ids));
    if (r.error) { toast("Couldn't save: " + r.error.message, "error"); return false; }
    refs().filter(x => (Array.isArray(ids) ? ids : [ids]).includes(x.id)).forEach(x => Object.assign(x, patch));
    return true;
  }
  function refreshAll() {
    try { _buildUnpaidRefIndex(); } catch (e) {}
    try { renderReferrals(); } catch (e) {}
    try { if (window.loadToday) window.loadToday(); } catch (e) {}
    render();
  }
  function statementText(id) {
    const i = iById(id), C = compute(), b = C.by[id]; if (!b) return "";
    const owed = b.rows.filter(x => x.st === "owed").sort((a, c) => a.d - c.d), open = b.rows.filter(x => x.st === "unsure" || x.st === "pending");
    let t = "Hi " + (first(i.full_name) || "there") + " 👋 Your DriveSQ referral statement:\n\n";
    if (owed.length) t += "Booked — fee due:\n" + owed.map(x => "• " + (x.r.student_name || "Student") + " (" + new Date(x.r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ") — " + money2(x.a)).join("\n") + "\n*Total due: " + money2(b.owed) + "*\n\n";
    if (open.length) t += "Could you let me know if these have booked?\n" + open.map(x => "• " + (x.r.student_name || "Student")).join("\n") + "\n\n";
    return t + "Thanks! — DriveSQ";
  }
  const waLink = (phone, t) => { let n = ""; try { n = buildWaNum(phone || ""); } catch (e) {} return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(t) : ""; };
  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-dl],[data-dl-view],[data-dl-filter]"); if (!t || !t.closest("#ledgerBox,#refMoneyStrip")) return;
    if (t.hasAttribute("data-dl-view")) { S.view = t.getAttribute("data-dl-view"); render(); return; }
    if (t.hasAttribute("data-dl-filter")) { S.filter = t.getAttribute("data-dl-filter") || null; S.view = "ledger"; render(); return; }
    const a = t.getAttribute("data-dl"), id = t.getAttribute("data-id"), ref = t.getAttribute("data-ref");
    if (a === "acct") { try { switchTab("expenses"); setActiveTab && setActiveTab("expenses"); } catch (x) {} setTimeout(() => { const b = $("#ledgerBox"); if (b) b.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300); }
    else if (a === "refs") { try { switchTab("referrals"); setActiveTab && setActiveTab("referrals"); } catch (x) {} }
    else if (a === "open") { S.openInstr = S.openInstr === id ? null : id; render(); }
    else if (a === "stmt") { const i = iById(id), u = waLink(i.phone, statementText(id)); if (u) window.open(u, "_blank", "noopener"); else { try { await navigator.clipboard.writeText(statementText(id)); toast("No phone number — statement copied", "info"); } catch (x) { toast("No phone number for this instructor", "error"); } } }
    else if (a === "ask") { const i = iById(id), C = compute(), b = C.by[id], names = b ? b.rows.filter(x => x.st === "unsure" || x.st === "pending").map(x => "• " + (x.r.student_name || "Student")).join("\n") : ""; const u = waLink(i.phone, "Hi " + first(i.full_name) + " 👋 Quick check — have these learners booked a lesson with you yet?\n" + names + "\n\nThanks! — DriveSQ"); if (u) window.open(u, "_blank", "noopener"); }
    else if (a === "paidall") {
      const C = compute(), b = C.by[id]; if (!b) return; const xs = b.rows.filter(x => x.st === "owed");
      if (!xs.length || !confirm(`Mark ${xs.length} booked fee${xs.length > 1 ? "s" : ""} for ${b.i.full_name || "this instructor"} as PAID?\n\nTotal: ${money2(b.owed)}`)) return;
      if (await upd(xs.map(x => x.r.id), { is_paid: true, paid_at: new Date().toISOString(), flag_color: "green" })) { toast(`✅ ${money2(b.owed)} marked paid`, "success"); refreshAll(); }
    }
    else if (a === "paid") { const r = refs().find(x => x.id === ref); if (r && await upd(ref, { is_paid: true, paid_at: new Date().toISOString(), flag_color: "green" })) { toast("✅ " + (r.student_name || "Fee") + " — paid " + money2(amt(r)), "success"); refreshAll(); } }
    else if (a === "flag") { const c = t.getAttribute("data-c"); if (window._todayFlag) await window._todayFlag(ref + "|" + c); else if (await upd(ref, { flag_color: c })) refreshAll(); render(); }
    else if (a === "void") { const r = refs().find(x => x.id === ref); if (!r || !confirm(`Void the fee for ${r.student_name || "this student"}? They're flagged NOT booked, so no fee is owed.\n\nThe referral is closed and removed from the instructor's list.`)) return; if (await upd(ref, { is_cancelled: true })) { toast("Fee voided", "success"); refreshAll(); } }
    else if (a === "voidall") { const C = compute(), xs = C.issues.filter(x => x.fix === "void"); if (!xs.length || !confirm(`Void ${xs.length} fees flagged NOT booked (${money(xs.reduce((s, x) => s + x.x.a, 0))})?\n\nNo fee is owed for these.`)) return; if (await upd(xs.map(x => x.x.r.id), { is_cancelled: true })) { toast(xs.length + " fees voided", "success"); refreshAll(); } }
    else if (a === "reassign") { try { _flagReassign(ref); } catch (x) {} }
    else if (a === "edit") { try { switchTab("referrals"); editRef(ref); } catch (x) {} }
    else if (a === "csv") csv();
  });
  document.addEventListener("change", e => { const t = e.target; if (t && t.hasAttribute && t.hasAttribute("data-dl-tax")) { cfg.taxPct = clamp(parseFloat(t.value) || 0, 0, 60); saveCfg(); render(); } });
  function csv() {
    const C = compute(), q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const lines = [["Referral date", "Student", "Instructor", "Model", "Status", "Booking flag", "Instructor reply", "Fee", "Paid", "Paid on", "Expected (£)", "Age (days)"].map(q).join(",")];
    C.rows.slice().sort((a, b) => new Date(a.r.created_at) - new Date(b.r.created_at)).forEach(x => { const i = iById(x.r.instructor_id); lines.push([new Date(x.r.created_at).toISOString().slice(0, 10), x.r.student_name, i.full_name, i.instructor_model, ST[x.st][0], x.r.flag_color || "", x.r.reply_status || "", x.a.toFixed(2), x.r.is_paid ? "yes" : "no", x.r.paid_at ? x.r.paid_at.slice(0, 10) : "", x.st === "paid" ? "" : x.exp.toFixed(2), Math.round(x.d)].map(q).join(",")); });
    const b = new Blob(["﻿" + lines.join("\n")], { type: "text/csv" }), u = URL.createObjectURL(b), a = document.createElement("a");
    a.href = u; a.download = "DriveSQ-referral-ledger-" + new Date().toISOString().slice(0, 10) + ".csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000);
  }

  /* ───────── hooks: redraw whenever referrals or accounting redraw ───────── */
  function wrap(name, after) {
    const f = window[name]; if (typeof f !== "function" || f.__dl) return !!(f && f.__dl);
    const w = function () { const out = f.apply(this, arguments); try { after(); } catch (e) { console.warn("ledger", e); } return out; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__dl = true; window[name] = w; return true;
  }
  function boot() {
    const ok1 = wrap("renderAccounting", render), ok2 = wrap("renderReferrals", () => { strip(); if ($("#ledgerBox") && $("#ledgerBox").offsetParent) render(); });
    if (!(ok1 && ok2)) return setTimeout(boot, 800);
  }
  window.DSQL = { compute, render, strip, status, statementText };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
