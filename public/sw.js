self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

// Badge counter
function updateBadge() {
  return self.registration.getNotifications().then(n => {
    if (navigator.setAppBadge) {
      n.length > 0 ? navigator.setAppBadge(n.length) : navigator.clearAppBadge();
    }
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  let payload = { title: 'Postocard', body: '', tag: undefined, data: {} };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; }
  catch { payload.body = event.data ? event.data.text() : ''; }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Postocard', {
      body: payload.body,
      tag: payload.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data,
    }).then(() => updateBadge())
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/feed';
  event.waitUntil(
    updateBadge().then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        for (const c of clients) { if ('focus' in c) { c.focus(); try { c.navigate(url); } catch {} return; } }
        return self.clients.openWindow(url);
      })
    )
  );
});
