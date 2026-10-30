// src/lib/notifications/push-service.ts
// Native HTML5 & Service Worker Web Push Notification Manager

import { AppNotification } from '../../types';

// Crisp Accelvia brand badge SVG as base64 data URI for native notification icons
const ACCELVIA_ICON_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%23059669"/><text x="50%" y="54%" font-family="system-ui,sans-serif" font-weight="900" font-size="34" fill="white" dominant-baseline="middle" text-anchor="middle">A</text></svg>`;

export class WebPushService {
  /**
   * Check if the current browser environment supports the Web Notification API
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Current browser permission status
   */
  static getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Prompt user to grant native browser push notification permission
   */
  static async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (err) {
      console.warn('Native push permission request failed:', err);
      return Notification.permission;
    }
  }

  /**
   * Trigger a native operating system / browser push alert
   */
  static async dispatchNativeNotification(notif: AppNotification): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const options: NotificationOptions & { renotify?: boolean } = {
      body: notif.body,
      icon: ACCELVIA_ICON_DATA_URI,
      badge: ACCELVIA_ICON_DATA_URI,
      tag: `accelvia-${notif.category}-${notif.id}`,
      renotify: true,
      data: {
        id: notif.id,
        category: notif.category,
        projectId: notif.project_id,
        url: window.location.href,
      },
    };

    // 1. Prefer Service Worker if active and ready
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(notif.title, options);
          return true;
        }
      } catch {
        // Fall back to Notification constructor if service worker is not active
      }
    }

    // 2. Direct Window Notification API
    try {
      const nativeNotif = new Notification(notif.title, options);
      nativeNotif.onclick = () => {
        try {
          window.focus();
        } catch {}
        nativeNotif.close();
      };
      return true;
    } catch (e) {
      console.warn('Direct notification construction failed:', e);
      return false;
    }
  }
}
