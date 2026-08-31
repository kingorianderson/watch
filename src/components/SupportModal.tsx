import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Smartphone,
  CreditCard,
  Wallet,
  Zap,
  CheckCircle2,
} from 'lucide-react';
// @ts-ignore
import PaystackPop from '@paystack/inline-js';
import { useAuth } from '../context/AuthContext';

export function openSupportModal() {
  window.dispatchEvent(new CustomEvent('open-support-modal'));
}

export function closeSupportModal() {
  window.dispatchEvent(new CustomEvent('close-support-modal'));
}

const PRESET_AMOUNTS = [
  { amount: 100, label: 'KES 100', subtitle: '☕ Coffee (~$1)' },
  { amount: 250, label: 'KES 250', subtitle: '🍿 Movie (~$2)' },
  { amount: 500, label: 'KES 500', subtitle: '⚡ Booster (~$4)', popular: true },
  { amount: 1000, label: 'KES 1,000', subtitle: '👑 Super Fan (~$8)' },
];

export default function SupportModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'paystack' | 'crypto'>('paystack');
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loadingPaystack, setLoadingPaystack] = useState(false);

  const paystackKey =
    import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
    'pk_live_da3ed2fbbd176b1af5135e26941bf9cbfdad637a';

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setPaymentSuccess(false);
    };
    const handleClose = () => setIsOpen(false);

    window.addEventListener('open-support-modal', handleOpen);
    window.addEventListener('close-support-modal', handleClose);

    return () => {
      window.removeEventListener('open-support-modal', handleOpen);
      window.removeEventListener('close-support-modal', handleClose);
    };
  }, []);

  if (!isOpen) return null;

  const currentAmount = isCustom ? Number(customAmount) || 0 : selectedAmount;

  const handlePaystackCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAmount || currentAmount < 50) {
      alert('Please enter an amount of at least KES 50');
      return;
    }

    const emailToUse = (user?.email || `supporter_${Date.now()}@watch.kingori.co.ke`).trim();

    setLoadingPaystack(true);

    try {
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: paystackKey,
        email: emailToUse,
        amount: Math.round(currentAmount * 100), // In KES cents
        currency: 'KES',
        metadata: {
          custom_fields: [
            {
              display_name: 'Supporter Name',
              variable_name: 'supporter_name',
              value: user?.name || 'Anonymous Supporter',
            },
            {
              display_name: 'Platform',
              variable_name: 'platform',
              value: 'WATCHD Streaming',
            },
          ],
        },
        onSuccess: (transaction: any) => {
          setLoadingPaystack(false);
          setPaymentSuccess(true);
          console.log('Payment successful reference:', transaction.reference);
        },
        onCancel: () => {
          setLoadingPaystack(false);
        },
      });
    } catch (err) {
      console.error('Failed to open Paystack popup:', err);
      setLoadingPaystack(false);
      alert('Could not initialize payment gateway. Please try again.');
    }
  };

  const cryptoAddresses = [
    {
      name: 'USDT (TRC-20)',
      network: 'Tron Network (Fast & $1 Fee)',
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
      name: 'Solana (SOL / USDT)',
      network: 'Solana Network',
      address: '7XqT8YUb2FnZ1N6x9P3eR4TqW8yK2mNvB1',
      badge: 'SOL',
    },
  ];

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Screen */}
        {paymentSuccess ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-white">Thank You for Your Support! ❤️</h3>
              <p className="text-sm text-zinc-300 max-w-sm mx-auto">
                Your payment of <span className="text-emerald-400 font-bold font-mono">KES {currentAmount}</span> was successful. You're helping keep WATCHD fast, free & buffer-free for everyone!
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition cursor-pointer"
            >
              Continue Streaming
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center space-y-2 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-red-600/30">
                <Heart className="w-6 h-6 text-white fill-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Support WATCH<span className="text-red-500 font-bold">HD</span>
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Help us keep servers buffer-free & 100% free with fast 4K streaming.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800/80 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('paystack')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'paystack'
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>M-Pesa / Airtel / Card</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crypto')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'crypto'
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Crypto Tips</span>
              </button>
            </div>

            {/* Tab 1: All-in-One Paystack Checkout */}
            {activeTab === 'paystack' && (
              <form onSubmit={handlePaystackCheckout} className="space-y-4">
                {/* Preset Amount Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((item) => {
                    const isSelected = !isCustom && selectedAmount === item.amount;
                    return (
                      <button
                        key={item.amount}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(item.amount);
                          setIsCustom(false);
                        }}
                        className={`relative p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-red-600/20 border-red-500 text-white shadow-md shadow-red-600/20'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                        }`}
                      >
                        {item.popular && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-amber-500 text-zinc-950 font-bold text-[9px] rounded-full uppercase tracking-wider font-mono">
                            Popular
                          </span>
                        )}
                        <div className="text-xs sm:text-sm font-bold">{item.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{item.subtitle}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Field */}
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustom(!isCustom)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                        isCustom
                          ? 'bg-red-600/20 border-red-500 text-red-300'
                          : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Custom Amount
                    </button>
                    {isCustom && (
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 font-bold">
                          KES
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 1500"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-12 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <button
                  type="submit"
                  disabled={loadingPaystack || currentAmount <= 0}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>
                    Pay KES {currentAmount || 0} via M-Pesa / Airtel / Card
                  </span>
                </button>

                {/* Supported Methods Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] text-zinc-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>M-Pesa STK</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-red-400" />
                    <span>Airtel Money</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>Visa / Mastercard</span>
                  </span>
                </div>
              </form>
            )}

            {/* Tab 2: Crypto Addresses */}
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
                        type="button"
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

            {/* Security Footer */}
            <div className="mt-5 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <div className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>256-Bit SSL Encrypted Checkout</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Confirmation</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
