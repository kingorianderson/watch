import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Film,
  Tv,
  Bookmark,
  Search,
  X,
  Play,
  Star,
  Menu,
  LogIn,
  Flame,
  Clock,
  Loader2,
  Trash2,
  ArrowLeft,
  Heart,
} from 'lucide-react';
import { tmdbService, getPosterUrl } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../hooks/useWatchlist';
import UserProfileMenu from './UserProfileMenu';
import { openSupportModal } from './SupportModal';

const TRENDING_QUICK_SEARCHES = [
  'Spider-Man',
  'Moana',
  'Arcane',
  'Stranger Things',
  'Deadpool',
  'Avatar',
];

const RECENT_SEARCHES_KEY = 'watchd_recent_searches_v1';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { user, openAuthModal } = useAuth();
  const { watchlist } = useWatchlist();

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global Keyboard Shortcut: Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileSearchOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 100);
        } else {
          desktopInputRef.current?.focus();
          setShowSearchDropdown(true);
        }
      } else if (
        e.key === '/' &&
        document.activeElement !== desktopInputRef.current &&
        document.activeElement !== mobileInputRef.current &&
        !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileSearchOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 100);
        } else {
          desktopInputRef.current?.focus();
          setShowSearchDropdown(true);
        }
      } else if (e.key === 'Escape') {
        setShowSearchDropdown(false);
        setMobileSearchOpen(false);
        desktopInputRef.current?.blur();
        mobileInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close desktop dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent background scroll when mobile search or mobile menu is open
  useEffect(() => {
    if (mobileSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSearchOpen]);

  // Focus mobile input when mobile search opens
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 100);
    }
  }, [mobileSearchOpen]);

  // Debounced Live Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await tmdbService.searchMulti(searchQuery.trim());
        setSearchResults(results.slice(0, 8));
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Live search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const clean = term.trim();
    const updated = [clean, ...recentSearches.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((t) => t !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      setShowSearchDropdown(false);
      setMobileSearchOpen(false);
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectQuickSearch = (term: string) => {
    setSearchQuery(term);
    saveRecentSearch(term);
    setShowSearchDropdown(false);
    setMobileSearchOpen(false);
    navigate(`/explore?q=${encodeURIComponent(term)}`);
  };

  const handleResultClick = (item: MediaItem) => {
    const title = item.title || item.name || 'Untitled';
    saveRecentSearch(title);
    setShowSearchDropdown(false);
    setMobileSearchOpen(false);
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Movies', path: '/movies', icon: Film },
    { name: 'TV Series', path: '/series', icon: Tv },
    { name: 'Watchlist', path: '/watchlist', icon: Bookmark, count: watchlist.length },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 h-16 ${
          isScrolled
            ? 'bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/80 shadow-2xl shadow-black/50'
            : 'bg-gradient-to-b from-zinc-950 via-zinc-950/70 to-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition duration-200">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
                WATC<span className="text-red-500 font-bold ml-0.5">HD</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-white bg-zinc-800/90 shadow-inner'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
                    }`}
                  >
                    {link.icon && <link.icon className="w-4 h-4" />}
                    <span>{link.name}</span>
                    {link.count !== undefined && link.count > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-600/30 text-red-400 rounded-full text-[10px] font-mono font-bold leading-none">
                        {link.count}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Desktop Support Button */}
              <button
                onClick={openSupportModal}
                className="ml-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition hover:scale-105 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Support WATCHD with a tip"
              >
                <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 animate-pulse" />
                <span>Support</span>
              </button>
            </div>
          </div>

          {/* Desktop Search Bar & User Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end max-w-xl">
            {/* Desktop-only Search Bar */}
            <div className="relative hidden md:block w-full max-w-xs md:max-w-md" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  ref={desktopInputRef}
                  type="text"
                  placeholder="Search movies, TV shows, actors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="w-full bg-zinc-900/90 hover:bg-zinc-900 text-sm text-zinc-100 placeholder-zinc-500 pl-10 pr-20 py-2 rounded-full border border-zinc-700/60 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all shadow-inner"
                />

                {/* Search Icon or Loading Spinner */}
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-zinc-400" />
                  )}
                </div>

                {/* Right Badges / Clear Button */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        desktopInputRef.current?.focus();
                      }}
                      className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800 border border-zinc-700/60 rounded-md select-none pointer-events-none">
                      Ctrl K
                    </span>
                  )}
                </div>
              </form>

              {/* Desktop Interactive Search Dropdown */}
              {showSearchDropdown && (
                <div className="absolute right-0 w-[420px] mt-2 bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-zinc-800/80">
                  {/* 1. Live TMDB Results */}
                  {searchQuery.trim() && searchResults.length > 0 && (
                    <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-zinc-800/50">
                      {searchResults.map((item) => {
                        const title = item.title || item.name || 'Untitled';
                        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
                        const isTv = item.media_type === 'tv' || (!item.release_date && !!item.first_air_date);
                        const playUrl = isTv ? `/watch/tv/${item.id}/1/1` : `/watch/movie/${item.id}`;

                        return (
                          <Link
                            key={item.id}
                            to={playUrl}
                            onClick={() => handleResultClick(item)}
                            className="flex items-center gap-3 p-2 hover:bg-zinc-800/90 rounded-xl transition group"
                          >
                            <img
                              src={getPosterUrl(item.poster_path, 'w92')}
                              alt={title}
                              className="w-11 h-16 object-cover rounded-lg bg-zinc-950 shrink-0 border border-zinc-800 group-hover:border-red-500/50 transition"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-red-400 truncate transition-colors">
                                {title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-red-400 font-mono text-[10px] font-bold uppercase">
                                  {isTv ? 'TV Show' : 'Movie'}
                                </span>
                                {year && <span>{year}</span>}
                                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {item.vote_average ? item.vote_average.toFixed(1) : 'NR'}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. No Results State */}
                  {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
                    <div className="p-6 text-center text-zinc-400 space-y-1">
                      <Search className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                      <p className="text-sm font-semibold text-zinc-300">No instant results for "{searchQuery}"</p>
                      <p className="text-xs text-zinc-500">Press Enter to browse the full catalog.</p>
                    </div>
                  )}

                  {/* 3. Empty Search Query: Trending & Recent */}
                  {!searchQuery.trim() && (
                    <div className="p-4 space-y-4">
                      {recentSearches.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" /> Recent Searches
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRecentSearches([]);
                                localStorage.removeItem(RECENT_SEARCHES_KEY);
                              }}
                              className="text-[11px] text-zinc-500 hover:text-red-400 transition cursor-pointer"
                            >
                              Clear all
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {recentSearches.map((term) => (
                              <button
                                key={term}
                                type="button"
                                onClick={() => handleSelectQuickSearch(term)}
                                className="group px-3 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition border border-zinc-700/50 cursor-pointer"
                              >
                                <span>{term}</span>
                                <Trash2
                                  onClick={(e) => removeRecentSearch(term, e)}
                                  className="w-3 h-3 text-zinc-500 hover:text-red-400 transition ml-0.5"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mb-2">
                          <Flame className="w-3.5 h-3.5 text-red-500" /> Trending Searches
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {TRENDING_QUICK_SEARCHES.map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => handleSelectQuickSearch(term)}
                              className="px-3 py-1 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-xs text-red-300 hover:text-white flex items-center gap-1 transition border border-red-800/30 font-medium cursor-pointer"
                            >
                              <span>{term}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Desktop Footer Action */}
                  {searchQuery.trim() && (
                    <div className="p-2.5 bg-zinc-950/80 text-center border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        <span>Explore all matching titles for "{searchQuery}"</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => {
                setMobileSearchOpen(true);
                setMobileMenuOpen(false);
              }}
              className="md:hidden p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800/80 hover:bg-zinc-800 active:scale-95 transition"
              aria-label="Open Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* User Profile or Sign In Button */}
            {user ? (
              <UserProfileMenu />
            ) : (
              <button
                onClick={openAuthModal}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition duration-200 shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                if (!mobileMenuOpen) setMobileSearchOpen(false);
              }}
              className="md:hidden p-2 text-zinc-300 hover:text-white rounded-xl bg-zinc-900/80 border border-zinc-800/80 hover:bg-zinc-800 active:scale-95 transition shrink-0"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-950/98 border-b border-zinc-800/80 px-4 py-3 space-y-1.5 backdrop-blur-2xl animate-in slide-in-from-top-2 shadow-2xl">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'text-white bg-red-600/20 border border-red-500/30'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {link.icon && <link.icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-zinc-400'}`} />}
                    <span>{link.name}</span>
                  </div>
                  {link.count !== undefined && link.count > 0 && (
                    <span className="px-2 py-0.5 bg-red-600/30 text-red-400 rounded-full text-xs font-mono font-bold">
                      {link.count}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Mobile Drawer Support Button */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openSupportModal();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer mt-1"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                <span>Support Platform</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs font-mono font-bold">
                Tip ☕
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Full-Screen Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/98 backdrop-blur-2xl flex flex-col md:hidden animate-in fade-in duration-200">
          {/* Top Search Input Bar */}
          <div className="p-3 sm:p-4 border-b border-zinc-800/80 bg-zinc-950/90 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 active:scale-95 transition shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search movies, TV shows, actors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 text-base text-zinc-100 placeholder-zinc-500 pl-10 pr-10 py-2.5 rounded-full border border-zinc-700/60 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition shadow-inner"
              />

              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-zinc-400" />
                )}
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    mobileInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* Search Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
            {/* Live Search Results */}
            {searchQuery.trim() && searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
                  Matching Titles ({searchResults.length})
                </div>
                <div className="space-y-2">
                  {searchResults.map((item) => {
                    const title = item.title || item.name || 'Untitled';
                    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
                    const isTv = item.media_type === 'tv' || (!item.release_date && !!item.first_air_date);
                    const playUrl = isTv ? `/watch/tv/${item.id}/1/1` : `/watch/movie/${item.id}`;

                    return (
                      <Link
                        key={item.id}
                        to={playUrl}
                        onClick={() => handleResultClick(item)}
                        className="flex items-center gap-3.5 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 active:bg-zinc-800 transition"
                      >
                        <img
                          src={getPosterUrl(item.poster_path, 'w92')}
                          alt={title}
                          className="w-12 h-16 object-cover rounded-xl bg-zinc-950 shrink-0 border border-zinc-800"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-zinc-100 truncate">
                            {title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-red-400 font-mono text-[10px] font-bold uppercase">
                              {isTv ? 'TV Show' : 'Movie'}
                            </span>
                            {year && <span>{year}</span>}
                            <span className="flex items-center gap-1 text-amber-400 font-semibold ml-auto">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {item.vote_average ? item.vote_average.toFixed(1) : 'NR'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Footer Explore Button */}
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-[0.98] transition"
                >
                  <span>Explore all matching results for "{searchQuery}"</span>
                  <span>→</span>
                </button>
              </div>
            )}

            {/* No Results State */}
            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <div className="py-12 text-center text-zinc-400 space-y-2">
                <Search className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                <p className="text-base font-semibold text-zinc-200">No instant results for "{searchQuery}"</p>
                <p className="text-xs text-zinc-500">Tap explore or press Enter to search the full catalog.</p>
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium text-red-400"
                >
                  Search catalog for "{searchQuery}" →
                </button>
              </div>
            )}

            {/* Empty State: Recent & Trending Searches */}
            {!searchQuery.trim() && (
              <div className="space-y-6 pt-1">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-3 px-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" /> Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRecentSearches([]);
                          localStorage.removeItem(RECENT_SEARCHES_KEY);
                        }}
                        className="text-xs text-zinc-500 hover:text-red-400 transition"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          onClick={() => handleSelectQuickSearch(term)}
                          className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs sm:text-sm text-zinc-200 flex items-center gap-2 border border-zinc-800 active:scale-95 transition cursor-pointer"
                        >
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(term, e)}
                            className="text-zinc-500 hover:text-red-400 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Searches */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mb-3 px-1">
                    <Flame className="w-4 h-4 text-red-500" /> Trending Searches
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TRENDING_QUICK_SEARCHES.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSelectQuickSearch(term)}
                        className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-xs sm:text-sm text-red-300 font-medium flex items-center gap-1.5 border border-red-800/40 active:scale-95 transition cursor-pointer"
                      >
                        <Flame className="w-3 h-3 text-red-400" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

