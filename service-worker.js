// Service Worker for पतपेढी PWA
// This must be hosted as a real file (same folder as index.html) — it cannot be
// embedded inline or loaded from a blob: URL, since browsers only allow service
// worker registration from a genuine same-origin HTTPS (or localhost) file path.

const CACHE_NAME = 'patpedhi-cache-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json'
];

// Install: cache the app shell so the site can open even with a flaky connection.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old cache versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for everything (so members always get the latest data/app
// code and Supabase calls always hit the real network), falling back to the
// cached app shell only if the network is unavailable (e.g., no signal) and the
// request is for a page navigation.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // never cache POST/PUT etc.

  event.respondWith(
    fetch(event.request).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return caches.match(event.request);
    })
  );
});
