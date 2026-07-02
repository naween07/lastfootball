/* LastFootball service worker — web push notifications (goal / full-time alerts) */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { /* ignore malformed */ }
  event.waitUntil(
    self.registration.showNotification(d.title || 'LastFootball', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || undefined, // dedupes if the same event is delivered twice
      data: { url: d.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      try {
        await w.navigate(url);
        return w.focus();
      } catch { /* fall through to openWindow */ }
    }
    return self.clients.openWindow(url);
  })());
});
