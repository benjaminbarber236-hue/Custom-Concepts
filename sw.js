// Offline support: serve the app shell from cache, refresh it in the background.
const CACHE = 'wc-tracker-v6';
const SHELL = [
  './', 'index.html', 'css/styles.css', 'js/icons.js', 'js/constants.js', 'js/files.js', 'js/importer.js', 'js/ui.js', 'js/store.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Stale-while-revalidate for same-origin GETs.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const origin = new URL(req.url).origin;
  // Same-origin app files, plus the PDF viewer library so documents open offline after first use.
  if (req.method !== 'GET' || (origin !== location.origin && origin !== 'https://cdnjs.cloudflare.com')) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || fresh;
  }));
});
