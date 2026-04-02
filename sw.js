self.addEventListener('install', (e) => {
    console.log('[Service Worker] Đã cài đặt');
});
self.addEventListener('fetch', (e) => {
    // Basic fetch để app thỏa mãn điều kiện PWA
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});