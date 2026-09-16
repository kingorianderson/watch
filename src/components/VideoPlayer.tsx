import { useState, useEffect, useRef } from 'react';
import { Server, RefreshCw, Sparkles, Info, Play, RotateCcw, X, AlertCircle } from 'lucide-react';
import { STREAM_SERVERS, type StreamServer } from '../services/providers';
import { directStreamService, type DirectStreamResult } from '../services/directStreamService';
import NativePlayer from './NativePlayer';
import { PREVIEW_THRESHOLD_SECONDS } from '../utils/historyHelpers';

interface VideoPlayerProps {
  tmdbId: number | string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title: string;
  releaseYear?: number;
  startAt?: number;
  onProgressUpdate?: (progress: number, duration: number) => void;
  onEnded?: () => void;
  nextEpisodeInfo?: { season: number; episode: number; isNextSeason?: boolean } | null;
  onPlayNextEpisode?: () => void;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function VideoPlayer({
  tmdbId,
  type,
  season = 1,
  episode = 1,
  title,
  releaseYear,
  startAt = 0,
  onProgressUpdate,
  onEnded,
  nextEpisodeInfo,
  onPlayNextEpisode,
}: VideoPlayerProps) {
  const [currentServer, setCurrentServer] = useState<StreamServer>(STREAM_SERVERS[0]);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeStartAt, setActiveStartAt] = useState<number>(startAt);
  const [showResumeToast, setShowResumeToast] = useState<boolean>(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [directStreamData, setDirectStreamData] = useState<DirectStreamResult | null>(null);
  const [nativeScrapeFailed, setNativeScrapeFailed] = useState<boolean>(false);

  const countdownTimerRef = useRef<any>(null);
  const hasTriggeredNextRef = useRef<boolean>(false);
  const startAtRef = useRef<number>(startAt);
  startAtRef.current = startAt;

  // Track the media identity so we ONLY reload when the media or server actually changes
  const prevMediaKeyRef = useRef<string>('');

  useEffect(() => {
    const currentMediaKey = `${tmdbId}_${type}_${season}_${episode}_${currentServer.id}`;

    // Only reload when media or server truly changes
    if (prevMediaKeyRef.current !== currentMediaKey) {
      prevMediaKeyRef.current = currentMediaKey;
      setIsLoading(true);
      setNativeScrapeFailed(false);

      // Only resume if beyond 3-minute preview threshold (180s)
      const initialTime =
        startAtRef.current && startAtRef.current > PREVIEW_THRESHOLD_SECONDS
          ? startAtRef.current
          : 0;
      setActiveStartAt(initialTime);
      setIframeKey((prev) => prev + 1);
      hasTriggeredNextRef.current = false;
      setAutoPlayCountdown(null);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      if (initialTime > PREVIEW_THRESHOLD_SECONDS) {
        setShowResumeToast(true);
        const timer = setTimeout(() => setShowResumeToast(false), 7000);
        return () => clearTimeout(timer);
      } else {
        setShowResumeToast(false);
      }
    }
  }, [tmdbId, type, season, episode, currentServer]);

  // Resolve direct HLS stream metadata when Server 1 is active
  useEffect(() => {
    if (currentServer.isNativeHls) {
      let isMounted = true;
      setIsLoading(true);
      setNativeScrapeFailed(false);

      directStreamService
        .getDirectStream(tmdbId, type, season, episode, title, releaseYear)
        .then((res) => {
          if (isMounted) {
            if (res && res.qualities && res.qualities.length > 0) {
              setDirectStreamData(res);
              setNativeScrapeFailed(false);
            } else {
              setDirectStreamData(null);
              setNativeScrapeFailed(true);
            }
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setDirectStreamData(null);
            setNativeScrapeFailed(true);
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else {
      setDirectStreamData(null);
      setNativeScrapeFailed(false);
    }
  }, [tmdbId, type, season, episode, currentServer, title, releaseYear]);

  // Listen to postMessage events from VidLink without causing iframe re-renders
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onPlayNextEpisodeRef = useRef(onPlayNextEpisode);
  onPlayNextEpisodeRef.current = onPlayNextEpisode;
  const nextEpisodeInfoRef = useRef(nextEpisodeInfo);
  nextEpisodeInfoRef.current = nextEpisodeInfo;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin from vidlink.pro
      if (typeof event.origin === 'string' && event.origin.includes('vidlink.pro')) {
        const data = event.data;
        if (data?.type === 'PLAYER_EVENT' && data.data) {
          const { event: eventType, currentTime, duration } = data.data;

          if (typeof currentTime === 'number') {
            onProgressUpdateRef.current?.(currentTime, duration || 0);

            // Only trigger auto next episode when the episode is 100% complete
            const is100PercentComplete =
              eventType === 'ended' || (duration > 30 && currentTime >= duration - 2);

            if (
              is100PercentComplete &&
              !hasTriggeredNextRef.current &&
              nextEpisodeInfoRef.current &&
              onPlayNextEpisodeRef.current
            ) {
              hasTriggeredNextRef.current = true;
              onEndedRef.current?.();
              startAutoPlayCountdown();
            }
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const startAutoPlayCountdown = () => {
    setAutoPlayCountdown(6);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setAutoPlayCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownTimerRef.current);
          if (onPlayNextEpisodeRef.current) onPlayNextEpisodeRef.current();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelAutoPlay = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setAutoPlayCountdown(null);
  };

  // Handlers for NativePlayer
  const handleNativeProgress = (currentTime: number, duration: number) => {
    onProgressUpdateRef.current?.(currentTime, duration);

    // Trigger auto next episode strictly when 100% complete (last 2 seconds)
    const is100PercentComplete = duration > 30 && currentTime >= duration - 2;
    if (
      is100PercentComplete &&
      !hasTriggeredNextRef.current &&
      nextEpisodeInfoRef.current &&
      onPlayNextEpisodeRef.current
    ) {
      hasTriggeredNextRef.current = true;
      onEndedRef.current?.();
      startAutoPlayCountdown();
    }
  };

  const handleNativeEnded = () => {
    if (
      !hasTriggeredNextRef.current &&
      nextEpisodeInfoRef.current &&
      onPlayNextEpisodeRef.current
    ) {
      hasTriggeredNextRef.current = true;
      onEndedRef.current?.();
      startAutoPlayCountdown();
    }
  };

  const handleSwitchToBackup = () => {
    setCurrentServer(STREAM_SERVERS[1]); // Fallback to Server 2 (VidLink)
  };

  const streamUrl =
    type === 'movie'
      ? currentServer.getMovieUrl(tmdbId, activeStartAt)
      : currentServer.getTvUrl(tmdbId, season, episode, activeStartAt);

  const handleServerChange = (server: StreamServer) => {
    if (server.id !== currentServer.id) {
      setCurrentServer(server);
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleStartOver = () => {
    setActiveStartAt(0);
    setShowResumeToast(false);
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="w-full space-y-4">
      {/* Video Player Frame Container */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 ring-1 ring-zinc-800/50">
        {/* Loading Spinner Indicator for Iframe mode */}
        {isLoading && !currentServer.isNativeHls && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm pointer-events-none">
            <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-zinc-300">Connecting to {currentServer.name}...</p>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2 font-medium bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Loading HD Video Feed</span>
            </div>
          </div>
        )}

        {/* Resumed from timestamp banner toast */}
        {showResumeToast && activeStartAt > 15 && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2.5 bg-zinc-900/90 border border-emerald-500/40 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              Resumed from <strong className="text-emerald-400 font-mono">{formatTime(activeStartAt)}</strong>
            </span>
            <button
              onClick={handleStartOver}
              className="ml-1 px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Start Over</span>
            </button>
            <button
              onClick={() => setShowResumeToast(false)}
              className="text-zinc-500 hover:text-white p-0.5 rounded cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Auto Next Episode Countdown Overlay */}
        {autoPlayCountdown !== null && nextEpisodeInfo && (
          <div className="absolute bottom-6 right-6 z-40 bg-zinc-950/95 border border-red-600/50 backdrop-blur-md p-4 rounded-2xl shadow-2xl max-w-xs space-y-3 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 font-mono">
                {nextEpisodeInfo.isNextSeason ? 'Next Season Up' : 'Up Next'}
              </span>
              <button
                onClick={cancelAutoPlay}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-850 cursor-pointer"
                title="Cancel Auto-play"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {nextEpisodeInfo.isNextSeason
                  ? `Season ${nextEpisodeInfo.season} • Episode 1`
                  : `Season ${nextEpisodeInfo.season} • Episode ${nextEpisodeInfo.episode}`}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Playing automatically in <strong className="text-red-400 font-mono text-sm">{autoPlayCountdown}s</strong>...
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  cancelAutoPlay();
                  if (onPlayNextEpisodeRef.current) onPlayNextEpisodeRef.current();
                }}
                className="flex-1 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Now</span>
              </button>
              <button
                onClick={cancelAutoPlay}
                className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Player Rendering: Native HLS Player vs Embed Iframe */}
        {currentServer.isNativeHls ? (
          directStreamData ? (
            <NativePlayer
              key={`native-${tmdbId}-${season}-${episode}`}
              qualities={directStreamData.qualities}
              subtitles={directStreamData.subtitles}
              title={title}
              startAt={activeStartAt}
              onProgressUpdate={handleNativeProgress}
              onEnded={handleNativeEnded}
              onSwitchToBackup={handleSwitchToBackup}
            />
          ) : isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center space-y-4">
              <div className="w-14 h-14 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Scraping Multi-Source Streams...</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Connecting to @movie-web 4K cluster and querying 15+ high-speed sources for zero-ad playback.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium bg-red-950/40 px-3 py-1 rounded-full border border-red-800/40">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Resolving 1080p & 4K Feeds</span>
              </div>
            </div>
          ) : nativeScrapeFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center z-30 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-lg font-bold text-white">Direct Stream Unavailable</h3>
                <p className="text-xs text-zinc-400">
                  This specific title is not in the direct HLS archive. Switch to Server 2 (VidLink) to watch in full HD.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSwitchToBackup}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  Switch to Server 2 (VidLink)
                </button>
              </div>
            </div>
          ) : null
        ) : (
          <iframe
            key={iframeKey}
            src={streamUrl}
            title={`${title} Stream Player`}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-0 relative z-20"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="origin"
          />
        )}
      </div>

      {/* Control Bar: Server Switching & Controls */}
      <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex flex-col space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Server Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mr-2 uppercase tracking-wider">
              <Server className="w-4 h-4 text-red-500" />
              <span>Servers:</span>
            </div>

            {STREAM_SERVERS.map((server) => {
              const isSelected = server.id === currentServer.id;
              return (
                <button
                  key={server.id}
                  onClick={() => handleServerChange(server)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-500/50'
                      : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <span>{server.name}</span>
                  {server.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-red-700 text-red-100' : 'bg-zinc-950 text-zinc-400 border border-zinc-700/50'
                      }`}
                    >
                      {server.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleReload}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition border border-zinc-700 cursor-pointer"
              title="Reload Video Stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Stream</span>
            </button>
          </div>
        </div>

        {/* Server Quality Note */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-zinc-400">
          <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span>
            Server 1 (Direct 4K) provides ad-free native HLS streaming with custom resolution &amp; subtitle switcher. If a stream buffers, switch servers above.
          </span>
        </div>
      </div>
    </div>
  );
}
