import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Layers, CheckCircle2 } from 'lucide-react';
import { tmdbService, getBackdropUrl } from '../services/tmdb';
import type { Episode, SeasonSummary } from '../types/media';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { isPlaybackCompleted, isPlaybackPreview } from '../utils/historyHelpers';

interface EpisodePickerProps {
  tvId: number | string;
  seasons: SeasonSummary[];
  currentSeason: number;
  currentEpisode: number;
}

export default function EpisodePicker({
  tvId,
  seasons,
  currentSeason,
  currentEpisode,
}: EpisodePickerProps) {
  const [selectedSeason, setSelectedSeason] = useState<number>(currentSeason || 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { getEpisodeProgress } = useWatchHistory();

  // Filter out Season 0 (Specials) if preferred, or keep if valid
  const validSeasons = (seasons || []).filter((s) => s.season_number > 0);

  useEffect(() => {
    setSelectedSeason(currentSeason);
  }, [currentSeason]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadEpisodes() {
      try {
        const list = await tmdbService.getTvSeasonEpisodes(tvId, selectedSeason);
        if (isMounted) {
          setEpisodes(list);
        }
      } catch (err) {
        console.error('Failed to load season episodes', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadEpisodes();

    return () => {
      isMounted = false;
    };
  }, [tvId, selectedSeason]);

  const handleEpisodeSelect = (epNum: number) => {
    navigate(`/watch/tv/${tvId}/${selectedSeason}/${epNum}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header & Season Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-bold text-white">Episodes &amp; Seasons</h3>
        </div>

        {/* Season Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="season-select" className="text-xs font-semibold text-zinc-400 uppercase">
            Season:
          </label>
          <select
            id="season-select"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="bg-zinc-800 text-sm font-semibold text-white px-3 py-1.5 rounded-lg border border-zinc-700 focus:outline-none focus:border-red-500 cursor-pointer"
          >
            {validSeasons.length > 0 ? (
              validSeasons.map((s) => (
                <option key={s.id} value={s.season_number}>
                  {s.name || `Season ${s.season_number}`} ({s.episode_count} Eps)
                </option>
              ))
            ) : (
              <option value={1}>Season 1</option>
            )}
          </select>
        </div>
      </div>

      {/* Episode Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-32 bg-zinc-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
          {episodes.map((ep) => {
            const isPlaying =
              selectedSeason === currentSeason && ep.episode_number === currentEpisode;

            const progressInfo = getEpisodeProgress(
              Number(tvId),
              'tv',
              selectedSeason,
              ep.episode_number
            );

            const isCompleted = isPlaybackCompleted(
              progressInfo?.progress,
              progressInfo?.duration,
              'tv',
              progressInfo?.completed
            );
            const isPreview = isPlaybackPreview(progressInfo?.progress, isCompleted);

            const progressPct =
              !isCompleted && !isPreview && progressInfo?.progress && progressInfo?.duration && progressInfo.duration > 0
                ? Math.min(100, Math.round((progressInfo.progress / progressInfo.duration) * 100))
                : 0;

            const isWatched = isCompleted || progressPct >= 85;

            return (
              <button
                key={ep.id}
                onClick={() => handleEpisodeSelect(ep.episode_number)}
                className={`flex flex-col text-left rounded-xl overflow-hidden border transition-all duration-200 group cursor-pointer ${
                  isPlaying
                    ? 'bg-red-950/40 border-red-500/80 shadow-lg shadow-red-950/50 ring-1 ring-red-500/40'
                    : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80'
                }`}
              >
                {/* Still Thumbnail */}
                <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                  <img
                    src={getBackdropUrl(ep.still_path, 'w300')}
                    alt={ep.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />

                  {/* Play badge / active indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                        isPlaying
                          ? 'bg-red-600 text-white scale-110'
                          : 'bg-zinc-950/70 text-zinc-300 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>

                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-zinc-950/90 text-xs font-mono font-bold text-white border border-zinc-700/50">
                    EP {ep.episode_number}
                  </span>

                  {isPlaying && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider font-mono shadow-md animate-pulse">
                      Now Watching
                    </span>
                  )}

                  {!isPlaying && isWatched && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Watched</span>
                    </span>
                  )}

                  {/* Playback Progress Bar */}
                  {progressPct > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-amber-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4
                      className={`text-sm font-semibold line-clamp-1 ${
                        isPlaying ? 'text-red-400' : 'text-zinc-200 group-hover:text-white'
                      }`}
                    >
                      {ep.name || `Episode ${ep.episode_number}`}
                    </h4>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                      {ep.overview || 'No description available for this episode.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800/60">
                    {ep.air_date && <span>{ep.air_date}</span>}
                    {ep.runtime && <span>{ep.runtime} min</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
