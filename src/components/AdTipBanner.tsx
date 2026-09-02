import { useState } from 'react';
import { Zap, ArrowRight, X } from 'lucide-react';

export default function AdTipBanner() {
  const [closed, setClosed] = useState(() => {
    try {
      return sessionStorage.getItem('watchflix_ad_tip_closed') === 'true';
    } catch {
      return false;
    }
  });

  const smartlinkUrl =
    import.meta.env.VITE_VPN_AFFILIATE_URL ||
    'https://www.profitableratecpmnetwork.com/tmu3is0wf5?key=21a1ec5aea498f026813fc3a521b1af3';

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
    <div className="bg-gradient-to-r from-zinc-950 via-red-950/25 to-zinc-950 border-b border-zinc-800/80 px-4 py-2 text-xs md:text-sm text-zinc-300 flex items-center justify-between gap-3 sticky top-16 z-30 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2 max-w-5xl mx-auto flex-1 justify-center sm:justify-start">
        <span className="p-1 rounded-md bg-red-600/20 text-red-400 border border-red-500/30 shrink-0 flex items-center gap-1 text-[11px] font-bold uppercase font-mono">
          <Zap className="w-3.5 h-3.5" />
          <span>Pro Tip</span>
        </span>
        <span className="text-zinc-300 text-center sm:text-left">
          For <strong className="text-white font-semibold">100% buffer-free 4K streaming</strong> &amp; fastest server speeds, check out today's top streaming &amp; speed deals.
        </span>
        <a
          href={smartlinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-red-600/20 hover:scale-105 transition cursor-pointer shrink-0 ml-1"
        >
          <span>Claim Deal</span>
          <ArrowRight className="w-3 h-3" />
        </a>
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
