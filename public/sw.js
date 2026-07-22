const CACHE = "fba-manager-v2";
const STATIC_CACHE = "fba-manager-static-v2";
const API_CACHE = "fba-manager-api-v2";
const OFFLINE_URL = "/offline";

const API_PATTERNS = [
  /\/api\/(products|inventory|sales|suppliers|orders|dashboard|settings|notifications)\/?/,
  /\/api\/(expenses|returns|reimbursements|shipments|ppc-campaigns|forecasting)/,
  /\/api\/(members|tasks|board-decisions|reorder-rules)/,
  /\/api\/analytics\//,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        OFFLINE_URL,
        "/logo_solo.png",
        "/LOGO.png",
        "/banner.png",
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) => k !== CACHE && k !== STATIC_CACHE && k !== API_CACHE
          )
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isApiRequest(url: string): boolean {
  return API_PATTERNS.some((p) => p.test(url));
}

function isStaticAsset(url: string): boolean {
  return /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp)$/.test(url);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  // Navigation requests: network-first, fallback to offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match(OFFLINE_URL);
          })
        )
    );
    return;
  }

  // API requests: network-first, cache on success, fallback to cached
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })))
    );
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "FBA Manager", {
      body: data.body || "New notification",
      icon: "/logo_solo.png",
      badge: "/logo_solo.png",
      data: data.url || "/dashboard",
      tag: data.tag || "fba-notification",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data || "/dashboard";
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
