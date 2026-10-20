/* Service worker do TemAqui: recebe notificações push de mensagens e abre o chat ao tocar. */

// Cache só dos arquivos do próprio site. Chamadas ao Supabase (outra origem) nunca passam por aqui,
// então dados e fotos dos anúncios continuam sempre vindo da rede.
const CACHE = 'temaqui-static-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Arquivos com hash no nome (/assets/*) nunca mudam: cache primeiro
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            // o rewrite do Vercel devolve a página no lugar de arquivo inexistente: não guardar isso
            if (res.ok && !(res.headers.get('content-type') || '').includes('text/html')) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Página: rede primeiro (deploy novo aparece na hora); sem internet, abre a última versão guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
  }
});

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
