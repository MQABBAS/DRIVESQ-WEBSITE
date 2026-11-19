/* DriveSQ weekly guides for students (Student Portal).
   A new guide each Monday (12 in rotation), shown on the Home screen with a "New" tag until it is opened.
   Facts come from the Highway Code and the DVSA / GOV.UK driving test information; each guide names its source.
   Use:  DSQGuides.mount('#homeGuideCard')   DSQGuides.openAll() */
(function () {
  'use strict';
  var G = [
    { e: '🪑', t: 'Your cockpit drill', goal: 'Get set up safely every time, before the engine starts.',
      b: ['**D-S-S-S-M:** Doors closed, Seat comfortable, Steering wheel adjusted, Seat belt on, Mirrors set. Do it in the same order every lesson until it is automatic.',
        'Sit so you can fully press the pedals and see clearly over the bonnet.',
        'Know where the controls are without looking: lights, wipers, indicators, horn, demister.',
        'Nervous at the start? Ask your instructor to talk you through it slowly. Everyone does.'],
      tryit: 'Say your cockpit drill out loud at the start of your next lesson.', src: 'DVSA driving test: "Showing the examiner you are prepared" (GOV.UK)' },
    { e: '👀', t: 'Mirrors – Signal – Manoeuvre', goal: 'Look first, signal second, then move.',
      b: ['**Mirrors:** check them before you signal, slow down or change direction.',
        '**Signal:** in good time so others can react, and cancel it afterwards.',
        '**Manoeuvre:** position, speed, look, then go (watch for blind spots).',
        'Check your **blind spot** over your shoulder before moving off and before changing lanes.',
        'A signal does not give you priority. It only tells others what you plan to do.'],
      tryit: 'On your next drive, say "mirror, signal" quietly before every turn.', src: 'The Highway Code and DVSA driving test guidance (GOV.UK)' },
    { e: '🔄', t: 'Junctions and roundabouts', goal: 'Choose the right lane early and give way correctly.',
      b: ['At a roundabout in the UK, give priority to traffic approaching from your **right** unless signs or road markings tell you otherwise.',
        'Signal **left** after the exit before the one you want, and check mirrors before you signal.',
        'Pick your lane early: left lane to turn left or go straight on, right lane to turn right.',
        'Look for cyclists, motorcyclists and pedestrians, especially at mini-roundabouts.',
        'If you are not sure it is clear, wait. A short wait is always better than rushing.'],
      tryit: 'Ask your instructor to explain lane choice at three different roundabouts in your area.', src: 'The Highway Code, rules 184–190 (GOV.UK)' },
    { e: '📏', t: 'Speed and stopping distances', goal: 'Know the limits and leave enough room to stop.',
      b: ['The typical overall stopping distance at **30 mph is 23 metres**, at **40 mph 36 metres**, at **50 mph 53 metres** and at **60 mph 73 metres** (thinking plus braking distance).',
        'In built-up areas with street lights the limit is **30 mph** unless signs show otherwise.',
        'For cars the national speed limit is **60 mph** on single carriageways and **70 mph** on dual carriageways and motorways.',
        'Use the **two-second rule** on dry roads and leave at least double the gap in the wet.',
        'The limit is a limit, not a target. Drive at a speed that suits the road, traffic and weather.'],
      tryit: 'Pick a stationary object ahead and count the gap to the car in front: "only a fool breaks the two-second rule".', src: 'The Highway Code, rules 124–126 (GOV.UK)' },
    { e: '🅿️', t: 'Parking and manoeuvres', goal: 'Slow, steady, observant.',
      b: ['On the practical test you will be asked to do **one** of: parallel park, park in a bay (reversing or driving in), or pull up on the right and reverse for two car lengths.',
        'Go **slowly**. Clutch (or brake, in an automatic) control is more important than speed.',
        'Look all round before you start and again as you move. Stop and wait if anyone approaches.',
        'Use reference points your instructor teaches you, and ask to practise your weakest one first.',
        'Do not worry about perfect: the examiner is looking for safe, controlled and observant.'],
      tryit: 'Choose your weakest manoeuvre and practise it three times in a quiet street this week.', src: 'DVSA practical driving test: reversing manoeuvres (GOV.UK)' },
    { e: '🔧', t: 'Show me, tell me questions', goal: 'Two easy marks if you have practised.',
      b: ['On the test you are asked **two** vehicle safety questions: one "tell me" at the start and one "show me" while you drive.',
        'Learn how to check things like tyre tread depth (legal minimum **1.6 mm** across the central three-quarters of the tyre), oil and coolant levels, and the brake lights.',
        'Practise finding the controls for the demister, lights and horn without taking your eyes off the road for long.',
        'One wrong answer is a driver fault (a minor); getting both wrong is a serious fault. So it is worth learning them, but one slip is not a fail.',
        'Your instructor has the full list. Ask to go through it in the car.'],
      tryit: 'Ask your instructor to quiz you on three questions at the start of your next lesson.', src: 'DVSA: "Show me, tell me" vehicle safety questions (GOV.UK)' },
    { e: '📝', t: 'The practical test: what to expect', goal: 'Walk in knowing exactly what happens.',
      b: ['Bring your **photocard driving licence**. You may be asked to read a number plate from **20 metres** (with glasses or contact lenses if you wear them). If you cannot, the test does not go ahead.',
        'The test lasts about **40 minutes** and includes around **20 minutes of independent driving** (following signs or sat nav directions).',
        'You can pass with **up to 15 driver faults** (minors). **16 or more**, or any serious or dangerous fault, is a fail.',
        'Nerves are normal. If you make a mistake, carry on: the examiner marks the whole drive, not one moment.',
        'Arrive early, wear comfortable shoes, and ask your instructor to do a mock test on local roads.'],
      tryit: 'Ask your instructor for a full mock test, with a score sheet, two weeks before your test.', src: 'GOV.UK: "What happens during the driving test"' },
    { e: '🧠', t: 'Theory test and hazard perception', goal: 'Pass the theory test first time.',
      b: ['The theory test has **50 multiple-choice questions**. You need **43 or more** to pass.',
        'Then comes **hazard perception**: **14 video clips**, with a pass mark of **44 out of 75**.',
        'Your theory test pass is valid for **2 years**. You must pass your practical test within that time.',
        'Do a few short practice sessions each day rather than one long one.',
        'Use the **mock tests and topic practice** in your portal, and ask your instructor about any question you get wrong.'],
      tryit: 'Do one mock test in your portal this week and note the topics you got wrong.', src: 'GOV.UK: "Theory test: cars"' },
    { e: '🌧️', t: 'Weather and visibility', goal: 'Adapt your driving to the conditions.',
      b: ['In the wet, stopping distances are **at least double** those in the dry. On ice and snow they can be **up to ten times** longer.',
        'Use **dipped headlights** when visibility is seriously reduced (generally when you cannot see for more than 100 metres).',
        'Use fog lights only in seriously reduced visibility, and switch them off when it improves.',
        'Demist and clear all windows **before** you set off, not while moving.',
        'Slow down earlier, brake gently and keep your steering smooth. Do not be afraid to ask to reschedule if conditions are unsafe.'],
      tryit: 'Next rainy lesson, ask your instructor to point out how the road surface changes your braking.', src: 'The Highway Code, rules 226–228 and 236 (GOV.UK)' },
    { e: '🛣️', t: 'Dual carriageways and faster roads', goal: 'Stay calm and keep your space.',
      b: ['Keep **left** unless you are overtaking, and move back when it is safe.',
        'Join slowly from the slip road, matching the speed of traffic and looking for a safe gap.',
        'Leave a bigger gap in front at higher speeds. Cars take longer to stop.',
        'Check mirrors more often: faster roads change quickly.',
        'Learner drivers may have lessons on motorways **only** with an approved driving instructor in a car with dual controls.'],
      tryit: 'Ask your instructor to take you on a dual carriageway and talk through lane discipline.', src: 'The Highway Code (GOV.UK); GOV.UK: "Motorway driving lessons"' },
    { e: '⛰️', t: 'Moving off, hills and control', goal: 'Smooth control makes everything else easier.',
      b: ['**Manual:** find the biting point calmly, then release the handbrake only when you are ready to move.',
        '**Automatic:** use gentle pressure on the accelerator and the brake. Always use the brake to hold on a slope.',
        'On a hill, take extra time: observe, signal, then move off smoothly.',
        'Never rush a junction because someone is waiting behind you.',
        'If you pass your test in an automatic car, your licence only lets you drive automatics.'],
      tryit: 'Practise five hill starts in a quiet road with your instructor.', src: 'DVSA driving test syllabus: vehicle control (GOV.UK)' },
    { e: '🧘', t: 'Staying calm and building confidence', goal: 'Confidence comes from small steps.',
      b: ['Sleep well and eat before lessons. Tiredness slows reactions.',
        'Tell your instructor when something feels hard. They plan the next lesson around it.',
        'Break big skills into steps and celebrate small wins.',
        'Breathe out slowly before you move off. It really helps.',
        'A mistake is information, not failure: ask "what would I do differently?"'],
      tryit: 'At the end of your next lesson, tell your instructor one thing that went well and one thing to work on.', src: 'DVSA: "Learning to drive: coaching" (GOV.UK)' },
    { e: '👨‍👩‍👧', t: 'Practising with family or friends', goal: 'Extra practice, done legally and safely.',
      b: ['A supervising person must be **at least 21** and have held a full licence for the same type of vehicle for **at least 3 years**.',
        'The car needs **L plates** on the front and back, a valid MOT, tax, and insurance that covers a learner.',
        'Tell your instructor what you practised so lessons build on it.',
        'Practise the skills you have already learned with your instructor, not new ones.',
        'No phone use for the supervisor or you while driving.'],
      tryit: 'Plan one 30-minute practice a week on roads you already know well.', src: 'GOV.UK: "Driving lessons and practice"' }
  ];
  var $ = function (s) { return document.querySelector(s); };
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  var md = function (t) { return E(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); };
  function monday(d) { d = d ? new Date(d) : new Date(); d.setHours(12, 0, 0, 0); var back = (d.getDay() + 6) % 7; d.setDate(d.getDate() - back); return d; }
  function weekIndex(d) { return Math.floor(monday(d).getTime() / (7 * 864e5)); }
  function current() { return G[weekIndex() % G.length]; }
  function key(g) { return 'dsq_guide_read_' + G.indexOf(g); }
  var CSS = '@keyframes dgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.dg-card{background:linear-gradient(135deg,rgba(245,197,24,.13),rgba(209,10,17,.09));border:1px solid rgba(245,197,24,.35);border-radius:18px;padding:15px 16px;margin-bottom:12px;animation:dgIn .4s both}' +
    '.dg-top{display:flex;gap:12px;align-items:center}.dg-e{font-size:1.8rem;width:48px;height:48px;border-radius:14px;background:rgba(128,128,128,.14);display:grid;place-items:center;flex:0 0 auto}.dg-k{font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--txt2,#aaa);font-weight:700}' +
    '.dg-t{font-family:Oswald,sans-serif;font-size:1.08rem;font-weight:700;color:var(--txt,#fff);line-height:1.2}.dg-new{display:inline-block;background:#d10a11;color:#fff;font-size:.58rem;font-weight:800;letter-spacing:.06em;padding:1px 7px;border-radius:99px;margin-left:6px;vertical-align:middle}' +
    '.dg-goal{font-size:.8rem;color:var(--txt2,#aaa);margin:10px 0 4px}.dg-ul{margin:6px 0 0;padding:0;list-style:none}.dg-ul li{display:flex;gap:8px;padding:5px 0;font-size:.82rem;line-height:1.5;color:var(--txt,#fff)}.dg-ul li:before{content:"✓";color:#22c55e;font-weight:800}' +
    '.dg-try{margin-top:10px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.35);border-radius:12px;padding:9px 12px;font-size:.78rem;color:var(--txt,#fff);line-height:1.45}.dg-src{font-size:.66rem;color:var(--txt3,#777);margin-top:8px}' +
    '.dg-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.dg-btn{border:1px solid var(--bdr,#2a2a32);background:rgba(128,128,128,.14);color:var(--txt,#fff);border-radius:11px;padding:9px 13px;font-size:.78rem;font-weight:700;cursor:pointer}.dg-btn.p{background:#d10a11;border-color:#d10a11;color:#fff}' +
    '.dg-ov{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center}.dg-sh{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:var(--card-bg,var(--dk2,#16161b));color:var(--txt,#fff);border-radius:22px 22px 0 0;padding:16px 16px 24px;border:1px solid var(--bdr,#2a2a32);animation:dgIn .25s both}' +
    '@media(min-width:600px){.dg-ov{align-items:center}.dg-sh{border-radius:22px}}.dg-row{border:1px solid var(--bdr,#2a2a32);border-radius:14px;margin-top:8px;overflow:hidden}.dg-row>button{width:100%;display:flex;gap:10px;align-items:center;background:none;border:0;color:var(--txt,#fff);padding:11px 12px;cursor:pointer;text-align:left;font-size:.86rem;font-weight:700}.dg-row .dg-body{padding:0 14px 14px;display:none}.dg-row.open .dg-body{display:block}.dg-row.cur{border-color:#f5c518}';
  function css() { if ($('#dgCss')) return; var s = document.createElement('style'); s.id = 'dgCss'; s.textContent = CSS; document.head.appendChild(s); }
  function inner(g) {
    return '<div class="dg-goal"><b>This week\'s goal:</b> ' + E(g.goal) + '</div><ul class="dg-ul">' + g.b.map(function (x) { return '<li><span>' + md(x) + '</span></li>'; }).join('') + '</ul><div class="dg-try">🎯 <b>Try this:</b> ' + E(g.tryit) + '</div><div class="dg-src">Source: ' + E(g.src) + '</div>';
  }
  function mount(sel) {
    css(); var el = typeof sel === 'string' ? $(sel) : sel; if (!el) return; var g = current(), unread = LS.get(key(g)) !== '1', wk = monday().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    el.innerHTML = '<div class="dg-card"><div class="dg-top"><div class="dg-e">' + g.e + '</div><div style="min-width:0"><div class="dg-k">Weekly guide · week of ' + E(wk) + (unread ? '<span class="dg-new">NEW</span>' : '') + '</div><div class="dg-t">' + E(g.t) + '</div></div></div>' + inner(g) +
      '<div class="dg-btns"><button class="dg-btn p" data-g="read">👍 Got it</button><button class="dg-btn" data-g="all">📚 All weekly guides</button><button class="dg-btn" data-g="ask">💬 Ask my instructor</button></div></div>';
    el.onclick = function (e) { var b = e.target.closest('[data-g]'); if (!b) return; var k = b.getAttribute('data-g');
      if (k === 'read') { LS.set(key(g), '1'); try { if (window.DSQBlock && DSQBlock.sound) DSQBlock.sound('ok'); } catch (x) { } mount(el); }
      else if (k === 'all') openAll();
      else if (k === 'ask') { try { LS.set(key(g), '1'); if (window.switchTab) { window.switchTab('messages'); } } catch (x) { } } };
  }
  function openAll() {
    css(); var cur = current(), ov = document.createElement('div'); ov.className = 'dg-ov';
    ov.innerHTML = '<div class="dg-sh"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:Oswald,sans-serif;font-size:1.15rem;font-weight:700">📚 Weekly guides</div><button class="dg-btn" data-g="x">✕</button></div><div style="font-size:.78rem;color:var(--txt2,#aaa);margin-top:4px">A new guide arrives every Monday. All ' + G.length + ' stay here so you can read them any time.</div>' +
      G.map(function (g, i) { return '<div class="dg-row' + (g === cur ? ' cur open' : '') + '"><button data-g="t">' + '<span style="font-size:1.3rem">' + g.e + '</span><span style="flex:1">' + E(g.t) + (g === cur ? '<span class="dg-new">THIS WEEK</span>' : '') + '</span><span style="color:var(--txt3,#777)">' + (LS.get('dsq_guide_read_' + i) === '1' ? '✓' : '') + '</span></button><div class="dg-body">' + inner(g) + '</div></div>'; }).join('') + '</div>';
    ov.onclick = function (e) { if (e.target === ov) return ov.remove(); var b = e.target.closest('[data-g]'); if (!b) return; var k = b.getAttribute('data-g'); if (k === 'x') ov.remove(); else if (k === 't') b.parentNode.classList.toggle('open'); };
    document.body.appendChild(ov);
  }
  window.DSQGuides = { mount: mount, openAll: openAll, current: current, all: G };
})();
