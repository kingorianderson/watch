import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  Smartphone,
  RotateCw,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  sendPayHeroStkPush,
  checkPayHeroTransactionStatus,
  normalizeKenyanPhone,
} from '../services/payheroService';

export function openSupportModal() {
  window.dispatchEvent(new CustomEvent('open-support-modal'));
}

export function closeSupportModal() {
  window.dispatchEvent(new CustomEvent('close-support-modal'));
}

const PRESET_AMOUNTS = [
  { amount: 100, label: 'KES 100', subtitle: '☕ Coffee (~$1)' },
  { amount: 250, label: 'KES 250', subtitle: '🍿 Movie Night (~$2)' },
  { amount: 500, label: 'KES 500', subtitle: '⚡ Server Booster (~$4)', popular: true },
  { amount: 1000, label: 'KES 1,000', subtitle: '👑 Super Fan (~$8)' },
];

const SAVED_PHONE_KEY = 'watchd_payhero_phone';

export default function SupportModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  // Phone state
  const [phone, setPhone] = useState<string>(() => {
    return localStorage.getItem(SAVED_PHONE_KEY) || '';
  });

  // Flow states: 'form' | 'prompt_sent' | 'success' | 'failed'
  const [step, setStep] = useState<'form' | 'prompt_sent' | 'success' | 'failed'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [activeReference, setActiveReference] = useState<string>('');
  const [successData, setSuccessData] = useState<{ reference?: string; amount?: number }>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(75);
  const [isVerifying, setIsVerifying] = useState(false);

  const pollingTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setStep('form');
      setErrorMessage('');
      setStatusMessage('');
      setIsLoading(false);
      setIsVerifying(false);
    };
    const handleClose = () => {
      setIsOpen(false);
      clearAllTimers();
    };

    window.addEventListener('open-support-modal', handleOpen);
    window.addEventListener('close-support-modal', handleClose);

    return () => {
      window.removeEventListener('open-support-modal', handleOpen);
      window.removeEventListener('close-support-modal', handleClose);
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  if (!isOpen) return null;

  const currentAmount = isCustom ? Number(customAmount) || 0 : selectedAmount;
  const { isValid: isPhoneValid } = normalizeKenyanPhone(phone);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    setErrorMessage('');
  };

  const startPollingStatus = (ref: string, amountToConfirm: number) => {
    clearAllTimers();
    setCountdown(75);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearAllTimers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let attempts = 0;
    pollingTimerRef.current = setInterval(async () => {
      attempts++;
      try {
        const result = await checkPayHeroTransactionStatus(ref);
        if (result.status === 'SUCCESS') {
          clearAllTimers();
          setSuccessData({
            reference: result.providerReference || ref,
            amount: result.amount || amountToConfirm,
          });
          setStep('success');
        } else if (result.status === 'FAILED') {
          clearAllTimers();
          setErrorMessage(result.message || 'Payment was cancelled or declined on your phone.');
          setStep('failed');
        }
      } catch (e) {
        // Continue polling
      }

      if (attempts >= 35) {
        clearAllTimers();
      }
    }, 2500);
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentAmount || currentAmount < 1) {
      setErrorMessage('Please enter an amount of at least KES 10');
      return;
    }

    if (!isPhoneValid) {
      setErrorMessage('Please enter a valid Safaricom / Airtel number (e.g. 0712 345 678 or 0112 345 678)');
      return;
    }

    // Save phone for future convenience
    try {
      localStorage.setItem(SAVED_PHONE_KEY, phone.trim());
    } catch {
      // Ignore
    }

    setIsLoading(true);
    setStatusMessage('Dispatching M-Pesa STK Prompt...');

    const res = await sendPayHeroStkPush({
      amount: currentAmount,
      phone: phone.trim(),
      customerName: user?.name || 'WATCHD Supporter',
    });

    setIsLoading(false);

    if (res.success && res.reference) {
      setActiveReference(res.reference);
      setStep('prompt_sent');
      startPollingStatus(res.reference, currentAmount);
    } else {
      setErrorMessage(
        res.message ||
          'Could not dispatch M-Pesa STK prompt. Please check your number and try again.'
      );
    }
  };

  const handleManualVerify = async () => {
    if (!activeReference) return;
    setIsVerifying(true);
    setErrorMessage('');
    try {
      const result = await checkPayHeroTransactionStatus(activeReference);
      if (result.status === 'SUCCESS') {
        clearAllTimers();
        setSuccessData({
          reference: result.providerReference || activeReference,
          amount: result.amount || currentAmount,
        });
        setStep('success');
      } else if (result.status === 'FAILED') {
        clearAllTimers();
        setErrorMessage(result.message || 'Payment was cancelled or declined on your phone.');
        setStep('failed');
      } else {
        setErrorMessage('Awaiting PIN entry on your phone. Please check your screen and enter your PIN.');
      }
    } catch {
      setErrorMessage('Unable to verify with PayHero at this moment. Please wait a few seconds and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            setIsOpen(false);
            clearAllTimers();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: FORM INPUT */}
        {step === 'form' && (
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
                Powered by <strong className="text-emerald-400">PayHero Kenya</strong>. Direct Safaricom M-Pesa STK push with zero extra charges!
              </p>
            </div>

            <form onSubmit={handlePayNow} className="space-y-4">
              {/* Preset Amounts Grid */}
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
                        setErrorMessage('');
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

              {/* Custom Amount Button / Input */}
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustom(!isCustom);
                      setErrorMessage('');
                    }}
                    className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition cursor-pointer ${
                      isCustom
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Custom Amount
                  </button>
                  {isCustom && (
                    <div className="flex-1 relative animate-in fade-in">
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

              {/* M-Pesa Phone Input Field */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>M-Pesa Phone Number</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-medium">
                    Safaricom / Airtel
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-sm">🇰🇪</span>
                    <span className="text-xs font-mono text-zinc-400 font-bold">+254</span>
                    <div className="h-3.5 w-px bg-zinc-700 mx-0.5" />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl pl-24 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono transition"
                    required
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Enter your number to receive an instant PIN prompt on your phone.
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Submit STK Button */}
              <button
                type="submit"
                disabled={isLoading || currentAmount <= 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 hover:scale-[1.01] active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>{statusMessage || 'Sending M-Pesa Prompt...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Pay KES {currentAmount || 0} via M-Pesa STK</span>
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-zinc-500">
                🔒 Safe & Instant • Powered by PayHero Africa
              </div>
            </form>

            {/* Footer Trust Badges */}
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Encrypted PayHero Gateway</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Confirmation</span>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: PROMPT SENT (AWAITING M-PESA PIN) */}
        {step === 'prompt_sent' && (
          <div className="py-4 text-center space-y-5 animate-in zoom-in-95">
            {/* Animated Phone Graphic */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30">
                <Smartphone className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                STK PROMPT SENT
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                Check Your Phone
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
                An M-Pesa prompt for{' '}
                <strong className="text-emerald-400 font-mono">KES {currentAmount}</strong> has been
                sent to <strong className="text-white font-mono">{phone}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl text-left space-y-2 max-w-sm mx-auto">
              <div className="flex items-center gap-2 text-xs text-zinc-300 font-semibold">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instructions to complete payment:</span>
              </div>
              <ol className="text-xs text-zinc-400 list-decimal list-inside space-y-1">
                <li>Unlock your phone screen</li>
                <li>Enter your 4-digit M-Pesa PIN in the prompt</li>
                <li>Tap <strong>Send / OK</strong></li>
              </ol>
            </div>

            {/* Polling indicator & countdown */}
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
              <RotateCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Awaiting confirmation ({countdown}s)...</span>
            </div>

            {/* Error / info alert in prompt_sent */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-2 animate-in fade-in max-w-sm mx-auto text-left">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleManualVerify}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Verifying Payment Status...</span>
                  </>
                ) : (
                  <span>I have entered my PIN • Verify Payment</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearAllTimers();
                  setStep('form');
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                Change Phone Number or Amount
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'success' && (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-white">Thank You for Your Support! ❤️</h3>
              <p className="text-sm text-zinc-300 max-w-sm mx-auto">
                Your payment of{' '}
                <span className="text-emerald-400 font-bold font-mono">
                  KES {successData.amount || currentAmount}
                </span>{' '}
                via PayHero M-Pesa was received.
              </p>
            </div>

            {successData.reference && (
              <div className="px-3 py-1.5 bg-zinc-950/80 rounded-xl border border-zinc-800 inline-block text-[11px] font-mono text-zinc-400">
                Ref: {successData.reference}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  clearAllTimers();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                Continue Streaming
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FAILED OR CANCELLED */}
        {step === 'failed' && (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Transaction Incomplete</h3>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto">
                {errorMessage || 'The payment was cancelled or timed out before PIN entry.'}
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => {
                  setStep('form');
                  setErrorMessage('');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
