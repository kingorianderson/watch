import { useState, useEffect } from 'react';
import { X, ShieldCheck, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { decodeGoogleJwt } from '../services/authService';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, googleClientId, setUserProfile, loginWithEmail } = useAuth();
  const [activeTab, setActiveTab] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize and render the official Google Identity Services button
  useEffect(() => {
    if (!isAuthModalOpen) return;

    const clientIdToUse =
      googleClientId ||
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '1036162123114-b5ujr9g79e4qat72dusn37qr3t7037aj.apps.googleusercontent.com';

    const initOfficialGoogleBtn = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id && clientIdToUse) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientIdToUse,
            callback: (response: { credential?: string }) => {
              if (response.credential) {
                const payload = decodeGoogleJwt(response.credential);
                setUserProfile({
                  id: `google_${payload.sub}`,
                  name: payload.name || payload.email.split('@')[0],
                  email: payload.email,
                  avatar:
                    payload.picture ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      payload.name
                    )}`,
                  provider: 'google',
                  joinedAt: Date.now(),
                });
              }
            },
          });

          const btnContainer = document.getElementById('official-google-btn-container');
          if (btnContainer) {
            btnContainer.innerHTML = '';
            window.google.accounts.id.renderButton(btnContainer, {
              type: 'standard',
              theme: 'filled_black',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: '300',
              logo_alignment: 'left',
            });
          }
        } catch (err) {
          console.warn('Official Google button rendering failed', err);
        }
      }
    };

    const timer = setTimeout(initOfficialGoogleBtn, 150);
    return () => clearTimeout(timer);
  }, [isAuthModalOpen, googleClientId, setUserProfile]);

  if (!isAuthModalOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      await loginWithEmail(email.trim(), name.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
              Account Sync
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Welcome to WATC<span className="text-red-500">HD</span></h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Sign in to automatically save your Watchlist and continue watching across all your devices.
          </p>
        </div>

        {/* Tabs: Google / Email */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'google'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>Google Account</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email / Name</span>
          </button>
        </div>

        {/* Tab 1: Google Sign In */}
        {activeTab === 'google' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 px-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl">
              {/* Official Google Button Container */}
              <div id="official-google-btn-container" className="min-h-[44px] flex items-center justify-center w-full" />
            </div>
          </div>
        )}

        {/* Tab 2: Email Sign In */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition cursor-pointer mt-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Continue with Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Security Footer */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted Cloud Sync • Supabase Connected</span>
        </div>
      </div>
    </div>
  );
}
