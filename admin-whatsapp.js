/* DriveSQ WhatsApp Business (Meta Cloud API) — admin side.
   - One master switch: "Send WhatsApp messages automatically" (ON / OFF), plus separate switches for the instructor and the student message.
     OFF = admin behaves exactly as before (you tap the WhatsApp buttons yourself). Saved in growth_settings key "whatsapp_cfg".
   - When ON, pressing Assign in Find & Assign sends the instructor the student's details (with Accept / Can't take buttons)
     and the student their welcome, through the Supabase function "whatsapp". The secret token never reaches this page.
   - Settings window: connection status, setup steps, template texts to paste into Meta, test message, recent messages. */
(function () {
  'use strict';
  var DEFAULTS = { enabled: false, instructor: true, student: true };
  var CFG = Object.assign({}, DEFAULTS), loaded = false, ST = null, stAt = 0;
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m, t, ms) { try { window.showToast(m, t || '', ms); } catch (e) { } };
  var SBc = function () { return window.DSQ_ADMIN && DSQ_ADMIN.sb && DSQ_ADMIN.sb(); };
  var key = function () { try { var v = localStorage.getItem('dsqm_key'); return v ? JSON.parse(v) : ''; } catch (e) { return ''; } };
  var FN = function () { return SB_URL + '/functions/v1/whatsapp'; };

  /* ---------- templates (submit these in Meta → WhatsApp Manager → Message templates; category UTILITY, language English (UK)) ---------- */
  var TPL = {
    dsq_new_student: { who: 'Instructor', buttons: ['Accept', "Can't take"], params: ['Instructor first name', 'Student name', 'Student phone', 'Postcode', 'Lesson type', 'Other details'],
      body: 'Hi {{1}}, DriveSQ has assigned you a new student. 🚗\n\n*Student details*\nName: {{2}}\nPhone: {{3}}\nPostcode: {{4}}\nLessons: {{5}}\nDetails: {{6}}\n\n*What to do next*\n1. Contact the student within 24 hours to arrange the first lesson.\n2. Check their provisional licence and eyesight at lesson one.\n3. Update their status in your Instructor Portal: booked, not booked yet, can\'t reach or not going ahead.\n\nYour Instructor Portal: https://www.drivesq.co.uk/dashboard\n\nTap Accept if you can take them, or Can\'t take if you can\'t. Thank you!' },
    dsq_student_welcome: { who: 'Student', buttons: [], params: ['Student first name', 'Instructor name', 'Instructor phone'],
      body: 'Hi {{1}}, welcome to DriveSQ! 🚗\n\nYour instructor is *{{2}}* on {{3}}. They will contact you to arrange your first lesson, and you are welcome to message them first to say hello and tell them which days and times suit you.\n\n*Your free Student Portal*\nhttps://www.drivesq.co.uk/student\nLog in with your mobile number. No password needed. You can:\n✅ see your lessons\n📚 practise your theory test\n💬 message your instructor\n📊 track your progress\n\nPlease have your provisional driving licence ready for your first lesson.\n\nIf you have any questions, just reply here.' },
    dsq_student_offer: { who: 'Instructor (offer before assigning)', buttons: ['Accept', "Can't take"], params: ['Instructor first name', 'Area (postcode district)', 'Miles from you', 'Lesson type'],
      body: 'Hi {{1}}, DriveSQ has a new student near {{2}}, about {{3}} miles from you, wanting {{4}} lessons.\n\nCan you take them? Tap Accept or Can\'t take below. If you accept, we will send you their full details and add them to your Instructor Portal: https://www.drivesq.co.uk/dashboard\n\nPlease reply within a few hours so we can find someone else if you can\'t. Thank you!' },
    dsq_admin_alert: { who: 'You (attention required)', buttons: [], params: ['What needs attention', 'Details'],
      body: 'DriveSQ admin: attention needed. {{1}}. Details: {{2}}\n\nPlease open DriveSQ admin to review it.' },
    dsq_chase_unmarked: { who: 'Instructor (chase)', buttons: [], params: ['Instructor first name', 'Number of students'],
      body: 'Hi {{1}}, quick check from DriveSQ. {{2}} of the students we sent you have no update yet.\n\nPlease open your Instructor Portal and mark each one as booked, not booked yet, can\'t reach or not going ahead: https://www.drivesq.co.uk/dashboard\n\nIt only takes a minute and helps us keep your records right. Thank you!' }
  };

  async function load(force) {
    if (loaded && !force) return CFG;
    var got = null;
    try { var r = await SBc().from('growth_settings').select('value').eq('key', 'whatsapp_cfg').maybeSingle(); if (r && r.data && r.data.value) got = r.data.value; } catch (e) { }
    if (!got) { try { got = JSON.parse(localStorage.getItem('dsq_wa_cfg') || 'null'); } catch (e) { } }
    CFG = Object.assign({}, DEFAULTS, got || {}); loaded = true; return CFG;
  }
  async function save() {
    try { localStorage.setItem('dsq_wa_cfg', JSON.stringify(CFG)); } catch (e) { }
    try { var r = await SBc().from('growth_settings').upsert({ key: 'whatsapp_cfg', value: CFG, updated_at: new Date().toISOString() }, { onConflict: 'key' }); if (r.error) throw r.error; return true; }
    catch (e) { toast('Saved on this device only — run the growth tools SQL so the switch is stored for everyone.', 'warn', 6000); return false; }
  }

  async function call(body) {
    var k = key(); if (!k) return { ok: false, error: 'Enter your email admin key first (Email → Settings). WhatsApp uses the same key.' };
    try {
      var r = await fetch(FN(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': k, Authorization: 'Bearer ' + (typeof SB_KEY !== 'undefined' ? SB_KEY : '') }, body: JSON.stringify(body) });
      var j = await r.json().catch(function () { return {}; });
      if (r.status === 404) return { ok: false, error: 'The "whatsapp" function is not deployed yet (Supabase → Edge Functions).' };
      if (r.status === 401) return { ok: false, error: 'Wrong admin key, or Verify JWT is still on for the function.' };
      return j;
    } catch (e) { return { ok: false, error: "Couldn't reach the WhatsApp function: " + (e.message || e) }; }
  }
  async function status(force) {
    if (ST && !force && Date.now() - stAt < 60000) return ST;
    ST = await call({ action: 'status' }); stAt = Date.now(); return ST;
  }
  var ready = function () { return !!(ST && ST.ok && ST.ready && !ST.error); };
  var isOn = function () { return !!(CFG.enabled && ready()); };

  /* ---------- the little button in the top bar ---------- */
  function dot() {
    var b = document.getElementById('waApiBtn'); if (!b) return;
    var on = isOn(), bad = CFG.enabled && !ready();
    b.style.borderColor = on ? 'rgba(37,211,102,.7)' : bad ? 'rgba(248,113,113,.7)' : 'rgba(148,163,184,.4)';
    b.title = on ? 'WhatsApp automation is ON' : bad ? 'WhatsApp automation is ON but not connected' : 'WhatsApp automation is OFF';
    var d = b.querySelector('.wa-dot'); if (d) d.style.background = on ? '#22c55e' : bad ? '#ef4444' : '#94a3b8';
  }

  /* ---------- sending ---------- */
  var first = function (n) { return String(n || '').trim().split(/\s+/)[0] || 'there'; };
  var fmtPhone = function (p) { var d = String(p || '').replace(/\D/g, ''); return d.length === 11 && d[0] === '0' ? d.slice(0, 5) + ' ' + d.slice(5) : String(p || '').trim(); };
  function details(s) {
    var bits = []; if (s.avail) bits.push('Availability: ' + s.avail); if (s.addr) bits.push('Address: ' + s.addr); if (s.testCentre) bits.push('Test centre: ' + s.testCentre.name); if (s.notes) bits.push(s.notes);
    return bits.join(' | ') || 'None';
  }
  async function sendTemplate(to, template, params, extra) {
    var r = await call(Object.assign({ action: 'send_template', to: to, template: template, lang: 'en_GB', params: params }, extra || {}));
    return r;
  }
  /* called from confirmAssign() after the student has been saved and assigned */
  async function afterAssign(ctx) {
    var wantI = !!(document.getElementById('wa-auto-instr') || {}).checked, wantS = !!(document.getElementById('wa-auto-stu') || {}).checked;   // read now, the modal closes next
    if (!isOn()) return;
    var s = ctx.student || {}, out = [], fail = [];
    if (wantI && CFG.instructor && ctx.instrPhone) {
      var r1 = await sendTemplate(ctx.instrPhone, 'dsq_new_student', [first(ctx.instrName), s.name || 'Student', fmtPhone(s.phone) || 'Not provided', s.postcode || 'Not provided', s.type || 'Manual', details(s)],
        { buttons: ctx.refId ? ['ACCEPT:' + ctx.refId, 'DECLINE:' + ctx.refId] : [], instructor_id: ctx.instrId, referral_id: ctx.refId || null, student_name: s.name });
      (r1.ok ? out : fail).push(r1.ok ? 'instructor' : 'instructor: ' + (r1.error || 'failed'));
    }
    if (wantS && CFG.student && s.phone) {
      var r2 = await sendTemplate(s.phone, 'dsq_student_welcome', [first(s.name), ctx.instrName || 'your instructor', fmtPhone(ctx.instrPhone) || 'their phone'],
        { instructor_id: ctx.instrId, referral_id: ctx.refId || null, student_name: s.name });
      (r2.ok ? out : fail).push(r2.ok ? 'student' : 'student: ' + (r2.error || 'failed'));
    }
    if (out.length) toast('💬 WhatsApp sent to the ' + out.join(' and the '), 'success', 4500);
    if (fail.length) toast('WhatsApp did not send (' + fail.join('; ') + '). Use the manual WhatsApp buttons instead.', 'warn', 9000);
  }

  /* ---------- the block shown inside the Assign window ---------- */
  function mountAssign() {
    var modal = document.getElementById('assignModal'); if (!modal) return; var old = document.getElementById('waAutoBox'); if (old) old.remove();
    var anchor = modal.querySelector('.mb-3 .dsq-lbl'); anchor = anchor && anchor.parentNode; if (!anchor) return;
    var box = document.createElement('div'); box.id = 'waAutoBox'; box.className = 'mb-3'; anchor.parentNode.insertBefore(box, anchor);
    var draw = function () {
      var on = isOn();
      box.innerHTML = '<div style="border:1px solid ' + (on ? 'rgba(37,211,102,.5)' : 'var(--bdr)') + ';background:' + (on ? 'rgba(37,211,102,.08)' : 'var(--dk3)') + ';border-radius:10px;padding:10px 12px;font-size:.78rem">' +
        (on ? '<div style="font-weight:800;color:#22c55e;margin-bottom:6px">💬 Automatic WhatsApp is ON</div>' +
          '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:2px 0"><input type="checkbox" id="wa-auto-instr"' + (CFG.instructor ? ' checked' : '') + '> Send the instructor the student\'s details (with Accept / Can\'t take buttons)</label>' +
          '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:2px 0"><input type="checkbox" id="wa-auto-stu"' + (CFG.student ? ' checked' : '') + '> Send the student their welcome and instructor details</label>' +
          '<div style="font-size:.68rem;color:var(--txt4);margin-top:4px">Sent the moment you press Assign. Untick to skip, or use the manual buttons below.</div>'
          : '<div style="color:var(--txt3)">💬 Automatic WhatsApp is <b>OFF</b>. ' + (CFG.enabled && !ready() ? '<span style="color:#f87171">It is switched on but not connected.</span> ' : '') + '<a href="javascript:DSQWA.openSettings()" style="color:#60a5fa">Settings</a></div>') + '</div>';
    };
    draw(); if (!ST) status().then(function () { dot(); draw(); });
  }
  (function hookOpenModal() {
    var o = window.openModal; if (typeof o !== 'function' || o.__wa) { if (typeof o !== 'function') setTimeout(hookOpenModal, 800); return; }
    var w = function (id) { var r = o.apply(this, arguments); if (id === 'assignModal') { try { load().then(mountAssign); } catch (e) { } } return r; }; w.__wa = 1; window.openModal = w;
  })();

  /* ---------- settings window ---------- */
  var tplHtml = function () {
    return Object.keys(TPL).map(function (k) {
      var t = TPL[k]; return '<details style="border:1px solid var(--bdr);border-radius:10px;padding:8px 10px;margin:6px 0"><summary style="cursor:pointer;font-weight:700;font-size:.8rem">' + E(k) + ' <span style="font-weight:400;color:var(--txt4)">· ' + E(t.who) + '</span></summary>' +
        '<div style="font-size:.72rem;color:var(--txt3);margin:6px 0">Category: <b>Utility</b> · Language: <b>English (UK)</b>' + (t.buttons.length ? ' · Quick-reply buttons: <b>' + E(t.buttons.join(' / ')) + '</b>' : '') + '</div>' +
        '<pre style="white-space:pre-wrap;font-size:.74rem;background:var(--dk3);border-radius:8px;padding:8px;margin:0 0 6px">' + E(t.body) + '</pre>' +
        '<div style="font-size:.68rem;color:var(--txt4)">Variables: ' + t.params.map(function (p, i) { return '{{' + (i + 1) + '}} ' + E(p); }).join(' · ') + '</div>' +
        '<button class="btn-s" style="font-size:.7rem;margin-top:6px" onclick="DSQWA.copyTpl(\'' + k + '\')">Copy text</button></details>';
    }).join('');
  };
  async function openSettings(tab) {
    await load(); var m = document.getElementById('waSet'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'waSet'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99998;display:flex;align-items:center;justify-content:center;padding:14px'; m.onclick = function (e) { if (e.target === m) m.remove(); };
    document.body.appendChild(m); m.innerHTML = '<div style="background:var(--dk2);border:1px solid var(--bdr);border-radius:16px;width:100%;max-width:720px;max-height:92vh;overflow:auto;padding:18px"><div style="color:var(--txt3)">Checking the connection…</div></div>';
    var s = await status(true); dot(); m.__tab = tab; draw(m, s); recent();
  }
  function draw(m, s) {
    var ok = s && s.ok && s.ready && !s.error, sw = function (id, label, sub, on) { return '<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;padding:8px 0;border-top:1px solid var(--bdr)"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + ' style="margin-top:3px;width:18px;height:18px"><span><b style="font-size:.85rem">' + label + '</b><br><span style="font-size:.72rem;color:var(--txt3)">' + sub + '</span></span></label>'; };
    var conn = ok ? '<div style="color:#22c55e;font-weight:800">✅ Connected' + (s.phone ? ' · ' + E(s.phone.display_phone_number || '') + (s.phone.verified_name ? ' · ' + E(s.phone.verified_name) : '') : '') + '</div>' + (s.phone && s.phone.quality_rating ? '<div style="font-size:.72rem;color:var(--txt3)">Quality rating: ' + E(s.phone.quality_rating) + '</div>' : '') + (s.webhook_ready ? '' : '<div style="font-size:.74rem;color:#f59e0b;margin-top:3px">Replies are not connected yet: add WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET, then add the webhook in Meta. Sending works without it, but Accept / Can\'t take taps will not update the referral.</div>')
      : '<div style="color:#f87171;font-weight:800">Not connected</div><div style="font-size:.76rem;color:var(--txt3);margin-top:3px">' + E((s && s.error) || 'Follow the steps below. It is free to set up and you only pay Meta a few pence per message.') + '</div>';
    m.firstChild.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-family:\'Oswald\',sans-serif;font-size:1.2rem;font-weight:700">💬 WhatsApp Business automation</div><button class="btn-s" onclick="document.getElementById(\'waSet\').remove()">Close</button></div>' +
      '<div style="border:1px solid ' + (ok ? 'rgba(34,197,94,.5)' : 'var(--bdr)') + ';border-radius:12px;padding:10px 12px;margin-bottom:10px">' + conn + '</div>' +
      '<div style="margin-bottom:10px">' + sw('waMaster', 'Turn automatic WhatsApp ON (tick, then press Save)', 'ON: pressing Assign in Find &amp; Assign sends the messages for you. OFF: nothing is sent by the system and you use the WhatsApp buttons yourself, exactly as before.', CFG.enabled) +
      sw('waInstr', 'Message the instructor', 'The student\'s details, with Accept and Can\'t take buttons. A tap updates the referral automatically.', CFG.instructor) + sw('waStu', 'Message the student', 'A welcome with their instructor\'s name and phone and the Student Portal link. Only for students who agreed to be contacted on WhatsApp.', CFG.student) + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn-p" onclick="DSQWA.saveSettings()">Save</button><button class="btn-s" onclick="DSQWA.recheck()">Check connection again</button></div>' +
      '<div id="aaHolder"></div>' +
      '<details style="margin-bottom:8px"' + (ok ? '' : ' open') + '><summary style="cursor:pointer;font-weight:800">Set-up steps (about 30 minutes, free)</summary><ol style="font-size:.78rem;line-height:1.6;padding-left:18px;margin:8px 0">' +
        '<li>Create a free <b>Meta Business account</b> at business.facebook.com, then in <b>Meta for Developers</b> create an app of type <b>Business</b> and add the <b>WhatsApp</b> product.</li>' +
        '<li>In <b>WhatsApp → API Setup</b> add your phone number. It must be a number that is <b>not</b> already used in a WhatsApp app (a cheap SIM or virtual number is fine). Copy the <b>Phone number ID</b>.</li>' +
        '<li>In Business settings → <b>System users</b>, create one, give it your app and the WhatsApp account, and generate a <b>permanent token</b> with the <i>whatsapp_business_messaging</i> and <i>whatsapp_business_management</i> permissions.</li>' +
        '<li>In Supabase → Edge Functions → <b>Secrets</b> add <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_ID</code>, <code>WHATSAPP_VERIFY_TOKEN</code> (any long random text) and <code>WHATSAPP_APP_SECRET</code> (App → Settings → Basic).</li>' +
        '<li>Deploy the function named <b>whatsapp</b> (code: <code>supabase/functions/whatsapp/index.ts</code>), turn <b>Verify JWT off</b>, and run <code>supabase/migrations/20261128_whatsapp.sql</code> in the SQL Editor. It replaces the older <i>whatsapp-webhook</i> and <i>send-whatsapp</i> functions, so use only this one as the Meta webhook.</li>' +
        '<li>In Meta → WhatsApp → <b>Configuration</b>, set the webhook URL to <code>' + E(FN()) + '</code>, the verify token to the same text as step 4, and subscribe to <b>messages</b>.</li>' +
        '<li>Create the <b>five message templates</b> below in WhatsApp Manager and wait for approval (usually minutes to a day).</li>' +
        '<li>Use <b>Send a test</b> below, then switch automation <b>ON</b>.</li></ol></details>' +
      '<details style="margin-bottom:8px"><summary style="cursor:pointer;font-weight:800">Message templates to create in Meta</summary>' + tplHtml() + '</details>' +
      '<div style="border-top:1px solid var(--bdr);padding-top:8px;margin-top:6px"><b style="font-size:.85rem">Send a test</b><div style="font-size:.72rem;color:var(--txt3);margin:2px 0 6px">Sends Meta\'s built-in "hello_world" message to your own number (it works before your templates are approved).</div><div style="display:flex;gap:6px;flex-wrap:wrap"><input class="dsq-inp" id="waTestTo" placeholder="Your mobile, e.g. 07700 900123" style="max-width:260px"><button class="btn-s" onclick="DSQWA.test()">Send test</button></div><div id="waTestOut" style="font-size:.76rem;margin-top:5px"></div></div>' +
      '<div style="border-top:1px solid var(--bdr);padding-top:8px;margin-top:10px"><b style="font-size:.85rem">Recent messages</b><div id="waRecent" style="font-size:.74rem;color:var(--txt3);margin-top:4px">Loading…</div></div>' +
      '<div style="font-size:.68rem;color:var(--txt4);margin-top:10px;line-height:1.5">Only message people who have agreed to hear from you on WhatsApp, and keep to Meta\'s WhatsApp Business policy. Meta charges a small fee per template message that starts a conversation; replies within 24 hours of a person messaging you are free.</div>';
    try { if (window.DSQAA) DSQAA.mount().then(function () { if (m.__tab === 'auto') { var h = document.getElementById('aaHolder'); if (h) h.scrollIntoView({ block: 'start' }); m.__tab = null; } }); } catch (e) { }
  }
  async function saveSettings() {
    CFG.enabled = !!document.getElementById('waMaster').checked; CFG.instructor = !!document.getElementById('waInstr').checked; CFG.student = !!document.getElementById('waStu').checked;
    if (CFG.enabled && !ready()) toast('Saved, but WhatsApp is not connected yet, so nothing will send until it is.', 'warn', 6000);
    else toast(CFG.enabled ? '💬 Automatic WhatsApp is ON' : 'Automatic WhatsApp is OFF', 'success', 2500);
    await save(); dot();
    try { DSQLog.add(SBc(), { area: 'whatsapp', action: 'switch', summary: 'Automatic WhatsApp turned ' + (CFG.enabled ? 'ON' : 'OFF'), role: 'admin', actor: 'Admin' }); } catch (e) { }
  }
  async function recheck() { var s = await status(true); dot(); var m = document.getElementById('waSet'); if (m) draw(m, s); recent(); }
  async function test() {
    var to = (document.getElementById('waTestTo') || {}).value, out = document.getElementById('waTestOut'); if (!to) { if (out) out.textContent = 'Enter your mobile number first.'; return; }
    if (out) out.textContent = 'Sending…'; var r = await call({ action: 'test', to: to });
    if (out) out.innerHTML = r.ok ? '<span style="color:#22c55e">✅ Sent. Check your WhatsApp.</span>' : '<span style="color:#f87171">' + E(r.error || 'Failed') + '</span>'; recent();
  }
  async function recent() {
    var el = document.getElementById('waRecent'); if (!el) return;
    try {
      var r = await SBc().from('wa_log').select('*').order('created_at', { ascending: false }).limit(20);
      if (r.error) { el.innerHTML = /does not exist|relation|schema cache/i.test(r.error.message || '') ? 'One-time setup: run <code>20261128_whatsapp.sql</code> in the Supabase SQL Editor.' : E(r.error.message); return; }
      el.innerHTML = (r.data || []).length ? r.data.map(function (x) { var c = x.status === 'failed' ? '#f87171' : x.status === 'read' || x.status === 'delivered' ? '#22c55e' : 'var(--txt3)'; return '<div style="display:flex;gap:8px;padding:3px 0;border-top:1px solid var(--bdr)"><span style="min-width:96px;color:var(--txt4)">' + new Date(x.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</span><span style="flex:1">' + (x.direction === 'in' ? '⬅️ ' : '➡️ ') + E(x.to_phone || '') + ' · ' + E(x.template || x.body || '').slice(0, 60) + (x.payload ? ' <b>' + E(String(x.payload).split(':')[0]) + '</b>' : '') + '</span><span style="color:' + c + ';font-weight:700">' + E(x.status || '') + (x.error ? ' — ' + E(x.error).slice(0, 50) : '') + '</span></div>'; }).join('') : 'Nothing sent yet.';
    } catch (e) { el.textContent = 'Could not load.'; }
  }
  async function copyTpl(k) { try { await navigator.clipboard.writeText(TPL[k].body); toast('Copied', 'success', 1500); } catch (e) { window.prompt('Copy:', TPL[k].body); } }

  (function init() { var n = 0, t = setInterval(function () { n++; if (n > 40) return clearInterval(t); if (window.DSQ_ADMIN && DSQ_ADMIN.sb && DSQ_ADMIN.sb()) { clearInterval(t); load().then(function () { if (CFG.enabled) status().then(dot); dot(); }); } }, 1000); })();
  window.DSQWA = { call: call, load: load, status: status, isOn: isOn, afterAssign: afterAssign, openSettings: openSettings, saveSettings: saveSettings, recheck: recheck, test: test, copyTpl: copyTpl, mountAssign: mountAssign, sendTemplate: sendTemplate, TPL: TPL, _cfg: function () { return CFG; } };
})();
