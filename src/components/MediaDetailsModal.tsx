import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Play, Star, Calendar, Clock, Bookmark, Tv, Video, Layers, Sparkles } from 'lucide-react';
import { tmdbService, getBackdropUrl, getPosterUrl, getProfileUrl } from '../services/tmdb';
import type { MediaItem, CastMember, VideoTrailer } from '../types/media';
import { useWatchlist } from '../hooks/useWatchlist';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { isPlaybackCompleted, isPlaybackPreview } from '../utils/historyHelpers';

interface MediaDetailsModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onSelectMovie?: (item: MediaItem) => void;
}

export default function MediaDetailsModal({ item, onClose, onSelectMovie }: MediaDetailsModalProps) {
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(item);
  const [details, setDetails] = useState<MediaItem | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [similar, setSimilar] = useState<MediaItem[]>([]);
  const [collection, setCollection] = useState<{ name: string; parts: MediaItem[] } | null>(null);
  const [trailers, setTrailers] = useState<VideoTrailer[]>([]);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { getLastWatched } = useWatchHistory();

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  useEffect(() => {
    if (!currentItem) return;

    let isMounted = true;
    setActiveTrailerKey(null);

    const type = currentItem.media_type || (currentItem.first_air_date ? 'tv' : 'movie');

    async function loadFullData() {
      try {
        const [detailData, castData, videoData, similarData] = await Promise.all([
          type === 'tv'
            ? tmdbService.getTvDetails(currentItem!.id)
            : tmdbService.getMovieDetails(currentItem!.id),
          tmdbService.getCredits(type, currentItem!.id),
          tmdbService.getVideos(type, currentItem!.id),
          tmdbService.getSimilar(type, currentItem!.id),
        ]);

        if (isMounted) {
          setDetails(detailData);
          setCast(castData);
          setSimilar(similarData);
          const youtubeTrailers = videoData.filter(
            (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
          );
          setTrailers(youtubeTrailers);

          // If movie belongs to an official TMDB collection / franchise (e.g. Harry Potter, John Wick, Avatar)
          if (detailData.belongs_to_collection?.id) {
            tmdbService
              .getCollectionDetails(detailData.belongs_to_collection.id)
              .then((colData) => {
                if (isMounted && colData?.parts && colData.parts.length > 1) {
                  setCollection({
                    name: colData.name,
                    parts: colData.parts,
                  });
                } else if (isMounted) {
                  setCollection(null);
                }
              })
              .catch(() => {
                if (isMounted) setCollection(null);
              });
          } else {
            setCollection(null);
          }
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
  }, [currentItem]);

  if (!item) return null;

  const current = details || item;
  const title = current.title || current.name || 'Untitled';
  const rawDate = current.release_date || current.first_air_date || '';
  const year = rawDate ? rawDate.substring(0, 4) : '';
  const isTv = current.media_type === 'tv' || (!current.release_date && !!current.first_air_date);
  const isSaved = isInWatchlist(current.id);
  const lastWatched = getLastWatched(current.id, isTv ? 'tv' : 'movie');
  const isCompleted = isPlaybackCompleted(lastWatched?.progress, lastWatched?.duration, isTv ? 'tv' : 'movie', lastWatched?.completed);
  const isPreview = isPlaybackPreview(lastWatched?.progress, isCompleted);
  const hasActiveResume = Boolean(lastWatched && !isCompleted && !isPreview && lastWatched.progress && lastWatched.progress > 180);

  const playUrl = isTv
    ? `/watch/tv/${current.id}/${lastWatched?.season || 1}/${lastWatched?.episode || 1}`
    : `/watch/movie/${current.id}`;

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
                    <span>
                      {hasActiveResume
                        ? isTv
                          ? `Resume S${lastWatched?.season || 1}:E${lastWatched?.episode || 1}`
                          : 'Resume Movie'
                        : isCompleted
                        ? 'Watch Again'
                        : 'Watch Now'}
                    </span>
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
                    <Link
                      key={actor.id}
                      to={`/person/${actor.id}`}
                      onClick={onClose}
                      className="w-20 shrink-0 text-center space-y-1 group transition cursor-pointer"
                    >
                      <img
                        src={getProfileUrl(actor.profile_path)}
                        alt={actor.name}
                        className="w-16 h-16 rounded-full object-cover mx-auto bg-zinc-800 border border-zinc-700 group-hover:border-red-500 group-hover:scale-105 transition duration-200"
                      />
                      <p className="text-xs font-semibold text-zinc-200 group-hover:text-red-400 transition truncate">
                        {actor.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">{actor.character}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic TMDB Franchise Collection / Sequels Shelf */}
            {collection && collection.parts && collection.parts.length > 1 && (
              <div className="pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                    {collection.name} (The Complete Saga)
                  </h3>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {collection.parts.map((part) => {
                    const isCurrent = part.id === current.id;
                    const partYear = (part.release_date || '').substring(0, 4);
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => {
                          if (!isCurrent) {
                            setCurrentItem(part);
                            if (onSelectMovie) onSelectMovie(part);
                          }
                        }}
                        className={`w-28 shrink-0 text-left space-y-1.5 group transition cursor-pointer p-1.5 rounded-xl border ${
                          isCurrent
                            ? 'bg-red-600/10 border-red-500/50 ring-1 ring-red-500/30'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-900">
                          <img
                            src={getPosterUrl(part.poster_path, 'w185')}
                            alt={part.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            loading="lazy"
                          />
                          {isCurrent && (
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase">
                              Viewing
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-red-400 line-clamp-1">
                          {part.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500">{partYear || 'Movie'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* More Like This (Similar & Recommended Titles) */}
            {similar && similar.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    More Like This
                  </h3>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {similar.slice(0, 10).map((sim) => {
                    const simTitle = sim.title || sim.name || 'Untitled';
                    const simYear = (sim.release_date || sim.first_air_date || '').substring(0, 4);
                    return (
                      <button
                        key={sim.id}
                        type="button"
                        onClick={() => {
                          setCurrentItem(sim);
                          if (onSelectMovie) onSelectMovie(sim);
                        }}
                        className="w-28 shrink-0 text-left space-y-1.5 group transition cursor-pointer p-1.5 rounded-xl border bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60"
                      >
                        <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-900">
                          <img
                            src={getPosterUrl(sim.poster_path, 'w185')}
                            alt={simTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            loading="lazy"
                          />
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-zinc-950/80 text-amber-400 text-[9px] font-bold flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            <span>{sim.vote_average ? sim.vote_average.toFixed(1) : 'NR'}</span>
                          </div>
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-red-400 line-clamp-1">
                          {simTitle}
                        </h4>
                        <p className="text-[10px] text-zinc-500">{simYear || 'Movie'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

