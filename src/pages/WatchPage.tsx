import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Star,
  Calendar,
  Clock,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Share2,
  Check,
  Copy,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { tmdbService, getProfileUrl, getPosterUrl, getBackdropUrl } from '../services/tmdb';
import type { MediaItem, CastMember } from '../types/media';
import VideoPlayer from '../components/VideoPlayer';
import EpisodePicker from '../components/EpisodePicker';
import MediaRow from '../components/MediaRow';
import MediaDetailsModal from '../components/MediaDetailsModal';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useWatchlist } from '../hooks/useWatchlist';
import { usePageTitle } from '../hooks/usePageTitle';
import { useMetaTags } from '../hooks/useMetaTags';

export default function WatchPage() {
  const { type, id, season, episode } = useParams<{
    type: 'movie' | 'tv';
    id: string;
    season?: string;
    episode?: string;
  }>();

  const navigate = useNavigate();
  const location = useLocation();

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const currentSeason = Number(season) || 1;
  const currentEpisode = Number(episode) || 1;

  const [details, setDetails] = useState<MediaItem | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [similar, setSimilar] = useState<MediaItem[]>([]);
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { addToHistory, updateProgress, getLastWatched, getEpisodeProgress } = useWatchHistory();
  const { toggleWatchlist, isInWatchlist } = useWatchlist();

  const getLastWatchedRef = useRef(getLastWatched);
  getLastWatchedRef.current = getLastWatched;

  // If user visits /watch/tv/:id without season/episode in URL, resume last watched season/episode
  useEffect(() => {
    if (mediaType === 'tv' && id && (!season || !episode)) {
      const lastWatched = getLastWatchedRef.current(Number(id), 'tv');
      const targetSeason = lastWatched?.season || 1;
      const targetEpisode = lastWatched?.episode || 1;
      navigate(`/watch/tv/${id}/${targetSeason}/${targetEpisode}`, { replace: true });
    }
  }, [id, mediaType, season, episode, navigate]);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadData() {
      try {
        const [detailData, castData, similarData] = await Promise.all([
          mediaType === 'tv' ? tmdbService.getTvDetails(id!) : tmdbService.getMovieDetails(id!),
          tmdbService.getCredits(mediaType, id!),
          tmdbService.getSimilar(mediaType, id!),
        ]);

        if (isMounted) {
          setDetails(detailData);
          setCast(castData);
          setSimilar(similarData);

          // Get existing saved progress if any
          const savedProgress = getEpisodeProgress(
            Number(id),
            mediaType,
            mediaType === 'tv' ? currentSeason : 1,
            mediaType === 'tv' ? currentEpisode : 1
          );

          // Record or refresh in watch history
          addToHistory({
            id: Number(id),
            title: detailData.title || detailData.name || 'Untitled',
            poster_path: detailData.poster_path,
            backdrop_path: detailData.backdrop_path,
            type: mediaType,
            season: mediaType === 'tv' ? currentSeason : undefined,
            episode: mediaType === 'tv' ? currentEpisode : undefined,
            progress: savedProgress?.progress,
            duration: savedProgress?.duration,
            completed: savedProgress?.completed,
          });
        }
      } catch (err) {
        console.error('Failed to load stream page details', err);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, mediaType, currentSeason, currentEpisode]);

  // Determine Next Episode / Next Season information
  const nextEpisodeInfo = useMemo(() => {
    if (mediaType !== 'tv' || !details?.seasons) return null;

    const validSeasons = details.seasons.filter((s) => s.season_number > 0);
    const currSeasonObj = validSeasons.find((s) => s.season_number === currentSeason);
    const maxEpisodesInSeason = currSeasonObj?.episode_count || 1;

    if (currentEpisode < maxEpisodesInSeason) {
      return {
        season: currentSeason,
        episode: currentEpisode + 1,
        isNextSeason: false,
      };
    } else {
      // Find next season if available
      const nextSeasonNum = currentSeason + 1;
      const nextSeasonObj = validSeasons.find((s) => s.season_number === nextSeasonNum);
      if (nextSeasonObj && nextSeasonObj.episode_count > 0) {
        return {
          season: nextSeasonNum,
          episode: 1,
          isNextSeason: true,
        };
      }
    }
    return null;
  }, [mediaType, details, currentSeason, currentEpisode]);

  if (!id) return null;

  const title = details ? details.title || details.name || 'Stream' : 'Loading...';
  const rawDate = details ? details.release_date || details.first_air_date || '' : '';
  const year = rawDate ? rawDate.substring(0, 4) : '';
  const isSaved = details ? isInWatchlist(details.id) : false;

  usePageTitle(
    details
      ? mediaType === 'tv'
        ? `${title} (S${currentSeason} E${currentEpisode})`
        : `${title} (${year || 'Movie'})`
      : 'Watch'
  );

  useMetaTags({
    title: details
      ? mediaType === 'tv'
        ? `${title} (S${currentSeason} E${currentEpisode})`
        : `${title} (${year || 'Movie'})`
      : 'Watch',
    description: details?.overview || 'Stream movies and TV series in HD with instant playback on WATCHD.',
    image: details?.poster_path ? getPosterUrl(details.poster_path, 'w780') : details?.backdrop_path ? getBackdropUrl(details.backdrop_path, 'w1280') : undefined,
    url: window.location.href,
    type: mediaType === 'tv' ? 'video.tv_show' : 'video.movie',
  });

  const handlePrevEpisode = () => {
    if (currentEpisode > 1) {
      navigate(`/watch/tv/${id}/${currentSeason}/${currentEpisode - 1}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentSeason > 1 && details?.seasons) {
      const prevSeasonNum = currentSeason - 1;
      const prevSeasonObj = details.seasons.find((s) => s.season_number === prevSeasonNum);
      const prevMaxEp = prevSeasonObj?.episode_count || 1;
      navigate(`/watch/tv/${id}/${prevSeasonNum}/${prevMaxEp}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextEpisode = () => {
    if (nextEpisodeInfo) {
      navigate(`/watch/tv/${id}/${nextEpisodeInfo.season}/${nextEpisodeInfo.episode}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(`/watch/tv/${id}/${currentSeason}/${currentEpisode + 1}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Watch "${title}" in HD on WATCHD!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `WATCHD - ${title}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or fallback
      }
    }

    setShowShareModal((prev) => !prev);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Get initial start time for playback - computed ONLY when the media/episode changes
  const initialStartAt = useMemo(() => {
    // Check if navigated back via miniplayer expand with exact timestamp
    if (location.state && typeof location.state === 'object' && 'resumeAt' in location.state) {
      const resumeTime = Number((location.state as any).resumeAt);
      if (resumeTime > 0) return resumeTime;
    }

    const saved = getEpisodeProgress(
      Number(id),
      mediaType,
      mediaType === 'tv' ? currentSeason : 1,
      mediaType === 'tv' ? currentEpisode : 1
    );
    return saved?.resumeProgress ?? (saved?.progress && saved.progress > 180 ? saved.progress : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mediaType, currentSeason, currentEpisode, location.state]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation & Breadcrumb Header */}
        <div className="flex items-center gap-3 py-1 overflow-x-auto whitespace-nowrap no-scrollbar">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(mediaType === 'tv' ? '/series' : '/movies');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition active:scale-95 cursor-pointer shadow-md shrink-0"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white" />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 shrink-0" />

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 font-medium">
            <Link to="/" className="hover:text-white transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <Link
              to={mediaType === 'tv' ? '/series' : '/movies'}
              className="hover:text-white transition capitalize"
            >
              {mediaType === 'tv' ? 'TV Shows' : 'Movies'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="text-zinc-200 truncate">{title}</span>
            {mediaType === 'tv' && (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-red-400 font-mono text-xs font-bold">
                S{currentSeason} : E{currentEpisode}
              </span>
            )}
          </div>
        </div>

        {/* Video Player */}
        <VideoPlayer
          tmdbId={id}
          type={mediaType}
          season={currentSeason}
          episode={currentEpisode}
          title={title}
          releaseYear={year ? Number(year) : undefined}
          startAt={initialStartAt}
          onProgressUpdate={(prog, dur) => {
            updateProgress(Number(id), mediaType, prog, dur, currentSeason, currentEpisode);
          }}
          nextEpisodeInfo={nextEpisodeInfo}
          onPlayNextEpisode={handleNextEpisode}
        />

        {/* Pro Stream Booster & VPN Affiliate Card */}
        <div className="bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Experiencing buffering or slow streams?</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                  Speed Boost
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                Protect your connection & unlock buffer-free 4K Ultra-HD streaming with a high-speed VPN.
              </p>
            </div>
          </div>
          <a
            href={import.meta.env.VITE_VPN_AFFILIATE_URL || 'https://www.profitableratecpmnetwork.com/tmu3is0wf5?key=21a1ec5aea498f026813fc3a521b1af3'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 hover:scale-105 transition shrink-0 cursor-pointer"
          >
            <span>Unlock High-Speed Stream</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Quick Episode Navigation (for TV Series) */}
        {mediaType === 'tv' && (
          <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <button
              onClick={handlePrevEpisode}
              disabled={currentEpisode <= 1 && currentSeason <= 1}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>
                {currentEpisode === 1 && currentSeason > 1 ? `Previous Season` : `Previous Episode`}
              </span>
            </button>

            <div className="text-center">
              <span className="text-xs sm:text-sm font-bold text-red-400 font-mono">
                Season {currentSeason} • Episode {currentEpisode}
              </span>
              {nextEpisodeInfo?.isNextSeason && (
                <div className="text-[10px] text-amber-400 font-medium">Season Finale</div>
              )}
            </div>

            <button
              onClick={handleNextEpisode}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <span>
                {nextEpisodeInfo?.isNextSeason
                  ? `Start Season ${nextEpisodeInfo.season}`
                  : `Next Episode`}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Movie / Show Overview & Action Bar */}
        {details && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
                    {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                  </span>
                  {details.vote_average > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{details.vote_average.toFixed(1)}</span>
                    </span>
                  )}
                  {year && (
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{year}</span>
                    </span>
                  )}
                  {details.runtime ? (
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{details.runtime}m</span>
                    </span>
                  ) : null}
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">{title}</h1>

                {details.tagline && (
                  <p className="text-sm italic text-zinc-400">{details.tagline}</p>
                )}

                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-4xl">
                  {details.overview || 'No overview available for this title.'}
                </p>

                {/* Genre Tags */}
                {details.genres && details.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {details.genres.map((g) => (
                      <span
                        key={g.id}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs font-medium text-zinc-300 border border-zinc-700/50"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap md:flex-col gap-2.5 w-full md:w-auto shrink-0">
                <button
                  onClick={() => toggleWatchlist(details)}
                  className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    isSaved
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-500'
                      : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                  <span>{isSaved ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-zinc-700 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Stream</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rich Share Modal Dialog */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-red-500" />
                  <span>Share Stream</span>
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              {/* Live OpenGraph Social Preview Card */}
              <div className="rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-inner">
                <div className="relative h-32 w-full bg-zinc-900 overflow-hidden">
                  <img
                    src={
                      details?.backdrop_path
                        ? getBackdropUrl(details.backdrop_path, 'w780')
                        : details?.poster_path
                        ? getPosterUrl(details.poster_path, 'w500')
                        : 'https://watch.kingori.co.ke/favicon.svg'
                    }
                    alt={title}
                    className="w-full h-full object-cover object-center filter brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase tracking-wider">
                    WATCHD HD
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                    watch.kingori.co.ke
                  </p>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{title}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {details?.overview || 'Stream this title in HD with instant playback and subtitles.'}
                  </p>
                </div>
              </div>

              {/* Social Channels 1-Click Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🍿 Watch "${title}" in HD on WATCHD:\n${window.location.href}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition text-center"
                >
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(
                    window.location.href
                  )}&text=${encodeURIComponent(`🍿 Watch "${title}" in HD on WATCHD`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition text-center"
                >
                  <span>Telegram</span>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `🍿 Watching "${title}" in HD on @WATCHD`
                  )}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition text-center"
                >
                  <span>X / Twitter</span>
                </a>
              </div>

              {/* Direct Copy Link Input */}
              <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="bg-transparent text-xs text-zinc-300 flex-1 outline-none font-mono px-1"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TV Series Episode & Season Picker */}
        {mediaType === 'tv' && details?.seasons && (
          <EpisodePicker
            tvId={id}
            seasons={details.seasons}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
          />
        )}

        {/* Cast & Crew Carousel */}
        {cast.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>Top Cast</span>
              <span className="text-xs text-zinc-500 font-normal">({cast.length})</span>
            </h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {cast.map((c) => (
                <Link
                  key={c.id}
                  to={`/person/${c.id}`}
                  className="w-24 sm:w-28 shrink-0 text-center space-y-1.5 group cursor-pointer"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700/60 shadow-md transition-all duration-200 group-hover:scale-105 group-hover:border-red-500">
                    <img
                      src={getProfileUrl(c.profile_path)}
                      alt={c.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-red-400 transition-colors line-clamp-1">
                    {c.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">{c.character}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Similar Titles Shelf */}
        {similar.length > 0 && (
          <MediaRow
            title="You May Also Like"
            items={similar}
            onOpenDetails={(item) => setModalItem(item)}
          />
        )}
      </div>

      {/* Media Details Modal */}
      <MediaDetailsModal item={modalItem} onClose={() => setModalItem(null)} />
    </div>
  );
}
