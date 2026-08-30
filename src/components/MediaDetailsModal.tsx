import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Play, Star, Calendar, Clock, Bookmark, Tv, Video } from 'lucide-react';
import { tmdbService, getBackdropUrl, getPosterUrl, getProfileUrl } from '../services/tmdb';
import type { MediaItem, CastMember, VideoTrailer } from '../types/media';
import { useWatchlist } from '../hooks/useWatchlist';

interface MediaDetailsModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

export default function MediaDetailsModal({ item, onClose }: MediaDetailsModalProps) {
  const [details, setDetails] = useState<MediaItem | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [trailers, setTrailers] = useState<VideoTrailer[]>([]);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);

  const { toggleWatchlist, isInWatchlist } = useWatchlist();

  useEffect(() => {
    if (!item) return;

    let isMounted = true;
    setActiveTrailerKey(null);

    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');

    async function loadFullData() {
      try {
        const [detailData, castData, videoData] = await Promise.all([
          type === 'tv'
            ? tmdbService.getTvDetails(item!.id)
            : tmdbService.getMovieDetails(item!.id),
          tmdbService.getCredits(type, item!.id),
          tmdbService.getVideos(type, item!.id),
        ]);

        if (isMounted) {
          setDetails(detailData);
          setCast(castData);
          const youtubeTrailers = videoData.filter(
            (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
          );
          setTrailers(youtubeTrailers);
        }
      } catch (err) {
        console.error('Failed to load media details', err);
      }
    }

    loadFullData();

    // Prevent background body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      isMounted = false;
      document.body.style.overflow = 'auto';
    };
  }, [item]);

  if (!item) return null;

  const current = details || item;
  const title = current.title || current.name || 'Untitled';
  const rawDate = current.release_date || current.first_air_date || '';
  const year = rawDate ? rawDate.substring(0, 4) : '';
  const isTv = current.media_type === 'tv' || (!current.release_date && !!current.first_air_date);
  const isSaved = isInWatchlist(current.id);
  const playUrl = isTv ? `/watch/tv/${current.id}/1/1` : `/watch/movie/${current.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1">
          {/* Top Backdrop / Trailer Section */}
          <div className="relative aspect-video sm:h-80 w-full bg-zinc-950 overflow-hidden">
            {activeTrailerKey ? (
              <iframe
                src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1`}
                title="Trailer"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  src={getBackdropUrl(current.backdrop_path)}
                  alt={title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                {trailers.length > 0 && (
                  <button
                    onClick={() => setActiveTrailerKey(trailers[0].key)}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition duration-300"
                  >
                    <Play className="w-8 h-8 fill-white ml-1" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Details Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Poster Thumbnail */}
              <div className="hidden sm:block w-36 shrink-0 rounded-xl overflow-hidden shadow-xl -mt-20 z-20 border-2 border-zinc-800 bg-zinc-950">
                <img
                  src={getPosterUrl(current.poster_path, 'w342')}
                  alt={title}
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Main Info */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-red-600/20 text-red-400 border border-red-500/30">
                    {isTv ? 'TV Series' : 'Movie'}
                  </span>
                  {current.genres &&
                    current.genres.map((g) => (
                      <span
                        key={g.id}
                        className="px-2 py-0.5 rounded-md text-xs bg-zinc-800 text-zinc-300"
                      >
                        {g.name}
                      </span>
                    ))}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white">{title}</h2>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{current.vote_average ? current.vote_average.toFixed(1) : 'NR'}</span>
                    <span className="text-xs text-zinc-500 font-normal">
                      ({current.vote_count || 0})
                    </span>
                  </div>
                  {year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{year}</span>
                    </div>
                  )}
                  {current.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{current.runtime} min</span>
                    </div>
                  )}
                  {current.number_of_seasons && (
                    <div className="flex items-center gap-1">
                      <Tv className="w-4 h-4" />
                      <span>{current.number_of_seasons} Seasons</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    to={playUrl}
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105 transition"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Watch Now</span>
                  </Link>

                  <button
                    onClick={() => toggleWatchlist(current)}
                    className={`px-4 py-2.5 rounded-xl border font-medium flex items-center gap-2 transition ${
                      isSaved
                        ? 'bg-red-600/20 border-red-500/40 text-red-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-700'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-red-500' : ''}`} />
                    <span>{isSaved ? 'In Watchlist' : 'Add to Watchlist'}</span>
                  </button>

                  {trailers.length > 0 && !activeTrailerKey && (
                    <button
                      onClick={() => setActiveTrailerKey(trailers[0].key)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-700 font-medium flex items-center gap-2 transition"
                    >
                      <Video className="w-4 h-4" />
                      <span>Trailer</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Overview */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Overview
              </h3>
              <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                {current.overview || 'No overview available for this title.'}
              </p>
            </div>

            {/* Cast Carousel */}
            {cast.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Top Cast
                </h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {cast.map((actor) => (
                    <div key={actor.id} className="w-20 shrink-0 text-center space-y-1">
                      <img
                        src={getProfileUrl(actor.profile_path)}
                        alt={actor.name}
                        className="w-16 h-16 rounded-full object-cover mx-auto bg-zinc-800 border border-zinc-700"
                      />
                      <p className="text-xs font-semibold text-zinc-200 truncate">{actor.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{actor.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

