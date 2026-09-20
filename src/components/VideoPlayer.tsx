import { useState, useEffect, useRef } from 'react';
import {
  Server,
  RefreshCw,
  Sparkles,
  Info,
  Play,
  RotateCcw,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  Layers,
} from 'lucide-react';
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
  const [isServerAccordionOpen, setIsServerAccordionOpen] = useState<boolean>(false);
  const [autoSwitchToast, setAutoSwitchToast] = useState<{ message: string } | null>(null);

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
      if (!title || title === 'Loading...' || title === 'Stream') {
        setIsLoading(true);
        return;
      }

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
              setIsLoading(false);
            } else {
              // Seamless Auto-Transition from Tier 1/2 to Tier 3 (Server 2: VidLink)
              setDirectStreamData(null);
              setNativeScrapeFailed(false);
              setCurrentServer(STREAM_SERVERS[1]);
              setIsLoading(false);
              setAutoSwitchToast({
                message: '⚡ Auto-switched to Server 2 (VidLink) for HD streaming',
              });
              setTimeout(() => setAutoSwitchToast(null), 5000);
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            setDirectStreamData(null);
            setNativeScrapeFailed(false);
            setCurrentServer(STREAM_SERVERS[1]);
            setIsLoading(false);
            setAutoSwitchToast({
              message: '⚡ Auto-switched to Server 2 (VidLink) for HD streaming',
            });
            setTimeout(() => setAutoSwitchToast(null), 5000);
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

        {/* Seamless Auto-switch Notification Toast */}
        {autoSwitchToast && (
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-zinc-900/95 border border-amber-500/40 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs text-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{autoSwitchToast.message}</span>
            <button
              onClick={() => setAutoSwitchToast(null)}
              className="text-zinc-500 hover:text-white p-0.5 rounded cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Player Rendering: Native HLS Player vs Embed Iframe */}
        {currentServer.isNativeHls ? (
          directStreamData ? (
            <NativePlayer
              key={`native-${tmdbId}-${season}-${episode}`}
              tmdbId={tmdbId}
              qualities={directStreamData.qualities}
              subtitles={directStreamData.subtitles}
              title={title}
              mediaType={type}
              season={season}
              episode={episode}
              releaseYear={releaseYear}
              startAt={activeStartAt}
              onProgressUpdate={handleNativeProgress}
              onEnded={handleNativeEnded}
              onSwitchToBackup={handleSwitchToBackup}
            />
          ) : isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center space-y-4">
              <div className="w-14 h-14 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Connecting to High-Speed Stream...</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Checking 7-Account VIP Engine and multi-source scrapers for buffer-free playback.
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
                  Switch to Server 2 (VidLink) to watch in full HD.
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

      {/* Sleek Collapsible Server Control Bar */}
      <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg">
        {/* Compact Summary Header Bar */}
        <div className="px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/80 border border-zinc-800 text-xs font-semibold shadow-inner">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-zinc-400">Active Source:</span>
              <span className="text-white font-bold">{currentServer.name}</span>
              {currentServer.badge && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-red-600/20 text-red-400 border border-red-500/30">
                  {currentServer.badge}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsServerAccordionOpen(!isServerAccordionOpen)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isServerAccordionOpen
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-inner'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-700/60'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-red-400" />
              <span>{isServerAccordionOpen ? 'Hide Server Mirrors' : 'Change Server (11 Mirrors)'}</span>
              {isServerAccordionOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleReload}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition border border-zinc-700/60 cursor-pointer"
              title="Reload Video Stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Stream</span>
            </button>
          </div>
        </div>

        {/* Expandable Server Grid */}
        {isServerAccordionOpen && (
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-red-500" />
              <span>Available Server Mirrors & Backup Streams</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {STREAM_SERVERS.map((server) => {
                const isSelected = server.id === currentServer.id;
                return (
                  <button
                    key={server.id}
                    onClick={() => {
                      handleServerChange(server);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex flex-col items-start gap-1 text-left cursor-pointer border ${
                      isSelected
                        ? 'bg-red-600/90 text-white shadow-lg shadow-red-600/30 border-red-500 ring-2 ring-red-500/40'
                        : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate font-bold">{server.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </div>
                    {server.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono truncate max-w-full ${
                          isSelected
                            ? 'bg-red-950/80 text-red-200'
                            : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {server.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>
                  Streams auto-cascade across servers. Use manual selection above if you prefer a specific player or server mirror.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
