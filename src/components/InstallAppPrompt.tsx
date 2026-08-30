import { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Play } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'watchd_pwa_install_dismissed_v1';

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Check if dismissed recently (within 3 days)
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
        if (diffDays < 3) return;
      }
    } catch {
      // Ignore storage errors
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIosDevice && isSafari) {
      setIsIOS(true);
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Android / Chrome / Edge beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // Ignore
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-4 shadow-black/80 ring-1 ring-white/10">
        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0 border border-white/10">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pr-6">
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Install WATCHD App
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
              Install for instant full-screen streaming, zero lag, and fast 1-tap access from your home screen.
            </p>
          </div>

          {/* Close / Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Area */}
        <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2.5">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            Maybe Later
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 active:scale-95 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>

        {/* iOS Step-by-Step Instructions Modal */}
        {showIOSGuide && (
          <div className="mt-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-2 animate-in fade-in">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>How to install on iPhone/iPad:</span>
            </div>
            <div className="space-y-1.5 text-zinc-400 pl-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  1
                </span>
                <span>
                  Tap the <strong className="text-white">Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /> in Safari's bottom toolbar.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-white mx-0.5" />.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

