import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  Calendar,
  Clock,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  Tv,
  Share2,
  Check,
  Copy,
  Sparkles,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { tmdbService, getProfileUrl } from '../services/tmdb';
import type { MediaItem, CastMember } from '../types/media';
import VideoPlayer from '../components/VideoPlayer';
import EpisodePicker from '../components/EpisodePicker';
import MediaRow from '../components/MediaRow';
import MediaDetailsModal from '../components/MediaDetailsModal';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useWatchlist } from '../hooks/useWatchlist';
import { usePageTitle } from '../hooks/usePageTitle';

export default function WatchPage() {
  const { type, id, season, episode } = useParams<{
    type: 'movie' | 'tv';
    id: string;
    season?: string;
    episode?: string;
  }>();

  const navigate = useNavigate();
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const currentSeason = Number(season) || 1;
  const currentEpisode = Number(episode) || 1;

  const [details, setDetails] = useState<MediaItem | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [similar, setSimilar] = useState<MediaItem[]>([]);
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { addToHistory } = useWatchHistory();
  const { toggleWatchlist, isInWatchlist } = useWatchlist();

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

          // Record in watch history
          addToHistory({
            id: Number(id),
            title: detailData.title || detailData.name || 'Untitled',
            poster_path: detailData.poster_path,
            backdrop_path: detailData.backdrop_path,
            type: mediaType,
            season: mediaType === 'tv' ? currentSeason : undefined,
            episode: mediaType === 'tv' ? currentEpisode : undefined,
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

  const handlePrevEpisode = () => {
    if (currentEpisode > 1) {
      navigate(`/watch/tv/${id}/${currentSeason}/${currentEpisode - 1}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextEpisode = () => {
    navigate(`/watch/tv/${id}/${currentSeason}/${currentEpisode + 1}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 font-medium overflow-x-auto whitespace-nowrap py-1">
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
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-red-400 font-mono text-xs">
              S{currentSeason} : E{currentEpisode}
            </span>
          )}
        </div>

        {/* Video Player */}
        <VideoPlayer
          tmdbId={id}
          type={mediaType}
          season={currentSeason}
          episode={currentEpisode}
          title={title}
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
              disabled={currentEpisode <= 1}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Episode</span>
            </button>

            <span className="text-xs sm:text-sm font-bold text-red-400 font-mono">
              Season {currentSeason} • Episode {currentEpisode}
            </span>

            <button
              onClick={handleNextEpisode}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <span>Next Episode</span>
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
                  {details.genres?.map((g) => (
                    <span
                      key={g.id}
                      className="px-2.5 py-0.5 rounded-md text-xs bg-zinc-800 text-zinc-300"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight m-0">
                  {title}
                </h1>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{details.vote_average ? details.vote_average.toFixed(1) : 'NR'}</span>
                    <span className="text-xs text-zinc-500 font-normal">
                      ({details.vote_count} votes)
                    </span>
                  </div>
                  {year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{year}</span>
                    </div>
                  )}
                  {details.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{details.runtime} min</span>
                    </div>
                  )}
                  {details.number_of_seasons && (
                    <div className="flex items-center gap-1">
                      <Tv className="w-4 h-4" />
                      <span>{details.number_of_seasons} Seasons</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Watchlist & Share */}
              <div className="relative flex flex-wrap items-center gap-3">
                <button
                  onClick={() => toggleWatchlist(details)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                    isSaved
                      ? 'bg-red-600/20 border-red-500/50 text-red-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-red-500' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                  title="Share this title"
                >
                  <Share2 className="w-4 h-4 text-red-400" />
                  <span>Share</span>
                </button>

                {/* Share Dropdown Modal (Fallback / Desktop) */}
                {showShareModal && (
                  <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl z-30 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-xs font-bold text-zinc-300">Share "{title}"</div>
                    
                    {/* Copy Link Row */}
                    <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                      <input
                        type="text"
                        readOnly
                        value={window.location.href}
                        className="bg-transparent text-xs text-zinc-400 flex-1 truncate focus:outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white transition cursor-pointer shrink-0"
                        title="Copy link"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {copied && (
                      <div className="text-[11px] text-emerald-400 font-medium text-center">
                        ✓ Link copied to clipboard!
                      </div>
                    )}

                    {/* Quick Social Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Watch "${title}" on WATCHD: ${window.location.href}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-300 text-xs font-bold text-center transition"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Watch "${title}" on WATCHD!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/40 text-sky-300 text-xs font-bold text-center transition"
                      >
                        Telegram
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Watch "${title}" on WATCHD: ${window.location.href}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold text-center transition"
                      >
                        X / Twitter
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Synopsis */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Synopsis
              </h3>
              <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                {details.overview || 'No synopsis available.'}
              </p>
            </div>

            {/* Cast List */}
            {cast.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Cast & Crew
                </h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {cast.map((actor) => (
                    <div key={actor.id} className="w-20 shrink-0 text-center space-y-1">
                      <img
                        src={getProfileUrl(actor.profile_path)}
                        alt={actor.name}
                        className="w-14 h-14 rounded-full object-cover mx-auto bg-zinc-800 border border-zinc-700"
                      />
                      <p className="text-xs font-semibold text-zinc-200 truncate">{actor.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{actor.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TV Series Episode Guide (if TV Show) */}
        {mediaType === 'tv' && details?.seasons && (
          <EpisodePicker
            tvId={id}
            seasons={details.seasons}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
          />
        )}

        {/* Recommendations / Similar Titles */}
        {similar.length > 0 && (
          <div className="pt-4">
            <MediaRow
              title="You May Also Like"
              items={similar}
              icon={<Sparkles className="w-5 h-5 text-red-500" />}
              onOpenDetails={(item) => setModalItem(item)}
            />
          </div>
        )}

        {/* Modal */}
        {modalItem && (
          <MediaDetailsModal item={modalItem} onClose={() => setModalItem(null)} />
        )}
      </div>
    </div>
  );
}

