import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Bookmark, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../hooks/useWatchlist';
import { useWatchHistory } from '../hooks/useWatchHistory';

export default function UserProfileMenu() {
  const { user, logout } = useAuth();
  const { watchlist } = useWatchlist();
  const { history } = useWatchHistory();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button: User Avatar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-red-500/50 transition duration-200 group"
      >
        <div className="relative">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover bg-zinc-800 border-2 border-zinc-700 group-hover:border-red-500 transition shadow"
          />
          {/* Provider badge */}
          <span
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white font-bold border border-zinc-950 ${
              user.provider === 'google'
                ? 'bg-amber-500'
                : user.provider === 'facebook'
                ? 'bg-blue-600'
                : 'bg-red-500'
            }`}
          >
            {user.provider === 'google' ? 'G' : user.provider === 'facebook' ? 'f' : 'W'}
          </span>
        </div>
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-zinc-800">
          {/* Profile Header */}
          <div className="p-4 bg-zinc-950/60 flex items-center gap-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-11 h-11 rounded-full object-cover bg-zinc-800 border border-zinc-700 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
              <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-red-400 font-mono capitalize mt-1 border border-zinc-700/50">
                {user.provider} Account
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-900/50 text-center">
            <Link
              to="/watchlist"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800/80 transition"
            >
              <div className="text-base font-black text-red-400">{watchlist.length}</div>
              <div className="text-[11px] text-zinc-400 font-medium">In Watchlist</div>
            </Link>

            <Link
              to="/watchlist"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800/80 transition"
            >
              <div className="text-base font-black text-amber-400">{history.length}</div>
              <div className="text-[11px] text-zinc-400 font-medium">History items</div>
            </Link>
          </div>

          {/* Action Links */}
          <div className="p-2 space-y-1">
            <Link
              to="/watchlist"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition"
            >
              <Bookmark className="w-4 h-4 text-red-500" />
              <span>My Watchlist</span>
            </Link>

            <Link
              to="/watchlist"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition"
            >
              <History className="w-4 h-4 text-amber-500" />
              <span>Continue Watching History</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="p-2">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

