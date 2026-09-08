const BASE = new URL('./', self.location.href).href;
const PREFIX = 'buffer-bath-' + new URL(BASE).pathname + '-';
const CACHE = PREFIX + 'standalone-v2';
const HOME = new URL('./', BASE).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    HOME, new URL('manifest.webmanifest', BASE).href, new URL('favicon.svg', BASE).href
  ])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(BASE)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => (await caches.match(event.request)) ||
    (event.request.mode === 'navigate' ? await caches.match(HOME) : Response.error())));
});
