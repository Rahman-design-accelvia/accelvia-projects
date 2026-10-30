// src/sw.ts
// Service Worker for Background Web Push & Notification Click Handling

const sw = self as unknown as {
  addEventListener: (type: string, listener: (event: any) => void) => void;
  skipWaiting: () => Promise<void>;
  clients: {
    claim: () => Promise<void>;
    matchAll: (options?: any) => Promise<any[]>;
    openWindow?: (url: string) => Promise<any>;
  };
  registration: {
    showNotification: (title: string, options?: any) => Promise<void>;
  };
};

sw.addEventListener('install', () => {
  sw.skipWaiting();
});

sw.addEventListener('activate', (event: any) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow('/');
      }
    })
  );
});

sw.addEventListener('push', (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Accelvia Notification';
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: data.data || {},
    };
    event.waitUntil(sw.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      sw.registration.showNotification('Accelvia Notification', {
        body: text,
      })
    );
  }
});

export {};
