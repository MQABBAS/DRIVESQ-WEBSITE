/* ══════════════════════════════════════════════
   DriveSQ Instructor — Service Worker
   Handles: push notifications, offline caching
══════════════════════════════════════════════ */

const CACHE_NAME = 'drivesq-instructor-v1';
const OFFLINE_URLS = [
  '/dashboard.html',
  '/dashboard-manifest.json',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
];

/* ── INSTALL: cache core assets ── */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(OFFLINE_URLS).catch(function() {
        // Silently skip assets that fail (CDN may block SW fetch)
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* ── ACTIVATE: clear old caches ── */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ── FETCH: network-first, fall back to cache ── */
self.addEventListener('fetch', function(e) {
  // Only handle GET requests to our own origin
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request).then(function(response) {
      // Cache successful responses for dashboard.html
      if (response && response.status === 200 && url.pathname === '/dashboard.html') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Offline fallback
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/dashboard.html');
      });
    })
  );
});

/* ── PUSH: receive notification ── */
self.addEventListener('push', function(e) {
  let data = { title: 'DriveSQ', body: 'You have a new update.', tag: 'drivesq-general' };
  try {
    if (e.data) {
      const parsed = e.data.json();
      data = Object.assign(data, parsed);
    }
  } catch(err) {
    if (e.data) data.body = e.data.text();
  }

  const options = {
    body: data.body,
    icon: 'https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png',
    badge: 'https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png',
    tag: data.tag || 'drivesq-general',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard.html' },
    actions: data.actions || []
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'DriveSQ', options)
  );
});

/* ── NOTIFICATION CLICK: open/focus app ── */
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || '/dashboard.html';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      // Focus existing window if open
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        if (client.url.includes('dashboard.html') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/* ── PUSH SUBSCRIPTION CHANGE ── */
self.addEventListener('pushsubscriptionchange', function(e) {
  e.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: e.oldSubscription ? e.oldSubscription.options.applicationServerKey : null
    })
  );
});
