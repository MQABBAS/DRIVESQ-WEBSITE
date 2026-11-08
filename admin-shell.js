/* DriveSQ admin shell (v2) — builds on admin.html's own navigation (the .qa-side sidebar, the .qa-crumb section header and
   the #mobTabBar phone bar) instead of replacing it:
   • 700–1199px (Galaxy Z Fold unfolded, small laptops): the sidebar now shows there too, in compact icon mode — before, these
     screens had no sidebar and a cut-off row of buttons
   • phones / Fold cover screen: "More" opens a searchable menu (pinned, recent, every section and action, live badges) and a
     floating ＋ opens quick actions
   • ☆ Pin any section from its header; pinned sections appear at the top of the sidebar and the menu
   • the 10 stat cards show on the Dashboard only; header never wider than the screen; wide tables become cards on phones
   • the Today, Enquiries, Email and Free hour sections are remembered on reload; Ctrl/⌘ + . opens the menu */
(function () {
  if (window.__dsqShell) return;
  window.__dsqShell = true;

  var GROUPS = [
    { label: 'Overview', items: [['today', 'Today', 'bi-sun-fill'], ['dashboard', 'Dashboard', 'bi-speedometer2'], ['growth', 'Growth', 'bi-rocket-takeoff-fill'], ['actions', 'Action queue', 'bi-lightning-charge-fill'], ['scorecard', 'Scorecard', 'bi-bar-chart-fill']] },
    { label: 'Leads & bookings', items: [['enquiries', 'Enquiries', 'bi-inbox-fill'], ['@webbookings', 'Website bookings', 'bi-globe2'], ['waitlist', 'Waiting list', 'bi-person-lines-fill'], ['requests', 'Requests', 'bi-person-plus-fill'], ['followup', 'Follow up', 'bi-telephone-fill'], ['find', 'Find & assign', 'bi-geo-alt-fill'], ['map', 'Map', 'bi-map-fill'], ['coverage', 'Coverage', 'bi-bullseye'], ['availability', 'Availability', 'bi-calendar-week-fill']] },
    { label: 'People', items: [['students', 'Students', 'bi-people'], ['instructors', 'Instructors', 'bi-people-fill'], ['pending', 'Pending approval', 'bi-hourglass-split'], ['transfers', 'Transfers', 'bi-arrow-left-right'], ['progress-overview', 'Progress', 'bi-graph-up-arrow'], ['@theory', 'Theory progress', 'bi-book-fill'], ['add', 'Add instructor', 'bi-person-plus']] },
    { label: 'Lessons', items: [['lessons', 'Lessons', 'bi-journal-text'], ['calendar', 'Calendar', 'bi-calendar-week'], ['feedback', 'Feedback', 'bi-star-fill']] },
    { label: 'Money', items: [['referrals', 'Referrals', 'bi-cash-coin'], ['finance', 'Finance', 'bi-bank2'], ['expenses', 'Accounting', 'bi-bar-chart-line-fill'], ['revenue', 'Revenue', 'bi-currency-pound'], ['freehour', 'Free hour draw', 'bi-gift-fill']] },
    { label: 'Messages', items: [['messages', 'Inbox', 'bi-chat-dots-fill'], ['bulk', 'Bulk message', 'bi-send-fill'], ['email', 'Email', 'bi-envelope-fill'], ['notes', 'My notes', 'bi-journal-bookmark-fill'], ['@reports', 'Reports', 'bi-flag-fill']] },
    { label: 'Insights', items: [['analytics', 'Analytics', 'bi-graph-up'], ['activity', 'Activity log', 'bi-activity'], ['infoview', 'Info', 'bi-info-circle-fill']] }];
  var ACTIONS = { '@webbookings': 'openWebBookingsPanel', '@theory': 'openTheoryProgressModal', '@reports': 'openReportsInbox' };
  var BADGES = { today: ['todayTabBadge', 'qaTodayBadge'], growth: ['gxTabBadge'], finance: ['financeBadge'], pending: ['pendingBadge'], messages: ['inboxBadge'], freehour: ['freehourBadge'], '@webbookings': ['webBookingsBadge'], '@reports': ['qaReportsBadge'] };
  var QUICK = [['New customer', 'bi-person-plus-fill', 'adminNewCustomer()'], ['Website bookings', 'bi-globe2', 'openWebBookingsPanel()'], ['Find & assign', 'bi-geo-alt-fill', "dsqShellGo('find')"],
    ['Add student', 'bi-person-badge', "dsqShellGo('students');setTimeout(function(){try{openCreateStudentModal()}catch(e){}},300)"], ['Add lesson', 'bi-calendar-plus', 'openAddLessonModal(null)'],
    ['Search everything', 'bi-search', 'openGlobalSearch()'], ['Bulk message', 'bi-send-fill', "dsqShellGo('bulk')"], ['Add instructor', 'bi-person-plus', "dsqShellGo('add')"],
    ['Reports', 'bi-flag-fill', 'openReportsInbox()'], ['Theory progress', 'bi-book-fill', 'openTheoryProgressModal()'], ['Today', 'bi-sun-fill', 'openToday()'], ['All sections', 'bi-grid-3x3-gap-fill', 'dsqShellMenu()']];
  var CARD_PANELS = ['students', 'instructors', 'lessons', 'pending', 'revenue', 'analytics', 'requests', 'transfers', 'feedback'];
  var PIN_KEY = 'dsq_admin_pins', REC_KEY = 'dsq_admin_recent';
  var ALL = {}; GROUPS.forEach(function (g) { g.items.forEach(function (it) { ALL[it[0]] = { id: it[0], label: it[1], icon: it[2], group: g.label }; }); });

  function ls(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function exists(id) { return id.charAt(0) === '@' ? typeof window[ACTIONS[id]] === 'function' : !!document.getElementById('panel-' + id); }
  function current() { var a = document.querySelector('[id^="panel-"]:not(.hidden)'); return a ? a.id.slice(6) : 'dashboard'; }
  function pins() { return ls(PIN_KEY, []).filter(function (id) { return ALL[id] && exists(id); }); }
  function recents() { return ls(REC_KEY, []).filter(function (id) { return ALL[id] && exists(id); }); }

  var CSS = '' +
    /* Fold unfolded / small laptops: the existing sidebar, compact */
    '@media (min-width:700px) and (max-width:1199px){body.qa-side-on .qa-side{display:flex}body.qa-side-on .dsq-tabs{display:none!important}' +
    'body.qa-side-on{--qa-sw:72px}body.qa-side-on #mainPage{width:auto!important;margin-left:calc(var(--qa-sw) + 6px)!important;margin-right:6px!important;max-width:calc(100vw - var(--qa-sw) - 12px)!important}' +
    'body.qa-side-on #mobTabBar{display:none!important}body.qa-side-on.dsq-sh-fullside{--qa-sw:244px}}' +
    /* pinned group in the sidebar */
    '.qa-side .dsq-pin-grp .qa-side__item i{color:#F5C518}.qa-side .dsq-menu-item i{color:#D10A11!important}.qa-side .dsq-menu-item{margin-bottom:4px}' +
    /* pin button in the section header */
    '.dsq-pin{margin-left:auto;flex:none;border:1px solid var(--bdr);background:none;color:var(--txt3);border-radius:999px;padding:5px 12px;font-size:.78rem;cursor:pointer;white-space:nowrap}' +
    '.dsq-pin.on{color:#F5C518;border-color:rgba(245,197,24,.55);background:rgba(245,197,24,.08)}.qa-crumb .dsq-pin+.qa-crumb__help{margin-left:8px}' +
    /* stats only on the dashboard */
    'body.dsq-sh-hidestats #globalStats{display:none!important}' +
    /* header never wider than the screen */
    '#mainNav .ms-auto{flex-wrap:wrap;min-width:0}' +
    '@media (max-width:1199px){.search-trigger-btn span,.search-trigger-btn kbd{display:none}#mainNav .btn-s{font-size:0!important;padding:6px 9px!important}#mainNav .btn-s i{font-size:.95rem;margin:0!important}}' +
    '@media (max-width:699px){#webBookingsBtnLabel{display:none}body.dsq-sh-on #themeBtn,body.dsq-sh-on #adminNotifToggle,body.dsq-sh-on #mainNav .btn-s[onclick*=doLogout]{display:none!important}}' +
    '@media (min-width:700px) and (max-width:1199px){body.qa-side-on #quickActionsBar{display:none!important}body.dsq-sh-on .dsq-sh-fab{display:grid;place-items:center;bottom:22px}}' +
    /* menu + quick sheets */
    '.dsq-sh-sheet{position:fixed;inset:0;z-index:1060;display:none;background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}.dsq-sh-sheet.open{display:block}' +
    '.dsq-sh-panel{position:absolute;left:0;right:0;bottom:0;max-height:88vh;overflow:auto;background:var(--dk2,#141414);color:var(--txt,#eee);border-radius:20px 20px 0 0;padding:10px 14px calc(20px + env(safe-area-inset-bottom,0px));animation:dsqShUp .28s cubic-bezier(.2,.8,.2,1)}' +
    '@media (min-width:700px){.dsq-sh-panel{left:auto;right:auto;top:0;bottom:0;width:min(440px,92vw);max-height:none;border-radius:0 20px 20px 0;animation:dsqShIn .25s ease}}' +
    '@keyframes dsqShUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}@keyframes dsqShIn{from{transform:translateX(-30px);opacity:0}to{transform:none;opacity:1}}' +
    '.dsq-sh-grab{width:42px;height:5px;border-radius:999px;background:rgba(127,127,127,.4);margin:2px auto 10px}' +
    '.dsq-sh-q{width:100%;border:1px solid var(--bdr,rgba(255,255,255,.12));background:var(--dk3,rgba(255,255,255,.05));color:var(--txt,#fff);border-radius:12px;padding:12px 14px;font-size:1rem;margin-bottom:6px;outline:none}' +
    '.dsq-sh-h{font:700 .66rem Inter,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--txt4,#777);padding:12px 2px 6px;display:flex;align-items:center;gap:6px}' +
    '.dsq-sh-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px}' +
    '.dsq-sh-t{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:14px;border:1px solid var(--bdr,rgba(255,255,255,.08));background:rgba(127,127,127,.06);color:var(--txt,#eee);font-size:.76rem;text-align:center;cursor:pointer;min-height:76px;line-height:1.15}' +
    '.dsq-sh-t i{font-size:1.35rem;color:#ff4d55}.dsq-sh-t.on{border-color:#D10A11;background:rgba(209,10,17,.12)}' +
    '.dsq-sh-b{position:absolute;top:6px;right:6px;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#D10A11;color:#fff;font:700 .68rem/20px Inter,sans-serif;text-align:center}.dsq-sh-b.gold{background:#F5C518;color:#111}' +
    '.dsq-sh-foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid var(--bdr,rgba(255,255,255,.1))}.dsq-sh-foot button{flex:1 1 120px;border:1px solid var(--bdr,rgba(255,255,255,.12));background:none;color:var(--txt2,#ccc);border-radius:12px;padding:10px;font-size:.82rem;cursor:pointer}' +
    '.dsq-sh-fab{position:fixed;right:16px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:301;width:56px;height:56px;border-radius:50%;border:0;background:linear-gradient(135deg,#ff2d35,#D10A11);color:#fff;font-size:1.6rem;box-shadow:0 10px 24px rgba(209,10,17,.45);display:none;cursor:pointer}' +
    '@media (max-width:699px){body.dsq-sh-on .dsq-sh-fab{display:grid;place-items:center}}' +
    /* phone: wide tables become cards */
    '@media (max-width:699px){table.dsq-sh-cards,table.dsq-sh-cards tbody,table.dsq-sh-cards tr,table.dsq-sh-cards td{display:block;width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box}*:has(> table.dsq-sh-cards){min-width:0!important;overflow-x:visible!important}' +
    'table.dsq-sh-cards thead{display:none}table.dsq-sh-cards tr{border:1px solid var(--bdr,rgba(255,255,255,.1));border-radius:14px;margin:0 0 10px;padding:6px 10px;background:rgba(127,127,127,.04)}' +
    'table.dsq-sh-cards td{display:flex!important;justify-content:space-between;align-items:center;gap:12px;border:0!important;padding:6px 0!important;text-align:right;min-height:30px;white-space:normal!important;overflow-wrap:anywhere}table.dsq-sh-cards td > *{max-width:60%;min-width:0}table.dsq-sh-cards td:has(button,.abtn,a.btn,.btn-s){flex-wrap:wrap;justify-content:flex-end;gap:6px}table.dsq-sh-cards td:has(button,.abtn,a.btn,.btn-s) > *{max-width:none}table.dsq-sh-cards td:has(button,.abtn,a.btn,.btn-s)::before{width:100%;max-width:100%;text-align:left}table.dsq-sh-cards td > div:has(> button,> .abtn){display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}' +
    'table.dsq-sh-cards td::before{content:attr(data-label);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--txt4,#888);text-align:left;flex:none;max-width:45%}' +
    'table.dsq-sh-cards td[data-label=""]::before{display:none}table.dsq-sh-cards td[data-label=""]{justify-content:flex-start;flex-wrap:wrap}}' +
    '@media (pointer:coarse){.abtn,.btn-s,.qa-btn,.qa-side__item{min-height:40px}}' +
    /* cover screen: rows of action buttons wrap; Email columns may shrink */
    '@media (max-width:699px){#mainPage div:has(> .abtn + .abtn){flex-wrap:wrap}#mainPage div:has(> div > .abtn){flex-wrap:wrap}#mainPage div[style*="flex-shrink:0"]:has(> .abtn){flex-shrink:1;max-width:100%}#panel-email .dsqm-col{min-width:0;max-width:100%}#panel-email .dsqm-col > *{min-width:0;max-width:100%}#panel-email [class*=dsqm]{min-width:0}}';

  var sheet, fab;
  function badgeOf(id) {
    var src = BADGES[id]; if (!src) return '';
    for (var k = 0; k < src.length; k++) {
      var el = document.getElementById(src[k]); if (!el) continue;
      var hidden = el.classList.contains('hidden') || el.hidden || el.style.display === 'none' || getComputedStyle(el).display === 'none';
      var t = (el.textContent || '').trim();
      if (!hidden && t && t !== '0') return t.length > 4 ? '•' : t;
    }
    return '';
  }
  function tile(id) {
    var it = ALL[id], b = badgeOf(id);
    return '<button type="button" class="dsq-sh-t' + (id === current() ? ' on' : '') + '" data-go="' + id + '"><i class="bi ' + it.icon + '"></i>' + esc(it.label) + (b ? '<em class="dsq-sh-b' + (id === 'growth' ? ' gold' : '') + '">' + esc(b) + '</em>' : '') + '</button>';
  }
  function openSheet(kind) {
    var h = '<div class="dsq-sh-panel" role="dialog" aria-modal="true" aria-label="' + (kind === 'quick' ? 'Quick actions' : 'All sections') + '"><div class="dsq-sh-grab"></div>';
    if (kind === 'quick') {
      h += '<div class="dsq-sh-h">Quick actions</div><div class="dsq-sh-tiles">' + QUICK.map(function (q) { return '<button type="button" class="dsq-sh-t" data-run="' + esc(q[2]) + '"><i class="bi ' + q[1] + '"></i>' + esc(q[0]) + '</button>'; }).join('') + '</div>';
    } else {
      h += '<input class="dsq-sh-q" type="search" placeholder="Find a section…" aria-label="Find a section">';
      var p = pins(), r = recents().filter(function (x) { return p.indexOf(x) < 0; }).slice(0, 4);
      if (p.length) h += '<div class="dsq-sh-h" data-sec>★ Pinned</div><div class="dsq-sh-tiles" data-sec>' + p.map(tile).join('') + '</div>';
      if (r.length) h += '<div class="dsq-sh-h" data-sec>Recent</div><div class="dsq-sh-tiles" data-sec>' + r.map(tile).join('') + '</div>';
      GROUPS.forEach(function (g) { var its = g.items.filter(function (it) { return exists(it[0]); }); if (its.length) h += '<div class="dsq-sh-h" data-grp>' + esc(g.label) + '</div><div class="dsq-sh-tiles" data-grp>' + its.map(function (it) { return tile(it[0]); }).join('') + '</div>'; });
      h += '<div class="dsq-sh-foot"><button type="button" data-run="toggleTheme()"><i class="bi bi-circle-half"></i> Day / night</button><button type="button" data-run="adminManualEnableNotifs()"><i class="bi bi-bell"></i> Notifications</button><button type="button" data-run="doLogout()"><i class="bi bi-box-arrow-right"></i> Sign out</button></div>';
    }
    sheet.innerHTML = h + '</div>';
    sheet.classList.add('open');
    var q = sheet.querySelector('.dsq-sh-q');
    if (!q) return;
    if (window.innerWidth >= 700) setTimeout(function () { q.focus(); }, 50);
    q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase();
      [].forEach.call(sheet.querySelectorAll('[data-sec]'), function (x) { x.style.display = v ? 'none' : ''; });
      [].forEach.call(sheet.querySelectorAll('.dsq-sh-tiles[data-grp]'), function (grid) {
        var any = false;
        [].forEach.call(grid.children, function (t) { var it = ALL[t.getAttribute('data-go')] || {}; var on = !v || t.textContent.toLowerCase().indexOf(v) > -1 || String(it.group).toLowerCase().indexOf(v) > -1; t.style.display = on ? '' : 'none'; if (on) any = true; });
        grid.style.display = any ? '' : 'none'; grid.previousElementSibling.style.display = any ? '' : 'none';
      });
    });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var f = [].filter.call(sheet.querySelectorAll('.dsq-sh-tiles[data-grp] .dsq-sh-t'), function (t) { return t.style.display !== 'none'; })[0]; if (f) f.click(); } });
  }
  function closeSheet() { if (!sheet) return; sheet.classList.remove('open'); sheet.innerHTML = ''; }
  function go(id) {
    closeSheet();
    if (id.charAt(0) === '@') { try { window[ACTIONS[id]](); } catch (e) { console.warn(e); } return; }
    if (typeof window.switchTab === 'function') window.switchTab(id);
    try { window._mobSetActive && window._mobSetActive(id); } catch (e) {}
  }
  window.dsqShellGo = go;
  window.dsqShellMenu = function () { setTimeout(function () { openSheet('menu'); }, 0); };

  function pinButton() {
    var cr = document.querySelector('#mainPage .qa-crumb'); if (!cr) return;
    var c = current(), on = pins().indexOf(c) > -1, b = cr.querySelector('.dsq-pin');
    if (!ALL[c]) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'dsq-pin'; var help = cr.querySelector('.qa-crumb__help'); help ? cr.insertBefore(b, help) : cr.appendChild(b); }
    b.setAttribute('data-pin', c); b.classList.toggle('on', on); b.textContent = on ? '★ Pinned' : '☆ Pin';
    b.title = on ? 'Remove from your pinned sections' : 'Pin to the top of the sidebar and menu';
  }
  function fixIcons() {
    [].forEach.call(document.querySelectorAll('.qa-side .qa-side__item[data-side]'), function (b) {
      var it = ALL[b.getAttribute('data-side')], i = b.querySelector('i');
      if (it && i && /bi-grid(\s|$)/.test(i.className)) i.className = 'bi ' + it.icon;
    });
  }
  function sidePins() {
    fixIcons();
    var sc = document.querySelector('.qa-side .qa-side__scroll'); if (!sc) return;
    var old = sc.querySelector('.dsq-pin-grp'); if (old) old.remove();
    var p = pins();
    var d = document.createElement('div'); d.className = 'dsq-pin-grp';
    d.innerHTML = '<button type="button" class="qa-side__item dsq-menu-item" data-shmenu="1" title="All sections, actions and settings (Ctrl + .)"><i class="bi bi-grid-3x3-gap-fill"></i><span class="qa-lbl">All sections &amp; actions</span></button>' + (p.length ? '<div class="qa-side__grp">★ Pinned</div>' : '') + p.map(function (id) { var it = ALL[id]; return '<button type="button" class="qa-side__item' + (id === current() ? ' is-on' : '') + '" data-go="' + id + '" title="' + esc(it.label) + '"><i class="bi ' + it.icon + '"></i><span class="qa-lbl">' + esc(it.label) + '</span></button>'; }).join('');
    sc.insertBefore(d, sc.firstChild);
  }
  function cardify() {
    if (window.innerWidth >= 700) return;
    CARD_PANELS.forEach(function (pid) {
      var p = document.getElementById('panel-' + pid); if (!p || p.classList.contains('hidden')) return;
      [].forEach.call(p.querySelectorAll('table'), function (t) {
        var ths = [].map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
        if (!ths.length || t.querySelector('table')) return;
        t.classList.add('dsq-sh-cards');
        [].forEach.call(t.querySelectorAll('tbody tr'), function (tr) { [].forEach.call(tr.children, function (td, i) { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', ths[i] || ''); }); });
      });
    });
  }
  function afterSwitch(id) {
    if (ALL[id]) { var r = recents().filter(function (x) { return x !== id; }); r.unshift(id); lsSet(REC_KEY, r.slice(0, 8)); }
    document.body.classList.toggle('dsq-sh-hidestats', id !== 'dashboard');
    try { localStorage.setItem('dsq_admin_last_tab', id); } catch (e) {}
    setTimeout(function () { pinButton(); sidePins(); cardify(); }, 30);
  }
  function compactRange() {
    // 700–1199px: the existing sidebar in its compact icon mode (the collapse button still expands it)
    var mid = window.innerWidth >= 700 && window.innerWidth < 1200;
    var pref = false; try { pref = localStorage.getItem('dsqa_side') === 'mini'; } catch (e) {}
    document.body.classList.toggle('qa-side-mini', mid ? !document.body.classList.contains('dsq-sh-fullside') : pref);
  }

  function start() {
    if (sheet) return;
    var st = document.createElement('style'); st.id = 'dsq-shell-css'; st.textContent = CSS; document.head.appendChild(st);
    sheet = document.createElement('div'); sheet.className = 'dsq-sh-sheet'; document.body.appendChild(sheet);
    fab = document.createElement('button'); fab.type = 'button'; fab.className = 'dsq-sh-fab'; fab.setAttribute('aria-label', 'Quick actions'); fab.innerHTML = '<i class="bi bi-plus-lg"></i>'; fab.setAttribute('data-quick', '1'); document.body.appendChild(fab);
    document.body.classList.add('dsq-sh-on');
    // the phone bar's "More" opens the searchable menu
    window._mobToggleMore = function () { openSheet('menu'); };
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-go],[data-run],[data-quick],[data-pin],[data-shmenu]');
      if (!t) { if (e.target === sheet) closeSheet(); return; }
      var mine = sheet.contains(t) || t === fab || t.classList.contains('dsq-pin') || !!t.closest('.dsq-pin-grp');
      if (!mine) return;
      e.preventDefault();
      if (t.hasAttribute('data-go')) go(t.getAttribute('data-go'));
      else if (t.hasAttribute('data-run')) { closeSheet(); try { (new Function(t.getAttribute('data-run')))(); } catch (x) { console.warn(x); } }
      else if (t.hasAttribute('data-quick')) openSheet('quick');
      else if (t.hasAttribute('data-shmenu')) openSheet('menu');
      else if (t.hasAttribute('data-pin')) { var id = t.getAttribute('data-pin'), p = pins(), i = p.indexOf(id); if (i > -1) p.splice(i, 1); else p.push(id); lsSet(PIN_KEY, p); pinButton(); sidePins(); window.showToast && showToast(i > -1 ? 'Unpinned' : 'Pinned — it\'s now at the top of the sidebar and menu', 'success'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet();
      if ((e.ctrlKey || e.metaKey) && e.key === '.') { e.preventDefault(); openSheet('menu'); }
    });
    // remember an explicit expand of the compact sidebar on the Fold
    document.addEventListener('click', function (e) { if (e.target.closest('.js-qa-collapse') && window.innerWidth >= 700 && window.innerWidth < 1200) setTimeout(function () { document.body.classList.toggle('dsq-sh-fullside', !document.body.classList.contains('qa-side-mini')); }, 0); }, true);
    var orig = window.switchTab;
    if (typeof orig === 'function' && !orig.__shell) {
      var wrapped = function (id) { var r = orig.apply(this, arguments); try { afterSwitch(id); } catch (e) { console.warn(e); } return r; };
      wrapped.__shell = true; window.switchTab = wrapped;
    }
    var mp = document.getElementById('mainPage');
    var mo2 = new MutationObserver(function () { clearTimeout(mo2.t); mo2.t = setTimeout(function () { cardify(); pinButton(); }, 150); });
    mo2.observe(mp, { childList: true, subtree: true });
    var sideMo = new MutationObserver(function () { if (document.querySelector('.qa-side') && !document.querySelector('.qa-side .dsq-pin-grp')) sidePins(); });
    sideMo.observe(document.body, { childList: true });
    window.addEventListener('resize', function () { clearTimeout(compactRange.t); compactRange.t = setTimeout(function () { compactRange(); cardify(); }, 120); });
    compactRange();
    var last = null; try { last = localStorage.getItem('dsq_admin_last_tab'); } catch (e) {}
    if (last && last !== current() && document.getElementById('panel-' + last) && last !== 'calendar') { try { window.switchTab(last); } catch (e) {} }
    else afterSwitch(current());
  }
  function check() { var mp = document.getElementById('mainPage'); if (mp && !mp.classList.contains('hidden')) start(); }
  function boot() {
    var mp = document.getElementById('mainPage'); if (!mp) return;
    new MutationObserver(check).observe(mp, { attributes: true, attributeFilter: ['class'] });
    setTimeout(check, 400); setTimeout(check, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
