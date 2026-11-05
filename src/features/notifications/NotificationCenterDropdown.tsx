// src/features/notifications/NotificationCenterDropdown.tsx
// Rich Notification Center Dropdown with Web Push permission management and filter tabs

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from './NotificationContext';
import { AppNotification, NotificationCategory } from '../../types';
import { 
  BellIcon, 
  BellRingIcon, 
  Volume2Icon, 
  VolumeXIcon, 
  CheckCheckIcon, 
  Trash2Icon, 
  SparklesIcon 
} from '../../components/NotificationIcons';
import { 
  X, 
  CheckCircle2, 
  MessageSquare, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  Send,
  ExternalLink 
} from 'lucide-react';

interface NotificationCenterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  isOpen,
  onClose,
  onSelectNotification,
}) => {
  const {
    notifications,
    unreadCount,
    permission,
    soundEnabled,
    toggleSound,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    requestPermission,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'estimates' | 'chat'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtered list
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'estimates') {
      return n.category === 'estimate_approved' || n.category === 'estimate_status';
    }
    if (activeTab === 'chat') {
      return n.category === 'conversation';
    }
    return true;
  });

  const formatRelativeTime = (isoString: string): string => {
    try {
      const ms = Date.now() - new Date(isoString).getTime();
      const sec = Math.floor(ms / 1000);
      if (sec < 60) return 'Just now';
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hrs = Math.floor(min / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 sm:w-[420px] max-w-[92vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col text-xs text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
            <BellIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-emerald-600 dark:bg-emerald-500 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Web Push & Real-Time Workspace Alerts
            </div>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-1">
          {/* Mute / Unmute sound toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition ${
              soundEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? 'Chime sound active (Click to mute)' : 'Sound muted (Click to enable)'}
            aria-label="Toggle chime sound"
          >
            {soundEnabled ? <Volume2Icon className="w-3.5 h-3.5" /> : <VolumeXIcon className="w-3.5 h-3.5" />}
          </button>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Mark all notifications as read"
              aria-label="Mark all as read"
            >
              <CheckCheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </button>
          )}

          {/* Clear all */}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              title="Clear all notification history"
              aria-label="Clear all"
            >
              <Trash2Icon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close modal */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-1"
            aria-label="Close notifications panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Browser Native Push Permission Banner */}
      <div className="px-3.5 py-2.5 bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
        {permission === 'granted' ? (
          <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Browser Push Active (Desktop OS alerts on)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Granted</span>
          </div>
        ) : permission === 'denied' ? (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Browser push blocked in browser settings. In-app alerts remain active.</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              Get desktop push alerts when backgrounded.
            </div>
            <button
              type="button"
              onClick={requestPermission}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] tracking-wide transition shrink-0 shadow-xs"
            >
              Enable Browser Push
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold px-2 bg-slate-50/50 dark:bg-slate-950/30">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`py-2 px-3 border-b-2 transition ${
            activeTab === 'all'
              ? 'border-emerald-600 dark:border-teal-400 text-emerald-700 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('estimates')}
          className={`py-2 px-3 border-b-2 transition ${
            activeTab === 'estimates'
              ? 'border-emerald-600 dark:border-teal-400 text-emerald-700 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Estimates
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`py-2 px-3 border-b-2 transition ${
            activeTab === 'chat'
              ? 'border-emerald-600 dark:border-teal-400 text-emerald-700 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Conversation
        </button>
      </div>

      {/* Notifications List Body */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-1">
            <BellIcon className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-700" />
            <div className="font-semibold text-xs text-slate-600 dark:text-slate-400">
              No notifications in this filter
            </div>
            <p className="text-[11px]">
              You will receive real-time push alerts as soon as conversations update or estimates are approved.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isApproved = notif.category === 'estimate_approved';
            const isChat = notif.category === 'conversation';

            return (
              <div
                key={notif.id}
                onClick={() => {
                  markAsRead(notif.id);
                  onSelectNotification?.(notif);
                }}
                className={`p-3 transition cursor-pointer flex gap-3 items-start relative hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                  !notif.read ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                }`}
              >
                {/* Category Icon */}
                <div
                  className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 border ${
                    isApproved
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : isChat
                      ? 'bg-teal-100 dark:bg-teal-950/70 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-400'
                      : 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {isApproved ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isChat ? (
                    <MessageSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Layers className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {formatRelativeTime(notif.timestamp)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {notif.body}
                  </p>

                  {notif.project_name && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {notif.project_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Unread indicator / Remove button */}
                <div className="flex flex-col items-center justify-between h-full pt-1">
                  {!notif.read && (
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-teal-400 shrink-0 mb-2"
                      title="Unread"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notif.id);
                    }}
                    className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 transition"
                    title="Remove notification"
                    aria-label="Remove notification"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400">
        Notifications are preserved locally and synced with your browser session.
      </div>
    </div>
  );
};

