const CACHE = 'health-tracker-v13';
const ASSETS = [
  './',
  './index.html',
  './export.html',
  './styles.css',
  './app.js',
  './export.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Bob embeds this app as ../health-tracker/?theme=…&_v=<ts> — match the
  // cached shell regardless of the query or offline loads fail and every
  // _v value piles a new copy into the cache.
  const matchOpts = req.mode === 'navigate' ? { ignoreSearch: true } : undefined;
  e.respondWith(
    caches.match(req, matchOpts).then(cached => {
      const fetchPromise = fetch(req).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
