// src/features/notifications/NotificationContext.tsx
// Comprehensive Web Push Notification Context for Accelvia WMS

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppNotification, ToastNotification, NotificationCategory } from '../../types';
import { WebPushService } from '../../lib/notifications/push-service';
import { notificationAudio } from '../../lib/notifications/sound';

interface NotificationContextType {
  notifications: AppNotification[];
  toasts: ToastNotification[];
  unreadCount: number;
  permission: NotificationPermission | 'unsupported';
  soundEnabled: boolean;
  browserPushEnabled: boolean;
  notify: (payload: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => AppNotification;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  dismissToast: (toastId: string) => void;
  toggleSound: () => void;
  setBrowserPushEnabled: (enabled: boolean) => void;
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>;
  sendTestNotification: (category?: NotificationCategory) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY_NOTIFS = 'accelvia_notifications_v1';
const STORAGE_KEY_SOUND = 'accelvia_notification_sound_enabled';
const STORAGE_KEY_PUSH_PREF = 'accelvia_browser_push_preference';

// Initial seed notifications so user has context on first launch
const INITIAL_SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'seed-notif-1',
    title: '🎉 Welcome to Accelvia Push Alerts',
    body: 'Real-time push notifications are active for conversation updates and estimate approvals.',
    category: 'system',
    priority: 'normal',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: true,
  },
  {
    id: 'seed-notif-2',
    title: '📋 Estimate Scope v1.0 Ready',
    body: 'Initial estimate scope of 145 billable hours prepared for TechSphere Dynamics.',
    category: 'estimate_status',
    priority: 'normal',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
    project_id: 'proj-1',
    project_name: 'Enterprise Cloud Migration',
    estimate_version_id: 'ver-1',
  },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Stored notifications history
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window === 'undefined') return INITIAL_SEED_NOTIFICATIONS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
      return saved ? JSON.parse(saved) : INITIAL_SEED_NOTIFICATIONS;
    } catch {
      return INITIAL_SEED_NOTIFICATIONS;
    }
  });

  // 2. Active floating toast banners
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // 3. Audio sound preference (default: true)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SOUND);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // 4. User preference to enable browser push (default: true)
  const [browserPushEnabled, setBrowserPushEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PUSH_PREF);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // 5. Browser notification permission state
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    return WebPushService.getPermission();
  });

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifications.slice(0, 50)));
    } catch {
      // Storage quota safety
    }
  }, [notifications]);

  // Sync sound setting
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SOUND, String(next));
      } catch {}
      if (next) {
        notificationAudio.playConversationChime();
      }
      return next;
    });
  }, []);

  const setBrowserPushEnabled = useCallback((enabled: boolean) => {
    setBrowserPushEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_PUSH_PREF, String(enabled));
    } catch {}
  }, []);

  // Request browser permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    const res = await WebPushService.requestPermission();
    setPermission(res);
    return res;
  }, []);

  // Derived unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Update document title with unread badge counter e.g. "(2) Accelvia — WMS"
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseTitle = 'Accelvia — Work Management System';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [unreadCount]);

  // Register Service Worker if in production / supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        navigator.serviceWorker
          .register(new URL('../../sw.ts', import.meta.url), { type: 'module' })
          .catch(() => {});
      } catch {
        // Fallback gracefully
      }
    }
  }, []);

  // Core push notification dispatch
  const notify = useCallback(
    (payload: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification => {
      const newNotif: AppNotification = {
        ...payload,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };

      // 1. Add to state history (keep max 100 entries)
      setNotifications((prev) => [newNotif, ...prev.slice(0, 99)]);

      // 2. Add to active screen toasts
      const toastId = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastNotification = {
        ...newNotif,
        toast_id: toastId,
        created_at_ms: Date.now(),
      };
      setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Keep max 4 visible toasts

      // 3. Play Web Audio acoustic chime if sound is enabled
      if (soundEnabled) {
        if (payload.category === 'estimate_approved') {
          notificationAudio.playApprovedChime();
        } else if (payload.category === 'conversation') {
          notificationAudio.playConversationChime();
        } else {
          notificationAudio.playStatusChime();
        }
      }

      // 4. Trigger Native OS / Browser Push Notification if permission is granted
      if (browserPushEnabled && permission === 'granted') {
        WebPushService.dispatchNativeNotification(newNotif).catch(() => {});
      }

      return newNotif;
    },
    [soundEnabled, browserPushEnabled, permission]
  );

  // Auto-dismiss toasts after 5.5 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.created_at_ms < 5500));
    }, 500);
    return () => clearInterval(timer);
  }, [toasts.length]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toast_id !== toastId));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Quick test notification trigger
  const sendTestNotification = useCallback(
    (category: NotificationCategory = 'estimate_approved') => {
      if (category === 'estimate_approved') {
        notify({
          title: '🎉 Estimate Approved: v2.0 (145.00 hrs)',
          body: 'Management approved commercial estimate scope for Enterprise Cloud Migration ($7,250 USD / ৳870,000 BDT).',
          category: 'estimate_approved',
          priority: 'high',
          project_id: 'proj-1',
          project_name: 'Enterprise Cloud Migration',
          version_number: 2,
        });
      } else if (category === 'conversation') {
        notify({
          title: '💬 New Message from Sarah Jenkins',
          body: 'Architecture team uploaded the benchmark report. Please review when ready.',
          category: 'conversation',
          priority: 'normal',
          project_id: 'proj-1',
          author_name: 'Sarah Jenkins',
        });
      } else {
        notify({
          title: '📤 Estimate Dispatched to Client',
          body: 'Scope v2.0 sent to robert@techspheredynamics.com with secure review token.',
          category: 'estimate_status',
          priority: 'normal',
          project_id: 'proj-1',
        });
      }
    },
    [notify]
  );

  const value = useMemo(
    () => ({
      notifications,
      toasts,
      unreadCount,
      permission,
      soundEnabled,
      browserPushEnabled,
      notify,
      markAsRead,
      markAllAsRead,
      clearAll,
      removeNotification,
      dismissToast,
      toggleSound,
      setBrowserPushEnabled,
      requestPermission,
      sendTestNotification,
    }),
    [
      notifications,
      toasts,
      unreadCount,
      permission,
      soundEnabled,
      browserPushEnabled,
      notify,
      markAsRead,
      markAllAsRead,
      clearAll,
      removeNotification,
      dismissToast,
      toggleSound,
      setBrowserPushEnabled,
      requestPermission,
      sendTestNotification,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
