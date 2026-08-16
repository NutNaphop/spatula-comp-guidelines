/* Offline is the point: mobile data drops mid-game and the comp list still
 * has to open. App shell is cache-first; the artifact is
 * network-first-with-fallback so a new patch lands without a hard refresh
 * but a dead connection still renders the last good copy.
 */
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const DATA = `data-${VERSION}`;
const IMGS = `img-${VERSION}`;

const SHELL_FILES = [
  './', 'index.html', 'app.js', 'styles.css', 'manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => ![SHELL, DATA, IMGS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // champion / item art from the upstream CDN - cache on first sight
  if (url.origin !== self.location.origin) {
    e.respondWith(cacheFirst(req, IMGS));
    return;
  }
  if (url.pathname.endsWith('comps.json')) {
    e.respondWith(networkFirst(req, DATA));
    return;
  }
  e.respondWith(cacheFirst(req, SHELL));
});

async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') {
      (await caches.open(cacheName)).put(req, res.clone());
    }
    return res;
  } catch (err) {
    return hit || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(cacheName)).put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}
