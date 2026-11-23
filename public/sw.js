// Network-first for app files so updates land immediately; cache fallback for offline gyms.
const CACHE = 'liftlab-v12';
const SHELL = ['/', '/index.html', '/css/app.css', '/js/app.js', '/js/claude.js', '/js/mobility.js', '/fonts/inter-latin-400-normal.woff2', '/fonts/inter-latin-500-normal.woff2', '/fonts/inter-latin-600-normal.woff2', '/fonts/inter-latin-700-normal.woff2', '/fonts/inter-tight-latin-700-normal.woff2', '/fonts/inter-tight-latin-800-normal.woff2', '/js/engine.js', '/js/exercises.js', '/js/store.js', '/js/bodymap.js', '/js/charts.js', '/manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const isShell = url.origin === location.origin;
  const isSdk = url.hostname === 'www.gstatic.com';
  if (!isShell && !isSdk) return;
  e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
});
