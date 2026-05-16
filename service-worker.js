/**
 * Priora — Service Worker
 * Strategy : Cache-First with Network Fallback
 * Version  : bump CACHE_NAME when you deploy a new build
 */

const CACHE_NAME = 'priora-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching core assets');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ── MESSAGES ───────────────────────────────────────────────────────────────
const _reminderTimers = {};

self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Schedule background reminder notification
  if (event.data.type === 'SCHEDULE_REMINDER') {
    const { id, name, delay } = event.data;
    // Clear existing timer for this id
    if (_reminderTimers[id]) clearTimeout(_reminderTimers[id]);

    _reminderTimers[id] = setTimeout(() => {
      self.registration.showNotification('Priora', {
        body: `حان وقت متابعة ${name}`,
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: id,
        requireInteraction: false,
        data: { id }
      });
      delete _reminderTimers[id];
    }, delay);
  }

  if (event.data.type === 'CANCEL_REMINDER') {
    const { id } = event.data;
    if (_reminderTimers[id]) {
      clearTimeout(_reminderTimers[id]);
      delete _reminderTimers[id];
    }
  }
});

// ── NOTIFICATION CLICK ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});
