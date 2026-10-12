const VERSION = "v26";
const SHELL_CACHE = `aptfindr-shell-${VERSION}`;
const RUNTIME_CACHE = `aptfindr-runtime-${VERSION}`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/aptfindr-logo.png",
  "/aptfindr-wordmark.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

async function cacheAppShell() {
  const cache = await caches.open(SHELL_CACHE);
  // These are the minimum files needed to launch the app or explain an offline miss.
  await cache.addAll(APP_SHELL);

  // Cache every production chunk, not just the landing page. This lets users
  // reopen app routes they've never visited before while offline. A missing
  // optional asset must not prevent the service worker from installing.
  let manifestResponse;
  try {
    manifestResponse = await fetch("/asset-manifest.json", { cache: "no-store" });
  } catch {
    return;
  }
  if (!manifestResponse.ok || !manifestResponse.headers.get("content-type")?.includes("json")) return;

  let buildManifest;
  try {
    buildManifest = await manifestResponse.json();
  } catch {
    return;
  }
  const buildAssets = new Set();
  for (const entry of Object.values(buildManifest)) {
    if (entry.file) buildAssets.add(`/${entry.file}`);
    for (const stylesheet of entry.css || []) buildAssets.add(`/${stylesheet}`);
    for (const asset of entry.assets || []) buildAssets.add(`/${asset}`);
  }

  await Promise.allSettled(
    [...buildAssets].map(async (asset) => {
      const response = await fetch(asset, { cache: "no-store" });
      if (response.ok && (response.type === "basic" || response.type === "cors")) {
        await cache.put(asset, response);
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("aptfindr-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match("/index.html")) || (await caches.match("/offline.html"))),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || ["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok && (response.type === "basic" || response.type === "cors")) {
              const copy = response.clone();
              event.waitUntil(caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)));
            }
            return response;
          })
          .catch(() => Response.error());
      }),
    );
  }
});
