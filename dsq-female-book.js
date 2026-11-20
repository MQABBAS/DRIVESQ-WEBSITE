/* DriveSQ — advanced booking form for the female driving instructor pages.
 * Mount:  <div id="dsqFemBook" data-area="Longsight" data-postcodes="M12|M13"></div>
 * Three short steps: about you → your lessons (incl. instructor preference) → where & when → done.
 * Sends through window.DSQBooking.send (booking-capture.js), so every booking reaches Admin → Website Bookings
 * (with the area, the postcode districts and the instructor preference in the notes), the DriveSQ email and the admin push.
 * The email address is required. */
(function () {
  'use strict';
  var root = document.getElementById('dsqFemBook');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  var AREA = root.getAttribute('data-area') || 'Manchester';
  var PCS = (root.getAttribute('data-postcodes') || '').split('|').filter(Boolean);
  var WA = '447352932003';
  var st = { step: 1, gear: '', pref: 'Female instructor', done: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function phoneOk(v) { var d = clean(v).replace(/\D/g, ''); if (d.indexOf('44') === 0) d = '0' + d.slice(2); return /^0\d{9,10}$/.test(d); }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(v)); }

  var css = '#dsqFemBook{--r:#D10A11;font-family:Inter,system-ui,Arial,sans-serif;color:#f3eeee;background:linear-gradient(160deg,#1c0a0f,#0b0204);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px 16px;margin:12px 0 18px;max-width:640px}' +
    '#dsqFemBook *{box-sizing:border-box}#dsqFemBook h3{font-family:"Barlow Condensed",sans-serif;font-size:1.5rem;text-transform:uppercase;margin:0 0 4px;color:#fff}' +
    '#dsqFemBook .sub{font-size:.84rem;opacity:.8;margin:0 0 12px}#dsqFemBook .bar{display:flex;gap:6px;margin:0 0 14px}#dsqFemBook .bar i{flex:1;height:5px;border-radius:9px;background:rgba(255,255,255,.14)}#dsqFemBook .bar i.on{background:var(--r)}' +
    '#dsqFemBook label{display:block;font-size:.76rem;font-weight:600;margin:10px 0 4px;opacity:.9}#dsqFemBook input[type=text],#dsqFemBook input[type=tel],#dsqFemBook input[type=email],#dsqFemBook input[type=date],#dsqFemBook select,#dsqFemBook textarea{width:100%;font:inherit;font-size:16px;color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:11px 12px;outline:0}' +
    '#dsqFemBook select option{background:#1b0c0e}#dsqFemBook input:focus,#dsqFemBook select:focus,#dsqFemBook textarea:focus{border-color:var(--r)}' +
    '#dsqFemBook .picks{display:grid;grid-template-columns:1fr 1fr;gap:8px}#dsqFemBook .pick{border:1.5px solid rgba(255,255,255,.18);border-radius:12px;padding:12px 10px;text-align:center;cursor:pointer;font-weight:700;background:rgba(255,255,255,.04)}#dsqFemBook .pick.on{border-color:var(--r);background:rgba(209,10,17,.18)}' +
    '#dsqFemBook .chips{display:flex;flex-wrap:wrap;gap:7px}#dsqFemBook .chip{border:1px solid rgba(255,255,255,.2);border-radius:99px;padding:7px 12px;font-size:.82rem;cursor:pointer;background:rgba(255,255,255,.04)}#dsqFemBook .chip.on{background:var(--r);border-color:var(--r);color:#fff}' +
    '#dsqFemBook .btns{display:flex;gap:10px;margin-top:16px}#dsqFemBook button{font:inherit;cursor:pointer;border:0;border-radius:99px;padding:12px 20px;font-weight:700}' +
    '#dsqFemBook .go{background:var(--r);color:#fff;flex:1}#dsqFemBook .back{background:rgba(255,255,255,.1);color:#fff}#dsqFemBook .err{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.4);color:#fca5a5;border-radius:10px;padding:9px 12px;font-size:.84rem;margin-top:10px}' +
    '#dsqFemBook .perk{background:rgba(245,197,24,.1);border:1px solid rgba(245,197,24,.35);border-radius:12px;padding:10px 12px;font-size:.84rem;margin:0 0 12px}#dsqFemBook .ok{font-size:.92rem;line-height:1.6}#dsqFemBook .ok a{color:#fff}#dsqFemBook .small{font-size:.72rem;opacity:.7;margin-top:8px}#dsqFemBook .consent{display:flex;gap:8px;align-items:flex-start;font-weight:400;font-size:.78rem;margin-top:12px}#dsqFemBook .consent input{margin-top:3px}' +
    '#dsqFemBook .note{font-size:.76rem;opacity:.8;margin-top:6px}';
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);

  function bar() { var h = ''; for (var i = 1; i <= 3; i++) h += '<i class="' + (i <= st.step ? 'on' : '') + '"></i>'; return '<div class="bar">' + h + '</div>'; }
  function opts(list, val, ph) { return '<option value="">' + esc(ph) + '</option>' + list.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); }
  function v(n) { var el = root.querySelector('[name="' + n + '"]'); return el ? clean(el.value) : ''; }
  var keep = {};
  function stash() { ['name', 'phone', 'email', 'exp', 'start', 'testdate', 'pc', 'notes'].forEach(function (n) { var el = root.querySelector('[name="' + n + '"]'); if (el) keep[n] = el.value; }); keep.times = [].map.call(root.querySelectorAll('.chip.on[data-t]'), function (c) { return c.getAttribute('data-t'); }); }
  function kv(n) { return esc(keep[n] || ''); }
  function head(t, sub) { return bar() + '<h3>' + t + '</h3><p class="sub">' + sub + '</p>'; }
  var PERK = '<div class="perk"><strong>' + esc(AREA) + ' learners:</strong> lessons from £35 an hour, manual or automatic at the same price. New learners get their first 10 hours for £330, paid in advance, plus the <strong>free DriveSQ Student Portal</strong> (700+ theory questions, 14 mock tests).</div>';

  function render(err) {
    var h = '';
    if (st.step === 1) {
      h = head('Book a female instructor in ' + esc(AREA), 'Takes about a minute. We match you with a female instructor near your pick-up point, subject to availability.') + PERK +
        '<label>Full name</label><input type="text" name="name" autocomplete="name" value="' + kv('name') + '">' +
        '<label>Mobile</label><input type="tel" name="phone" autocomplete="tel" value="' + kv('phone') + '">' +
        '<label>Email (your booking confirmation goes here)</label><input type="email" name="email" autocomplete="email" value="' + kv('email') + '">' +
        '<div class="btns"><button type="button" class="go" data-go="2">Next: your lessons</button></div>';
    } else if (st.step === 2) {
      h = head('Your lessons', 'Manual and automatic cost the same at DriveSQ.') +
        '<label>Manual or automatic?</label><div class="picks"><div class="pick' + (st.gear === 'Manual' ? ' on' : '') + '" data-gear="Manual">Manual</div><div class="pick' + (st.gear === 'Automatic' ? ' on' : '') + '" data-gear="Automatic">Automatic</div></div>' +
        '<label>Your instructor</label><div class="chips"><span class="chip' + (st.pref === 'Female instructor' ? ' on' : '') + '" data-pref="Female instructor">Female instructor</span><span class="chip' + (st.pref === 'Female preferred' ? ' on' : '') + '" data-pref="Female preferred">Female preferred, any is fine</span></div>' +
        '<div class="note">We always try to match a female instructor first. If none is free near you, we tell you before booking anything.</div>' +
        '<label>Your driving so far</label><select name="exp">' + opts(['Complete beginner', 'Had some lessons', 'Test already booked', 'Failed a test, want to retake', 'Passed, want a refresher or Pass Plus', 'Nervous driver, want a gentle start'], keep.exp, 'Choose one') + '</select>' +
        '<div id="tdw" style="display:' + (keep.exp === 'Test already booked' ? 'block' : 'none') + '"><label>Test date</label><input type="date" name="testdate" value="' + kv('testdate') + '"></div>' +
        '<label>When do you want to start?</label><select name="start">' + opts(['As soon as possible', 'Within 2 weeks', 'Within a month', 'In a few months', 'Just looking for now'], keep.start, 'Choose one') + '</select>' +
        '<div class="btns"><button type="button" class="back" data-go="1">Back</button><button type="button" class="go" data-go="3">Next: where and when</button></div>';
    } else if (st.step === 3) {
      var T = ['Weekday mornings', 'Weekday afternoons', 'Evenings', 'Weekends', 'Flexible'];
      h = head('Where and when', 'We pick you up where it suits you: home, work, college or university.') +
        '<label>Pick-up postcode (full postcode)</label><input type="text" name="pc" autocomplete="postal-code" maxlength="8" placeholder="e.g. ' + esc((PCS[0] || 'M14') + ' 6HR') + '" style="text-transform:uppercase" value="' + kv('pc') + '">' +
        '<div class="note">' + esc(AREA) + ' is covered by ' + esc(PCS.join(', ')) + '. We cover nearby postcodes too.</div>' +
        '<label>When are you free?</label><div class="chips">' + T.map(function (t) { return '<span class="chip' + ((keep.times || []).indexOf(t) > -1 ? ' on' : '') + '" data-t="' + t + '">' + t + '</span>'; }).join('') + '</div>' +
        '<label>Anything we should know? (nerves, access needs, shifts, school run times)</label><textarea name="notes" rows="3">' + kv('notes') + '</textarea>' +
        '<label class="consent"><input type="checkbox" name="ok"> <span>I agree DriveSQ may contact me about my lessons. Your details go to the DriveSQ team and your instructor, and aren\'t sold. <a href="/privacy.html" style="color:#fff">Privacy</a></span></label>' +
        '<div class="btns"><button type="button" class="back" data-go="2">Back</button><button type="button" class="go" data-send="1">Send my booking request</button></div>';
    } else {
      h = st.done;
    }
    if (err) h += '<div class="err" role="alert">' + err + '</div>';
    root.innerHTML = h;
  }

  function validate(n) {
    if (n === 1) {
      if (!/[A-Za-z].*[A-Za-z]/.test(v('name'))) return 'Please enter your name.';
      if (!phoneOk(v('phone'))) return "That mobile number doesn't look right. Please check it.";
      if (!emailOk(v('email'))) return 'Please enter a valid email. We send your booking confirmation there.';
    }
    if (n === 2) {
      if (!st.gear) return 'Please choose manual or automatic.';
      if (!v('exp')) return 'Please tell us about your driving so far.';
      if (!v('start')) return 'Please choose when you want to start.';
    }
    if (n === 3) {
      if (!/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(v('pc').replace(/\s+/g, ' '))) return 'Please enter your full pick-up postcode, e.g. ' + (PCS[0] || 'M14') + ' 6HR.';
      var ok = root.querySelector('[name="ok"]'); if (!ok || !ok.checked) return 'Please tick the box so we can contact you about your lessons.';
    }
    return '';
  }

  function DSQ_pc(raw) { return (window.DSQBooking && window.DSQBooking.fullPostcode) ? window.DSQBooking.fullPostcode(raw) : clean(raw).toUpperCase(); }

  function submit() {
    stash();
    var pc = DSQ_pc(v('pc')), times = (keep.times || []).join(', ');
    var td = ''; if (keep.exp === 'Test already booked' && keep.testdate) { var dd = new Date(keep.testdate + 'T12:00:00'); td = isNaN(dd) ? '' : dd.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
    var d = {
      formName: 'Female instructor booking form (' + AREA + ')', page: 'Female driving instructors ' + AREA, name: keep.name, phone: keep.phone, email: clean(keep.email),
      service: st.gear + ' Lessons', gearbox: st.gear, experience: keep.exp, start: keep.start, testDate: td, times: times, pickup: 'Home or pick-up postcode', postcode: pc,
      notes: ['👩 ' + st.pref.toUpperCase() + ' REQUESTED', 'Area page: ' + AREA + ' (' + PCS.join(', ') + ')', 'Offer: first 10 hours £330', clean(keep.notes)].filter(Boolean).join(' | '),
      ref: 'DSQ-' + Date.now().toString(36).slice(-5).toUpperCase()
    };
    var btn = root.querySelector('[data-send]'); if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    var done = function (ok) {
      if (!ok) { render('Sorry, that did not send. Please <a href="https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi DriveSQ! I'd like to book lessons with a female instructor in " + AREA + '.') + '" style="color:#fff">message us on WhatsApp</a> and we will sort it.'); return; }
      var wa = 'https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi DriveSQ! I've just sent a booking request for a female instructor.\nRef: " + d.ref + '\nName: ' + d.name + '\nPostcode: ' + d.postcode + '\nLessons: ' + d.service);
      st.step = 4;
      st.done = '<div class="ok"><h3>Booking request sent ✅</h3><p><strong>Your reference is ' + esc(d.ref) + '.</strong> We will call or text you on ' + esc(d.phone) + ' to match you with ' + (st.pref === 'Female instructor' ? 'a female instructor' : 'an instructor, female if one is available,') + ' near ' + esc(d.postcode) + ', and email your confirmation to ' + esc(d.email) + '.</p>' +
        '<p><strong>Your free Student Portal:</strong> practise 700+ theory questions and take mock tests while you wait. <a href="/drivesq-student-portal.html">See what is inside</a>.</p>' +
        '<p><a href="' + wa + '" target="_blank" rel="noopener" style="display:inline-block;background:#25D366;color:#06210f;border-radius:99px;padding:10px 16px;font-weight:700;text-decoration:none">Message us on WhatsApp</a></p><p class="small">Please quote ' + esc(d.ref) + ' if you contact us.</p></div>';
      keep = {}; render();
      try { root.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { }
    };
    if (window.DSQBooking && window.DSQBooking.send) window.DSQBooking.send(d).then(done, function () { done(false); });
    else done(false);
  }

  root.addEventListener('click', function (e) {
    var t = e.target;
    var g = t.closest('[data-go]'), sd = t.closest('[data-send]'), gear = t.closest('[data-gear]'), pf = t.closest('[data-pref]'), ch = t.closest('.chip[data-t]');
    if (gear) { stash(); st.gear = gear.getAttribute('data-gear'); render(); return; }
    if (pf) { stash(); st.pref = pf.getAttribute('data-pref'); render(); return; }
    if (ch) { ch.classList.toggle('on'); return; }
    if (g) {
      var to = +g.getAttribute('data-go'), from = st.step;
      if (to > from) { var er = validate(from); if (er) { stash(); render(er); return; } }
      stash(); st.step = to; render();
    } else if (sd) { var er3 = validate(3); if (er3) { stash(); render(er3); return; } submit(); }
  });
  root.addEventListener('change', function (e) { if (e.target.name === 'exp') { var w = document.getElementById('tdw'); if (w) w.style.display = e.target.value === 'Test already booked' ? 'block' : 'none'; } });
  render();
})();
