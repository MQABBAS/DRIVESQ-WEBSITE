/* DriveSQ student welcome — a friendly full-screen hello with a cheerful sound, confetti and a short "what's next".
   Shown after sign-in, and once a day when they come back. Respects the sound-off setting (localStorage dsq_sound = off)
   and "reduce motion". Use: DSQWelcome.show({ name, firstEver, streak, lesson, guide, hoursLeft }) */
(function () {
  'use strict';
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var reduce = function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  var ac = null;

  /* a bright "you did it" jingle: rising major arpeggio, sparkle on top, soft final chord */
  function jingle() {
    try {
      if (LS.get('dsq_sound') === 'off') return;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = ac || new AC(); if (ac.state === 'suspended') ac.resume();
      var t0 = ac.currentTime + .02, master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
      function note(f, at, dur, type, vol) {
        var o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0 + at);
        g.gain.setValueAtTime(.0001, t0 + at); g.gain.exponentialRampToValueAtTime(vol, t0 + at + .012); g.gain.exponentialRampToValueAtTime(.0001, t0 + at + dur);
        o.connect(g); g.connect(master); o.start(t0 + at); o.stop(t0 + at + dur + .05);
      }
      [[523.25, 0], [659.25, .11], [783.99, .22], [1046.5, .33], [1318.5, .46]].forEach(function (n, i) {      // C5 E5 G5 C6 E6
        note(n[0], n[1], .5, 'triangle', .2); note(n[0] * 2, n[1], .35, 'sine', .06);
      });
      [[1568, .62], [2093, .70], [2637, .78]].forEach(function (n) { note(n[0], n[1], .35, 'sine', .07); });   // sparkle
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { note(f, .62, 1.1, 'sine', .11); });              // warm chord
    } catch (e) { }
  }
  function pop() { try { if (LS.get('dsq_sound') === 'off') return; var AC = window.AudioContext || window.webkitAudioContext; ac = ac || new AC(); var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(900, t + .08); g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.0001, t + .12); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .14); } catch (e) { } }
  function vib(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }

  var CSS = '@keyframes dwIn{from{opacity:0}to{opacity:1}}@keyframes dwPop{0%{transform:scale(.4) rotate(-8deg);opacity:0}60%{transform:scale(1.12) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0)}}@keyframes dwUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}@keyframes dwBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes dwFall{0%{transform:translate(0,-20px) rotate(0);opacity:1}100%{transform:translate(var(--dx),105vh) rotate(var(--rot));opacity:.9}}' +
    '.dw-ov{position:fixed;inset:0;z-index:100003;background:radial-gradient(ellipse at 50% 30%,#2a0709 0%,#0a0204 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;animation:dwIn .3s both;overflow:hidden;color:#fff}' +
    '.dw-car{font-size:4.2rem;animation:dwPop .7s .1s both,dwBob 2.2s 1s infinite}.dw-h{font-family:Oswald,sans-serif;font-size:clamp(1.9rem,8vw,2.8rem);font-weight:700;line-height:1.1;margin-top:10px;animation:dwUp .5s .35s both}.dw-h span{color:#ff3b43}' +
    '.dw-s{font-size:1rem;color:rgba(255,255,255,.78);margin-top:8px;max-width:360px;line-height:1.5;animation:dwUp .5s .5s both}.dw-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:18px;max-width:420px}' +
    '.dw-chip{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:99px;padding:7px 14px;font-size:.84rem;font-weight:700;animation:dwPop .5s both}.dw-go{margin-top:26px;min-width:230px;border:0;border-bottom:5px solid #15803d;background:#22c55e;color:#06210f;border-radius:16px;padding:14px 26px;font-family:Oswald,sans-serif;font-size:1.1rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;animation:dwUp .5s .8s both}.dw-go:active{transform:translateY(3px);border-bottom-width:2px}' +
    '.dw-snd{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:99px;padding:6px 12px;font-size:.74rem;cursor:pointer}.dw-c{position:absolute;top:0;width:10px;height:16px;border-radius:2px;animation:dwFall linear forwards;pointer-events:none}@media(prefers-reduced-motion:reduce){.dw-ov *{animation-duration:.01s!important;animation-delay:0s!important}}';
  function css() { if (document.getElementById('dwCss')) return; var s = document.createElement('style'); s.id = 'dwCss'; s.textContent = CSS; document.head.appendChild(s); }
  function confetti(ov) {
    if (reduce()) return; var cols = ['#22c55e', '#f5c518', '#ff3b43', '#60a5fa', '#c084fc', '#fff'];
    for (var i = 0; i < 46; i++) { var c = document.createElement('i'); c.className = 'dw-c'; c.style.left = (Math.random() * 100) + '%'; c.style.background = cols[i % cols.length]; c.style.setProperty('--dx', ((Math.random() - .5) * 180) + 'px'); c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg'); c.style.animationDuration = (2.4 + Math.random() * 2.2) + 's'; c.style.animationDelay = (Math.random() * .7) + 's'; ov.appendChild(c); }
  }
  function show(o) {
    css(); o = o || {}; var old = document.getElementById('dwOv'); if (old) old.remove();
    var first = String(o.name || '').trim().split(/\s+/)[0] || 'there', hr = new Date().getHours(), hello = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    var chips = [];
    if (o.streak > 1) chips.push('🔥 ' + o.streak + '-day streak');
    if (o.lesson) chips.push('📅 Next lesson: ' + o.lesson);
    if (o.hoursLeft != null && o.hoursLeft !== '') chips.push('📦 ' + o.hoursLeft + ' left on your block');
    if (o.guide) chips.push('📘 New weekly guide: ' + o.guide);
    if (!chips.length) chips.push('🎯 Your learning space is ready');
    var ov = document.createElement('div'); ov.className = 'dw-ov'; ov.id = 'dwOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Welcome');
    ov.innerHTML = '<button class="dw-snd" type="button">' + (LS.get('dsq_sound') === 'off' ? '🔇 Sound off' : '🔊 Sound on') + '</button><div class="dw-car">🚗</div>' +
      '<div class="dw-h">' + (o.firstEver ? 'Welcome to <span>DriveSQ</span>,<br>' + E(first) + '! 🎉' : hello + ',<br><span>' + E(first) + '</span>! 👋') + '</div>' +
      '<div class="dw-s">' + (o.firstEver ? 'We\'re so glad you\'re here. Learn the theory, track every lesson and chat with your instructor — all in one place.' : 'Great to see you again. Ready for the next step towards passing?') + '</div>' +
      '<div class="dw-chips">' + chips.map(function (c, i) { return '<span class="dw-chip" style="animation-delay:' + (.6 + i * .12) + 's">' + E(c) + '</span>'; }).join('') + '</div>' +
      '<button class="dw-go" type="button">Let\'s go →</button>';
    if (document.querySelector('.dsq-ck')) { ov.style.paddingBottom = '260px'; ov.style.overflowY = 'auto'; }   // keep the button clear of the cookie choices box
    document.body.appendChild(ov); confetti(ov); jingle(); vib([20, 40, 20, 40, 60]);
    var played = true, close = function () { pop(); ov.style.transition = 'opacity .25s'; ov.style.opacity = '0'; setTimeout(function () { ov.remove(); }, 260); clearTimeout(timer); };
    var timer = setTimeout(close, 12000);
    ov.querySelector('.dw-go').onclick = close;
    ov.querySelector('.dw-snd').onclick = function () { var off = LS.get('dsq_sound') === 'off'; LS.set('dsq_sound', off ? 'on' : 'off'); this.textContent = off ? '🔊 Sound on' : '🔇 Sound off'; if (off) jingle(); };
    /* if the phone blocked the sound (no tap yet), play it on the first touch */
    var onFirst = function () { if (!played) return; ov.removeEventListener('pointerdown', onFirst); if (ac && ac.state === 'suspended') { ac.resume().then(jingle); } };
    ov.addEventListener('pointerdown', onFirst, { once: true });
  }
  window.DSQWelcome = { show: show, jingle: jingle };
})();
