// Service worker of the site: makes the landing page, the launchers and the games work offline
// once they have been opened online. See "Offline" in docs/mlu1/specifications.md (section 2).
//
// Every same-origin GET inside the worker's scope goes to the network first, so a reload always
// gets the current files; each successful answer is also kept in a cache. Only when the network
// cannot be reached at all is the request answered from that cache. Each game fetches every image
// and sound when it starts, so opening a game once online is enough to play it offline. Errors
// such as 404 are passed through as they are and never replaced by a cached copy.

const PREFIX = 'mlu-web-'; // the site's caches; the origin may hold other sites' caches
const CACHE = `${PREFIX}v1`;

// The landing page's own files, fetched before the worker took control of the first visit.
const LANDING = ['./', 'index.css', 'site.webmanifest', 'favicon.ico', 'apple-touch-icon.png',
  'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One at a time, so that one missing file cannot stop the worker from installing.
    await Promise.all(LANDING.map((path) => cache.add(path).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      // A redirected answer cannot serve a later navigation, and errors are not worth keeping.
      if (response.status === 200 && !response.redirected) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
      }
      return response;
    } catch (err) {
      // Offline. Pages are matched without their query string (?scale=...).
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
      if (hit) return hit;
      throw err;
    }
  })());
});
