const CACHE_NAME = "codex-cache-v2";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/Home.html",
  "/Codex.html",
  "/manifest.json",

  // Styles
  "/Styles.css",

  // JavaScript
  "/Shared.js",
  "/Settings.js",
  "/CodexUI.js",
  "/CodexStorage.js",
  "/marked.min.js",

  // Icons
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png"
];

// Install: cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: offline-first with background update
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Background Sync for offline operations (entries sync queue)
self.addEventListener("sync", event => {
  if (event.tag === "sync-entries") {
    event.waitUntil(
      (async () => {
        console.log("[Service Worker] Background sync triggered for entries");
        // In a real server-backed app: process syncQueue from IndexedDB and POST/PUT/DELETE to server
        // For this local-only Codex: clear processed queue (demo)
        try {
          const db = await openCodexDB();
          const tx = db.transaction("syncQueue", "readwrite");
          const store = tx.objectStore("syncQueue");
          await store.clear();
          console.log("[Service Worker] Sync queue processed (local-only demo)");
          // Notify clients (optional)
          self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: "SYNC_COMPLETE" }));
          });
        } catch (err) {
          console.error("[Service Worker] Sync failed:", err);
        }
      })()
    );
  }
});

async function openCodexDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("CodexDB", 2);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("entries")) {
        db.createObjectStore("entries", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}