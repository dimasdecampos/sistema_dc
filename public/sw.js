/* Service worker do TemAqui: recebe notificações push de mensagens e abre o chat ao tocar. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Se o app já está na tela, o próprio site avisa; não duplica
      if (windows.some((w) => w.visibilityState === 'visible')) return undefined;

      return self.registration.showNotification(data.title || 'TemAqui', {
        body: data.body || 'Você recebeu uma mensagem nova.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.conversationId ? 'conv-' + data.conversationId : 'chat',
        renotify: true,
        data: { conversationId: data.conversationId || null },
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const conversationId = event.notification.data && event.notification.data.conversationId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.postMessage({ type: 'open-chat', conversationId });
          return client.focus();
        }
      }
      return self.clients.openWindow(conversationId ? '/?chat=' + conversationId : '/?chat=');
    })
  );
});
