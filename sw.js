// Service Worker - Auditoría Friosur PWA
const CACHE_NAME = 'friosur-audit-v4'; // ← v4: maestro vía Apps Script con token + JSONP (evita CORS)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // El maestro de clientes ya NO se precachea acá: se sirve desde el Apps Script
  // con token (network-first + cache dinámico en el fetch handler).
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching core assets v2');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy: Network First for JSON data, Cache First for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Maestro de clientes: ahora llega del Apps Script (?action=clientes&token=...).
  // Network-first con fallback a cache para que siga funcionando offline.
  if (url.searchParams.get('action') === 'clientes' ||
      url.pathname.endsWith('clientes_maestro.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For POST requests (Google Sheets): let them pass through
  if (event.request.method === 'POST') {
    return;
  }

  // For everything else: cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses for fonts/CDN
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});