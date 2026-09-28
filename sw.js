var CACHE_NAME = "lift-log-v28";
var APP_SHELL = ["./index.html"];

// GitHub Pages serves the app shell with Cache-Control: max-age=600. Anything
// that goes through the browser's HTTP cache can therefore hand back a stale
// page for ten minutes, so every network fetch below deliberately bypasses it.
function freshRequest(url) {
  return new Request(url, { cache: "no-store", credentials: "same-origin" });
}

function isShell(request) {
  if (request.mode === "navigate") return true;
  return /\/(index\.html)?$/.test(new URL(request.url).pathname);
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL.map(function (u) { return freshRequest(u); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Network-first: always prefer the live version when online (so updates show up
// immediately), and fall back to the last cached copy when offline. The shell is
// re-requested with no-store so a new build is never masked by the HTTP cache.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var networkRequest = isShell(event.request) ? freshRequest(event.request.url) : event.request;
  event.respondWith(
    fetch(networkRequest).then(function (networkResponse) {
      var copy = networkResponse.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      return networkResponse;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match("./index.html");
      });
    })
  );
});
