// src/components/InstallAppBanner.tsx
// In-App PWA Install Banner & iOS "Add to Home Screen" Walkthrough Sheet
// Enables 1-tap installation on Android & native push notification activation on iOS

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, CheckCircle2, BellRing, Sparkles } from 'lucide-react';
import { useTheme } from '../features/theme/ThemeContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallAppBanner: React.FC = () => {
  const { accentColor } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if already installed in standalone mode
    const checkStandalone = () => {
      const isWindowStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (window.navigator as any).standalone === true;
      return isWindowStandalone || isNavStandalone;
    };

    setIsStandalone(checkStandalone());

    // 2. Check if iOS device (Safari)
    const ua = window.navigator.userAgent;
    const isAppleDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // 3. Check dismissed cache
    const dismissedTime = localStorage.getItem('accelvia_pwa_prompt_dismissed');
    if (dismissedTime) {
      // Re-prompt after 3 days if not installed
      const daysSince = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 3) {
        setIsDismissed(true);
      }
    }

    // 4. Capture Chromium/Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 5. Allow manual trigger from user menu or header button
    const handleManualTrigger = () => {
      setIsDismissed(false);
      if (deferredPrompt) {
        deferredPrompt.prompt().then(() => {});
      } else {
        setShowIOSModal(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('accelvia:show-install-prompt', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('accelvia:show-install-prompt', handleManualTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('accelvia_pwa_prompt_dismissed', Date.now().toString());
  };

  // Do not render banner if already installed or dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  // Only show banner on mobile screens or if install prompt is available
  const canShow = Boolean(deferredPrompt) || isIOS;
  if (!canShow) {
    return null;
  }

  return (
    <>
      {/* Floating Pixel-Perfect Mobile Banner */}
      <aside
        aria-label="Install Mobile App"
        className="fixed bottom-18 lg:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 dark:border-teal-500/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md"
            style={{ backgroundColor: accentColor }}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Install Accelvia App</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-teal-300 font-semibold">
                iOS & Android
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Instant access & lock-screen push notifications
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl text-white font-semibold text-xs transition active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Dismiss"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* iOS Safari "Add to Home Screen" Bottom Sheet Walkthrough Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setShowIOSModal(false)}
          />

          <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 z-10 text-slate-900 dark:text-slate-100 space-y-4 pb-safe animate-in slide-in-from-bottom-5 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    Install on iPhone / iPad
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Run in full-screen standalone mode
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Apple 2-Step Instructions */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-slate-800 text-emerald-700 dark:text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Tap the Safari Share button</span>
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Located in the center of the bottom toolbar on your iPhone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-slate-800 text-emerald-700 dark:text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Select "Add to Home Screen"</span>
                    <PlusSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Scroll down in the share sheet and tap Add to finish.
                  </p>
                </div>
              </div>
            </div>

            {/* Push Notification Benefit */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
              <BellRing className="w-4 h-4 text-emerald-600 dark:text-teal-400 shrink-0" />
              <div>
                <span className="font-bold">Unlocks iOS Push Notifications:</span> On iOS 16.4+, installing to the Home Screen allows you to receive instant lock-screen alerts for new messages and approvals.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-white shadow-md active:scale-95 transition"
              style={{ backgroundColor: accentColor }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
