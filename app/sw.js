// Lets Job Tracker open with no internet: the app's own files are saved on this device.
// Your data never goes through here; it's kept in the app's own storage and synced to your database.
const CACHE = 'job-tracker-app-v4';
const SHELL = ['./', 'index.html', 'supabase.js', 'leaflet.js', 'leaflet.css', 'manifest.webmanifest', 'icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const appFile = url.origin === location.origin;
  const font = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (!appFile && !font) return; // database and file requests go straight to the network
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    // Use the saved copy right away; refresh it in the background so updates arrive next launch.
    const fresh = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || fresh;
  }));
});
