/* DriveSQ admin — pro layer (loaded after admin.html's own script, admin-growth.js and admin-ledger.js).
   1. Referral fee filled in automatically: £25 (from 2 November 2026), £0 for franchise instructors.
   2. Message All: ready-made announcements (incl. the referral policy) and one-tap WhatsApp to every instructor.
   3. Message All is available on phones too.
   4. Offline banner, and fresh data when you come back to the tab after a while.
   Everything here only uses functions admin.html already has; if one is missing, that feature quietly stays off. */
(function () {
  "use strict";
  const REF_FEE = 25, FEE_FROM = "2 November 2026";
  const $ = (s, r) => (r || document).querySelector(s);
  const instrs = () => { try { return Array.isArray(allInstrs) ? allInstrs : []; } catch (e) { return []; } };
  const toast = (m, t, ms) => { try { showToast(m, t || "info", ms || 3000); } catch (e) {} };
  const waNum = p => { try { return buildWaNum(p || ""); } catch (e) { let d = String(p || "").replace(/\D/g, ""); if (d[0] === "0") d = "44" + d.slice(1); return d; } };
  const h = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ───── 1. referral fee ───── */
  function feeFor(id) { const i = instrs().find(x => x.id === id); return i && i.instructor_model === "franchise" ? 0 : REF_FEE; }
  function fillFee(inputId, instrId) {
    const el = document.getElementById(inputId); if (!el || el.dataset.touched) return;
    el.value = feeFor(instrId);
    let hint = document.getElementById(inputId + "-hint");
    if (!hint) { hint = document.createElement("div"); hint.id = inputId + "-hint"; hint.style.cssText = "font-size:.68rem;color:var(--txt3);margin-top:6px"; el.closest("div[style*='display:flex']")?.after(hint); }
    if (hint) hint.textContent = feeFor(instrId) ? `Referral fee is £${REF_FEE} from ${FEE_FROM} — change it here if this one is different.` : "Franchise instructor — no referral fee.";
  }
  document.addEventListener("input", e => { if (/^(assign|cs)-referral-amount$/.test(e.target.id)) e.target.dataset.touched = "1"; });
  document.addEventListener("change", e => { if (e.target.id === "cs-instr") fillFee("cs-referral-amount", e.target.value); });
  const _open = window.openModal;
  if (typeof _open === "function") {
    window.openModal = function (id) {
      const r = _open.apply(this, arguments);
      try {
        if (id === "assignModal") { const a = document.getElementById("assign-referral-amount"); if (a) delete a.dataset.touched; fillFee("assign-referral-amount", ($("#assign-instr-id") || {}).value); }
        if (id === "createStudentModal") { const a = document.getElementById("cs-referral-amount"); if (a) delete a.dataset.touched; setTimeout(() => fillFee("cs-referral-amount", ($("#cs-instr") || {}).value), 250); }
        if (id === "sendAllModal") enhanceSendAll();
      } catch (e) { console.warn("admin-pro openModal", e); }
      return r;
    };
  }

  /* ───── 2. Message All: templates + WhatsApp each instructor ───── */
  const TEMPLATES = [
    ["💷 Referral fee £25", "franchise_fee", "Referral fee update — £25 from " + FEE_FROM,
     "From " + FEE_FROM + ", the referral fee for each student we send you is £25 (was £20). Referrals sent before then stay at £20.\n\n" +
     "The £25 is due automatically as soon as the student books their first lesson with you. We confirm every booking with the student, so the office knows when a lesson has been booked. Please pay within 7 days of the booking — you can see what's due under Referrals.\n\n" +
     "Referral policies:\n1. Update every referral within 48 hours (booked, not interested, or couldn't reach them).\n2. Try to contact the student within 24 hours.\n3. No booking = no fee.\n" +
     "4. Paid, but the student cancels before their first lesson or turns out to be fake? Tell us within 7 days for a free replacement referral.\n5. All lessons with a DriveSQ student must be declared, including later bookings.\n" +
     "6. If a fee is unpaid after 14 days, new referrals are paused until it's settled.\n7. Our students stay DriveSQ students — please don't move them elsewhere or ask them to book privately.\n" +
     "8. Stick to DriveSQ prices (£35/hr, manual and automatic the same) unless we agree otherwise.\n9. PDIs (pink badge) must tell students they're a trainee. Motorway lessons are ADI only.\n10. Can't take a student? Tell us straight away — no fee, no penalty.\n\nThank you — DriveSQ Team"],
    ["📋 Update your referrals", "general", "Please update your referrals",
     "Quick reminder: please update every DriveSQ referral in your portal — booked, not interested, or couldn't reach them. It takes a few seconds and means we can send you the next student sooner. Thank you!"],
    ["🙋 Free slots this week?", "general", "Have you got free slots this week?",
     "We have new learners waiting. Reply with your free slots this week and the postcodes you cover, and we'll send students your way first."],
    ["🪪 Badge check", "badge_request", "Please upload your current badge",
     "Please upload a clear photo of your current DVSA badge (green ADI or pink PDI) and its expiry date in your portal profile, so our records stay up to date. Thank you."],
  ];
  function enhanceSendAll() {
    const modal = document.getElementById("sendAllModal"); if (!modal) return;
    if (!$("#proTpl", modal)) {
      const subj = $("#all-subject", modal); const host = subj && subj.closest(".mb-2"); if (!host) return;
      const box = document.createElement("div"); box.id = "proTpl"; box.className = "mb-2";
      box.innerHTML = '<label class="dsq-lbl">Ready-made messages</label><div style="display:flex;flex-wrap:wrap;gap:6px">' +
        TEMPLATES.map((t, k) => `<button type="button" class="mtype-btn" data-pro-tpl="${k}">${h(t[0])}</button>`).join("") + "</div>";
      host.before(box);
      const send = $("#sendAllBtn", modal);
      const wa = document.createElement("button"); wa.type = "button"; wa.className = "btn-s w-100 mb-2"; wa.id = "proWaAll";
      wa.innerHTML = '<i class="bi bi-whatsapp me-1" style="color:#25D366"></i>Also send on WhatsApp — one tap per instructor';
      if (send) send.after(wa);
      const list = document.createElement("div"); list.id = "proWaList"; list.style.cssText = "display:none;max-height:260px;overflow:auto;margin-bottom:10px"; wa.after(list);
    }
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-pro-tpl]");
    if (t) {
      const tpl = TEMPLATES[+t.getAttribute("data-pro-tpl")]; if (!tpl) return;
      try { setMsgType(tpl[1], "sendAllModal"); } catch (x) {}
      const s = $("#all-subject"), b = $("#all-body"); if (s) s.value = tpl[2]; if (b) { b.value = tpl[3]; b.rows = 10; }
      toast("Template added — check it, then send.", "info", 2500); return;
    }
    if (e.target.closest("#proWaAll")) {
      const list = $("#proWaList"); if (!list) return;
      const subj = ($("#all-subject") || {}).value || "", body = ($("#all-body") || {}).value || "";
      if (!body.trim()) { toast("Write the message first.", "error"); return; }
      const text = (subj ? "*" + subj + "*\n\n" : "") + body;
      const rows = instrs().filter(i => i.status === "approved");
      list.style.display = "block";
      list.innerHTML = rows.length ? rows.map(i => { const n = waNum(i.phone); return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 4px;border-bottom:1px solid var(--bdr)"><span style="font-size:.82rem">${h(i.full_name)} <span style="color:var(--txt4);font-size:.7rem">${h(i.badge_type || "")}</span></span>${n ? `<a class="abtn wa" target="_blank" rel="noopener" data-pro-sent href="https://wa.me/${n}?text=${encodeURIComponent(text)}"><i class="bi bi-whatsapp me-1"></i>Send</a>` : '<span style="font-size:.7rem;color:var(--txt4)">No phone</span>'}</div>`; }).join("")
        : '<div style="font-size:.8rem;color:var(--txt4)">No approved instructors.</div>';
      return;
    }
    const sent = e.target.closest("[data-pro-sent]");
    if (sent) setTimeout(() => { sent.innerHTML = '<i class="bi bi-check2 me-1"></i>Opened'; sent.style.opacity = ".6"; }, 300);
  });

  /* ───── 3. Message All on phones ───── */
  function showMessageAllOnMobile() {
    document.querySelectorAll("button.hide-mob[onclick*=\"openModal('sendAllModal')\"]").forEach(b => b.classList.remove("hide-mob"));
  }

  /* ───── 4. offline banner + refresh after time away ───── */
  function offlineBanner() {
    let b = document.getElementById("proOffline");
    if (!b) { b = document.createElement("div"); b.id = "proOffline"; b.setAttribute("role", "status");
      b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:76px;z-index:9999;background:#7f1d1d;color:#fff;border:1px solid #ef4444;border-radius:999px;padding:8px 16px;font-size:.8rem;box-shadow:0 8px 24px rgba(0,0,0,.4);display:none";
      b.innerHTML = '<i class="bi bi-wifi-off me-1"></i>You\'re offline — changes won\'t save until you reconnect.'; document.body.appendChild(b); }
    b.style.display = navigator.onLine ? "none" : "block";
  }
  window.addEventListener("online", () => { offlineBanner(); toast("Back online.", "success", 2000); });
  window.addEventListener("offline", offlineBanner);
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 5 * 60e3 && navigator.onLine && typeof loadAll === "function") {
      const app = document.getElementById("mainPage"); if (app && app.classList.contains("hidden")) return;
      Promise.resolve(loadAll()).then(() => toast("Updated with the latest data.", "info", 2000)).catch(() => {});
    }
  });

  /* ───── 5. Student profile → their referral (opens the instructor's referrals with the student highlighted) ───── */
  const norm = n => String(n || "").toLowerCase().replace(/\s+/g, " ").trim();
  function refsFor(name, instrId) {
    let all = []; try { all = Array.isArray(_refData) ? _refData : []; } catch (e) {}
    const k = norm(name), mine = all.filter(r => norm(r.student_name) === k);
    const exact = mine.filter(r => !instrId || r.instructor_id === instrId);
    return (exact.length ? exact : mine).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  function refLabel(name, instrId) {
    const r = refsFor(name, instrId)[0]; if (!r) return "Referral";
    const amt = "£" + (parseFloat(r.amount) || 0).toFixed(0);
    return r.is_cancelled ? "Referral · cancelled" : r.is_credit ? "Referral · credit" : r.is_paid ? "Referral · " + amt + " paid" : "Referral · " + amt + " unpaid";
  }
  window.openStudentReferral = async function (name, instrId) {
    try {
      let have = []; try { have = _refData || []; } catch (e) {}
      if (!have.length && typeof loadReferrals === "function") { try { switchTab("referrals"); } catch (e) {} await loadReferrals(); }
      const r = refsFor(name, instrId)[0];
      const iid = (r && r.instructor_id) || instrId;
      if (!iid) { toast("No referral found for " + name + ".", "info", 3000); return; }
      ["studentDetailModal", "adminStudentProfileModal"].forEach(id => { const m = document.getElementById(id); if (m) m.classList.remove("open"); });
      try { switchTab("referrals"); setActiveTab("referrals"); } catch (e) {}
      try { if (r && typeof _refPeriodStart === "function" && new Date(r.created_at) < _refPeriodStart() && typeof setRefPeriod === "function") setRefPeriod("all"); } catch (e) {}
      await openRefDetail(iid);
      if (!r) { toast("No referral for " + name + " — showing their instructor's referrals.", "info", 3500); return; }
      setTimeout(() => {
        const box = document.getElementById("refDetailRows"); if (!box) return;
        const k = norm(name);
        const row = [...box.querySelectorAll("tr")].find(tr => { const c = tr.querySelector("td"); return c && norm(c.innerText).startsWith(k); });
        if (!row) return;
        row.scrollIntoView({ block: "center", behavior: "smooth" });
        row.style.transition = "box-shadow .3s"; row.style.boxShadow = "inset 0 0 0 2px #F5C518";
        setTimeout(() => { row.style.boxShadow = ""; }, 4000);
      }, 150);
    } catch (e) { console.warn("openStudentReferral", e); toast("Couldn't open the referral.", "error"); }
  };
  const refBtn = (name, instrId, id) => `<button type="button" class="abtn" id="${id}" onclick="openStudentReferral(${JSON.stringify(name).replace(/"/g, "&quot;")},${JSON.stringify(instrId || "").replace(/"/g, "&quot;")})" style="background:rgba(245,197,24,.12);border:1px solid rgba(245,197,24,.35);color:var(--gold);border-radius:8px;padding:6px 12px;font-size:.82rem;min-height:36px"><i class="bi bi-cash-coin me-1"></i>${h(refLabel(name, instrId))}</button>`;
  function addSdButton() {
    const s = window._sdCurrentStudent, box = document.getElementById("sdActions"); if (!s || !box) return;
    const old = document.getElementById("proSdRefBtn"); if (old) old.remove();
    box.insertAdjacentHTML("afterbegin", refBtn(s.name, s.instrId, "proSdRefBtn"));
  }
  const _sd = window.openStudentDetail;
  if (typeof _sd === "function") window.openStudentDetail = async function () { const r = await _sd.apply(this, arguments); try { addSdButton(); } catch (e) {} return r; };
  const _ap = window.openAdminStudentProfile;
  if (typeof _ap === "function") window.openAdminStudentProfile = async function (name, phone, instrId) {
    const r = await _ap.apply(this, arguments);
    try {
      const c = document.getElementById("adminStudentProfileContent");
      if (c && !document.getElementById("proApRefBtn")) c.insertAdjacentHTML("afterbegin", '<div style="margin-bottom:10px">' + refBtn(name, instrId || (window._adminStudentCtx || {}).instrId, "proApRefBtn") + "</div>");
    } catch (e) {}
    return r;
  };

  function boot() { showMessageAllOnMobile(); offlineBanner(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.DSQPRO = { REF_FEE, feeFor };
})();
