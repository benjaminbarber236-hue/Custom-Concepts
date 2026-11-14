// Keeps Field Notes working with no internet: the app files are saved on the first visit.
const CACHE = 'field-notes-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Serve from the saved copy right away, and refresh it in the background when online.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const ok = url.origin === location.origin || url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (!ok) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || fresh;
  }));
});
