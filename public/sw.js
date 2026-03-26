// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('sunset-360-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        'https://i.postimg.cc/zf4sFBPC/LOGO-ICONE-APP-INSTALATION.png?v=2',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
