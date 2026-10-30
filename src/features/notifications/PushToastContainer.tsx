// src/features/notifications/PushToastContainer.tsx
// Floating interactive Web Push Toast Notifications with slide-in animation

import React from 'react';
import { useNotifications } from './NotificationContext';
import { ToastNotification } from '../../types';
import { 
  BellIcon, 
  CheckCheckIcon, 
  Volume2Icon, 
  VolumeXIcon, 
  Trash2Icon, 
  SparklesIcon 
} from '../../components/NotificationIcons';
import { X, CheckCircle2, MessageSquare, Layers, AlertCircle } from 'lucide-react';

export const PushToastContainer: React.FC<{ onNavigateToScope?: () => void; onNavigateToChat?: () => void }> = ({
  onNavigateToScope,
  onNavigateToChat,
}) => {
  const { toasts, dismissToast, markAsRead } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Push notifications"
      className="fixed top-16 right-3 sm:right-6 z-50 flex flex-col gap-2.5 max-w-[390px] w-[calc(100vw-24px)] pointer-events-none select-none"
    >
      {toasts.map((toast) => {
        const isApproved = toast.category === 'estimate_approved';
        const isChat = toast.category === 'conversation';

        return (
          <div
            key={toast.toast_id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex flex-col rounded-xl border p-3.5 backdrop-blur-md shadow-xl transition-all duration-300 transform translate-y-0 opacity-100 ${
              isApproved
                ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-500 dark:border-emerald-500/70 shadow-emerald-600/10 dark:shadow-emerald-950/60'
                : isChat
                ? 'bg-white/95 dark:bg-slate-900/95 border-teal-500 dark:border-teal-500/60 shadow-teal-600/10 dark:shadow-teal-950/50'
                : 'bg-white/95 dark:bg-slate-900/95 border-amber-500 dark:border-amber-500/60 shadow-amber-600/10 dark:shadow-amber-950/50'
            }`}
          >
            {/* Top row: Category Badge & Dismiss */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {isApproved ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Estimate Approved
                  </span>
                ) : isChat ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                    <MessageSquare className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                    Conversation Update
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <Layers className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    Estimate Status
                  </span>
                )}

                {toast.project_name && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] font-medium">
                    {toast.project_name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-mono">Just now</span>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.toast_id)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label="Dismiss toast"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification Title & Body */}
            <div
              className="cursor-pointer"
              onClick={() => {
                markAsRead(toast.id);
                dismissToast(toast.toast_id);
                if (isApproved || toast.category === 'estimate_status') {
                  onNavigateToScope?.();
                } else if (isChat) {
                  onNavigateToChat?.();
                }
              }}
            >
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {toast.title}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                {toast.body}
              </p>
            </div>

            {/* Mini Progress Bar indicating lifespan */}
            <div className="mt-2.5 h-0.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full animate-toast-shrink ${
                  isApproved
                    ? 'bg-emerald-500'
                    : isChat
                    ? 'bg-teal-500'
                    : 'bg-amber-500'
                }`}
              />
            </div>
          </div>
        );
      })}
    </aside>
  );
};

