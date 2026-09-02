import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  ShieldCheck,
  Sparkles,
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
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
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
        amount: Math.round(currentAmount * 100),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

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
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <Heart className="w-6 h-6 text-white fill-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Support WATCH<span className="text-red-500 font-bold">HD</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
                Keep WATCHD 100% free with fast 4K streaming servers & no subscription paywalls!
              </p>
            </div>

            {/* Direct Paystack Checkout Form */}
            <form onSubmit={handlePaystackCheckout} className="space-y-4">
              {/* Preset Amount Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                      className={`relative p-3 rounded-2xl border text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-600/20 ring-1 ring-emerald-500/50'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      {item.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500 text-zinc-950 font-black text-[9px] rounded-full uppercase tracking-wider font-mono shadow-sm">
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
                    className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition cursor-pointer ${
                      isCustom
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
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
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-12 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Checkout Button */}
              <button
                type="submit"
                disabled={loadingPaystack || currentAmount <= 0}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 hover:scale-[1.01] active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>
                  Pay KES {currentAmount || 0} with M-Pesa STK Push
                </span>
              </button>

              <div className="text-center text-[11px] text-zinc-500">
                Instant prompt sent to your phone • Enter PIN to confirm
              </div>
            </form>

            {/* Security Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>256-Bit SSL Encrypted Checkout</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 font-medium">
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
