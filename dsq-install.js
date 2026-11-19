/* DriveSQ "Add to Home Screen" — one friendly button for iPhone, iPad and Android.
   - iPhone / iPad (Safari): a bottom sheet with the exact taps, an arrow pointing at the Share button, and a "Done" button.
   - iPhone in WhatsApp / Instagram / Facebook / TikTok: tells them to open the page in Safari first (with a Copy link button).
   - Android Chrome: the button opens the phone's own install box in one tap. Other Android browsers get the menu steps.
   - Already installed (opened from the home screen): the card hides itself.
   Use:  DSQInstall.mount('#someDiv', { name:'DriveSQ Student', dismissible:true, key:'student-home' })   DSQInstall.open() */
(function () {
  'use strict';
  var UA = navigator.userAgent || '', deferred = window.__dsqDeferred || null, listeners = [];
  var IOS = /iPad|iPhone|iPod/.test(UA) || (/Mac/.test(UA) && navigator.maxTouchPoints > 1);
  var ANDROID = /Android/i.test(UA);
  var INAPP = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|TikTok|musical_ly|MicroMessenger|Line\/|Twitter|LinkedInApp|GSA\//i.test(UA) || (IOS && /\bWhatsApp\b/i.test(UA));
  var IOS_OTHER = IOS && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(UA);
  var standalone = function () { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; } };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; window.__dsqDeferred = e; repaint(); });
  window.addEventListener('appinstalled', function () { LS.set('dsq_a2hs_done', '1'); deferred = null; chime(); vib([15, 40, 15]); closeSheet(); repaint(); toast('✅ DriveSQ is on your home screen'); });

  /* soft sound + vibration (respects the portal's sound-off setting) */
  var ac = null;
  function chime() {
    try {
      if (LS.get('dsq_sound') === 'off') return; var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = ac || new AC(); if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime; [[1047, 0], [1319, .11], [1568, .22]].forEach(function (n) { var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(.0001, t + n[1]); g.gain.exponentialRampToValueAtTime(.14, t + n[1] + .015); g.gain.exponentialRampToValueAtTime(.0001, t + n[1] + .55); o.connect(g); g.connect(ac.destination); o.start(t + n[1]); o.stop(t + n[1] + .6); });
    } catch (e) { }
  }
  function tick() { try { if (LS.get('dsq_sound') === 'off') return; var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = ac || new AC(); var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 700; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .09); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .1); } catch (e) { } }
  function vib(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }
  function toast(m) { try { if (window.showToast) return window.showToast(m, 'success'); } catch (e) { } }

  /* which situation are we in? */
  function mode() {
    if (standalone() || LS.get('dsq_a2hs_done') === '1') return 'installed';
    if (IOS) return INAPP ? 'ios-inapp' : IOS_OTHER ? 'ios-other' : 'ios-safari';
    if (ANDROID) return INAPP ? 'android-inapp' : deferred ? 'android-prompt' : 'android-manual';
    return deferred ? 'desktop-prompt' : 'desktop-manual';
  }
  var APP = { name: 'DriveSQ', icon: '/icon-192.png' };

  var CSS = '@keyframes dqiIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes dqiUp{from{transform:translateY(100%)}to{transform:none}}@keyframes dqiBob{0%,100%{transform:translateY(0)}50%{transform:translateY(9px)}}@keyframes dqiGlow{0%,100%{box-shadow:0 0 0 0 rgba(209,10,17,.45)}50%{box-shadow:0 0 0 9px rgba(209,10,17,0)}}' +
    '.dqi-card{position:relative;display:flex;gap:14px;align-items:center;padding:14px 16px;border-radius:18px;border:1px solid rgba(209,10,17,.35);background:linear-gradient(135deg,rgba(209,10,17,.16),rgba(245,197,24,.09));margin-bottom:12px;animation:dqiIn .4s both;overflow:hidden}' +
    '.dqi-card img{width:52px;height:52px;border-radius:13px;box-shadow:0 4px 14px rgba(0,0,0,.28);flex:0 0 auto}.dqi-t{font-family:Oswald,sans-serif;font-size:1.02rem;font-weight:700;color:var(--txt,#fff);line-height:1.2}.dqi-s{font-size:.76rem;color:var(--txt2,#aaa);margin-top:3px;line-height:1.4}' +
    '.dqi-go{margin-top:9px;display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#d10a11,#a8060c);color:#fff;border:0;border-radius:12px;padding:10px 16px;font-family:Oswald,sans-serif;font-size:.86rem;font-weight:600;letter-spacing:.02em;cursor:pointer;animation:dqiGlow 2.4s infinite;transition:transform .12s}.dqi-go:active{transform:scale(.95)}' +
    '.dqi-x{position:absolute;top:6px;right:8px;background:none;border:0;color:var(--txt3,#888);font-size:1.1rem;cursor:pointer;padding:4px}.dqi-done{display:flex;gap:8px;align-items:center;font-size:.8rem;color:#22c55e;font-weight:700;padding:8px 2px}' +
    '.dqi-ov{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.62);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(2px)}.dqi-ov.ios{padding-bottom:78px}.dqi-ov.ios .dqi-sh{border-radius:24px;border-bottom:1px solid var(--bdr,#2a2a32);max-height:calc(100vh - 100px)}.dqi-sh{width:100%;max-width:480px;max-height:92vh;overflow:auto;background:var(--card-bg,var(--dk2,#16161b));color:var(--txt,#fff);border-radius:24px 24px 0 0;padding:10px 18px 22px;animation:dqiUp .3s both;border:1px solid var(--bdr,#2a2a32);border-bottom:0}' +
    '@media(min-width:600px){.dqi-ov{align-items:center}.dqi-sh{border-radius:24px;border-bottom:1px solid var(--bdr,#2a2a32)}}.dqi-grab{width:42px;height:5px;border-radius:9px;background:rgba(128,128,128,.4);margin:0 auto 12px}' +
    '.dqi-h{display:flex;gap:12px;align-items:center;margin-bottom:6px}.dqi-h img{width:48px;height:48px;border-radius:12px}.dqi-st{display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:16px;background:rgba(128,128,128,.1);margin-top:9px;animation:dqiIn .35s both}' +
    '.dqi-n{width:28px;height:28px;border-radius:50%;background:#d10a11;color:#fff;display:grid;place-items:center;font-weight:800;font-size:.85rem;flex:0 0 auto}.dqi-tx{flex:1;min-width:0}.dqi-tx>b{display:block;font-size:.92rem}.dqi-tx>span{display:block;font-size:.78rem;color:var(--txt2,#aaa);margin-top:2px;line-height:1.45}.dqi-tx>span b{color:var(--txt,#fff)}' +
    '.dqi-ic{width:38px;height:38px;border-radius:10px;background:var(--card-bg,#16161b);border:1px solid var(--bdr,#2a2a32);display:grid;place-items:center;flex:0 0 auto;color:#0a84ff}.dqi-ic svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    '.dqi-btn{width:100%;margin-top:14px;border:0;border-radius:14px;padding:13px;font-family:Oswald,sans-serif;font-size:.95rem;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#d10a11,#a8060c);color:#fff}.dqi-btn.s{background:rgba(128,128,128,.16);color:var(--txt,#fff);margin-top:8px}' +
    '.dqi-arrow{position:fixed;left:0;right:0;bottom:6px;text-align:center;z-index:100002;pointer-events:none;color:#fff;font-size:.8rem;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.7)}.dqi-arrow i{display:block;font-style:normal;font-size:2rem;animation:dqiBob 1s infinite}' +
    '.dqi-warn{background:rgba(245,158,11,.13);border:1px solid rgba(245,158,11,.4);color:var(--txt,#fff);border-radius:14px;padding:11px 13px;font-size:.8rem;line-height:1.45;margin-top:10px}';
  function css() { if (document.getElementById('dqiCss')) return; var s = document.createElement('style'); s.id = 'dqiCss'; s.textContent = CSS; document.head.appendChild(s); }
  var SVG = {
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M8.5 6.5L12 3l3.5 3.5"/><path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/></svg>',
    safari: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    tick: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
  function step(n, ic, title, text) { return '<div class="dqi-st" style="animation-delay:' + (n * .07) + 's"><span class="dqi-n">' + n + '</span><div class="dqi-tx"><b>' + title + '</b><span>' + text + '</span></div><span class="dqi-ic">' + ic + '</span></div>'; }

  function sheetBody(m) {
    var nm = E(APP.name), head = '<div class="dqi-grab"></div><div class="dqi-h"><img src="' + E(APP.icon) + '" alt=""><div><div class="dqi-t" style="font-size:1.15rem">Add ' + nm + ' to your Home Screen</div><div class="dqi-s" style="margin-top:2px">Opens full-screen like a normal app. Takes 10 seconds.</div></div></div>';
    if (m === 'ios-inapp' || m === 'android-inapp') {
      var br = m === 'ios-inapp' ? 'Safari' : 'Chrome';
      return head + '<div class="dqi-warn">📱 You are inside another app (like WhatsApp, Instagram or Facebook). Phones only allow “Add to Home Screen” from <b>' + br + '</b>.</div>' +
        step(1, SVG.dots, 'Open this page in ' + br, 'Tap the <b>⋯</b> or <b>Share</b> button in this app and choose <b>“Open in ' + br + '”</b>. Or copy the link and paste it into ' + br + '.') +
        '<button class="dqi-btn" data-q="copy">📋 Copy link</button><button class="dqi-btn s" data-q="close">Close</button>';
    }
    if (m === 'ios-safari' || m === 'ios-other') {
      return head + (m === 'ios-other' ? '<div class="dqi-warn">💡 Easiest in <b>Safari</b>. If you can\'t see the Share button here, tap “Copy link” below and open it in Safari.</div>' : '') +
        step(1, SVG.share, 'Tap the Share button', 'It\'s the square with an arrow <b>at the bottom</b> of the screen (on iPad it\'s at the top). If you can\'t see it, tap <b>⋯</b> first.') +
        step(2, SVG.plus, 'Tap “Add to Home Screen”', 'Scroll down in the menu until you see it, then tap it.') +
        step(3, SVG.tick, 'Tap “Add”', 'Top right corner. ' + nm + ' now appears on your home screen.') +
        '<button class="dqi-btn" data-q="done">✅ I\'ve added it</button>' + (m === 'ios-other' ? '<button class="dqi-btn s" data-q="copy">📋 Copy link for Safari</button>' : '') + '<button class="dqi-btn s" data-q="close">Not now</button>';
    }
    if (m === 'android-manual') {
      return head + step(1, SVG.dots, 'Tap the menu', 'The <b>⋮</b> (three dots) at the top right of your browser.') +
        step(2, SVG.dl, 'Tap “Add to Home screen” or “Install app”', 'Choose either — they do the same thing.') + step(3, SVG.tick, 'Tap “Add” / “Install”', nm + ' now appears on your home screen.') +
        '<button class="dqi-btn" data-q="done">✅ I\'ve added it</button><button class="dqi-btn s" data-q="close">Not now</button>';
    }
    return head + step(1, SVG.dl, 'Use the install icon', 'In Chrome or Edge, click the install icon at the right of the address bar — or the ⋮ menu → <b>Install</b>.') + '<button class="dqi-btn s" data-q="close">Close</button>';
  }
  var sheetEl = null;
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } var a = document.getElementById('dqiArrow'); if (a) a.remove(); }
  function open() {
    css(); var m = mode(); tick(); vib(8);
    if (m === 'installed') { toast('✅ Already on your home screen'); return; }
    if (m === 'android-prompt' || m === 'desktop-prompt') {
      var d = deferred; deferred = null; window.__dsqDeferred = null;
      try { d.prompt(); d.userChoice.then(function (r) { if (r.outcome === 'accepted') { LS.set('dsq_a2hs_done', '1'); chime(); vib([15, 40, 15]); toast('✅ Added to your home screen'); } else { deferred = d; window.__dsqDeferred = d; } repaint(); }); } catch (e) { deferred = d; window.__dsqDeferred = d; showSheet('android-manual'); }
      return;
    }
    showSheet(m);
  }
  function showSheet(m) {
    css(); closeSheet(); var o = document.createElement('div'); o.className = 'dqi-ov' + (m === 'ios-safari' && !/iPad/.test(UA) ? ' ios' : ''); o.innerHTML = '<div class="dqi-sh" role="dialog" aria-label="Add to Home Screen">' + sheetBody(m) + '</div>';
    o.addEventListener('click', function (e) {
      if (e.target === o) return closeSheet(); var b = e.target.closest('[data-q]'); if (!b) return; var q = b.getAttribute('data-q');
      if (q === 'close') closeSheet();
      else if (q === 'done') { LS.set('dsq_a2hs_done', '1'); chime(); vib([15, 40, 15]); closeSheet(); repaint(); toast('✅ Nice — find DriveSQ on your home screen'); }
      else if (q === 'copy') { var u = location.href.split('#')[0]; (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { b.textContent = '✅ Link copied'; }, function () { try { prompt('Copy this link', u); } catch (e) { } }); }
    });
    document.body.appendChild(o); sheetEl = o;
    if (m === 'ios-safari' && !/iPad/.test(UA) && !(/Mac/.test(UA) && navigator.maxTouchPoints > 1 && window.innerWidth > 700)) { var a = document.createElement('div'); a.id = 'dqiArrow'; a.className = 'dqi-arrow'; a.innerHTML = 'Share button is down here<i>👇</i>'; document.body.appendChild(a); }
  }

  /* the card that sits on the page */
  var mounts = [];
  function cardHTML(opts) {
    var m = mode(); if (m === 'installed') return opts.hideWhenDone ? '' : '<div class="dqi-card"><div class="dqi-done"><span style="font-size:1.3rem">✅</span> DriveSQ is on your home screen</div></div>';
    if (opts.dismissible && Date.now() < +(LS.get('dsq_a2hs_hide_' + (opts.key || 'x')) || 0)) return '';
    var sub = m.indexOf('ios') === 0 ? 'Get one-tap access, full-screen, like a real app. ' + (m === 'ios-inapp' ? 'Open in Safari first.' : 'Takes 10 seconds.') : 'One tap to your home screen, full-screen, like a real app.';
    return '<div class="dqi-card" role="region" aria-label="Add to Home Screen"><img src="' + E(APP.icon) + '" alt="">' + (opts.dismissible ? '<button class="dqi-x" data-q="hide" aria-label="Not now">×</button>' : '') +
      '<div style="min-width:0"><div class="dqi-t">Add ' + E(APP.name) + ' to your Home Screen</div><div class="dqi-s">' + sub + '</div><button class="dqi-go" data-q="go"><span style="font-size:1.05rem">📲</span> Add to Home Screen</button></div></div>';
  }
  function paint(el, opts) {
    el.innerHTML = cardHTML(opts);
    el.onclick = function (e) { var b = e.target.closest('[data-q]'); if (!b) return; var q = b.getAttribute('data-q'); if (q === 'go') open(); else if (q === 'hide') { LS.set('dsq_a2hs_hide_' + (opts.key || 'x'), String(Date.now() + 7 * 864e5)); el.innerHTML = ''; } };
  }
  function repaint() { mounts.forEach(function (m) { if (document.body.contains(m.el)) paint(m.el, m.opts); }); }
  function mount(sel, opts) {
    css(); opts = opts || {}; if (opts.name) APP.name = opts.name; if (opts.icon) APP.icon = opts.icon;
    var el = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!el) return; mounts = mounts.filter(function (m) { return m.el !== el; }); mounts.push({ el: el, opts: opts }); paint(el, opts);
  }
  window.DSQInstall = { mount: mount, open: open, mode: mode, repaint: repaint, setApp: function (n, i) { if (n) APP.name = n; if (i) APP.icon = i; } };
})();
