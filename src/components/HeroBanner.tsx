import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Bookmark, Star, Sparkles } from 'lucide-react';
import { getBackdropUrl } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import { useWatchlist } from '../hooks/useWatchlist';

interface HeroBannerProps {
  items: MediaItem[];
  onOpenDetails: (item: MediaItem) => void;
}

export default function HeroBanner({ items, onOpenDetails }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toggleWatchlist, isInWatchlist } = useWatchlist();

  // Auto rotate banner every 8 seconds
  useEffect(() => {
    if (!items || items.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(items.length, 6));
    }, 8000);
    return () => clearInterval(interval);
  }, [items]);

  if (!items || items.length === 0) return null;

  const current = items[currentIndex] || items[0];
  const title = current.title || current.name || 'Featured';
  const rawDate = current.release_date || current.first_air_date || '';
  const year = rawDate ? rawDate.substring(0, 4) : '';
  const isTv = current.media_type === 'tv' || (!current.release_date && !!current.first_air_date);
  const isSaved = isInWatchlist(current.id);
  const playUrl = isTv ? `/watch/tv/${current.id}/1/1` : `/watch/movie/${current.id}`;

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] max-h-[750px] overflow-hidden bg-zinc-950">
      {/* Background Backdrop with Gradient Fades */}
      <div className="absolute inset-0">
        <img
          src={getBackdropUrl(current.backdrop_path)}
          alt={title}
          className="w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out scale-105"
        />
        {/* Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-zinc-950/80 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-16 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Spotlight Tag */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-600/90 text-white shadow-lg shadow-red-600/30">
              <Sparkles className="w-3.5 h-3.5" /> Trending Spotlight
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900/80 text-zinc-300 border border-zinc-700/50">
              {isTv ? 'TV Series' : 'Movie'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-md line-clamp-2">
            {title}
          </h1>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
            <div className="flex items-center gap-1 text-amber-400 bg-zinc-950/70 px-2.5 py-1 rounded-md border border-amber-500/20">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{current.vote_average ? current.vote_average.toFixed(1) : 'NR'}</span>
            </div>
            {year && <span>{year}</span>}
            <span className="text-zinc-500">•</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono">
              Ultra HD
            </span>
          </div>

          {/* Overview / Synopsis */}
          <p className="text-sm sm:text-base text-zinc-300 line-clamp-3 leading-relaxed drop-shadow">
            {current.overview}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={playUrl}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 shadow-xl shadow-red-600/40 hover:scale-105 transition duration-200"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Watch Now</span>
            </Link>

            <button
              onClick={() => onOpenDetails(current)}
              className="px-5 py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/90 text-zinc-100 font-semibold flex items-center gap-2 backdrop-blur-md border border-zinc-700/60 transition"
            >
              <Info className="w-5 h-5 text-zinc-300" />
              <span>Details & Trailer</span>
            </button>

            <button
              onClick={() => toggleWatchlist(current)}
              className={`p-3 rounded-xl backdrop-blur-md border transition ${
                isSaved
                  ? 'bg-red-600/20 border-red-500/50 text-red-400'
                  : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-red-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute right-4 sm:right-8 bottom-8 flex items-center gap-2">
          {items.slice(0, 6).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? 'w-8 bg-red-500' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

