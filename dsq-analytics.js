/**
 * DriveSQ analytics + cookie consent (shared by every public page)
 *
 * - Google Analytics 4 (and Google Ads, once ADS_ID is filled in) via Google Consent Mode v2.
 * - Every page sets consent to "denied" by default in its <head> stub (or "granted" if the visitor already accepted),
 *   so until someone accepts, Google only receives anonymous cookieless pings.
 * - Shows a small Accept / Reject banner the first time; the choice is remembered (localStorage "dsq_consent").
 *   DSQConsent.open() — or any element with data-cookie-settings — reopens it.
 * - Bookings fire gtag('event','generate_lead') from the booking code; phone / WhatsApp taps are tracked here.
 */
(function () {
  if (window.__dsqAnalytics) return;
  window.__dsqAnalytics = true;

  var GA_ID = 'G-CQP798G5TW';
  var ADS_ID = '';            // e.g. 'AW-123456789'  — paste the Google Ads ID here to switch on Ads tracking
  var ADS_LEAD_LABEL = '';    // e.g. 'AbC-dEfGhIjK' — the conversion label for "Booking request"

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') window.gtag = function () { dataLayer.push(arguments); };
  var KEY = 'dsq_consent';
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // pages that don't have the <head> stub still get a consent default before anything is sent
  if (!window.__dsqConsentDefault) {
    var g0 = stored() === 'granted' ? 'granted' : 'denied';
    gtag('consent', 'default', { ad_storage: g0, ad_user_data: g0, ad_personalization: g0, analytics_storage: g0 });
  }
  gtag('set', 'url_passthrough', true);
  gtag('set', 'ads_data_redaction', true);

  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', GA_ID);
  if (ADS_ID) gtag('config', ADS_ID);

  // a booking (generate_lead) also counts as a Google Ads conversion once the Ads ID + label are filled in
  if (ADS_ID && ADS_LEAD_LABEL) {
    var real = window.gtag;
    window.gtag = function (a, b) {
      real.apply(this, arguments);
      if (a === 'event' && b === 'generate_lead') real('event', 'conversion', { send_to: ADS_ID + '/' + ADS_LEAD_LABEL });
    };
  }

  function apply(v) {
    var g = v === 'granted' ? 'granted' : 'denied';
    gtag('consent', 'update', { ad_storage: g, ad_user_data: g, ad_personalization: g, analytics_storage: g });
  }

  /* ---------- consent banner ---------- */
  var box;
  function close() { if (box) { box.classList.remove('is-in'); var b = box; setTimeout(function () { b.remove(); }, 250); box = null; } }
  function choose(v) { save(v); apply(v); close(); }
  function open() {
    if (box || !document.body) return;
    if (!document.getElementById('dsq-ck-css')) {
      var st = document.createElement('style'); st.id = 'dsq-ck-css';
      st.textContent =
        '.dsq-ck{position:fixed;left:16px;bottom:16px;z-index:2147483000;max-width:420px;background:#111114;color:#e5e5e5;border:1px solid #2a2a30;border-radius:16px;padding:16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.45);font:400 14px/1.5 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;opacity:0;transform:translateY(14px);transition:opacity .25s,transform .25s}' +
        '.dsq-ck.is-in{opacity:1;transform:none}' +
        '.dsq-ck b{display:block;color:#fff;font-size:15px;margin-bottom:4px}' +
        '.dsq-ck p{margin:0 0 12px}.dsq-ck a{color:#fff;text-decoration:underline}' +
        '.dsq-ck__row{display:flex;gap:8px}' +
        '.dsq-ck button{flex:1;min-height:44px;border-radius:10px;font:700 14px/1 Inter,system-ui,sans-serif;cursor:pointer;border:1px solid #3a3a42;background:transparent;color:#fff}' +
        '.dsq-ck button.is-yes{background:#D10A11;border-color:#D10A11}' +
        '.dsq-ck button:focus-visible{outline:2px solid #F5C518;outline-offset:2px}' +
        '@media (max-width:520px){.dsq-ck{left:12px;right:12px;bottom:12px;max-width:none}}' +
        '@media (prefers-reduced-motion:reduce){.dsq-ck{transition:none}}';
      document.head.appendChild(st);
    }
    box = document.createElement('div');
    box.className = 'dsq-ck'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Cookie choices');
    box.innerHTML = '<b>🍪 Cookies</b><p>We use cookies to understand how our site is used and to measure our adverts. No cookies are set unless you accept. <a href="/privacy.html">Privacy policy</a></p>' +
      '<div class="dsq-ck__row"><button type="button" data-ck="denied">Reject</button><button type="button" class="is-yes" data-ck="granted">Accept</button></div>';
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-ck]'); if (b) choose(b.getAttribute('data-ck')); });
    document.body.appendChild(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (box) box.classList.add('is-in'); }); });
  }
  window.DSQConsent = { open: open, accept: function () { choose('granted'); }, reject: function () { choose('denied'); }, status: stored };

  /* ---------- phone / WhatsApp taps + cookie-settings links ---------- */
  document.addEventListener('click', function (e) {
    var cs = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (cs) { e.preventDefault(); open(); return; }
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/^tel:/i.test(h)) gtag('event', 'contact_click', { method: 'phone', page: location.pathname });
    else if (/wa\.me|whatsapp\.com/i.test(h)) gtag('event', 'contact_click', { method: 'whatsapp', page: location.pathname });
  }, true);

  function start() { if (!stored()) setTimeout(open, 1200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
