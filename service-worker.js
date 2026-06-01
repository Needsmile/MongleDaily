// service-worker.js
self.addEventListener('push', function(event) {
    console.log('[Service Worker] 푸시 수신 완료.');

    let data = { title: '새로운 그림일기 🎨', body: '새로운 일기가 올라왔구만두?' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/icon-192.png', // 내 PWA 아이콘 경로
        badge: '/icon-192.png',
        vibrate: [200, 100, 200], // 진동 패턴 (모바일)
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            { action: 'explore', title: '일기장 열기 📖' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 알림창 클릭 시 앱으로 이동 처리
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
