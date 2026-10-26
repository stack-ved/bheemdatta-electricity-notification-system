self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Bheemdatta Electricity Alert', body: event.data?.text() || 'A new electricity update is available.' };
  }

  const title = payload.title || 'Bheemdatta Electricity Alert';
  const options = {
    body: payload.body || 'A new electricity update is available.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || 'electricity-alert',
    data: { url: payload.url || '/alerts' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/alerts', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
