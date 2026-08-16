/* Offline is the point: mobile data drops mid-game and the comp list still
 * has to open.
 *
 * Next emits content-hashed files under /_next/, so the shell cannot be a
 * fixed file list - install() would 404 on the first rebuild and the worker
 * would never activate. Instead only the entry document is precached, and
 * build assets are cached as they are first requested.
 */
const VERSION = "v2";
const SHELL = `shell-${VERSION}`;
const DATA = `data-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const IMGS = `img-${VERSION}`;

const ENTRY = new URL("./", self.location).pathname;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.add(new Request(ENTRY, { cache: "reload" })))
      .catch(() => {}) // a failed precache must not block activation
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  const keep = [SHELL, DATA, ASSETS, IMGS];
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // champion and item art from the upstream CDN
  if (url.origin !== self.location.origin) {
    e.respondWith(cacheFirst(req, IMGS));
    return;
  }

  // the artifact: take a fresh copy when possible so a new patch lands
  // without a hard refresh, fall back to the last good one when offline
  if (url.pathname.endsWith("comps.json")) {
    e.respondWith(networkFirst(req, DATA));
    return;
  }

  // navigations always resolve to the single exported page
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match(ENTRY).then((r) => r ?? Response.error())),
    );
    return;
  }

  // hashed build output is immutable, so a cache hit is always correct
  e.respondWith(cacheFirst(req, ASSETS));
});

async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === "opaque") {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return Response.error();
  }
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}
