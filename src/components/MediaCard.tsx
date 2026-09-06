import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Bookmark, Info, RotateCcw } from 'lucide-react';
import { getPosterUrl } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import { useWatchlist } from '../hooks/useWatchlist';
import { useWatchHistory } from '../hooks/useWatchHistory';

interface MediaCardProps {
  item: MediaItem;
  onOpenDetails?: (item: MediaItem) => void;
}

export default function MediaCard({ item, onOpenDetails }: MediaCardProps) {
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { getLastWatched } = useWatchHistory();
  const isBookmarked = isInWatchlist(item.id);

  const title = item.title || item.name || 'Untitled';
  const rawDate = item.release_date || item.first_air_date || '';
  const year = rawDate ? rawDate.substring(0, 4) : '';
  const isTv = item.media_type === 'tv' || (!item.release_date && !!item.first_air_date);

  // Resume last watched season and episode if available
  const lastWatched = getLastWatched(item.id, isTv ? 'tv' : 'movie');
  const playUrl = isTv
    ? `/watch/tv/${item.id}/${lastWatched?.season || 1}/${lastWatched?.episode || 1}`
    : `/watch/movie/${item.id}`;

  const progressPercent =
    lastWatched?.progress && lastWatched?.duration && lastWatched.duration > 0
      ? Math.min(100, Math.round((lastWatched.progress / lastWatched.duration) * 100))
      : 0;

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(item);
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenDetails) {
      onOpenDetails(item);
    }
  };

  return (
    <div className="isolate group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800/80 transition-all duration-300 hover:scale-[1.03] hover:border-zinc-600 hover:shadow-2xl hover:shadow-red-950/20">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
        <img
          src={getPosterUrl(item.poster_path, 'w500')}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges - elevated above hover overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-950/85 backdrop-blur-md text-red-400 border border-red-500/20 shadow">
              {isTv ? 'TV Show' : 'Movie'}
            </span>
            {isTv && lastWatched?.season && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-zinc-900/90 text-zinc-300 border border-zinc-700/60 font-mono">
                S{lastWatched.season}:E{lastWatched.episode}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleBookmarkClick}
            className={`pointer-events-auto p-2 rounded-lg backdrop-blur-md transition-all duration-200 shadow-md cursor-pointer hover:scale-110 active:scale-95 ${
              isBookmarked
                ? 'bg-red-600 text-white shadow-red-600/50 hover:bg-red-500 ring-2 ring-red-400/40'
                : 'bg-zinc-950/85 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700/60'
            }`}
            title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Bookmark className={`w-4 h-4 transition-transform ${isBookmarked ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Rating Badge */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-md text-[11px] font-semibold text-amber-400 border border-amber-500/20 pointer-events-none">
          <Star className="w-3 h-3 fill-amber-400" />
          <span>{item.vote_average ? item.vote_average.toFixed(1) : 'NR'}</span>
        </div>

        {/* Playback Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/90 z-20">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover Overlay with Quick Action Buttons */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
          <Link
            to={playUrl}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/50 transform scale-90 group-hover:scale-100 transition duration-300 cursor-pointer"
            title={isTv && lastWatched ? `Resume S${lastWatched.season}:E${lastWatched.episode}` : 'Watch Now'}
          >
            {lastWatched && progressPercent > 5 ? (
              <RotateCcw className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-6 h-6 fill-white ml-0.5" />
            )}
          </Link>
          {onOpenDetails && (
            <button
              type="button"
              onClick={handleInfoClick}
              className="w-10 h-10 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center backdrop-blur-md border border-zinc-600/50 transition cursor-pointer hover:scale-105"
              title="More Info"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Info Card Body */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <Link to={playUrl}>
          <h3
            className="text-sm font-semibold text-zinc-200 group-hover:text-red-400 transition-colors line-clamp-1"
            title={title}
          >
            {title}
          </h3>
        </Link>
        <div className="flex items-center justify-between text-xs text-zinc-400 mt-1.5">
          <span>{year || 'Unknown'}</span>
          {isTv && lastWatched?.season ? (
            <span className="text-[10px] text-red-400 font-mono font-semibold">
              Resume S{lastWatched.season}:E{lastWatched.episode}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase font-mono">
              HD
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
