const CACHE_NAME = 'fairshare-cache-v1';
const urlsToCache = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  // IMPORTANT: Ensure these icon files exist in your project root!
  'icon-192.png', 
  'icon-512.png'
];

self.addEventListener('install', event => {
  // Perform installation steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
