import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, Smartphone, Zap, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ forceOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSTip, setShowIOSTip] = useState<boolean>(false);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return; // Already installed
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check localStorage dismissal
    const dismissedAt = localStorage.getItem('sundaram_pwa_dismissed');
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    if (!dismissedAt || now - parseInt(dismissedAt, 10) > threeDaysMs) {
      // Delay prompt slightly so the landing page renders smoothly first
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsOpen(false);
        if (onClose) onClose();
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSTip(true);
    } else {
      // Direct standard browser prompt or fallback
      alert("To install Sundaram Prep: tap your browser's menu (⋮) and select 'Install app' or 'Add to Home screen'.");
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('sundaram_pwa_dismissed', Date.now().toString());
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-card rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-cool-200 dark:border-dark-border relative overflow-hidden text-slate-900 dark:text-white">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-950 via-royal-600 to-indigo-500" />

        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-dark-muted dark:hover:text-white hover:bg-cool-100 dark:hover:bg-dark-surface transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Logo */}
        <div className="flex items-center gap-3.5 mb-5 pt-1">
          <img
            src="/favicon.png"
            alt="Sundaram Prep App Icon"
            className="w-16 h-16 rounded-2xl object-cover shadow-md ring-2 ring-brand-400/40 dark:ring-brand-500/40 bg-white dark:bg-dark-surface shrink-0"
          />
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-royal-700 dark:text-royal-300 text-[10px] font-extrabold uppercase tracking-wide mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Official Web App</span>
            </div>
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white leading-tight">
              Sundaram Prep
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted font-medium">
              Practice. Focus. Improve.
            </p>
          </div>
        </div>

        {/* Value Proposition List */}
        <div className="space-y-2.5 mb-6 text-xs text-slate-700 dark:text-slate-300 bg-cool-50 dark:bg-dark-surface p-4 rounded-2xl border border-cool-200 dark:border-dark-border">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="w-3 h-3" />
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">1-Tap Home Screen Access</strong>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">Instant launch without typing URLs in the browser.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-royal-700 dark:text-royal-300 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-3 h-3" />
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Lightning Fast & Offline Cache</strong>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">Optimized lightweight study sessions even on low bandwidth.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Distraction-Free Focus Arena</strong>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">Proctored full-screen interface for real exam conditions.</p>
            </div>
          </div>
        </div>

        {/* iOS Safari Special Instruction */}
        {showIOSTip && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
            <p className="font-bold mb-1">How to Install on iPhone / iPad:</p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px]">
              <li>Tap the <strong>Share</strong> button (📤) at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong> (📲).</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full sm:flex-1 py-3 px-4 bg-royal-600 hover:bg-royal-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download App</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-cool-100 dark:hover:bg-dark-surface transition-all cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
