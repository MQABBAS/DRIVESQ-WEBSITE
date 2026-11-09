/* DriveSQ — pass-photo strip next to every booking card + "SQ Assistant" (v1).
   Loaded on every page by booking-capture.js.
   1. Photo strip: real DriveSQ pass photos + Google rating, placed straight under the booking card (.dsq-bc or [data-dsqx-bc]).
   2. SQ Assistant: a floating helper that answers the common questions instantly from DriveSQ's own published facts
      (prices, offer, areas, manual/automatic, intensive courses, tests, theory) and hands every visitor to the booking card,
      WhatsApp or a call. Postcodes are checked with DSQCover (/postcode-coverage.json) in the browser.
      It is rule-based, not a chatbot service: nothing typed here is sent anywhere unless the visitor taps WhatsApp. */
(function () {
  if (window.__dsqAssist) return; window.__dsqAssist = true;
  var WA = '447352932003', TEL = '07352932003', TEL_H = '07352 932003', REVIEWS = 'https://g.page/r/Cf5Ww977kUeEEBM/review';
  var path = location.pathname.toLowerCase();
  if (/\/(admin|admin1|dashboard|student|portal|instructor)[^/]*\.html$/.test(path)) return;
  var SOL = /solihull|shirley|knowle|dorridge|olton|balsall|hampton-in-arden|chelmsley|kingshurst|marston-green|meriden|monkspath|hockley-heath|castle-bromwich|smiths-wood|elmdon|lyndon|sparkhill|hall-green|acocks|sheldon|yardley|garretts-green|kings-heath|b9[0-4]|b2[5-8]|b3[3-7]/.test(path);
  var PH = [['01-red-suv', 'A learner in a blue jacket holding a pass certificate beside a red DriveSQ car'], ['02-black-volvo', 'A smiling learner holding a pass certificate in front of a black DriveSQ hatchback'],
    ['06-white-hyundai', 'A learner holding a pass certificate beside a white DriveSQ Hyundai'], ['04-silver-clio', 'A learner holding a pass certificate next to a silver DriveSQ Renault Clio'],
    ['10-test-centre-board', 'A learner holding an I have just passed board beside a white DriveSQ car outside a test centre'], ['03-blue-auris', 'A learner holding a pass certificate behind a blue DriveSQ Toyota'],
    ['05-silver-clio-sunny', 'A learner holding a pass certificate behind a silver DriveSQ car on a sunny day'], ['08-black-audi', 'A learner holding a pass certificate next to a black DriveSQ Audi'],
    ['07-blue-auris-2', 'A smiling learner holding a pass certificate behind a blue DriveSQ Toyota Auris'], ['09-test-centre-white', 'A learner pointing at their pass certificate outside a driving test centre']];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var wa = function (t) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(t); };

  var css = '.dsq-proof{box-sizing:border-box;width:100%;min-width:0;max-width:620px;margin:14px auto 0;padding:14px 0 12px;border-radius:22px;background:#111;color:#f3f3f3;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.25);font-family:Inter,system-ui,sans-serif}' +
    '.dsq-proof__top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 16px 10px;font-size:.8rem}.dsq-proof__top b{font-family:Oswald,Inter,sans-serif;letter-spacing:.4px;font-size:.95rem}' +
    '.dsq-proof__stars{color:#fbbf24;letter-spacing:1px;margin-right:4px}.dsq-proof__top a{color:#bbb;text-decoration:underline;white-space:nowrap}' +
    '.dsq-proof__win{position:relative;height:150px;overflow:hidden}.dsq-proof__rail{position:absolute;left:0;top:0;display:flex;gap:10px;width:max-content;animation:dsqRail 48s linear infinite;padding-left:16px}.dsq-proof:hover .dsq-proof__rail{animation-play-state:paused}' +
    '.dsq-proof__rail figure{margin:0;position:relative;width:118px;height:150px;border-radius:14px;overflow:hidden;flex:none;background:#222}' +
    '.dsq-proof__rail img{width:100%;height:100%;object-fit:cover;object-position:50% 35%;display:block}' +
    '.dsq-proof__rail figcaption{position:absolute;left:0;right:0;bottom:0;padding:18px 6px 5px;font-size:.62rem;font-weight:700;text-align:center;background:linear-gradient(transparent,rgba(0,0,0,.75))}' +
    '@keyframes dsqRail{to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.dsq-proof__rail{animation:none}.dsq-proof__win{overflow-x:auto}}' +
    '.dsq-portal{box-sizing:border-box;width:100%;max-width:620px;margin:12px auto 0;padding:16px;border-radius:22px;background:linear-gradient(135deg,#0b1220,#13213d);color:#e8eefc;font-family:Inter,system-ui,sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.22);text-align:left}' +
    '.dsq-portal__top{display:flex;align-items:center;gap:10px}.dsq-portal__ic{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#2563eb,#60a5fa);font-weight:800;font-family:Oswald,Inter,sans-serif;color:#fff;flex:none}' +
    '.dsq-portal__top b{display:block;font-family:Oswald,Inter,sans-serif;font-size:1.05rem;letter-spacing:.3px;color:#fff}.dsq-portal__top small{color:#9fb3d9;font-size:.74rem}' +
    '.dsq-portal__list{list-style:none;margin:12px 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;font-size:.8rem}.dsq-portal__list li::before{content:"✓ ";color:#4ade80;font-weight:700}.dsq-portal__list b{color:#fff}' +
    '.dsq-portal__btns{display:flex;flex-wrap:wrap;gap:8px}.dsq-portal__btns a{flex:1;min-width:140px;text-align:center;padding:9px 12px;border-radius:999px;background:#2563eb;color:#fff;font-weight:700;font-size:.84rem;text-decoration:none}.dsq-portal__btns a.o{background:transparent;border:1px solid #3b5a99;color:#cfe0ff}' +
    '@media (max-width:420px){.dsq-portal__list{grid-template-columns:1fr}}' +
    /* assistant */
    '.sqx-l{position:fixed;left:16px;bottom:20px;z-index:950;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:10px 16px 10px 10px;background:#0b0b0b;color:#fff;font:700 .9rem Inter,system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.35);cursor:pointer;transition:transform .2s}' +
    '.sqx-l:hover{transform:translateY(-2px)}.sqx-l i{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#D10A11,#ff4d55);font-style:normal;font-size:.95rem}' +
    '.sqx-l .dot{position:absolute;top:6px;left:32px;width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2px #0b0b0b}' +
    '@media (max-width:767px){.sqx-l{bottom:78px;left:12px;padding:8px 13px 8px 8px;font-size:.82rem}}' +
    '.sqx{position:fixed;left:16px;bottom:16px;z-index:10060;width:min(380px,calc(100vw - 24px));height:min(600px,calc(100vh - 32px));display:flex;flex-direction:column;background:#fff;color:#111;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;font-family:Inter,system-ui,sans-serif;transform:translateY(16px) scale(.98);opacity:0;pointer-events:none;transition:all .22s}' +
    '.sqx.open{transform:none;opacity:1;pointer-events:auto}@media (max-width:767px){.sqx{left:12px;bottom:12px;height:calc(100vh - 24px)}}' +
    '.sqx__h{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:#0b0b0b;color:#fff}.sqx__h i{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#D10A11,#ff4d55);font-style:normal}' +
    '.sqx__h b{display:block;font-family:Oswald,Inter,sans-serif;font-size:1.05rem;letter-spacing:.3px}.sqx__h small{display:block;font-size:.7rem;color:#aaa}.sqx__x{margin-left:auto;background:none;border:0;color:#fff;font-size:1.4rem;cursor:pointer;line-height:1;padding:4px 6px}' +
    '.sqx__b{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f6f6f7}' +
    '.sqx__m{max-width:88%;padding:10px 12px;border-radius:16px;font-size:.88rem;line-height:1.45;box-shadow:0 1px 2px rgba(0,0,0,.06)}.sqx__m.bot{background:#fff;border-bottom-left-radius:5px}.sqx__m.me{align-self:flex-end;background:#D10A11;color:#fff;border-bottom-right-radius:5px}' +
    '.sqx__m a{color:#D10A11;font-weight:600}.sqx__m.me a{color:#fff}.sqx__m ul{margin:6px 0 0;padding-left:18px}.sqx__m li{margin:2px 0}' +
    '.sqx__acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.sqx__acts a,.sqx__acts button{border:1px solid rgba(0,0,0,.12);background:#fff;color:#111;border-radius:999px;padding:6px 11px;font:600 .78rem Inter,system-ui,sans-serif;cursor:pointer;text-decoration:none}' +
    '.sqx__acts .p{background:#D10A11;border-color:#D10A11;color:#fff}.sqx__acts .w{background:#25d366;border-color:#25d366;color:#06210f}' +
    '.sqx__chips{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;background:#fff;border-top:1px solid #eee;scrollbar-width:none}.sqx__chips button{flex:none;border:1px solid #e5e5e5;background:#fafafa;border-radius:999px;padding:6px 11px;font:600 .76rem Inter,system-ui,sans-serif;cursor:pointer;color:#111}' +
    '.sqx__f{display:flex;gap:8px;padding:10px 12px 12px;background:#fff}.sqx__f input{flex:1;min-width:0;border:1px solid #ddd;border-radius:999px;padding:10px 14px;font:1rem Inter,system-ui,sans-serif;outline:none}.sqx__f input:focus{border-color:#D10A11}' +
    '.sqx__f button{border:0;border-radius:50%;width:42px;height:42px;background:#D10A11;color:#fff;font-size:1.05rem;cursor:pointer;flex:none}' +
    '.sqx__note{font-size:.66rem;color:#888;text-align:center;padding:0 12px 8px;background:#fff}.sqx__typing{display:inline-flex;gap:3px}.sqx__typing span{width:6px;height:6px;border-radius:50%;background:#bbb;animation:sqxT 1s infinite}.sqx__typing span:nth-child(2){animation-delay:.15s}.sqx__typing span:nth-child(3){animation-delay:.3s}@keyframes sqxT{50%{opacity:.3}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- 1. pass photos next to the booking card ---------- */
  function proof(card) {
    if (!card || card.nextElementSibling && card.nextElementSibling.classList.contains('dsq-proof')) return;
    var figs = PH.map(function (p) { return '<figure><img src="/img/passes/drivesq-pass-' + p[0] + '-sm.webp" alt="' + esc(p[1]) + '" width="118" height="150" loading="lazy" decoding="async"><figcaption>✅ Passed</figcaption></figure>'; }).join('');
    var d = document.createElement('div'); d.className = 'dsq-proof';
    d.innerHTML = '<div class="dsq-proof__top"><span><span class="dsq-proof__stars" aria-hidden="true">★★★★★</span><b>4.9</b> from 157 Google reviews</span><a href="' + REVIEWS + '" target="_blank" rel="noopener">Real DriveSQ passes</a></div>' +
      '<div class="dsq-proof__win"><div class="dsq-proof__rail" aria-label="Recent DriveSQ passes">' + figs + figs.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"') + '</div></div>';
    card.parentNode.insertBefore(d, card.nextSibling);
    var pt = document.createElement('div'); pt.className = 'dsq-portal';
    pt.innerHTML = '<div class="dsq-portal__top"><span class="dsq-portal__ic">SQ</span><div><b>Free DriveSQ Student Portal</b><small>Included with every DriveSQ lesson booking</small></div></div>' +
      '<ul class="dsq-portal__list"><li><b>700+</b> theory questions in all 14 DVSA categories</li><li><b>14</b> full timed mock tests</li><li>Hazard perception practice</li><li>Lesson log, progress charts &amp; test countdowns</li><li>Test-readiness checklist</li><li>Works offline on your phone</li></ul>' +
      '<div class="dsq-portal__btns"><a href="/drivesq-student-portal.html">See what\'s inside</a><a href="/student.html" class="o">Student log in</a></div>';
    d.parentNode.insertBefore(pt, d.nextSibling);
  }
  function findCards() { [].forEach.call(document.querySelectorAll('.dsq-bc, [data-dsqx-bc]'), proof); }

  /* ---------- 2. SQ Assistant ---------- */
  var box, body, input, opened = false;
  function bookBtn(label) { return '<button type="button" class="p" data-sqx="book">' + (label || '📅 Book in 60 seconds') + '</button>'; }
  function waBtn(t) { return '<a class="w" href="' + wa(t || 'Hi DriveSQ! I have a question about driving lessons.') + '" target="_blank" rel="noopener">WhatsApp us</a>'; }
  function say(html, acts, me) {
    var m = document.createElement('div'); m.className = 'sqx__m ' + (me ? 'me' : 'bot');
    m.innerHTML = html + (acts ? '<div class="sqx__acts">' + acts + '</div>' : '');
    body.appendChild(m); body.scrollTop = body.scrollHeight; return m;
  }
  function botSay(html, acts) {
    var t = say('<span class="sqx__typing"><span></span><span></span><span></span></span>');
    setTimeout(function () { t.remove(); say(html, acts); }, 420);
  }
  var PRICE = function () {
    return 'Our prices (manual or automatic, same price):<ul><li><b>£35/hr</b> — pay as you go in 2-hour lessons (£70)</li><li><b>10-hour block: £350</b></li>' +
      (SOL ? '<li>🎉 <b>New learners in Solihull: first 10 hours for £330</b> (paid in advance)</li>' : '') +
      '<li><b>NHS staff &amp; students: 10 hours for £320</b></li><li>Intensive &amp; semi-intensive courses planned around your test date</li></ul>';
  };
  var INTENTS = [
    [/\b(hi|hello|hey|salam|salaam|morning|evening)\b/, function () { botSay('Hi! 👋 I\'m the SQ Assistant. Ask me about prices, your area, manual vs automatic, intensive courses or tests — or book in under a minute.', bookBtn()); }],
    [/(price|cost|how much|£|fee|charge|rate|cheap|afford)/, function () { botSay(PRICE(), bookBtn('Book at these prices')); }],
    [/(offer|deal|discount|promo|first 10|330)/, function () { botSay(SOL ? '🎉 <b>New learner offer:</b> your first 10 hours for <b>£330</b> — for new DriveSQ learners in Solihull, first 10-hour block, paid in advance, manual or automatic. Can\'t be combined with the NHS/student price (£320).' : 'Our best value is a <b>10-hour block for £350</b>, or <b>£320</b> for NHS staff and students. In Solihull, new learners also get their first 10 hours for £330.', bookBtn()); }],
    [/(nhs|nurse|doctor|student|uni|college)/, function () { botSay('NHS staff and students get <b>10 hours for £320</b> (manual or automatic). Just pick that package when you book and mention it in your notes.', bookBtn()); }],
    [/(auto|manual|gear|clutch|electric|ev\b)/, function () { botSay('We teach <b>both manual and automatic</b> at the same price (£35/hr). Automatic means fewer controls to learn; manual gives you a licence for both. Not sure? <a href="/manual-or-automatic-decider.html">Try the 1-minute decider</a>.', bookBtn()); }],
    [/(intensive|crash|fast|quick|week|asap|urgent|soon)/, function () { botSay('Yes — we run <b>intensive and semi-intensive courses</b>. We plan the hours around your experience and your test date, so tell us both when you book (or if you need a test found for you).', bookBtn('Plan my course') + waBtn('Hi DriveSQ! I\'m interested in an intensive course.')); }],
    [/(wait|waiting|test date|book.*test|test centre|center|pass rate|examiner)/, function () { botSay('Test centres and waiting times change every month. ' + (SOL ? 'See <a href="/solihull-driving-test-centres-data.html">pass rates &amp; waits for every centre near Solihull</a> (official DVSA data).' : 'See <a href="/driving-test-waiting-times-manchester.html">Manchester test waiting times</a>.') + ' Already have a test date? Add it when you book and we\'ll plan your lessons to it.', bookBtn()); }],
    [/(portal|app\b|login|log in|sign in|track|progress)/, function () { botSay('The <b>DriveSQ Student Portal</b> is free with your lessons: 700+ theory questions across all 14 DVSA categories, 14 timed mock tests, hazard perception practice, your lesson log, progress charts, test countdowns and a test-readiness checklist — and it works offline.', '<a href="/drivesq-student-portal.html">See the portal</a><a href="/student.html">Student log in</a>' + bookBtn()); }],
    [/(theory|hazard|mock|highway code)/, function () { botSay('Every DriveSQ learner gets the free <b>Student Portal</b>: 700+ theory questions, 14 full mock tests, progress tracking and a test-readiness checklist.', bookBtn() + '<a href="/student.html">Student Portal</a>'); }],
    [/(how many (hours|lessons)|hours do i need|how long)/, function () { botSay('It depends on you — we\'ll give you an honest estimate after your first lesson. As a guide, DVSA says people who pass take around <b>45 hours of lessons plus 22 hours of private practice</b> on average (<a href="https://www.gov.uk/driving-lessons-learning-to-drive" target="_blank" rel="noopener">GOV.UK</a>).', bookBtn()); }],
    [/(age|old|17|16|provisional|licence|license)/, function () { botSay('You can apply for a provisional licence from 15 years 9 months and start driving a car at 17 (<a href="https://www.gov.uk/apply-first-provisional-driving-licence" target="_blank" rel="noopener">apply on GOV.UK</a>). You need it before your first lesson.', '<a href="/learner-driver-age-checker.html">When can I start?</a>' + bookBtn()); }],
    [/(pass plus|motorway|refresher|nervous|anxious|confidence|after passing)/, function () { botSay('We also do <b>refresher lessons</b>, motorway lessons and Pass Plus, and we\'re patient with nervous drivers. Tell us what you\'d like in the notes when you book.', bookBtn() + waBtn('Hi DriveSQ! I\'d like refresher / Pass Plus lessons.')); }],
    [/(gift|voucher|present)/, function () { botSay('Driving lesson gift vouchers are available — message us with the amount or hours and we\'ll sort it.', waBtn('Hi DriveSQ! I\'d like a driving lesson gift voucher.') + '<a href="/driving-lesson-gift-vouchers-solihull.html">Gift vouchers</a>'); }],
    [/(review|rating|good|trust|legit)/, function () { botSay('We\'re rated <b>4.9★ from 157 Google reviews</b>, and our instructors are DVSA-approved with dual-control cars.', bookBtn() + '<a href="' + REVIEWS + '" target="_blank" rel="noopener">Google reviews</a>'); }],
    [/(area|cover|near|where|location|postcode|come to)/, function () { botSay('Type your <b>full postcode</b> (e.g. ' + (SOL ? 'B90 4AA' : 'M14 5AA') + ') and I\'ll check it now.'); }],
    [/(instructor|female|lady|woman|language|urdu|arabic|punjabi)/, function () { botSay('Tell us your preference (for example a female instructor or a language) in the booking notes and we\'ll do our best to match you.', bookBtn()); }],
    [/(cancel|reschedul|refund|change.*lesson)/, function () { botSay('For changes to an existing lesson, please message us or your instructor directly — a real person will help.', waBtn('Hi DriveSQ! I need to change a lesson.') + '<a href="tel:' + TEL + '">Call ' + TEL_H + '</a>'); }],
    [/(book|start|sign up|join|begin|lesson)/, function () { botSay('Great — booking takes about 60 seconds: gearbox → postcode → name &amp; mobile. A real person then replies, usually within the hour.', bookBtn('📅 Start booking')); }],
    [/(human|person|call|phone|speak|talk|whatsapp|contact|number)/, function () { botSay('Of course — you can reach a real person straight away:', waBtn() + '<a href="tel:' + TEL + '">📞 ' + TEL_H + '</a>' + bookBtn('Or book online')); }]
  ];
  function pcIn(t) { var m = String(t).toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/); return m ? m[1] + ' ' + m[2] : null; }
  function answer(t) {
    var q = String(t).toLowerCase(), pc = pcIn(t);
    if (pc && window.DSQCover) {
      return DSQCover.lookup(pc).then(function (r) {
        if (r && r.ok) botSay(DSQCover.message(r), '<button type="button" class="p" data-sqx="bookpc" data-pc="' + esc(pc) + '">📅 Book for ' + esc(pc) + '</button>');
        else botSay('I can\'t confirm <b>' + esc(pc) + '</b> automatically — send a request and we\'ll check which instructor covers it.', '<button type="button" class="p" data-sqx="bookpc" data-pc="' + esc(pc) + '">Send a request</button>' + waBtn('Hi DriveSQ! Do you cover ' + pc + '?'));
      });
    }
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i][0].test(q)) return INTENTS[i][1]();
    botSay('Good question — I don\'t want to guess. A real person can answer that on WhatsApp, usually within the hour.', waBtn('Hi DriveSQ! ' + t) + bookBtn());
  }
  function goBook(pc) {
    close();
    if (window.DSQCover && (window.DSQBookCard || document.querySelector('#dsqInlineBookForm'))) return DSQCover.goBook(pc || '');
    var c = document.querySelector('[data-dsqx-bc], .dsq-bc, #booking, #book'); if (c) return c.scrollIntoView({ behavior: 'smooth', block: 'start' });
    location.href = '/#book';
  }
  function open() {
    if (!box) build(); box.classList.add('open'); launcher.style.display = 'none';
    if (!opened) { opened = true; botSay('Hi! 👋 I\'m the <b>SQ Assistant</b>. I can answer questions about prices, areas, lessons and tests' + (SOL ? ' in Solihull' : '') + ' — or get you booked in 60 seconds.', bookBtn()); }
    setTimeout(function () { if (window.innerWidth > 767) input.focus(); }, 250);
    try { if (window.gtag) gtag('event', 'sq_assistant_open'); } catch (e) {}
  }
  function close() { if (box) box.classList.remove('open'); launcher.style.display = ''; }
  function build() {
    box = document.createElement('div'); box.className = 'sqx'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'SQ Assistant');
    box.innerHTML = '<div class="sqx__h"><i>SQ</i><div><b>SQ Assistant</b><small>Instant answers · a real person replies to bookings</small></div><button type="button" class="sqx__x" aria-label="Close">×</button></div>' +
      '<div class="sqx__b" aria-live="polite"></div>' +
      '<div class="sqx__chips">' + ['💷 Prices', '📍 Do you cover my area?', '📱 Student Portal', '⚙️ Manual or automatic?', '⚡ Intensive courses', '🗓️ Test waiting times', '📚 Theory test', '🙋 Talk to a person'].map(function (c) { return '<button type="button">' + c + '</button>'; }).join('') + '</div>' +
      '<form class="sqx__f"><input type="text" maxlength="200" placeholder="Ask a question or type your postcode…" aria-label="Your question"><button type="submit" aria-label="Send">➤</button></form>' +
      '<div class="sqx__note">Automated answers from DriveSQ\'s published prices and official DVSA data. Nothing you type is sent unless you tap WhatsApp.</div>';
    document.body.appendChild(box);
    body = box.querySelector('.sqx__b'); input = box.querySelector('input');
    box.querySelector('.sqx__x').addEventListener('click', close);
    box.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var v = input.value.trim(); if (!v) return; say(esc(v), '', true); input.value = ''; answer(v); });
    box.querySelector('.sqx__chips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var v = b.textContent.replace(/^\S+\s/, ''); say(esc(v), '', true); answer(v); });
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-sqx]'); if (!b) return; var k = b.getAttribute('data-sqx'); if (k === 'book') goBook(); if (k === 'bookpc') goBook(b.getAttribute('data-pc')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  var launcher = document.createElement('button');
  launcher.type = 'button'; launcher.className = 'sqx-l'; launcher.setAttribute('aria-label', 'Open SQ Assistant');
  launcher.innerHTML = '<i>SQ</i><span class="dot"></span>Ask SQ';
  launcher.addEventListener('click', open);

  function hasOwnAssistant() { return !!document.querySelector('.sqa-launch') || [].some.call(document.scripts, function (x) { return !x.src && x.text.indexOf('sqa-launch') > -1; }); }
  function init() {
    if (!hasOwnAssistant()) document.body.appendChild(launcher);   // index + Solihull pages already have the full SQ Assistant
    findCards(); setTimeout(findCards, 800); setTimeout(findCards, 2500);
    if (window.MutationObserver) { var tm = 0, mo = new MutationObserver(function () { if (!tm) tm = setTimeout(function () { tm = 0; findCards(); }, 150); }); mo.observe(document.body, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect(); }, 20000); }
    window.DSQAssist = { open: open, close: close, ask: function (t) { open(); say(esc(t), '', true); answer(t); } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
