const CACHE_NAME = 'enare-simu-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css?v=2',
  '/script.js',
  '/questions.json',
  '/logo.svg',
  '/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
