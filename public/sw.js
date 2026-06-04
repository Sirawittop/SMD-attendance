// Service Worker for School Attendance PWA
const CACHE_NAME = "attendance-pwa-v1";
const ASSETS = [
  "/",
  "/login",
  "/student",
  "/manifest.json",
  "/icon.svg",
  "/globals.css"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Return cached asset or make a network fetch
      return cachedResponse || fetch(e.request).catch(() => {
        // Fallback for API / other pages if offline
        return caches.match("/");
      });
    })
  );
});
