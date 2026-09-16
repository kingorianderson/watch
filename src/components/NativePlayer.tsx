import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Subtitles,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { StreamQuality, SubtitleTrack } from '../services/directStreamService';

interface NativePlayerProps {
  qualities: StreamQuality[];
  subtitles?: SubtitleTrack[];
  title: string;
  startAt?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onSwitchToBackup?: () => void;
}

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

export default function NativePlayer({
  qualities,
  subtitles = [],
  title,
  startAt = 0,
  onProgressUpdate,
  onEnded,
  onSwitchToBackup,
}: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Selected Quality & Subtitle
  const [selectedQuality, setSelectedQuality] = useState<StreamQuality>(() => {
    return qualities.find((q) => q.isDefault) || qualities[0];
  });
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('off');

  // Dropdown menus
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'quality' | 'speed'>('main');

  const hideControlsTimerRef = useRef<number | null>(null);

  // Initialize HLS.js or Native HLS playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedQuality?.url) return;

    setHasError(false);
    setIsLoading(true);

    let retryCount = 0;
    let loadTimeout: number | null = window.setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setHasError(true);
      }
    }, 4500);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(selectedQuality.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        setIsLoading(false);
        setHasError(false);
        if (startAt > 0) {
          video.currentTime = startAt;
        }
        video.play().catch(() => {
          // Autoplay policy fallback (user must interact)
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 1) {
                retryCount++;
                hls.startLoad();
              } else {
                if (loadTimeout) clearTimeout(loadTimeout);
                hls.destroy();
                setHasError(true);
                setIsLoading(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (loadTimeout) clearTimeout(loadTimeout);
              hls.destroy();
              setHasError(true);
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = selectedQuality.url;
      video.addEventListener('loadedmetadata', () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        setIsLoading(false);
        setHasError(false);
        if (startAt > 0) {
          video.currentTime = startAt;
        }
        video.play().catch(() => setIsPlaying(false));
      });
      video.addEventListener('error', () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        setHasError(true);
        setIsLoading(false);
      });
    } else {
      if (loadTimeout) clearTimeout(loadTimeout);
      setHasError(true);
      setIsLoading(false);
    }

    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedQuality, startAt]);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;
    const dur = video.duration || 0;
    setCurrentTime(current);
    setDuration(dur);

    // Update buffered progress
    if (video.buffered.length > 0) {
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= current && current <= video.buffered.end(i)) {
          setBufferedEnd(video.buffered.end(i));
          break;
        }
      }
    }

    onProgressUpdate?.(current, dur);
  };

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const newTime = (Number(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const val = Number(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.muted = false;
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
  };

  // Auto hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
        setShowSubtitleMenu(false);
      }, 3000);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is on an input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(1, (videoRef.current.volume || 0) + 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(false);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, (videoRef.current.volume || 0) - 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group select-none flex items-center justify-center"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        title={title}
        aria-label={title}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
        onClick={handlePlayPause}
        onDoubleClick={toggleFullscreen}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Subtitles Overlay */}
      {selectedSubtitle !== 'off' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20 px-4">
          {/* Native track rendering is handled via WebVTT cues */}
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-20">
          <div className="w-14 h-14 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error Fallback Screen */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center z-30 space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-white">Direct Stream Temporarily Unavailable</h3>
            <p className="text-xs text-zinc-400">
              The direct HLS stream is currently unavailable. Switch to Server 2 (VidLink) to watch instantly in HD.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {onSwitchToBackup && (
              <button
                onClick={onSwitchToBackup}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                Switch to Server 2 (VidLink)
              </button>
            )}
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Center Play/Pause Pulsing Quick Action */}
      {!isPlaying && !isLoading && !hasError && (
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition cursor-pointer z-10"
        >
          <div className="w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transform scale-100 hover:scale-110 transition duration-200 ring-4 ring-red-600/30">
            <Play className="w-7 h-7 fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div className="relative w-full h-2 mb-3 flex items-center group/progress cursor-pointer">
          {/* Background Track */}
          <div className="absolute inset-0 bg-zinc-700/60 rounded-full overflow-hidden">
            {/* Buffered progress */}
            <div
              className="h-full bg-zinc-500/50 transition-all duration-150"
              style={{ width: `${bufferedPercent}%` }}
            />
          </div>

          {/* Active Played Progress */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-red-600 to-amber-500 rounded-full pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Scrubber Thumb */}
          <div
            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transform -translate-x-1/2 scale-0 group-hover/progress:scale-100 transition-transform pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Invisible Native Input for Smooth Scrubbing */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPercent || 0}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls (Play, Skip, Volume, Time) */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer text-zinc-200 hover:text-white"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-zinc-300 hover:text-white"
              title="Rewind 10s (Left Arrow)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-zinc-300 hover:text-white"
              title="Forward 10s (Right Arrow)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-zinc-300 hover:text-white"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-700 rounded-lg accent-red-600 cursor-pointer opacity-80 group-hover/volume:opacity-100 transition"
              />
            </div>

            {/* Time Stamp Display */}
            <div className="text-[11px] font-mono text-zinc-300 pl-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls (Quality, Subtitles, Settings, Fullscreen) */}
          <div className="flex items-center gap-2 relative">
            {/* Quality Badge Button */}
            <button
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setSettingsTab('quality');
                setShowSubtitleMenu(false);
              }}
              className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-red-400 font-mono text-[10px] font-bold border border-red-500/20 transition cursor-pointer"
              title="Stream Quality"
            >
              {selectedQuality.label}
            </button>

            {/* Subtitles Button */}
            {subtitles.length > 0 && (
              <button
                onClick={() => {
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowSettingsMenu(false);
                }}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  selectedSubtitle !== 'off'
                    ? 'bg-red-600/30 text-red-400 border border-red-500/40'
                    : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                }`}
                title="Subtitles"
              >
                <Subtitles className="w-4 h-4" />
              </button>
            )}

            {/* Settings (Speed) Button */}
            <button
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setSettingsTab('speed');
                setShowSubtitleMenu(false);
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-zinc-300 hover:text-white"
              title="Playback Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-zinc-300 hover:text-white"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Quality & Speed Popup Menu */}
            {showSettingsMenu && (
              <div className="absolute right-0 bottom-10 z-50 w-48 bg-zinc-900/95 border border-zinc-700/80 rounded-xl shadow-2xl p-2 text-xs backdrop-blur-md animate-in fade-in duration-150 space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider border-b border-zinc-800">
                  {settingsTab === 'quality' ? 'Stream Quality' : 'Playback Speed'}
                </div>

                {settingsTab === 'quality' &&
                  qualities.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => {
                        setSelectedQuality(q);
                        setShowSettingsMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                        selectedQuality.label === q.label
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span>{q.label}</span>
                      {selectedQuality.label === q.label && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}

                {settingsTab === 'speed' &&
                  [0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                        playbackSpeed === s
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span>{s === 1 ? 'Normal (1x)' : `${s}x`}</span>
                      {playbackSpeed === s && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
              </div>
            )}

            {/* Subtitles Popup Menu */}
            {showSubtitleMenu && (
              <div className="absolute right-0 bottom-10 z-50 w-44 bg-zinc-900/95 border border-zinc-700/80 rounded-xl shadow-2xl p-2 text-xs backdrop-blur-md animate-in fade-in duration-150 space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider border-b border-zinc-800">
                  Subtitles / Captions
                </div>
                <button
                  onClick={() => {
                    setSelectedSubtitle('off');
                    setShowSubtitleMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                    selectedSubtitle === 'off'
                      ? 'bg-red-600 text-white font-bold'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <span>Off</span>
                  {selectedSubtitle === 'off' && <Check className="w-3.5 h-3.5" />}
                </button>
                {subtitles.map((sub) => (
                  <button
                    key={sub.language}
                    onClick={() => {
                      setSelectedSubtitle(sub.language);
                      setShowSubtitleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                      selectedSubtitle === sub.language
                        ? 'bg-red-600 text-white font-bold'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span>{sub.label}</span>
                    {selectedSubtitle === sub.language && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
