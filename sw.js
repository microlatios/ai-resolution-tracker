/* Service worker: offline-first app shell for the tracker. */

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `ai-resolution-tracker-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ai-resolution-tracker-runtime-${CACHE_VERSION}`;

// Keep this list small and stable.
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k === APP_SHELL_CACHE || k === RUNTIME_CACHE) return Promise.resolve();
          if (k.startsWith("ai-resolution-tracker-")) return caches.delete(k);
          return Promise.resolve();
        }),
      );
      await self.clients.claim();
    })(),
  );
});

function isNavigationRequest(request) {
  return request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const res = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  const fetchPromise = fetch(request)
    .then(async (res) => {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("Offline", { status: 503, statusText: "Offline" });
}

async function networkFirstForNav(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put("./index.html", res.clone());
    return res;
  } catch {
    const cached = await caches.match("./index.html", { ignoreSearch: true });
    if (cached) return cached;
    return new Response("Offline and no cached app shell yet.", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // SPA-style navigation fallback: return cached index.html when offline.
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstForNav(request));
    return;
  }

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Cache app shell assets aggressively.
  if (sameOrigin && APP_SHELL.some((p) => url.pathname.endsWith(p.replace("./", "")))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // For other GETs, prefer showing something fast and update in background.
  if (sameOrigin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

