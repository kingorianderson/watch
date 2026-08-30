import React, { useState } from 'react';
import { X, Film, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginWithGoogle, loginWithFacebook, loginWithEmail } =
    useAuth();

  const [mode, setMode] = useState<'social' | 'custom-google' | 'custom-fb' | 'email'>('social');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleQuickGoogle = async () => {
    setLoading(true);
    setTimeout(async () => {
      await loginWithGoogle();
      setLoading(false);
    }, 600);
  };

  const handleQuickFacebook = async () => {
    setLoading(true);
    setTimeout(async () => {
      await loginWithFacebook();
      setLoading(false);
    }, 600);
  };

  const handleCustomSocial = async (e: React.FormEvent, provider: 'google' | 'facebook') => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(async () => {
      if (provider === 'google') {
        await loginWithGoogle(email, name);
      } else {
        await loginWithFacebook(email, name);
      }
      setLoading(false);
    }, 500);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(async () => {
      await loginWithEmail(email, name);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-red-600/30">
            <Film className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Welcome to WATCH<span className="text-red-500 font-bold">.FLIX</span>
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Sign in with your Google or Facebook account to save your Watchlist and continue watching across any device.
          </p>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
            <p className="text-sm text-zinc-300 font-medium">Authenticating profile...</p>
          </div>
        ) : (
          <>
            {/* Mode 1: Main One-Click Social Options */}
            {mode === 'social' && (
              <div className="space-y-3.5">
                {/* Google One-Click Button */}
                <button
                  onClick={handleQuickGoogle}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] transition duration-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Facebook One-Click Button */}
                <button
                  onClick={handleQuickFacebook}
                  className="w-full py-3 px-4 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-sm flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] transition duration-200"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continue with Facebook</span>
                </button>

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <span className="relative bg-zinc-900 px-3 text-xs text-zinc-500 uppercase font-mono">
                    or custom account
                  </span>
                </div>

                {/* Secondary options */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('custom-google')}
                    className="py-2 px-3 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-700/60 transition"
                  >
                    Custom Google ID
                  </button>
                  <button
                    onClick={() => setMode('email')}
                    className="py-2 px-3 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-700/60 transition"
                  >
                    Email Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Custom Google / FB ID */}
            {(mode === 'custom-google' || mode === 'custom-fb') && (
              <form
                onSubmit={(e) =>
                  handleCustomSocial(e, mode === 'custom-google' ? 'google' : 'facebook')
                }
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Your Full Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-800 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    {mode === 'custom-google' ? 'Google Email Address:' : 'Facebook Email / ID:'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={
                      mode === 'custom-google' ? 'you@gmail.com' : 'you@facebook.com'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-red-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition"
                >
                  <span>Sign In with {mode === 'custom-google' ? 'Google' : 'Facebook'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMode('social')}
                  className="w-full text-center text-xs text-zinc-400 hover:text-white pt-1"
                >
                  ← Back to 1-Click Login
                </button>
              </form>
            )}

            {/* Mode 3: Email Sign In */}
            {mode === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Your Name (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-800 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Email Address:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-red-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition"
                >
                  <Mail className="w-4 h-4" />
                  <span>Continue with Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('social')}
                  className="w-full text-center text-xs text-zinc-400 hover:text-white pt-1"
                >
                  ← Back to 1-Click Login
                </button>
              </form>
            )}
          </>
        )}

        {/* Security badge footer */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secure OAuth 2.0 Encryption & Privacy Protection</span>
        </div>
      </div>
    </div>
  );
}

