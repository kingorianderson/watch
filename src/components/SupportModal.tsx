import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  X,
  Smartphone,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  sendPayHeroStkPush,
  checkPayHeroTransactionStatus,
  normalizeKenyanPhone,
} from '../services/payheroService';

const PRESET_AMOUNTS = [
  { amount: 50, label: 'KES 50', subtitle: 'Quick Tip ☕' },
  { amount: 100, label: 'KES 100', subtitle: 'Server Fuel ⚡', popular: true },
  { amount: 200, label: 'KES 200', subtitle: 'Coffee Boost 🍿' },
  { amount: 500, label: 'KES 500', subtitle: 'Pro Supporter ⭐' },
  { amount: 1000, label: 'KES 1000', subtitle: 'Hero Backer 👑' },
];

const SAVED_PHONE_KEY = 'watchd_mpesa_phone';

// Global Event Trigger for openSupportModal
export function openSupportModal() {
  window.dispatchEvent(new CustomEvent('open-support-modal'));
}

export function closeSupportModal() {
  window.dispatchEvent(new CustomEvent('close-support-modal'));
}

export default function SupportModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [phone, setPhone] = useState<string>(() => {
    try {
      return localStorage.getItem(SAVED_PHONE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [step, setStep] = useState<'input' | 'prompt_sent' | 'success' | 'failed'>('input');
  const [activeReference, setActiveReference] = useState<string>('');
  const [successData, setSuccessData] = useState<{ reference: string; amount: number } | null>(null);
  const [countdown, setCountdown] = useState<number>(60);

  const pollIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  const { carrier, isValid: isPhoneValid, isSafaricom } = normalizeKenyanPhone(phone);
  const currentAmount = isCustom ? Number(customAmount) || 0 : selectedAmount;

  // Listen for global open/close events
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setStep('input');
      setErrorMessage('');
      setStatusMessage('');
    };
    const handleClose = () => {
      handleModalClose();
    };

    window.addEventListener('open-support-modal', handleOpen);
    window.addEventListener('close-support-modal', handleClose);
    return () => {
      window.removeEventListener('open-support-modal', handleOpen);
      window.removeEventListener('close-support-modal', handleClose);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const handleModalClose = () => {
    clearAllTimers();
    setIsOpen(false);
    setIsLoading(false);
    setIsVerifying(false);
    setErrorMessage('');
    setStatusMessage('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    if (errorMessage) setErrorMessage('');
  };

  // Start polling PayHero for transaction confirmation
  const startPollingStatus = (reference: string, amount: number) => {
    clearAllTimers();
    setCountdown(60);

    // Countdown tick
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearAllTimers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Status poll every 3.5 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await checkPayHeroTransactionStatus(reference);

        if (result.status === 'SUCCESS') {
          clearAllTimers();
          setSuccessData({
            reference: result.providerReference || reference,
            amount: result.amount || amount,
          });
          setStep('success');
        } else if (result.status === 'FAILED') {
          clearAllTimers();
          setErrorMessage(result.message || 'Payment was cancelled or declined on your phone.');
          setStep('failed');
        }
      } catch (err) {
        console.warn('Status poll check failed:', err);
      }
    }, 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (currentAmount < 1) {
      setErrorMessage('Please enter an amount of at least KES 1');
      return;
    }

    if (!isPhoneValid) {
      setErrorMessage('Please enter a valid Safaricom number (e.g. 0712 345 678 or 0110 345 678)');
      return;
    }

    if (!isSafaricom) {
      setErrorMessage(
        'Direct STK PIN prompt only works on Safaricom M-Pesa. Please enter a Safaricom number (e.g. 0712..., 0722..., 0110...).'
      );
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* STEP 1: INITIAL AMOUNT & PHONE SELECTION */}
        {step === 'input' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-600/30">
                <Heart className="w-7 h-7 fill-white animate-pulse" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Support WATCH<span className="text-red-500 font-bold">HD</span>
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
                Help us keep video streaming fast, high-speed, and free for everyone with instant Safaricom M-Pesa.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Preset Amounts Grid */}
              <div className="grid grid-cols-3 gap-2">
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
                      className={`relative p-3 rounded-2xl border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/25 border-emerald-500 text-white ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-600/20 scale-[1.02]'
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

              {/* Safaricom M-Pesa Phone Input Field */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safaricom M-Pesa Number</span>
                  </span>
                  {carrier === 'safaricom' ? (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Safaricom M-Pesa
                    </span>
                  ) : carrier === 'airtel' ? (
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      Airtel (M-Pesa Only)
                    </span>
                  ) : carrier === 'telkom' ? (
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      Telkom (M-Pesa Only)
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-mono font-medium">
                      Safaricom 07XX / 011X
                    </span>
                  )}
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
                    className={`w-full bg-zinc-950 border rounded-2xl pl-24 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none font-mono transition ${
                      carrier === 'airtel' || carrier === 'telkom'
                        ? 'border-amber-500/80 focus:border-amber-500'
                        : isSafaricom
                        ? 'border-emerald-500/80 focus:border-emerald-500'
                        : 'border-zinc-700 focus:border-emerald-500'
                    }`}
                    required
                  />
                </div>
                {carrier === 'airtel' ? (
                  <p className="text-[11px] text-amber-400 animate-in fade-in">
                    ⚠️ Automated STK prompts only work on <strong>Safaricom M-Pesa</strong>. Please enter an M-Pesa number.
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    Enter your Safaricom number to receive an instant PIN prompt on your phone.
                  </p>
                )}
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit STK Button */}
              <button
                type="submit"
                disabled={isLoading || currentAmount <= 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
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

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span>🔒 Safe & Instant • Powered by PayHero</span>
                <a
                  href="https://lipwa.link/11932"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition"
                >
                  <span>Card / Other</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: STK PROMPT SENT / WAITING PIN */}
        {step === 'prompt_sent' && (
          <div className="text-center py-4 space-y-6 animate-in fade-in">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Check Your Phone!</h3>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto">
                An M-Pesa STK PIN prompt of{' '}
                <strong className="text-emerald-400">KES {currentAmount}</strong> has been sent to{' '}
                <strong className="text-white font-mono">{phone}</strong>.
              </p>
              <p className="text-xs text-zinc-500">
                Please unlock your phone and enter your <strong>M-Pesa PIN</strong> to complete payment.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Auto-verifying payment...</span>
                <span className="font-mono text-emerald-400 font-bold">{countdown}s</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-1000"
                  style={{ width: `${(countdown / 60) * 100}%` }}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 text-left">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={isVerifying}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying with PayHero...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>I have entered my PIN</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearAllTimers();
                  setStep('input');
                  setErrorMessage('');
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-medium text-xs transition cursor-pointer"
              >
                Cancel / Re-enter Number
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                <span>Thank You!</span>
                <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
              </h3>
              <p className="text-sm text-zinc-300 max-w-sm mx-auto">
                Your support of{' '}
                <strong className="text-emerald-400">
                  KES {successData?.amount || currentAmount}
                </strong>{' '}
                was received successfully. You are directly powering fast, high-speed streaming for everyone!
              </p>
            </div>

            {successData?.reference && (
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 inline-block font-mono text-xs text-zinc-400">
                Receipt Reference: <span className="text-white font-bold">{successData.reference}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleModalClose}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              Continue Watching 🎬
            </button>
          </div>
        )}

        {/* STEP 4: FAILED / TIMEOUT */}
        {step === 'failed' && (
          <div className="text-center py-6 space-y-6 animate-in fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Payment Incomplete</h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
                {errorMessage ||
                  'The transaction timed out or was cancelled on your phone. No money was deducted.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setErrorMessage('');
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
