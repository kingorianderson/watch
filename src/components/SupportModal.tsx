import { useState, useEffect } from 'react';
import { X, Heart, Copy, Check, ShieldCheck, Sparkles, Coffee, DollarSign, Wallet } from 'lucide-react';

export function openSupportModal() {
  window.dispatchEvent(new CustomEvent('open-support-modal'));
}

export function closeSupportModal() {
  window.dispatchEvent(new CustomEvent('close-support-modal'));
}

export default function SupportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'crypto' | 'fiat'>('crypto');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('open-support-modal', handleOpen);
    window.addEventListener('close-support-modal', handleClose);

    return () => {
      window.removeEventListener('open-support-modal', handleOpen);
      window.removeEventListener('close-support-modal', handleClose);
    };
  }, []);

  if (!isOpen) return null;

  const cryptoAddresses = [
    {
      name: 'USDT (TRC-20)',
      network: 'Tron Network (Fast & Low Fee)',
      address: 'TYDzsYUb2FnZ1N6x9P3eR4TqW8yK2mNvB1',
      badge: 'Recommended',
    },
    {
      name: 'Bitcoin (BTC)',
      network: 'Native Bitcoin Network',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      badge: 'BTC',
    },
    {
      name: 'Ethereum / USDT (ERC-20)',
      network: 'Ethereum & Polygon (EVM)',
      address: '0x71C...849f2 (EVM compatible)',
      badge: 'ETH / Polygon',
    },
    {
      name: 'Solana (SOL / USDT)',
      network: 'Solana High Speed',
      address: '7XqT...4v9L (SOL network)',
      badge: 'SOL',
    },
  ];

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-red-600/30">
            <Heart className="w-6 h-6 text-white fill-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Support WATCH<span className="text-red-500 font-bold">HD</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
            Help us maintain high-speed servers, add daily 4K movies & keep WATCHD 100% free with no forced subscriptions!
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800/80 mb-5">
          <button
            onClick={() => setActiveTab('crypto')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'crypto'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Crypto Tips</span>
          </button>
          <button
            onClick={() => setActiveTab('fiat')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'fiat'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Coffee / M-Pesa / Cards</span>
          </button>
        </div>

        {/* Tab 1: Crypto */}
        {activeTab === 'crypto' && (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {cryptoAddresses.map((item, idx) => (
              <div
                key={idx}
                className="bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-3 space-y-1.5 hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <span>{item.name}</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-red-600/20 text-red-400 rounded-md font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{item.network}</span>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 px-2.5 py-1.5 rounded-xl border border-zinc-800">
                  <span className="font-mono text-xs text-zinc-400 truncate flex-1 select-all">
                    {item.address}
                  </span>
                  <button
                    onClick={() => handleCopy(item.name, item.address)}
                    className="p-1 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                    title="Copy address"
                  >
                    {copiedKey === item.name ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Fiat / Buy Me A Coffee / M-Pesa */}
        {activeTab === 'fiat' && (
          <div className="space-y-3.5 py-2">
            <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/30 rounded-2xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Coffee className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-zinc-100">Buy Us a Coffee or Streaming Server</h4>
              <p className="text-xs text-zinc-400">
                Support our monthly bandwidth costs to keep servers buffer-free and fast for all users worldwide.
              </p>
              <a
                href="https://buymeacoffee.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer mt-1"
              >
                <Coffee className="w-4 h-4 text-zinc-950 fill-zinc-950" />
                <span>Tip with Card / PayPal / Apple Pay</span>
              </a>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>M-Pesa / Local East Africa tips:</span>
              </div>
              <span className="font-mono text-zinc-300 font-bold">Contact Admin</span>
            </div>
          </div>
        )}

        {/* Footer Perks */}
        <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Direct Community Supported</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VIP recognition coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
