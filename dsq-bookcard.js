/* DriveSQ booking card (v1) — the homepage's animated booking card, on every page.
   Upgrades the page's booking section (#booking with #dsqInlineBookForm) into a tabbed card:
     • "Book in 60 seconds" — gearbox → postcode & package → name & mobile, inside the card
     • "Booking form"       — the full form that was already on the page (unchanged, same handler)
   Bookings go through booking-capture.js (window.DSQBooking.send): DriveSQ admin, Formspree email, push.
   Loaded automatically by booking-capture.js; does nothing on the homepage, which has its own card. */
(function () {
  if (window.__dsqBookCard) return;
  window.__dsqBookCard = true;
  var WA = '447352932003';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CSS = '.dsq-bc{box-sizing:border-box;position:relative;width:100%;max-width:620px;margin:0 auto;min-width:0;background:rgba(17,17,17,.92);-webkit-backdrop-filter:blur(12px) saturate(1.2);backdrop-filter:blur(12px) saturate(1.2);border:1px solid rgba(255,255,255,.09);border-radius:26px;padding:22px 20px;box-shadow:0 18px 50px rgba(0,0,0,.35);color:#f0f0f0;font-family:Inter,system-ui,sans-serif;text-align:left}' +
    '.dsq-bc *{box-sizing:border-box}' +
    '.dsq-bc__tabs{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px;padding:4px;margin:-4px 0 18px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}' +
    '.dsq-bc__tabs button{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:7px;border:0;background:none;color:#a3a3a3;padding:10px 8px;border-radius:10px;font:800 .98rem/1 "Barlow Condensed",Oswald,sans-serif;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:color .25s;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
    '.dsq-bc__tabs button.is-on{color:#fff}.dsq-bc__tabs button em{font-style:normal;font:700 .62rem Inter,sans-serif;letter-spacing:.04em;text-transform:none;background:#F5C518;color:#111;border-radius:999px;padding:2px 7px}' +
    '.dsq-bc__tabs button:focus-visible{outline:2px solid #F5C518;outline-offset:2px}' +
    '.dsq-bc__ink{position:absolute;left:0;top:4px;bottom:4px;width:50%;border-radius:10px;background:linear-gradient(135deg,#ff2d35,#D10A11 60%,#a80008);box-shadow:0 8px 20px rgba(209,10,17,.35);transition:transform .45s cubic-bezier(.3,1.3,.5,1),width .3s}' +
    '.dsq-bc.is-form .dsq-bc__ink{background:rgba(255,255,255,.12);box-shadow:none}' +
    '.dsq-bc__panel.in,.dsq-bc__step.in{animation:dsqBcIn .45s cubic-bezier(.22,1,.36,1)}@keyframes dsqBcIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
    '.dsq-bc__title{font:700 1.35rem/1.15 Oswald,sans-serif;color:#fff;margin:0 0 2px}.dsq-bc__sub{font-size:.76rem;color:#8a8a8a;margin-bottom:12px}' +
    '.dsq-bc__bar{height:4px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:0 0 14px}.dsq-bc__bar i{display:block;height:100%;width:33%;background:linear-gradient(90deg,#D10A11,#ff4d55);border-radius:999px;transition:width .5s cubic-bezier(.22,1,.36,1)}' +
    '.dsq-bc__q{font:800 1.3rem/1.1 "Barlow Condensed",Oswald,sans-serif;text-transform:uppercase;color:#fff;margin:0 0 10px}' +
    '.dsq-bc__picks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' +
    '.dsq-bc__picks button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:14px 6px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));color:#fff;cursor:pointer;transition:transform .25s,border-color .25s,background .25s,box-shadow .25s}' +
    '.dsq-bc__picks button:hover,.dsq-bc__picks button:focus-visible{transform:translateY(-3px);border-color:#D10A11;background:linear-gradient(180deg,rgba(209,10,17,.22),rgba(209,10,17,.06));box-shadow:0 12px 26px rgba(209,10,17,.25);outline:none}' +
    '.dsq-bc__picks button.is-on{border-color:#F5C518;box-shadow:0 0 0 3px rgba(245,197,24,.25)}.dsq-bc__picks .em{font-size:1.6rem;line-height:1}' +
    '.dsq-bc__picks b{font:800 1.12rem/1.1 "Barlow Condensed",Oswald,sans-serif;text-transform:uppercase;letter-spacing:.03em}.dsq-bc__picks small{font-size:.72rem;color:#a3a3a3}' +
    '.dsq-bc__same{display:flex;gap:7px;align-items:center;margin:10px 0 14px;font-size:.84rem;color:#cfcfcf}.dsq-bc__same i{color:#25D366;font-style:normal}.dsq-bc__same b{color:#fff}' +
    '.dsq-bc__steps{list-style:none;padding:0;margin:0 0 14px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}' +
    '.dsq-bc__steps li{display:flex;gap:7px;align-items:center;font-size:.74rem;line-height:1.25;color:#bdbdbd;padding:8px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}' +
    '.dsq-bc__steps li b{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:800 .78rem "Barlow Condensed",Oswald,sans-serif;background:#D10A11;color:#fff}' +
    '.dsq-bc__in{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:11px 13px;color:#f5f5f5;font-size:.95rem;outline:none;transition:border-color .2s,box-shadow .2s;margin-bottom:8px}' +
    '.dsq-bc__in:focus{border-color:#D10A11;box-shadow:0 0 0 3px rgba(209,10,17,.2)}.dsq-bc__in::placeholder{color:#777}' +
    '.dsq-bc__pk{display:grid;gap:7px;margin:4px 0 6px}.dsq-bc__pk label{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);cursor:pointer;transition:border-color .2s,background .2s,transform .2s;font-size:.88rem}' +
    '.dsq-bc__pk label:hover{transform:translateX(3px);border-color:rgba(209,10,17,.6)}.dsq-bc__pk input{accent-color:#D10A11}.dsq-bc__pk label.is-on{border-color:#F5C518;background:rgba(245,197,24,.07)}' +
    '.dsq-bc__pk span{flex:1}.dsq-bc__pk b{color:#fff}.dsq-bc__pk em{font-style:normal;color:#F5C518;font-weight:700;white-space:nowrap}.dsq-bc__pk .hot{border-color:rgba(209,10,17,.6);background:linear-gradient(90deg,rgba(209,10,17,.18),rgba(209,10,17,.04))}' +
    '.dsq-bc__live{font-size:.8rem;line-height:1.45;margin:-2px 0 8px;min-height:1px}' +
    '.dsq-bc__nav{display:flex;gap:8px;margin-top:10px}.dsq-bc__go{flex:1;background:#D10A11;color:#fff;border:0;border-radius:999px;font:700 1.02rem Oswald,sans-serif;letter-spacing:.4px;padding:12px;cursor:pointer;transition:transform .2s,box-shadow .2s}' +
    '.dsq-bc__go:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(209,10,17,.35)}.dsq-bc__go[disabled]{opacity:.6;cursor:wait}' +
    '.dsq-bc__back{border:1px solid rgba(255,255,255,.18);background:none;color:#ddd;border-radius:999px;padding:12px 16px;cursor:pointer}' +
    '.dsq-bc__err{color:#fca5a5;font-size:.82rem;margin-top:6px;min-height:1px}' +
    '.dsq-bc__alt{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:.84rem;margin-top:12px}.dsq-bc__alt a{color:#4ade80;text-decoration:none;font-weight:600}' +
    '.dsq-bc__alt button{border:0;background:none;color:#bdbdbd;text-decoration:underline;text-underline-offset:3px;cursor:pointer;font-size:.84rem}' +
    '.dsq-bc__done{text-align:center;padding:10px 4px}.dsq-bc__done .tick{width:64px;height:64px;margin:0 auto 10px;border-radius:50%;display:grid;place-items:center;background:rgba(37,211,102,.15);border:2px solid #25D366;font-size:1.8rem;animation:dsqPop .6s cubic-bezier(.3,1.5,.5,1)}' +
    '@keyframes dsqPop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}.dsq-bc__done b.ref{display:inline-block;margin:6px 0;padding:6px 12px;border-radius:999px;background:#fff;color:#111;letter-spacing:.06em}' +
    '.dsq-bc__done a{display:inline-block;margin:6px 4px 0;padding:9px 14px;border-radius:999px;font-weight:700;text-decoration:none}' +
    '.dsq-bc .dsq-bc__panel[data-panel=form] > h3{display:none}' +
    '@media (max-width:440px){.dsq-bc{padding:16px 12px;border-radius:20px}.dsq-bc__tabs button{font-size:.8rem;gap:4px;padding:10px 4px}.dsq-bc__tabs button em{display:none}.dsq-bc__steps{grid-template-columns:1fr}.dsq-bc__picks b{font-size:1rem}.dsq-bc__pk label{font-size:.82rem}}' +
    '@media (prefers-reduced-motion:reduce){.dsq-bc__ink,.dsq-bc__panel.in,.dsq-bc__step.in,.dsq-bc__bar i{transition:none;animation:none}}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function phoneOk(v) { var d = String(v || '').replace(/\D/g, ''); if (d.indexOf('44') === 0) d = '0' + d.slice(2); return /^0\d{9,10}$/.test(d); }
  function nameOk(v) { return /[A-Za-zÀ-ɏ].*[A-Za-zÀ-ɏ]/.test(String(v || '').trim()); }
  function pageLabel() { var h = document.querySelector('h1'), m = h && h.querySelector('.dsqx-pft'); return ((m || h) ? (m || h).textContent : document.title).replace(/\s+/g, ' ').trim().slice(0, 80); }
  function track(n, p) { try { if (window.gtag) gtag('event', n, p || {}); } catch (e) {} }

  var PKGS = [
    { id: 'payg', label: 'Pay as you go — 2-hour lessons', price: '£70 each' },
    { id: 'block', label: '10-hour block', price: '£350' },
    { id: 'offer', label: '🎉 New learner offer — first 10 hours', price: '£330', sol: true, hot: true },
    { id: 'nhs', label: 'NHS staff or student — 10 hours', price: '£320' },
    { id: 'int', label: 'Intensive or semi-intensive course', price: 'we\'ll plan it' },
    { id: 'unsure', label: 'Not sure yet — advise me', price: '' }];

  function build(section) {
    var form = section.querySelector('#dsqInlineBookForm');
    var oldCard = form && form.parentElement;
    if (!form || !oldCard || section.querySelector('.dsq-bc')) return;
    var card = document.createElement('div');
    card.className = 'dsq-bc'; card.setAttribute('data-dsq-bc', '');
    card.innerHTML =
      '<div class="dsq-bc__tabs" role="tablist" aria-label="How would you like to book?">' +
      '<button type="button" role="tab" data-bc="quick" aria-selected="true" class="is-on">⚡ <span>Book in 60 seconds</span><em>Fastest</em></button>' +
      '<button type="button" role="tab" data-bc="form" aria-selected="false">☑ <span>Full form</span></button><i class="dsq-bc__ink" aria-hidden="true"></i></div>' +
      '<div class="dsq-bc__panel" data-panel="quick" role="tabpanel">' +
      '<div class="dsq-bc__title">Start your booking</div><div class="dsq-bc__sub">3 quick steps · no account · a real person replies</div>' +
      '<div class="dsq-bc__bar" aria-hidden="true"><i></i></div>' +
      '<div class="dsq-bc__step" data-step="1"><div class="dsq-bc__q">Manual or automatic?</div><div class="dsq-bc__picks">' +
      '<button type="button" data-gb="Manual"><span class="em">⚙️</span><b>Manual</b><small>Licence for both</small></button>' +
      '<button type="button" data-gb="Automatic"><span class="em">🅰️</span><b>Automatic</b><small>No clutch</small></button>' +
      '<button type="button" data-gb="Not sure"><span class="em">🤔</span><b>Not sure</b><small>We\'ll help</small></button></div>' +
      '<div class="dsq-bc__same"><i>✔</i>Same price either way — <b>£35/hr</b></div>' +
      '<ol class="dsq-bc__steps" aria-label="What happens next"><li><b>1</b>Pick your gearbox</li><li><b>2</b>Postcode &amp; package</li><li><b>3</b>Name &amp; mobile — done</li></ol>' +
      '<div class="dsq-bc__alt"><a href="https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi! I'd like to book a driving lesson with DriveSQ 🚗") + '" target="_blank" rel="nofollow noopener">💬 WhatsApp us instead</a><button type="button" data-bc="form">Prefer a form?</button></div></div>' +
      '<div class="dsq-bc__step" data-step="2" hidden><div class="dsq-bc__q">Where should we pick you up?</div>' +
      '<input class="dsq-bc__in" name="qpc" autocomplete="postal-code" maxlength="8" placeholder="Your full postcode" aria-label="Your full postcode" style="text-transform:uppercase"><div class="dsq-bc__live" aria-live="polite"></div>' +
      '<div class="dsq-bc__q" style="font-size:1.05rem;margin-top:6px">Which package?</div><div class="dsq-bc__pk" role="radiogroup" aria-label="Package"></div>' +
      '<div class="dsq-bc__err" role="alert"></div><div class="dsq-bc__nav"><button type="button" class="dsq-bc__back" data-nav="1">Back</button><button type="button" class="dsq-bc__go" data-nav="3">Next →</button></div></div>' +
      '<div class="dsq-bc__step" data-step="3" hidden><div class="dsq-bc__q">Last step — your details</div>' +
      '<input class="dsq-bc__in" name="qname" autocomplete="name" placeholder="Full name" aria-label="Full name">' +
      '<input class="dsq-bc__in" name="qphone" type="tel" autocomplete="tel" placeholder="Mobile number" aria-label="Mobile number">' +
      '<input class="dsq-bc__in" name="qemail" type="email" autocomplete="email" placeholder="Email (optional)" aria-label="Email (optional)">' +
      '<div class="dsq-bc__err" role="alert"></div><div class="dsq-bc__nav"><button type="button" class="dsq-bc__back" data-nav="2">Back</button><button type="button" class="dsq-bc__go" data-send>Send booking ✓</button></div>' +
      '<p style="font-size:.72rem;color:#8a8a8a;margin:10px 0 0">No payment now. We\'ll call or text to confirm. <a href="/privacy.html" style="color:#8a8a8a">Privacy</a></p></div>' +
      '<div class="dsq-bc__step" data-step="4" hidden></div></div>' +
      '<div class="dsq-bc__panel" data-panel="form" role="tabpanel" hidden></div>';
    // move the existing form card's contents into the "form" panel, keep its handler
    var fp = card.querySelector('[data-panel=form]');
    while (oldCard.firstChild) fp.appendChild(oldCard.firstChild);
    oldCard.parentNode.replaceChild(card, oldCard);

    var st = { gb: '', pkg: '', pc: '', sol: false }, ink = card.querySelector('.dsq-bc__ink'), tabs = [].slice.call(card.querySelectorAll('.dsq-bc__tabs [data-bc]'));
    function setTab(which) {
      tabs.forEach(function (t) { var on = t.getAttribute('data-bc') === which; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
      [].forEach.call(card.querySelectorAll('[data-panel]'), function (p) { var on = p.getAttribute('data-panel') === which; p.hidden = !on; if (on && !reduce) { p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); } });
      card.classList.toggle('is-form', which === 'form');
      var t = tabs.filter(function (x) { return x.getAttribute('data-bc') === which; })[0];
      if (ink && t) { ink.style.width = t.offsetWidth + 'px'; ink.style.transform = 'translateX(' + t.offsetLeft + 'px)'; }
      try { localStorage.setItem('dsqx_bc', which); } catch (e) {}
    }
    function step(n) {
      [].forEach.call(card.querySelectorAll('[data-step]'), function (s) { var on = s.getAttribute('data-step') === String(n); s.hidden = !on; if (on && !reduce) { s.classList.remove('in'); void s.offsetWidth; s.classList.add('in'); } });
      card.querySelector('.dsq-bc__bar i').style.width = Math.min(100, n * 33.4) + '%';
      var f = card.querySelector('[data-step="' + n + '"] input'); if (f && n > 1) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
    }
    function packages() {
      var box = card.querySelector('.dsq-bc__pk');
      box.innerHTML = PKGS.filter(function (p) { return !p.sol || st.sol; }).map(function (p) {
        return '<label class="' + (p.hot ? 'hot ' : '') + (st.pkg === p.id ? 'is-on' : '') + '"><input type="radio" name="qpkg" value="' + p.id + '"' + (st.pkg === p.id ? ' checked' : '') + '><span><b>' + esc(p.label) + '</b></span>' + (p.price ? '<em>' + esc(p.price) + '</em>' : '') + '</label>';
      }).join('');
    }
    function coverage() {
      var inp = card.querySelector('[name=qpc]'), out = card.querySelector('.dsq-bc__live'), v = inp.value;
      var C = window.DSQCover; st.pc = (window.DSQBooking && DSQBooking.fullPostcode(v)) || '';
      if (!st.pc) { out.innerHTML = ''; if (st.sol) { st.sol = false; if (st.pkg === 'offer') st.pkg = ''; packages(); } return; }
      if (!C) return;
      C.lookup(st.pc).then(function (r) {
        if (!r || r.pc !== st.pc) return;
        out.innerHTML = C.message(r); out.style.color = r.ok ? '#4ade80' : '#fbbf24';
        var sol = r.kind === 'sol'; if (sol !== st.sol) { st.sol = sol; if (!sol && st.pkg === 'offer') st.pkg = ''; if (sol && !st.pkg) st.pkg = 'offer'; packages(); }
      });
    }
    packages();
    var t0 = 0; card.querySelector('[name=qpc]').addEventListener('input', function () { clearTimeout(t0); t0 = setTimeout(coverage, 250); });
    card.addEventListener('change', function (e) { if (e.target.name === 'qpkg') { st.pkg = e.target.value; [].forEach.call(card.querySelectorAll('.dsq-bc__pk label'), function (l) { l.classList.toggle('is-on', l.contains(e.target)); }); } });
    card.addEventListener('click', function (e) {
      var tb = e.target.closest('[data-bc]'); if (tb && card.contains(tb)) { setTab(tb.getAttribute('data-bc')); track('booking_mode', { mode: tb.getAttribute('data-bc') }); return; }
      var g = e.target.closest('[data-gb]');
      if (g) { st.gb = g.getAttribute('data-gb'); [].forEach.call(card.querySelectorAll('[data-gb]'), function (x) { x.classList.toggle('is-on', x === g); }); track('cta_click', { location: 'bookcard', gearbox: st.gb }); setTimeout(function () { step(2); }, reduce ? 0 : 220); return; }
      var nv = e.target.closest('[data-nav]');
      if (nv) {
        var to = +nv.getAttribute('data-nav'), err = card.querySelector('[data-step="2"] .dsq-bc__err');
        if (to === 3) {
          coverage();
          if (!st.pc) { err.textContent = 'Please enter your full postcode, e.g. M19 2AB or B90 4AA.'; card.querySelector('[name=qpc]').focus(); return; }
          if (!st.pkg) { err.textContent = 'Please choose a package — or "Not sure yet".'; return; }
          err.textContent = '';
        }
        step(to); return;
      }
      if (e.target.closest('[data-send]')) send(e.target.closest('[data-send]'));
    });
    function send(btn) {
      var g = function (n) { return (card.querySelector('[name=' + n + ']').value || '').trim(); };
      var err = card.querySelector('[data-step="3"] .dsq-bc__err');
      var name = g('qname'), phone = g('qphone'), email = g('qemail');
      if (!nameOk(name)) { err.textContent = 'Please enter your name.'; card.querySelector('[name=qname]').focus(); return; }
      if (!phoneOk(phone)) { err.textContent = "That mobile number doesn't look right — please check it."; card.querySelector('[name=qphone]').focus(); return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = "That email doesn't look right — check it or leave it blank."; return; }
      err.textContent = '';
      var pk = PKGS.filter(function (p) { return p.id === st.pkg; })[0] || {};
      var service = pk.id === 'offer' ? 'New learner offer: 10 hours for £330' : pk.id === 'int' ? 'Intensive Course' : pk.id === 'nhs' ? 'NHS/student 10 hours £320' : pk.id === 'block' ? '10-hour block £350' : pk.id === 'payg' ? '2-hour lessons (pay as you go)' : 'Not sure — advise me';
      var d = { formName: 'Book in 60 seconds (card)', page: pageLabel(), name: name, phone: phone, email: email, postcode: st.pc, service: service,
        gearbox: st.gb === 'Manual' || st.gb === 'Automatic' ? st.gb : 'Not stated — ask', notes: st.gb === 'Not sure' ? 'Not sure about manual or automatic — please advise.' : '',
        ref: 'DSQ-' + Date.now().toString(36).slice(-5).toUpperCase() };
      if (!window.DSQBooking || !DSQBooking.send) { location.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi DriveSQ! I'd like to book lessons. Name: " + name + ', postcode: ' + st.pc); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      DSQBooking.send(d).then(function (ok) {
        btn.disabled = false; btn.textContent = 'Send booking ✓';
        var wa = 'https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi DriveSQ! I've just booked online. Ref: " + d.ref + '\nName: ' + name + '\nPostcode: ' + st.pc);
        if (!ok) { err.innerHTML = 'Sorry — we couldn\'t send that just now. Please <a href="' + wa + '" target="_blank" rel="noopener" style="color:#fca5a5;font-weight:700">WhatsApp us</a> or call 07352 932003.'; return; }
        var done = card.querySelector('[data-step="4"]');
        done.innerHTML = '<div class="dsq-bc__done"><div class="tick">✓</div><div class="dsq-bc__q" style="margin-bottom:4px">Booking request sent!</div>' +
          '<div>Your reference</div><b class="ref">' + esc(d.ref) + '</b><p style="font-size:.88rem;color:#cfcfcf;margin:8px 0">The DriveSQ team will call or text ' + esc(phone) + ' shortly to match you with an instructor near ' + esc(st.pc) + '.</p>' +
          '<a href="' + wa + '" target="_blank" rel="noopener" style="background:#25D366;color:#06260f">WhatsApp your reference</a><a href="/student.html" style="border:1px solid rgba(255,255,255,.25);color:#fff">See the free Student Portal</a></div>';
        step(4); card.querySelector('.dsq-bc__bar i').style.width = '100%';
        track('booking_ref', { ref: d.ref, via: 'bookcard' });
      });
    }
    var saved = null; try { saved = localStorage.getItem('dsqx_bc'); } catch (e) {}
    setTab(saved === 'form' ? 'form' : 'quick'); step(1);
    addEventListener('resize', function () { setTab(card.classList.contains('is-form') ? 'form' : 'quick'); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTab(card.classList.contains('is-form') ? 'form' : 'quick'); });
    // any "go to the form" link on the page (sticky button, postcode bar) shows the full form only when needed
    window.DSQBookCard = { tab: setTab, card: card };
  }

  function init() {
    if (document.querySelector('[data-dsqx-bc]')) return; // the homepage has its own card
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    document.querySelectorAll('#booking').forEach(function (s) { if (s.querySelector('#dsqInlineBookForm')) build(s); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
