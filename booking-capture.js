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
  function gearbox(service, extra) { return /auto/i.test(service + ' ' + (extra || '')) ? 'Automatic' : 'Manual'; }
  function pageLabel() {
    var h1 = document.querySelector('h1');
    var t = (h1 ? h1.textContent : document.title || '').replace(/\s+/g, ' ').trim();
    return t.slice(0, 80);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* 1. Admin → Website Bookings. Full record first; if a column is refused, retry without it. */
  function saveToAdmin(d) {
    var notes = [
      '[WEB] ' + (d.formName || 'Booking form') + ' — ' + d.page,
      'Page: ' + location.pathname,
      d.service ? 'Package: ' + d.service : '',
      'Gearbox: ' + d.gearbox,
      d.postcode ? 'Postcode: ' + d.postcode : '',
      d.email ? 'Email: ' + d.email : '',
      d.notes ? 'Notes: ' + d.notes : ''
    ].filter(Boolean).join('\n');
    var full = { student_name: d.name || null, student_phone: d.phone || null, postcode: d.postcode || null, lesson_type: d.gearbox, notes: notes, status: 'waiting', created_at: new Date().toISOString() };
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
      [['name', d.name], ['phone', d.phone], ['email', d.email], ['postcode', d.postcode], ['service', d.service], ['gearbox', d.gearbox], ['notes', d.notes]].forEach(function (x) { if (x[1]) fd.append(x[0], x[1]); });
    }
    fd.append('_subject', 'New booking — ' + (d.name || 'website') + ' (' + d.page + ')');
    fd.append('source', 'drivesq.co.uk' + location.pathname);
    return fetch(d.action || FORMSPREE, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('email ' + r.status); return true; });
  }

  /* 3. Instant push to the admin's phone */
  function notifyAdmin(d) {
    try {
      return fetch(SB_URL + '/functions/v1/send-push', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + SB_KEY },
        body: JSON.stringify({ instructor_id: ADMIN_ID, title: '📅 New website booking', body: (d.name || 'New learner') + ' · ' + (d.postcode || '') + ' · ' + (d.service || 'Lessons') + ' (' + d.gearbox + ')', url: '/admin.html', tag: 'drivesq-admin' })
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
    var msg = "Hi DriveSQ! I'd like to book lessons." + (d.name ? '\nName: ' + d.name : '') + (d.postcode ? '\nPostcode: ' + d.postcode : '') + (d.service ? '\nLessons: ' + d.service : '');
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
  }

  /* ---------- the area pages' "Book a Lesson" form ---------- */
  function inlineForm(f) {
    if (f.dataset.dsqAttached) return;
    f.dataset.dsqAttached = '1';
    var btn = f.querySelector('[type=submit]'), msg = f.querySelector('#dsqInlineBookMsg') || f.appendChild(document.createElement('div'));
    var label = btn ? btn.innerHTML : '';
    var say = function (html, good) {
      msg.innerHTML = '<div role="' + (good ? 'status' : 'alert') + '" style="font-size:.85rem;margin-top:8px;border-radius:8px;padding:10px 13px;' +
        (good ? 'color:#4ade80;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25)' : 'color:#fca5a5;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3)') + '">' + html + '</div>';
    };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = function (n) { var el = f.querySelector('[name="' + n + '"]'); return el ? clean(el.value) : ''; };
      var d = { formName: 'Book a Lesson form', page: pageLabel(), name: val('name'), phone: val('phone'), email: val('email'), service: val('service'), notes: val('notes') };
      var pcRaw = val('postcode');
      d.postcode = fullPostcode(pcRaw); d.gearbox = gearbox(d.service);
      if (!d.name || !d.phone || !pcRaw || !d.service) { say('Please fill in your name, phone number, postcode and lesson type.'); return; }
      if (!phoneOk(d.phone)) { say("That phone number doesn't look right — please check it."); return; }
      if (!d.postcode) { say('Please enter your full postcode, e.g. M19 2AB.'); return; }
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending…'; }
      msg.innerHTML = '';
      send(d).then(function (ok) {
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
        if (ok) {
          f.reset();
          say("<strong>✅ Booking request sent!</strong> The DriveSQ team will call or text you on " + esc(d.phone) + " shortly. Want a faster reply? <a href=\"" + waLink(d) + "\" target=\"_blank\" rel=\"noopener\" style=\"color:#4ade80;font-weight:700\">WhatsApp us</a>.", true);
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
    if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && (n.matches('#dsqInlineBookForm') || n.matches('form[action*="formspree.io"]'))) scan(n.parentNode || document); else scan(n); } }); }); }).observe(document.body, { childList: true, subtree: true });
  }
  window.DSQBooking = { send: send, fullPostcode: fullPostcode };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
