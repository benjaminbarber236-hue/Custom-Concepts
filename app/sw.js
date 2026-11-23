// Lets Job Tracker open with no internet: the app's own files are saved on this device.
// With internet it always loads the newest version; the saved copy is only used offline or on a very slow connection.
// Your data never goes through here; it's kept in the app's own storage and synced to your database.
const CACHE = 'job-tracker-app-v6';
// Map pictures you've looked at are kept too, so those areas still show with no signal.
const TILES = 'job-tracker-map-tiles-v1';
const TILE_HOSTS = ['tile.openstreetmap.org', 'server.arcgisonline.com'];
const MAX_TILES = 4000;
const SHELL = ['./', 'index.html', 'supabase.js', 'leaflet.js', 'leaflet.css', 'manifest.webmanifest', 'icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's own short-term cache so the saved copy is truly the newest.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== TILES).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) return e.respondWith(networkFirst(req));
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') return e.respondWith(cacheFirst(req));
  if (TILE_HOSTS.includes(url.host)) return e.respondWith(tile(req));
  // Everything else (database, files, map pictures) goes straight to the network.
});
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const fresh = fetch(req, { cache: 'no-cache' }).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
  const slow = new Promise((resolve) => setTimeout(resolve, 4000, null));
  try {
    const res = await Promise.race([fresh, slow]);
    if (res) return res;
  } catch (e) { /* offline */ }
  const cached = await cache.match(req, { ignoreSearch: true });
  return cached || fresh;
}
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

// Map pictures: use the saved one if there is one, otherwise download and keep it.
let trimming = false;
async function tile(req) {
  const cache = await caches.open(TILES);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    if (!trimming && Math.random() < 0.05) {
      trimming = true;
      cache.keys().then((keys) => Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_TILES)).map((k) => cache.delete(k)))).finally(() => { trimming = false; });
    }
  }
  return res;
}
