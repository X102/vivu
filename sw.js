self.addEventListener('install', (e) => {
    console.log('[Service Worker] Đã cài đặt');
    self.skipWaiting(); // Ép bản cập nhật mới có hiệu lực ngay
});

self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Đã kích hoạt');
    e.waitUntil(clients.claim()); // Giúp Service Worker kiểm soát trang web ngay lập tức
});

self.addEventListener('fetch', (event) => {
    // QUAN TRỌNG: Chỉ chặn và xử lý các đường dẫn HTTP / HTTPS
    // Bỏ qua các đường dẫn ws:// (Live Server) hoặc chrome-extension://
    if (!event.request.url.startsWith('http')) {
        return; 
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                // Trả về trang lỗi trống để không sập trình duyệt khi mất mạng
                return new Response('Bạn đang ngoại tuyến (Offline).', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                });
            });
        })
    );
});