/**
 * DriveSQ Booking Capture (v2)
 * Every booking form on the site goes to three places at once:
 *   1. Admin → Website Bookings (Supabase waiting_list, tagged [WEB], same note layout as the homepage
 *      so Find & Assign picks up postcode, gearbox and email automatically)
 *   2. Email (Formspree)
 *   3. An instant push notification to the admin's phone
 * Handles the "Book a Lesson" form on the area pages (#dsqInlineBookForm) and any Formspree form.
 */
(function () {
  if (window.__dsqBookingCapture) return;
  window.__dsqBookingCapture = true;

  var SB_URL = 'https://vwvbfqrlumvoabzkjxoa.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dmJmcXJsdW12b2FiemtqeG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzQ4MzgsImV4cCI6MjA5Njc1MDgzOH0.c5UNle-sh1DYuyqaNYvG9r9ru74EMP89uhdteQu2qho';
  var FORMSPREE = 'https://formspree.io/f/xvgjdapp';
  var ADMIN_ID = '00000000-0000-0000-0000-000000000001';
  var WA = '447352932003';

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function fullPostcode(v) {
    var c = clean(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(c) ? c.slice(0, -3) + ' ' + c.slice(-3) : '';
  }
  function phoneOk(v) { var d = clean(v).replace(/\D/g, ''); if (d.indexOf('44') === 0) d = '0' + d.slice(2); return /^0\d{9,10}$/.test(d); }
  function emailOk(v) { v = clean(v); return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function nameOk(v) { return /[A-Za-z\u00C0-\u024F].*[A-Za-z\u00C0-\u024F]/.test(clean(v)); }
  /* inline error under a form; focuses the field at fault */
  function formError(form, html, field) {
    var old = form.querySelector('.dsq-form-err'); if (old) old.remove();
    var d = document.createElement('div'); d.className = 'dsq-form-err'; d.setAttribute('role', 'alert');
    d.style.cssText = 'color:#fca5a5;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.35);border-radius:8px;padding:10px 13px;font-size:.85rem;margin-top:8px';
    d.innerHTML = html; form.appendChild(d);
    if (field && field.focus) { try { field.focus(); } catch (e) {} }
    setTimeout(function () { if (d.parentNode) d.remove(); }, 9000);
  }
  function gearbox(service, extra) { var t = service + ' ' + (extra || ''); return /auto/i.test(t) ? 'Automatic' : /manual/i.test(t) ? 'Manual' : /offer|theory/i.test(service || '') ? 'Not stated — ask' : 'Manual'; }
  function pageLabel() {
    var h1 = document.querySelector('h1');
    var main = h1 && h1.querySelector('.dsqx-pft');
    var t = (main ? main.textContent : h1 ? h1.textContent : document.title || '').replace(/\s+/g, ' ').trim();
    return t.slice(0, 80);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* 1. Admin → Website Bookings. Full record first; if a column is refused, retry without it. */
  function saveToAdmin(d) {
    var notes = [
      '[WEB] ' + (d.formName || 'Booking form') + ' — ' + d.page,
      d.ref ? 'Ref: ' + d.ref : '',
      'Page: ' + location.pathname,
      d.service ? 'Package: ' + d.service : '',
      'Gearbox: ' + d.gearbox,
      d.postcode ? 'Postcode: ' + d.postcode : '',
      d.email ? 'Email: ' + d.email : '',
      d.start ? 'Start: ' + d.start : '',
      d.experience ? 'Experience: ' + d.experience : '',
      d.testDate ? 'Test date: ' + d.testDate : '',
      d.times ? 'Availability: ' + d.times : '',
      d.pickup ? 'Pick-up: ' + d.pickup : '',
      d.notes ? 'Notes: ' + d.notes : ''
    ].filter(Boolean).join('\n');
    var full = { student_name: d.name || null, student_phone: d.phone || null, postcode: d.postcode || null, lesson_type: /^(Manual|Automatic)$/.test(d.gearbox) ? d.gearbox : null, notes: notes, status: 'waiting', created_at: new Date().toISOString() };
    var base = { student_name: full.student_name, student_phone: full.student_phone, notes: notes, status: 'waiting' };
    var tries = [full,
      Object.assign({}, base, { postcode: full.postcode, lesson_type: full.lesson_type }),
      Object.assign({}, base, { postcode: full.postcode }),
      base];
    var H = { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Prefer: 'return=minimal' };
    return (function attempt(k) {
      return fetch(SB_URL + '/rest/v1/waiting_list', { method: 'POST', headers: H, body: JSON.stringify(tries[k]) }).then(function (r) {
        if (r.ok) return true;
        if (k + 1 < tries.length && r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 403) return attempt(k + 1);
        throw new Error('admin save ' + r.status);
      });
    })(0);
  }

  /* 2. Email */
  function sendEmail(d, fd) {
    if (!fd) {
      fd = new FormData();
      [['name', d.name], ['phone', d.phone], ['email', d.email], ['postcode', d.postcode], ['service', d.service], ['gearbox', d.gearbox], ['ref', d.ref], ['start', d.start], ['experience', d.experience], ['test_date', d.testDate], ['availability', d.times], ['pick_up', d.pickup], ['notes', d.notes]].forEach(function (x) { if (x[1]) fd.append(x[0], x[1]); });
    }
    fd.append('_subject', 'New booking' + (d.ref ? ' ' + d.ref : '') + ' — ' + (d.name || 'website') + ' (' + d.page + ')');
    fd.append('source', 'drivesq.co.uk' + location.pathname);
    return fetch(d.action || FORMSPREE, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('email ' + r.status); return true; });
  }

  /* 3. Instant push to the admin's phone */
  function notifyAdmin(d) {
    try {
      return fetch(SB_URL + '/functions/v1/send-push', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + SB_KEY },
        body: JSON.stringify({ instructor_id: ADMIN_ID, title: '📅 New website booking', body: (d.name || 'New learner') + ' · ' + (d.postcode || '') + ' · ' + (d.service || 'Lessons') + ' (' + d.gearbox + ')' + (d.start ? ' · start ' + d.start : '') + (d.experience ? ' · ' + d.experience : '') + (d.testDate ? ' · test ' + d.testDate : ''), url: '/admin.html', tag: 'drivesq-admin-' + Date.now() })
      }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }

  function send(d, fd) {
    return Promise.allSettled([saveToAdmin(d), sendEmail(d, fd)]).then(function (res) {
      var ok = res.some(function (x) { return x.status === 'fulfilled'; });
      if (res[0].status !== 'fulfilled') console.warn('[DriveSQ] booking → admin failed', res[0].reason);
      if (res[1].status !== 'fulfilled') console.warn('[DriveSQ] booking → email failed', res[1].reason);
      if (ok) {
        notifyAdmin(d);
        try { if (window.gtag) gtag('event', 'generate_lead', { method: d.formName || 'booking_form', page: location.pathname }); } catch (e) {}
      }
      return ok;
    });
  }

  function waLink(d) {
    var msg = "Hi DriveSQ! I'd like to book lessons." + (d.ref ? '\nRef: ' + d.ref : '') + (d.name ? '\nName: ' + d.name : '') + (d.postcode ? '\nPostcode: ' + d.postcode : '') + (d.service ? '\nLessons: ' + d.service : '');
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
  }

  /* ---------- draft autosave (this browser only; cleared after sending) ---------- */
  var DRAFT = 'dsq_book_draft_v1', DKEYS = ['name', 'phone', 'postcode', 'email', 'service', 'notes', 'experience', 'start', 'test_date'];
  function saveDraft(f) {
    try {
      var o = { t: Date.now() };
      DKEYS.forEach(function (k) { var el = f.querySelector('[name="' + k + '"]'); if (el && el.value) o[k] = el.value; });
      o.times = Array.prototype.map.call(f.querySelectorAll('[name="times"]:checked'), function (x) { return x.value; });
      localStorage.setItem(DRAFT, JSON.stringify(o));
    } catch (e) {}
  }
  function restoreDraft(f) {
    try {
      var o = JSON.parse(localStorage.getItem(DRAFT) || 'null');
      if (!o || Date.now() - o.t > 14 * 864e5) return;
      var any = false;
      DKEYS.forEach(function (k) { var el = f.querySelector('[name="' + k + '"]'); if (el && !el.value && o[k]) { el.value = o[k]; any = true; } });
      (o.times || []).forEach(function (v) { var c = f.querySelector('[name="times"][value="' + v + '"]'); if (c) c.checked = true; });
      if (any) { var pc = f.querySelector('[name="postcode"]'); if (pc && pc.value) pc.dispatchEvent(new Event('input', { bubbles: true })); }
    } catch (e) {}
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT); } catch (e) {} }

  /* ---------- floating "Book a lesson" button on phones (hidden while the form is on screen) ---------- */
  function stickyBook() {
    var form0 = document.querySelector('#dsqInlineBookForm');
    var f = (form0 && (form0.closest('[data-dsq-bc]') || form0.closest('#booking'))) || form0;
    if (!f || document.getElementById('dsqStickyBook') || !window.IntersectionObserver) return;
    var b = document.createElement('a');
    b.id = 'dsqStickyBook'; b.href = '#'; b.setAttribute('aria-label', 'Book a driving lesson');
    b.innerHTML = '📅 Book a lesson';
    b.style.cssText = 'position:fixed;left:12px;bottom:16px;z-index:900;background:#D10A11;color:#fff;font-weight:700;font-size:.92rem;border-radius:999px;padding:12px 18px;box-shadow:0 10px 28px rgba(0,0,0,.35);text-decoration:none;transition:opacity .25s,transform .25s;opacity:0;transform:translateY(20px);pointer-events:none';
    b.addEventListener('click', function (e) { e.preventDefault(); if (window.DSQBookCard) DSQBookCard.tab('quick'); f.scrollIntoView({ behavior: 'smooth', block: 'start' }); var n = window.DSQBookCard ? null : f.querySelector('[name="name"]'); setTimeout(function () { if (n && !n.value) try { n.focus({ preventScroll: true }); } catch (x) {} }, 700); });
    document.body.appendChild(b);
    var formOn = false, scrolled = false;
    function upd() { var show = window.innerWidth < 768 && scrolled && !formOn; b.style.opacity = show ? '1' : '0'; b.style.transform = show ? 'none' : 'translateY(20px)'; b.style.pointerEvents = show ? 'auto' : 'none'; }
    new IntersectionObserver(function (es) { formOn = es[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(f);
    window.addEventListener('scroll', function () { var s2 = window.scrollY > 500; if (s2 !== scrolled) { scrolled = s2; upd(); } }, { passive: true });
    window.addEventListener('resize', upd);
  }

  /* ---------- the area pages' "Book a Lesson" form ---------- */
  function inlineForm(f) {
    if (f.dataset.dsqAttached) return;
    f.dataset.dsqAttached = '1';
    var btn = f.querySelector('[type=submit]'), msg = f.querySelector('#dsqInlineBookMsg') || f.appendChild(document.createElement('div'));
    var label = btn ? btn.innerHTML : '';
    var exp = f.querySelector('[name="experience"]'), tdl = f.querySelector('.dsq-bk-test');
    var syncTest = function () { if (exp && tdl) tdl.style.display = exp.value === 'Test already booked' ? 'block' : 'none'; };
    if (exp) { exp.addEventListener('change', syncTest); syncTest(); }
    restoreDraft(f); syncTest();
    f.addEventListener('input', function () { saveDraft(f); });
    f.addEventListener('change', function () { saveDraft(f); });
    var say = function (html, good) {
      msg.innerHTML = '<div role="' + (good ? 'status' : 'alert') + '" style="font-size:.85rem;margin-top:8px;border-radius:8px;padding:10px 13px;' +
        (good ? 'color:#4ade80;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25)' : 'color:#fca5a5;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3)') + '">' + html + '</div>';
    };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = function (n) { var el = f.querySelector('[name="' + n + '"]'); return el ? clean(el.value) : ''; };
      var d = { formName: 'Book a Lesson form', page: pageLabel(), name: val('name'), phone: val('phone'), email: val('email'), service: val('service'), notes: val('notes') };
      d.experience = val('experience');
      d.start = val('start');
      d.ref = 'DSQ-' + Date.now().toString(36).slice(-5).toUpperCase();
      d.testDate = d.experience === 'Test already booked' ? val('test_date') : '';
      if (d.testDate) { var td = new Date(d.testDate + 'T12:00:00'); if (!isNaN(td)) d.testDate = td.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
      d.times = Array.prototype.map.call(f.querySelectorAll('[name="times"]:checked'), function (x) { return x.value; }).join(', ');
      var pu = f.querySelector('[name="pickup_diff"]'); d.pickup = pu && pu.checked ? 'Not home — school, college or work (ask)' : '';
      var pcRaw = val('postcode');
      d.postcode = fullPostcode(pcRaw); d.gearbox = gearbox(d.service);
      if (!d.name || !d.phone || !pcRaw || !d.service) { say('Please fill in your name, phone number, postcode and lesson type.'); return; }
      if (!nameOk(d.name)) { say('Please enter your name.'); return; }
      if (!emailOk(d.email)) { say("That email doesn't look right — check it or leave it blank."); return; }
      if (!phoneOk(d.phone)) { say("That phone number doesn't look right — please check it."); return; }
      if (!d.postcode) { say('Please enter your full postcode, e.g. M19 2AB.'); return; }
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending…'; }
      msg.innerHTML = '';
      send(d).then(function (ok) {
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
        if (ok) {
          f.reset(); syncTest(); clearDraft(f);
          say("<strong style=\"font-size:1.02rem\">✅ Booking request sent — your reference is " + esc(d.ref) + "</strong><br>The DriveSQ team will call or text you on " + esc(d.phone) + " shortly to match you with an instructor" + (d.postcode ? " near " + esc(d.postcode) : "") + "." +
            "<div style=\"display:flex;flex-wrap:wrap;gap:8px;margin-top:10px\"><a href=\"" + waLink(d) + "\" target=\"_blank\" rel=\"noopener\" style=\"background:#25D366;color:#06260f;border-radius:8px;padding:8px 12px;font-weight:700;text-decoration:none\">WhatsApp us your reference</a>" +
            "<a href=\"/student.html\" style=\"border:1px solid rgba(74,222,128,.5);color:#4ade80;border-radius:8px;padding:8px 12px;font-weight:700;text-decoration:none\">Explore the free Student Portal</a></div>", true);
          try { if (window.gtag) gtag('event', 'booking_ref', { ref: d.ref }); } catch (e) {}
        } else {
          say("Sorry — we couldn't send that just now. Please <a href=\"" + waLink(d) + "\" target=\"_blank\" rel=\"noopener\" style=\"color:#fca5a5;font-weight:700\">WhatsApp us</a> or call <a href=\"tel:+447352932003\" style=\"color:#fca5a5;font-weight:700\">07352 932003</a>.");
        }
      });
    });
  }

  /* ---------- any Formspree form ---------- */
  function formspreeForm(form) {
    if (form.dataset.dsqAttached) return;
    // instructor job applications aren't learner bookings — leave them to Formspree (email) only
    if (/join/i.test(form.id || '') || form.querySelector('[name="areas"]')) return;
    form.dataset.dsqAttached = '1';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type=submit]'), orig = btn ? btn.innerHTML : '';
      var fd = new FormData(form), g = function (k) { return clean(fd.get(k)); };
      var d = { formName: 'Website booking form', page: pageLabel(), action: form.action, name: g('name'), phone: g('phone') || g('tel'), email: g('email'), service: g('service') || g('lesson_type') || g('package'), notes: g('notes') || g('message') };
      d.postcode = fullPostcode(g('postcode')) || g('postcode').toUpperCase(); d.gearbox = gearbox(d.service, g('gearbox') + ' ' + g('transmission'));
      var F = function (n) { return form.querySelector('[name="' + n + '"]'); };
      if (fd.get('_gotcha')) return;   // spam bot filled the hidden trap field
      var phoneEl = F('phone') || F('tel'), pcEl = F('postcode'), emEl = F('email'), svcEl = F('service') || F('lesson_type') || F('package');
      if (!nameOk(d.name)) return formError(form, 'Please enter your name.', F('name'));
      if (phoneEl && !phoneOk(d.phone)) return formError(form, d.phone ? "That phone number doesn't look right — please check it." : 'Please enter your phone number so we can contact you.', phoneEl);
      if (!phoneEl && !d.email) return formError(form, 'Please enter your email so we can reply.', emEl);
      if (emEl && emEl.required && !d.email) return formError(form, 'Please enter your email address.', emEl);
      if (!emailOk(d.email)) return formError(form, "That email doesn't look right — please check it.", emEl);
      if (pcEl && !fullPostcode(g('postcode'))) return formError(form, 'Please enter your <strong>full postcode</strong>, e.g. M19 2AB.', pcEl);
      if (svcEl && svcEl.required && !clean(svcEl.value)) return formError(form, 'Please choose a lesson type.', svcEl);
      var oldErr = form.querySelector('.dsq-form-err'); if (oldErr) oldErr.remove();
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Sending…'; }
      send(d, fd).then(function (ok) {
        if (ok) {
          var div = document.createElement('div');
          div.setAttribute('role', 'status');
          div.style.cssText = 'background:#0f2e1a;border:1.5px solid #25D366;border-radius:10px;padding:18px 20px;font-family:Inter,sans-serif;font-size:.9rem;color:#4ade80;text-align:center;margin-top:8px';
          div.innerHTML = '<strong style="font-size:1.05rem">✅ Booking request received!</strong><br><span style="color:#a7f3d0;font-size:.82rem">The DriveSQ team will be in touch shortly. For a faster reply, <a href="' + waLink(d) + '" target="_blank" rel="noopener" style="color:#4ade80;font-weight:700">WhatsApp us</a>.</span>';
          form.parentNode.insertBefore(div, form.nextSibling);
          form.style.display = 'none';
        } else {
          if (btn) { btn.disabled = false; btn.innerHTML = orig; }
          var err = document.createElement('div');
          err.setAttribute('role', 'alert');
          err.style.cssText = 'color:#f87171;font-size:.82rem;margin-top:8px;text-align:center';
          err.innerHTML = '⚠️ Something went wrong — please <a href="' + waLink(d) + '" target="_blank" rel="noopener" style="color:#f87171;font-weight:700">WhatsApp us</a> or call 07352 932003.';
          form.appendChild(err);
          setTimeout(function () { err.remove(); }, 8000);
        }
      });
    });
  }

  function scan(root) {
    (root.querySelectorAll ? root : document).querySelectorAll('#dsqInlineBookForm').forEach(inlineForm);
    (root.querySelectorAll ? root : document).querySelectorAll('form[action*="formspree.io"]').forEach(formspreeForm);
  }
  function init() {
    scan(document);
    if (document.querySelector('#dsqInlineBookForm') && !document.querySelector('[data-dsqx-bc]') && !window.__dsqBookCard) {
      var bc = document.createElement('script'); bc.src = '/dsq-bookcard.js?v=20261109'; bc.defer = true; bc.onload = function () { stickyBook(); }; document.head.appendChild(bc);
    } else stickyBook();
    if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && (n.matches('#dsqInlineBookForm') || n.matches('form[action*="formspree.io"]'))) scan(n.parentNode || document); else scan(n); } }); }); }).observe(document.body, { childList: true, subtree: true });
  }
  window.DSQBooking = { send: send, fullPostcode: fullPostcode };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/**
 * DriveSQ postcode coverage (v1)
 * - Every booking form: as soon as a full postcode is typed, confirm we cover it (Solihull sector + nearest
 *   test centre, or Greater Manchester) right under the postcode box.
 * - Any [data-dsq-pc-quick] element becomes a "Check & book" bar: check the postcode, then jump to the
 *   booking form with the postcode filled in.
 * - Any link with data-dsq-book-pc="B90 4AA" does the same jump.
 * Nothing is sent anywhere — the lookup uses /postcode-coverage.json in the browser.
 */
(function () {
  if (window.__dsqCover) return;
  window.__dsqCover = true;
  var WA = '447352932003', data = null;
  var GM = /^(M\d{1,2}|BL\d{1,2}|OL\d{1,2}|SK(?:[1-8]|1[0-6]|22)|WA1[45]|WN\d)$/;
  function load() { if (!data) data = fetch('/postcode-coverage.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); return data; }
  function norm(v) { var c = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(c) ? c.slice(0, -3) + ' ' + c.slice(-3) : ''; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mi(a, b, c, d) { var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2); return 2 * 3958.8 * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y)); }
  function lookup(v) {
    var pc = norm(v);
    if (!pc) return Promise.resolve(null);
    var dist = pc.split(' ')[0], sec = dist + ' ' + pc.split(' ')[1].charAt(0);
    return load().then(function (D) {
      if (D && (D.sec[sec] || Object.prototype.hasOwnProperty.call(D.dist, dist))) {
        var s = D.sec[sec], g = s ? [s.lat, s.lon] : null;
        if (!g) { var ks = Object.keys(D.sec).filter(function (k) { return k.split(' ')[0] === dist; }); if (ks.length) g = [ks.reduce(function (t, k) { return t + D.sec[k].lat; }, 0) / ks.length, ks.reduce(function (t, k) { return t + D.sec[k].lon; }, 0) / ks.length]; }
        var tc = g ? D.tc.map(function (t) { return { t: t, d: mi(g[0], g[1], t.lat, t.lon) }; }).sort(function (a, b) { return a.d - b.d; })[0] : null;
        return { ok: true, pc: pc, kind: 'sol', sec: s ? sec : dist, area: s ? s.a : D.dist[dist], page: s ? s.f : '', tc: tc };
      }
      if (GM.test(dist)) return { ok: true, pc: pc, kind: 'gm', sec: dist };
      return { ok: false, pc: pc, kind: 'other' };
    });
  }
  function message(r) {
    if (!r) return '';
    if (r.kind === 'sol') return '✅ <b>We cover ' + esc(r.pc) + '</b>' + (r.area ? ' — ' + esc(r.area) : '') + '.' +
      (r.tc ? ' Nearest test centre: ' + esc(r.tc.t.n.replace('Birmingham (', '').replace(')', '')) + ', ' + r.tc.d.toFixed(1) + ' mi' + (r.tc.t.r ? ' (' + r.tc.t.r + '% pass rate)' : '') + '.' : '') +
      (r.page ? ' <a href="/' + r.page + '" style="color:inherit;text-decoration:underline">Your local guide</a>' : '');
    if (r.kind === 'gm') return '✅ <b>We cover ' + esc(r.pc) + '</b> — Greater Manchester.';
    return 'ℹ️ We\'ll check which instructor covers <b>' + esc(r.pc) + '</b> — send your request and we\'ll let you know, or <a href="https://wa.me/' + WA + '?text=' + encodeURIComponent('Hi DriveSQ! Do you cover ' + r.pc + '?') + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">ask on WhatsApp</a>.';
  }
  function bookForm() { return document.querySelector('#dsqInlineBookForm') || document.querySelector('form[action*="formspree.io"]:not(#joinForm)'); }
  function goBook(pc) {
    if (window.DSQBookCard) {
      var c = DSQBookCard.card, q = c.querySelector('[name=qpc]');
      DSQBookCard.tab('quick');
      if (q && pc) { q.value = pc; q.dispatchEvent(new Event('input', { bubbles: true })); }
      var ff = bookForm(), el = ff && ff.querySelector('[name="postcode"]');
      if (el && pc && !el.value) { el.value = pc; el.dispatchEvent(new Event('input', { bubbles: true })); }
      c.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var f = bookForm(); if (!f) { location.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi DriveSQ! I'd like to book lessons. My postcode is " + pc + '.'); return; }
    var el = f.querySelector('[name="postcode"]');
    if (el && pc) { el.value = pc; el.dispatchEvent(new Event('input', { bubbles: true })); }
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var nm = f.querySelector('[name="name"]');
    setTimeout(function () { if (nm && !nm.value) { try { nm.focus({ preventScroll: true }); } catch (e) { nm.focus(); } } }, 700);
  }
  window.DSQCover = { lookup: lookup, message: message, goBook: goBook };

  /* live check under the postcode box of every booking form */
  function liveForm(f) {
    var el = f.querySelector('[name="postcode"]');
    if (!el || el.dataset.dsqCover) return;
    el.dataset.dsqCover = '1';
    var out = document.createElement('div');
    out.className = 'dsq-pc-live'; out.setAttribute('aria-live', 'polite');
    out.style.cssText = 'font-size:.8rem;line-height:1.45;margin:-2px 0 2px;display:none';
    el.insertAdjacentElement('afterend', out);
    var t = 0, last = '';
    function check() {
      var v = norm(el.value);
      if (!v) { out.style.display = 'none'; last = ''; return; }
      if (v === last) return; last = v;
      lookup(v).then(function (r) {
        if (!r || norm(el.value) !== r.pc) return;
        out.innerHTML = message(r);
        out.style.color = r.ok ? '#4ade80' : '#fbbf24';
        out.style.display = 'block';
      });
    }
    el.addEventListener('input', function () { clearTimeout(t); t = setTimeout(check, 250); });
    el.addEventListener('blur', check);
    if (el.value) check();
  }

  /* "Check & book" bar */
  function quick(box) {
    if (box.dataset.dsqReady) return;
    box.dataset.dsqReady = '1';
    box.innerHTML = '<form class="dsq-pcq-form" novalidate style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;max-width:460px">' +
      '<input id="dsqPcq' + (++quick.n) + '" aria-label="Your postcode" name="pcq" autocomplete="postal-code" maxlength="8" placeholder="Your postcode, e.g. B90 4AA" style="flex:1 1 180px;min-width:0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:11px 14px;color:#fff;font-size:.95rem;text-transform:uppercase;outline:none">' +
      '<button type="submit" style="background:#D10A11;color:#fff;border:0;border-radius:10px;padding:11px 16px;font-weight:700;font-size:.92rem;cursor:pointer;white-space:nowrap"><i class="bi bi-geo-alt-fill"></i> Check &amp; book</button></form>' +
      '<div class="dsq-pcq-out" aria-live="polite" style="margin-top:10px;font-size:.88rem;line-height:1.5;color:#e5e5e5;max-width:520px"></div>';
    var form = box.querySelector('form'), inp = box.querySelector('input'), out = box.querySelector('.dsq-pcq-out');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = norm(inp.value);
      if (!v) { out.innerHTML = '<span style="color:#fbbf24">Please enter your full postcode, e.g. B90 4AA.</span>'; inp.focus(); return; }
      out.textContent = 'Checking…';
      lookup(v).then(function (r) {
        out.innerHTML = '<div style="color:' + (r.ok ? '#4ade80' : '#fbbf24') + '">' + message(r) + '</div>' +
          '<a href="#book" data-dsq-book-pc="' + esc(r.pc) + '" style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;background:#fff;color:#111;border-radius:10px;padding:9px 14px;font-weight:700;text-decoration:none">Book lessons at ' + esc(r.pc) + ' <i class="bi bi-arrow-down"></i></a>';
        try { if (window.gtag) gtag('event', 'postcode_check', { result: r.kind, page: location.pathname }); } catch (x) {}
      });
    });
  }
  quick.n = 0;

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-dsq-book-pc]');
    if (!a) return;
    e.preventDefault();
    goBook(a.getAttribute('data-dsq-book-pc'));
  });
  function scan() {
    document.querySelectorAll('#dsqInlineBookForm, form[action*="formspree.io"]:not(#joinForm)').forEach(liveForm);
    document.querySelectorAll('[data-dsq-pc-quick]').forEach(quick);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();

/**
 * DriveSQ enquiry source tracking (v1)
 * Works out where a visitor came from (Google Ads, Google search, Maps, AI assistant, social, direct…)
 * and adds "Source:" and "Landing:" lines to every enquiry saved to the admin waiting list,
 * whichever form on the site sends it. Admin → Enquiries reads these lines.
 * Rule: the latest non-direct visit within 30 days wins (a later direct visit keeps the earlier source).
 */
(function () {
  if (window.__dsqSource) return;
  window.__dsqSource = true;
  var KEY = 'dsq_src_v1', DAYS = 30;

  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; } }
  function detect() {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { q = { get: function () { return null; } }; }
    var med = (q.get('utm_medium') || '').toLowerCase(), src = (q.get('utm_source') || '').toLowerCase();
    var ref = hostOf(document.referrer || ''), self = location.hostname.replace(/^www\./, '').toLowerCase();
    if (q.get('gclid') || q.get('gbraid') || q.get('wbraid') || /^(cpc|ppc|paid|paidsearch|pmax)$/.test(med)) return 'Google Ads';
    if (/^(gbp|google_business|googlemybusiness|gmb)$/.test(src) || /maps\.google|google\.[a-z.]+\/maps/.test(document.referrer || '')) return 'Google Maps';
    if (src) {
      if (/chatgpt|openai|perplexity|copilot|gemini|claude/.test(src)) return 'AI assistant';
      if (/instagram|facebook|fb|tiktok|snapchat|youtube/.test(src)) return 'Social';
      return 'Campaign: ' + src;
    }
    if (!ref || ref === self) return 'Direct';
    if (/(^|\.)google\./.test(ref)) return 'Google search';
    if (/bing\.|duckduckgo\.|yahoo\.|ecosia\./.test(ref)) return 'Other search';
    if (/chatgpt\.com|openai\.com|perplexity\.ai|copilot\.microsoft|gemini\.google|claude\.ai/.test(ref)) return 'AI assistant';
    if (/instagram\.|facebook\.|fb\.|tiktok\.|t\.co$|twitter\.|x\.com|snapchat\.|youtube\.|whatsapp\./.test(ref)) return 'Social';
    return 'Referral: ' + ref;
  }
  function store() {
    var now = Date.now(), found = detect(), prev = null;
    try { prev = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { prev = null; }
    var fresh = prev && prev.t && (now - prev.t) < DAYS * 864e5;
    var rec;
    if (found === 'Direct' && fresh) rec = prev;
    else if (fresh && prev.s === found && prev.l) rec = prev;
    else rec = { s: found, l: location.pathname, t: now };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {}
    return rec;
  }
  var current = store();
  window.DSQSource = function () { return current; };

  /* add Source/Landing lines to any enquiry posted to the waiting list */
  if (!window.fetch || window.fetch.__dsqSrc) return;
  var orig = window.fetch;
  var wrapped = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\/rest\/v1\/waiting_list/.test(url) && init && /post/i.test(init.method || '') && typeof init.body === 'string') {
        var body = JSON.parse(init.body), rows = Array.isArray(body) ? body : [body];
        rows.forEach(function (r) {
          if (r && typeof r === 'object' && !/(^|\n)Source: /.test(r.notes || '')) {
            r.notes = (r.notes ? r.notes + '\n' : '') + 'Source: ' + current.s + '\nLanding: ' + current.l;
          }
        });
        init = Object.assign({}, init, { body: JSON.stringify(body) });
      }
    } catch (e) {}
    return orig.call(this, input, init);
  };
  wrapped.__dsqSrc = true;
  window.fetch = wrapped;
})();
