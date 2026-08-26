/**
 * DriveSQ Booking Capture
 * Intercepts every Formspree booking form on the website.
 * 1. Submits to Formspree (via fetch, JSON response — no page reload).
 * 2. Also writes to Supabase waiting_list so the admin autopilot can pick it up.
 * Both happen simultaneously; neither blocks the other.
 */
(function () {
  const SB_URL = 'https://vwvbfqrlumvoabzkjxoa.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dmJmcXJsdW12b2FiektqeG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjkxMTgsImV4cCI6MjA1ODk0NTExOH0.IvNjOhVWMoMDIKuqLQh4qFitFQiQKFYsrI8MHJB0HLg';

  function normaliseLessonType(raw) {
    if (!raw) return 'Manual';
    const r = raw.toLowerCase();
    if (r.includes('auto')) return 'Automatic';
    if (r.includes('intensive')) return 'Intensive';
    if (r.includes('refresher')) return 'Refresher';
    if (r.includes('mock')) return 'Mock Test';
    if (r.includes('pass plus')) return 'Pass Plus';
    return 'Manual';
  }

  function getSourceFromPage() {
    // Extract area name from <title> or <h1> for the notes field
    const h1 = document.querySelector('h1');
    if (h1) return h1.textContent.trim().slice(0, 80);
    return document.title.slice(0, 80);
  }

  async function saveToSupabase(data) {
    try {
      const payload = {
        student_name: data.name || null,
        student_phone: data.phone || null,
        student_email: data.email || null,
        postcode: (data.postcode || '').toUpperCase().trim() || null,
        lesson_type: normaliseLessonType(data.service),
        notes: [
          data.notes ? data.notes : '',
          '[WEB] Booked from: ' + (data.source || window.location.pathname),
          data.service ? 'Requested: ' + data.service : ''
        ].filter(Boolean).join('\n'),
        status: 'waiting',
        created_at: new Date().toISOString()
      };
      const res = await fetch(SB_URL + '/rest/v1/waiting_list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.warn('[DriveSQ] Supabase waiting_list insert failed:', res.status, txt);
      }
    } catch (e) {
      console.warn('[DriveSQ] Supabase booking capture error:', e);
    }
  }

  function showSuccess(form) {
    const div = document.createElement('div');
    div.style.cssText = [
      'background:#0f2e1a',
      'border:1.5px solid #25D366',
      'border-radius:10px',
      'padding:18px 20px',
      'font-family:Inter,sans-serif',
      'font-size:.9rem',
      'color:#4ade80',
      'text-align:center',
      'margin-top:8px',
      'animation:fadeIn .4s ease'
    ].join(';');
    div.innerHTML = '<strong style="font-size:1.05rem">✅ Booking Request Received!</strong><br/>' +
      '<span style="color:#a7f3d0;font-size:.82rem">We\'ll reply within 2 hours. ' +
      'You\'ll receive a WhatsApp confirmation shortly.</span>';
    form.parentNode.insertBefore(div, form.nextSibling);
    form.style.display = 'none';

    // Add fadeIn animation if not already present
    if (!document.getElementById('dsq-anim')) {
      const s = document.createElement('style');
      s.id = 'dsq-anim';
      s.textContent = '@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}';
      document.head.appendChild(s);
    }
  }

  function attachToForm(form) {
    if (form.dataset.dsqAttached) return;
    form.dataset.dsqAttached = '1';

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const btn = form.querySelector('[type=submit]');
      const origText = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Sending…'; }

      const fd = new FormData(form);
      const data = {
        name:     fd.get('name') || '',
        email:    fd.get('email') || '',
        phone:    fd.get('phone') || '',
        service:  fd.get('service') || '',
        postcode: fd.get('postcode') || '',
        notes:    fd.get('notes') || '',
        source:   getSourceFromPage()
      };

      // Fire both in parallel — neither waits for the other
      const [fsRes] = await Promise.allSettled([
        // 1. Formspree (JSON mode — no redirect)
        fetch(form.action, {
          method: 'POST',
          body: fd,
          headers: { 'Accept': 'application/json' }
        }),
        // 2. Supabase waiting_list
        saveToSupabase(data)
      ]);

      const fsOk = fsRes.status === 'fulfilled' && fsRes.value && fsRes.value.ok;

      if (fsOk) {
        showSuccess(form);
      } else {
        // Formspree failed — restore button and warn
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:#f87171;font-size:.8rem;margin-top:8px;text-align:center';
        errDiv.textContent = '⚠️ Something went wrong — please try again or call us directly.';
        form.appendChild(errDiv);
        setTimeout(() => errDiv.remove(), 6000);
      }
    });
  }

  function init() {
    // Attach to any Formspree form already in the DOM
    document.querySelectorAll('form[action*="formspree.io"]').forEach(attachToForm);

    // Watch for dynamically added forms (unlikely but safe)
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType === 1) {
              if (n.matches && n.matches('form[action*="formspree.io"]')) attachToForm(n);
              n.querySelectorAll && n.querySelectorAll('form[action*="formspree.io"]').forEach(attachToForm);
            }
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
