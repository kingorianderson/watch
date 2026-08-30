import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function AdTipBanner() {
  const [closed, setClosed] = useState(() => {
    try {
      return sessionStorage.getItem('watchflix_ad_tip_closed') === 'true';
    } catch {
      return false;
    }
  });

  if (closed) return null;

  const handleDismiss = () => {
    setClosed(true);
    try {
      sessionStorage.setItem('watchflix_ad_tip_closed', 'true');
    } catch {
      // Ignore storage error
    }
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900 border-b border-zinc-800 px-4 py-2.5 text-xs md:text-sm text-zinc-300 flex items-center justify-between gap-3 sticky top-16 z-30 backdrop-blur-md">
      <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
        <span className="p-1 rounded-md bg-red-600/20 text-red-400 border border-red-500/30 shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <span className="text-zinc-300">
          <strong className="text-white font-semibold">Pro Streaming Tip:</strong> For a 100% popup-free experience on all servers, we recommend using <span className="text-amber-400 font-semibold">Brave Browser</span> or the <span className="text-red-400 font-semibold">uBlock Origin</span> extension.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer shrink-0"
        title="Dismiss"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
