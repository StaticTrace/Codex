const CACHE_NAME = "codex-cache-v1";

// Core assets to cache for offline use
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/styles.css",
  "/main.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png"
];

// Install: cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting(); // Activate immediately
});

// Activate: remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Take control immediately
});

// Fetch strategy: hybrid offline-first + auto-update
self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          // Update cache with fresh version
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => cachedResponse); // fallback to cache if offline

      // If cached, return it immediately; otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
