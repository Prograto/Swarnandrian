/*
  Kill-switch service worker.
  Ensures any previously installed SW on this origin is removed.
*/
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (e) {
      // ignore cache deletion errors
    }

    await self.clients.claim();

    await self.registration.unregister();
  })());
});

self.addEventListener('fetch', () => {
  // Intentionally no-op: never intercept requests.
});
