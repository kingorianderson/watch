import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 pointer-events-none px-4 flex justify-center animate-in slide-in-from-top-2 duration-300">
      {isOffline && (
        <div className="pointer-events-auto bg-amber-950/95 border border-amber-600/50 backdrop-blur-xl text-amber-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold max-w-lg">
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
            <WifiOff className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <span>You are currently offline. Showing saved content.</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {showReconnected && !isOffline && (
        <div className="pointer-events-auto bg-emerald-950/95 border border-emerald-600/50 backdrop-blur-xl text-emerald-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold animate-in fade-in">
          <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Wifi className="w-4 h-4" />
          </div>
          <span>Connection restored! You're back online.</span>
        </div>
      )}
    </div>
  );
}

