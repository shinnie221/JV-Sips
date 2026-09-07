const CACHE_NAME = 'jv-sips-v9';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/pos.html',
  '/pages/products.html',
  '/pages/reports.html',
  '/css/main.css',
  '/css/pos.css',
  '/css/products.css',
  '/css/reports.css',
  '/js/auth.js',
  '/js/db.js',
  '/js/firebase-config.js',
  '/js/cart.js',
  '/js/payment.js',
  '/js/pos.js',
  '/js/products.js',
  '/js/reports.js',
  '/js/seed.js',
  '/js/utils.js',
  '/manifest.json',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some assets could not be pre-cached:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy to ensure code updates are immediately served
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
