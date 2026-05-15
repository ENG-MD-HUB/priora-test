/**
 * Priora — Service Worker
 * Strategy : Cache-First with Network Fallback
 * Version  : bump CACHE_NAME when you deploy a new build
 */

const CACHE_NAME = 'priora-v1';

// All core assets to pre-cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── INSTALL ────────────────────────────────────────────────────────────────
// Pre-cache every core asset immediately; skip waiting so the new SW
// activates without requiring a second page load.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching core assets');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// ── ACTIVATE ───────────────────────────────────────────────────────────────
// Delete any caches from older versions; claim all open clients so the
// new SW controls them without a reload.
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
  self.clients.claim(); // Take control of all open tabs
});

// ── FETCH ──────────────────────────────────────────────────────────────────
// Cache-First: serve from cache if available; otherwise fetch from network,
// store the response in cache, and return it.
// Non-GET requests (POST etc.) are always passed through to the network.
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (e.g. Google Fonts CDN)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache immediately
        return cached;
      }

      // Not in cache — fetch from network, cache it, return it
      return fetch(event.request)
        .then(response => {
          // Only cache valid responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone: one copy for the cache, one for the browser
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));

          return response;
        })
        .catch(() => {
          // Network failed and nothing in cache — return offline fallback
          // For navigation requests, return the cached index.html
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ── UPDATE MESSAGE ─────────────────────────────────────────────────────────
// When the main page sends a SKIP_WAITING message, activate the new SW
// immediately so the user gets the update without a second reload.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
