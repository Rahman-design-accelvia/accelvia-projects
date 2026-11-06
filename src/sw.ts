// src/sw.ts
// Production Service Worker for Accelvia Mobile PWA:
// - App Shell Asset Caching & Offline Resilience
// - Native Web Push Notifications (Android & iOS 16.4+ standalone)
// - Click-to-Focus Window Navigation & Vibration Patterns

const CACHE_NAME = 'accelvia-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

const sw = self as any;

// 1. Install Event: Pre-cache core application shell
sw.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => {
        console.warn('SW pre-cache warning:', err);
      })
      .then(() => sw.skipWaiting())
  );
});

// 2. Activate Event: Clean up stale caches & claim clients immediately
sw.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => sw.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate caching for instant mobile loads
sw.addEventListener('fetch', (event: any) => {
  const request = event.request;

  // Only cache GET requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Bypass cache for Supabase or external APIs
  if (request.url.includes('supabase.co') || request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Notification Click Event: Focus existing window or open app
sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      for (const client of clientList) {
        if ('focus' in client && 'url' in client) {
          return client.focus();
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow('/');
      }
    })
  );
});

// 5. Push Notification Event: Native Mobile Push with Sound & Vibration
sw.addEventListener('push', (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Accelvia Notification';
    const options: Record<string, any> = {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'accelvia-alert',
      data: data.data || {},
    };
    event.waitUntil(sw.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      sw.registration.showNotification('Accelvia Notification', {
        body: text,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
      })
    );
  }
});

export {};
