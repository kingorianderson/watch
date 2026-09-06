import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, History, Trash2, Play, Star } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { getPosterUrl } from '../services/tmdb';
import MediaDetailsModal from '../components/MediaDetailsModal';
import type { MediaItem } from '../types/media';
import { usePageTitle } from '../hooks/usePageTitle';

export default function WatchlistPage() {
  usePageTitle('My Library');
  const [activeTab, setActiveTab] = useState<'watchlist' | 'history'>('watchlist');
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const { history, removeFromHistory, clearHistory, getLastWatched } = useWatchHistory();
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white m-0">My Library</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Access your saved watchlist and continue watching your favorite shows.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              activeTab === 'watchlist'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Watchlist ({watchlist.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              activeTab === 'history'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Watchlist Tab Content */}
      {activeTab === 'watchlist' && (
        <div>
          {watchlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className="isolate group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition"
                >
                  <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden">
                    <img
                      src={getPosterUrl(item.poster_path, 'w500')}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 right-2 z-10 pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => removeFromWatchlist(item.id)}
                        className="p-1.5 rounded-lg bg-zinc-950/80 hover:bg-red-600 text-zinc-300 hover:text-white transition shadow cursor-pointer"
                        title="Remove from Watchlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
                    {(() => {
                      const isTv = item.type === 'tv';
                      const lastWatched = isTv ? getLastWatched(item.id, 'tv') : null;
                      const playUrl = isTv
                        ? `/watch/tv/${item.id}/${lastWatched?.season || 1}/${lastWatched?.episode || 1}`
                        : `/watch/movie/${item.id}`;

                      return (
                        <Link
                          to={playUrl}
                          className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition cursor-pointer"
                          title={lastWatched ? `Resume S${lastWatched.season}:E${lastWatched.episode}` : 'Watch Now'}
                        >
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </Link>
                      );
                    })()}
                    </div>
                  </div>

                  <div className="p-3 flex flex-col justify-between flex-1">
                    <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-red-400 truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                      <span className="capitalize">{item.type}</span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {item.vote_average.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 space-y-4">
              <Bookmark className="w-16 h-16 text-zinc-800 mx-auto" />
              <h3 className="text-xl font-bold text-zinc-300">Your Watchlist is empty</h3>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                Explore movies and series, and click the bookmark button on any title to save it for later.
              </p>
              <Link
                to="/"
                className="inline-block px-6 py-2.5 rounded-xl bg-red-600 text-white font-semibold shadow-lg shadow-red-600/30 hover:bg-red-500 transition"
              >
                Browse Popular Movies
              </Link>
            </div>
          )}
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={clearHistory}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History</span>
              </button>
            </div>
          )}

          {history.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {history.map((item) => {
                const playUrl =
                  item.type === 'tv'
                    ? `/watch/tv/${item.id}/${item.season || 1}/${item.episode || 1}`
                    : `/watch/movie/${item.id}`;

                const progressPct =
                  item.progress && item.duration && item.duration > 0
                    ? Math.min(100, Math.round((item.progress / item.duration) * 100))
                    : 0;

                const timeLeft =
                  item.progress && item.duration && item.duration > item.progress
                    ? Math.max(1, Math.round((item.duration - item.progress) / 60))
                    : null;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl hover:border-zinc-700 transition group"
                  >
                    <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-zinc-950 shrink-0">
                      <img
                        src={getPosterUrl(item.backdrop_path || item.poster_path, 'w300')}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      {/* Episode Badge */}
                      {item.type === 'tv' && item.season && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-zinc-950/90 text-red-400 font-mono text-[9px] font-bold border border-red-500/20">
                          S{item.season}:E{item.episode || 1}
                        </span>
                      )}
                      {/* Progress Bar */}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/90">
                          <div
                            className="h-full bg-gradient-to-r from-red-600 to-amber-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-red-400 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                        <span>
                          {item.type === 'tv'
                            ? `Season ${item.season || 1} • Ep ${item.episode || 1}`
                            : 'Movie'}
                        </span>
                        {timeLeft ? (
                          <span className="text-amber-400 font-mono font-medium">• {timeLeft}m left</span>
                        ) : progressPct > 0 ? (
                          <span className="text-emerald-400 font-mono">• {progressPct}%</span>
                        ) : null}
                      </p>
                      <Link
                        to={playUrl}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 mt-2"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>
                          {item.type === 'tv' && item.season
                            ? `Resume S${item.season}:E${item.episode || 1}`
                            : 'Resume'}
                        </span>
                      </Link>
                    </div>

                    <button
                      onClick={() => removeFromHistory(item.id, item.type)}
                      className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24 space-y-4">
              <History className="w-16 h-16 text-zinc-800 mx-auto" />
              <h3 className="text-xl font-bold text-zinc-300">No watch history yet</h3>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                Any movies or series episodes you start watching will appear here automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalItem && (
        <MediaDetailsModal item={modalItem} onClose={() => setModalItem(null)} />
      )}
    </div>
  );
}

