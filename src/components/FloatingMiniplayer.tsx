import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { directStreamService, type DirectStreamResult } from '../services/directStreamService';
import { STREAM_SERVERS } from '../services/providers';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function FloatingMiniplayer() {
  const {
    activeMedia,
    isDocked,
    currentTime,
    duration,
    isPlaying,
    isPipActive,
    setIsPipActive,
    updatePlayback,
    closePlayer,
    expandPlayer,
  } = usePlayer();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [streamData, setStreamData] = useState<DirectStreamResult | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<number | null>(null);

  const activeMediaIdRef = useRef<string | number | null>(null);

  // Synchronize Picture-in-Picture lifecycle events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPip = () => {
      setIsPip(true);
      setIsPipActive(true);
    };
    const onLeavePip = () => {
      setIsPip(false);
      setIsPipActive(false);
    };

    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);

    // Check if browser already has this video in PiP
    if (typeof document !== 'undefined' && document.pictureInPictureElement === video) {
      setIsPip(true);
      setIsPipActive(true);
    }

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, [streamData, setIsPipActive]);

  // Fetch Direct Stream data when active media changes
  useEffect(() => {
    if (!isDocked || !activeMedia) return;

    const mediaKey = `${activeMedia.id}-${activeMedia.type}-${activeMedia.season || 1}-${activeMedia.episode || 1}`;
    if (activeMediaIdRef.current === mediaKey && streamData) return;

    activeMediaIdRef.current = mediaKey;
    setIsLoading(true);
    setStreamError(false);

    let isMounted = true;
    directStreamService
      .getDirectStream(
        activeMedia.id,
        activeMedia.type,
        activeMedia.season,
        activeMedia.episode,
        activeMedia.title,
        activeMedia.releaseYear
      )
      .then((res) => {
        if (!isMounted) return;
        if (res && res.qualities && res.qualities.length > 0) {
          setStreamData(res);
          setStreamError(false);
        } else {
          setStreamData(null);
          setStreamError(true);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setStreamData(null);
        setStreamError(true);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isDocked, activeMedia, streamData]);

  // Setup HLS / Video playback
  useEffect(() => {
    if (!isDocked || !activeMedia || !streamData?.qualities?.length) return;

    const video = videoRef.current;
    if (!video) return;

    // Pick 1080p or default quality
    const selectedQ =
      streamData.qualities.find((q) => q.resolution === 1080) ||
      streamData.qualities.find((q) => q.isDefault) ||
      streamData.qualities[0];

    const streamUrl = selectedQ.url;
    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const initialTime = currentTime || activeMedia.startAt || 0;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (initialTime > 0) {
          video.currentTime = initialTime;
        }
        if (isPlaying) {
          video.play().catch(() => {});
        }
        // If user already had PiP active before route change, continue PiP
        if (isPipActive && video.requestPictureInPicture && !document.pictureInPictureElement) {
          video.requestPictureInPicture().catch(() => {});
        }
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setStreamError(true);
            setIsLoading(false);
          }
        }
      });
    } else {
      video.src = streamUrl;
      video.load();

      const onCanPlay = () => {
        if (initialTime > 0) {
          video.currentTime = initialTime;
        }
        if (isPlaying) {
          video.play().catch(() => {});
        }
        // If user already had PiP active before route change, continue PiP
        if (isPipActive && video.requestPictureInPicture && !document.pictureInPictureElement) {
          video.requestPictureInPicture().catch(() => {});
        }
        setIsLoading(false);
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isDocked, activeMedia, streamData, isPipActive]);

  // Video Time & Buffer event listeners
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    updatePlayback(video.currentTime, video.duration || duration, !video.paused);
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      updatePlayback(video.currentTime, video.duration, true);
    } else {
      video.pause();
      updatePlayback(video.currentTime, video.duration, false);
    }
  };

  const handleSkip = (seconds: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const newTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || duration));
    video.currentTime = newTime;
    updatePlayback(newTime, video.duration || duration, !video.paused);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handlePictureInPicture = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
        await video.requestPictureInPicture();
        setIsPip(true);
        setIsPipActive(true);
      }
    } catch (err) {
      console.warn('PiP error from miniplayer:', err);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const t = window.setTimeout(() => setShowControls(false), 3000);
    setControlsTimeout(t);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;

    const newTime = (Number(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    updatePlayback(newTime, duration, !video.paused);
  };

  if (!isDocked || !activeMedia) return null;

  const isAnyPipActive = isPip || isPipActive;

  const fallbackServer = STREAM_SERVERS[1]; // VidLink
  const fallbackUrl =
    activeMedia.type === 'tv'
      ? fallbackServer.getTvUrl(activeMedia.id, activeMedia.season || 1, activeMedia.episode || 1, currentTime)
      : fallbackServer.getMovieUrl(activeMedia.id, currentTime);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* 1. Sleek Compact Floating Pill when OS Picture-in-Picture is Active */}
      {isAnyPipActive && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-950/90 border border-red-500/50 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
              {activeMedia.title}
            </span>
            <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-800/50">
              PiP Active
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            {/* Expand to Watch Page */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (document.pictureInPictureElement) {
                  await document.exitPictureInPicture().catch(() => {});
                }
                expandPlayer();
              }}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Expand to Full Watch Page"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Return to In-App Miniplayer */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (document.pictureInPictureElement) {
                  await document.exitPictureInPicture().catch(() => {});
                }
                setIsPip(false);
                setIsPipActive(false);
              }}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Dock back to In-App Miniplayer"
            >
              <PictureInPicture2 className="w-3.5 h-3.5 text-red-400" />
            </button>

            {/* Close Player */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (document.pictureInPictureElement) {
                  await document.exitPictureInPicture().catch(() => {});
                }
                closePlayer();
              }}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Close Player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Full In-App Floating Miniplayer Card (Collapsed when OS PiP is active so video stream remains connected) */}
      <div
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onMouseMove={handleMouseMove}
        className={`fixed bottom-6 right-6 z-50 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group ${
          isAnyPipActive
            ? 'opacity-0 pointer-events-none fixed -bottom-[9999px] -right-[9999px] w-1 h-1 overflow-hidden -z-50'
            : 'w-72 sm:w-88 md:w-96 aspect-video bg-zinc-950 border border-zinc-700/80 ring-1 ring-zinc-700/50 hover:border-red-500/60 hover:shadow-red-600/20 animate-in slide-in-from-bottom-6 fade-in'
        }`}
        style={
          !isAnyPipActive
            ? {
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(220, 38, 38, 0.15)',
              }
            : undefined
        }
      >
        {/* Video stream container */}
        <div className="relative w-full h-full cursor-pointer" onClick={expandPlayer}>
          {!streamError ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => updatePlayback(duration, duration, false)}
              playsInline
            />
          ) : (
            <iframe
              src={fallbackUrl}
              title={activeMedia.title}
              className="w-full h-full border-0 pointer-events-auto"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="origin"
            />
          )}

          {/* Loading Spinner */}
          {isLoading && !isAnyPipActive && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-xs pointer-events-none">
              <div className="w-8 h-8 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-1.5" />
              <span className="text-[11px] text-zinc-300 font-medium">Connecting...</span>
            </div>
          )}

          {/* Hover / Active Control Overlay */}
          {!isAnyPipActive && (
            <div
              className={`absolute inset-0 z-30 bg-gradient-to-t from-black/90 via-black/40 to-black/80 flex flex-col justify-between p-3 transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Top Bar: Title & Window Controls */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate drop-shadow-md">
                    {activeMedia.title}
                  </h4>
                  {activeMedia.type === 'tv' && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-red-600 text-white font-mono text-[10px] font-bold shadow">
                      S{activeMedia.season || 1} • E{activeMedia.episode || 1}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Expand to Watch Page */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      expandPlayer();
                    }}
                    className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700/60"
                    title="Expand to Full Page"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Native OS Picture-in-Picture */}
                  <button
                    onClick={handlePictureInPicture}
                    className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700/60"
                    title="Pop out to OS Picture-in-Picture"
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Close Miniplayer */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closePlayer();
                    }}
                    className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-red-600 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700/60"
                    title="Close Miniplayer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Center: Play/Pause and Skip buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={(e) => handleSkip(-10, e)}
                  className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700/50"
                  title="Skip -10s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 transition transform active:scale-95 cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>

                <button
                  onClick={(e) => handleSkip(10, e)}
                  className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700/50"
                  title="Skip +10s"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Bar: Timeline Scrubber, Timestamp & Mute */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleMute}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                    <span>{formatTime(currentTime)}</span>
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Interactive Scrubber track */}
                <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden flex items-center group/scrub">
                  <div
                    className="absolute top-0 left-0 h-full bg-red-600 rounded-full pointer-events-none transition-all duration-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={progressPercent || 0}
                    onChange={handleSeek}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Seek"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Minimalist Progress Line when controls are hidden */}
          {!showControls && !isAnyPipActive && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-950/60 z-20">
              <div
                className="h-full bg-red-600 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
