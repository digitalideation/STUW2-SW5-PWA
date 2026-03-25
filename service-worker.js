// ──────────────────────────────────────────────
//  Service Worker — the heart of offline support
// ──────────────────────────────────────────────

// Bump this version string whenever you change any cached file.
// That triggers the "install" event again so the new files get cached.
const CACHE_NAME = "simple-pwa-v3";

// Files to cache so the app works offline (the "app shell").
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/about.html",
  "/apis.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// External API URLs that should use Network-First caching.
// We try the network and cache the response; when offline we serve the cache.
const NETWORK_FIRST_URLS = ["https://www.freepublicapis.com/api/"];

// ── INSTALL ─────────────────────────────────
// Runs once when the browser first registers this service worker
// (or when CACHE_NAME changes).
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching app shell");
      return cache.addAll(FILES_TO_CACHE);
    }),
  );
  // Activate immediately instead of waiting for old tabs to close.
  self.skipWaiting();
});

// ── ACTIVATE ────────────────────────────────
// Runs when the new service worker takes control.
// Good place to clean up old caches.
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
  // Take control of all open tabs immediately.
  self.clients.claim();
});

// ── Helpers ─────────────────────────────────

function isNetworkFirst(url) {
  return NETWORK_FIRST_URLS.some((prefix) => url.startsWith(prefix));
}

// Network-First: try the network, cache the response, fall back to cache.
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      // Clone because the response body can only be consumed once.
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    })
    .catch(() => caches.match(request));
}

// Cache-First: serve from cache, fall back to network.
function cacheFirst(request) {
  return caches.match(request).then((cachedResponse) => {
    if (cachedResponse) {
      return cachedResponse;
    }
    return fetch(request);
  });
}

// ── FETCH ───────────────────────────────────
// Intercepts every network request the page makes.
self.addEventListener("fetch", (event) => {
  if (isNetworkFirst(event.request.url)) {
    // API calls → Network-First so we always get fresh data when online,
    // but still serve cached data when offline.
    event.respondWith(networkFirst(event.request));
  } else {
    // App shell files → Cache-First (fast, already pre-cached).
    event.respondWith(cacheFirst(event.request));
  }
});
