import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  ChevronRight,
  ChevronLeft,
  Gauge,
  Sliders,
  Wifi,
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

const PREFERRED_QUALITY_KEY = 'watchd_preferred_quality';

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

// Helper to extract numeric resolution from quality
function getResolutionNumber(q: StreamQuality): number {
  if (q.resolution && q.resolution > 0) return q.resolution;
  const str = `${q.shortLabel || ''} ${q.label || ''}`.toLowerCase();
  if (str.includes('4k') || str.includes('2160')) return 2160;
  if (str.includes('1440') || str.includes('2k')) return 1440;
  if (str.includes('1080')) return 1080;
  if (str.includes('720')) return 720;
  if (str.includes('480')) return 480;
  if (str.includes('360')) return 360;
  if (str.includes('org') || str.includes('vip')) return 2160;
  return 1080;
}

// Helper to standardize quality label & badge type
function getFormattedQualityInfo(q: StreamQuality) {
  const res = getResolutionNumber(q);
  const isVipOrg = (q.shortLabel || q.label || '').toLowerCase().includes('vip') || (q.shortLabel || q.label || '').toLowerCase().includes('org');

  let cleanLabel = '1080p Full HD';
  let badge: '4k' | 'hd' | 'sd' | 'vip' | null = null;
  let short = '1080p';

  if (isVipOrg) {
    cleanLabel = 'Original VIP (Source Direct)';
    badge = 'vip';
    short = 'VIP Direct';
  } else if (res >= 2160) {
    cleanLabel = '4K Ultra HD (2160p)';
    badge = '4k';
    short = '4K';
  } else if (res >= 1440) {
    cleanLabel = '1440p (2K QHD)';
    badge = 'hd';
    short = '1440p';
  } else if (res >= 1080) {
    cleanLabel = '1080p Full HD';
    badge = 'hd';
    short = '1080p';
  } else if (res >= 720) {
    cleanLabel = '720p HD';
    badge = 'hd';
    short = '720p';
  } else if (res >= 480) {
    cleanLabel = '480p SD';
    badge = 'sd';
    short = '480p';
  } else {
    cleanLabel = '360p';
    badge = 'sd';
    short = '360p';
  }

  return { cleanLabel, badge, short, resolution: res };
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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Standardize & sort available qualities descending (4K -> 1080p -> 720p -> 480p -> 360p)
  const sortedQualities = useMemo(() => {
    if (!qualities || qualities.length === 0) return [];

    const list = qualities.map((q) => {
      const info = getFormattedQualityInfo(q);
      return {
        ...q,
        label: q.label && q.label.includes('•') ? q.label : info.cleanLabel,
        shortLabel: info.short,
        resolution: info.resolution,
        badgeType: info.badge,
      };
    });

    // Sort strictly descending by resolution
    list.sort((a, b) => (b.resolution || 0) - (a.resolution || 0));
    return list;
  }, [qualities]);

  // Core Playback State
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

  // Smart Auto Mode State (YouTube-style auto quality adaptation)
  const [isAutoQuality, setIsAutoQuality] = useState<boolean>(() => {
    const saved = localStorage.getItem(PREFERRED_QUALITY_KEY);
    return !saved || saved === 'auto';
  });

  // Selected Quality initialization from persistent localStorage memory or default 1080p
  const [selectedQuality, setSelectedQuality] = useState<StreamQuality>(() => {
    const savedPref = localStorage.getItem(PREFERRED_QUALITY_KEY);

    if (savedPref && savedPref !== 'auto' && sortedQualities.length > 0) {
      const matched = sortedQualities.find((q) => {
        const s = (q.shortLabel || q.label || '').toLowerCase();
        return s.includes(savedPref.toLowerCase());
      });
      if (matched) return matched;
    }

    // Default to 1080p Full HD
    const p1080 = sortedQualities.find((q) => (q.resolution || 0) === 1080);
    if (p1080) return p1080;

    // Next preference: 720p or 4K or default
    return sortedQualities.find((q) => q.isDefault) || sortedQualities[0] || qualities[0];
  });

  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('off');

  // Keep selectedQuality synchronized if sortedQualities updates (e.g. new episode / movie)
  useEffect(() => {
    if (sortedQualities.length === 0) return;
    const exists = sortedQualities.some((q) => q.url === selectedQuality?.url);
    if (!exists) {
      const savedPref = localStorage.getItem(PREFERRED_QUALITY_KEY);
      if (savedPref && savedPref !== 'auto') {
        const matched = sortedQualities.find((q) => {
          const s = (q.shortLabel || q.label || '').toLowerCase();
          return s.includes(savedPref.toLowerCase());
        });
        if (matched) {
          setSelectedQuality(matched);
          return;
        }
      }
      const p1080 = sortedQualities.find((q) => (q.resolution || 0) === 1080);
      setSelectedQuality(p1080 || sortedQualities.find((q) => q.isDefault) || sortedQualities[0]);
    }
  }, [sortedQualities, selectedQuality?.url]);

  // YouTube-style Settings Navigation: 'closed' | 'main' | 'quality' | 'speed' | 'subtitles'
  const [menuView, setMenuView] = useState<'closed' | 'main' | 'quality' | 'speed' | 'subtitles'>('closed');

  // Hover Scrubber Preview Time
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Visual Skip Ripple Indicator (+10s, -10s)
  const [skipIndicator, setSkipIndicator] = useState<{ text: string; side: 'left' | 'right' } | null>(null);
  const skipIndicatorTimerRef = useRef<number | null>(null);

  // Smart Network Adaptation Toast Notification
  const [networkToast, setNetworkToast] = useState<string | null>(null);
  const networkToastTimerRef = useRef<number | null>(null);

  // Seamless Quality Switching Trackers & Mutable Refs
  const savedPlaybackTimeRef = useRef<number>(startAt);
  const shouldResumePlayRef = useRef<boolean>(true);
  const hideControlsTimerRef = useRef<number | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const stallCountRef = useRef<number>(0);
  const stallTimerRef = useRef<number | null>(null);
  const waitingDebounceTimerRef = useRef<number | null>(null);

  // Keep fresh mutable refs for callbacks to avoid re-triggering effects
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onSwitchToBackupRef = useRef(onSwitchToBackup);
  onSwitchToBackupRef.current = onSwitchToBackup;

  const selectedQualityRef = useRef(selectedQuality);
  selectedQualityRef.current = selectedQuality;
  const sortedQualitiesRef = useRef(sortedQualities);
  sortedQualitiesRef.current = sortedQualities;
  const isAutoQualityRef = useRef(isAutoQuality);
  isAutoQualityRef.current = isAutoQuality;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const showNetworkToast = (message: string) => {
    setNetworkToast(message);
    if (networkToastTimerRef.current) clearTimeout(networkToastTimerRef.current);
    networkToastTimerRef.current = window.setTimeout(() => {
      setNetworkToast(null);
    }, 3800);
  };

  // Step down quality gracefully when internet connection is slow or buffering stalls (STABLE callback)
  const stepDownQuality = useCallback(
    (reason: string = 'slow connection') => {
      const currentQ = selectedQualityRef.current;
      if (!currentQ) return;
      const currentRes = getResolutionNumber(currentQ);
      // Find lower qualities available
      const lowerQualities = sortedQualitiesRef.current.filter((q) => (q.resolution || 0) < currentRes);

      if (lowerQualities.length > 0) {
        // Pick the closest lower quality (e.g. 4K -> 1080p, 1080p -> 720p, 720p -> 480p)
        const nextLower = lowerQualities[0];
        const video = videoRef.current;
        const currentPos = video ? video.currentTime : savedPlaybackTimeRef.current;
        const wasPlaying = video ? !video.paused : isPlayingRef.current;

        savedPlaybackTimeRef.current = currentPos;
        shouldResumePlayRef.current = wasPlaying;

        setSelectedQuality(nextLower);
        showNetworkToast(`⚡ Switched to ${nextLower.shortLabel || 'lower resolution'} due to ${reason}`);
      }
    },
    []
  );

  // Initialize or Switch Video Stream (Seamless position restoration like YouTube)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedQuality?.url) return;

    setHasError(false);
    setIsLoading(true);

    const streamUrl = selectedQuality.url;
    const isHlsStream = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');
    const targetSeekTime = savedPlaybackTimeRef.current;

    let retryCount = 0;
    let loadTimeout: number | null = window.setTimeout(() => {
      if (video.readyState < 2) {
        // If high quality timed out loading, try step down before showing full error
        const currentRes = getResolutionNumber(selectedQualityRef.current);
        if (currentRes > 720) {
          stepDownQuality('network timeout');
        } else {
          setIsLoading(false);
          setHasError(true);
        }
      }
    }, 14000);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        setIsLoading(false);
        setHasError(false);
        stallCountRef.current = 0;

        if (targetSeekTime > 0) {
          video.currentTime = targetSeekTime;
        }

        if (shouldResumePlayRef.current) {
          video.play().catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 1) {
                retryCount++;
                hls.startLoad();
              } else {
                // Network error: step down quality if possible
                if (loadTimeout) clearTimeout(loadTimeout);
                hls.destroy();
                const currentRes = getResolutionNumber(selectedQualityRef.current);
                if (currentRes > 720) {
                  stepDownQuality('network instability');
                } else {
                  setHasError(true);
                  setIsLoading(false);
                }
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
    } else {
      // Direct MP4 VIP Stream or Native Safari HLS
      video.src = streamUrl;
      video.load();

      const onLoadedMetadata = () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        setIsLoading(false);
        setHasError(false);
        stallCountRef.current = 0;

        if (targetSeekTime > 0) {
          video.currentTime = targetSeekTime;
        }

        if (shouldResumePlayRef.current) {
          video.play().catch(() => setIsPlaying(false));
        }
      };

      const onCanPlay = () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        setIsLoading(false);
        setHasError(false);
      };

      const onError = () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        // If error on 4K/VIP, try step down before failing
        const currentRes = getResolutionNumber(selectedQualityRef.current);
        if (currentRes > 720) {
          stepDownQuality('stream error');
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('error', onError, { once: true });
    }

    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      if (waitingDebounceTimerRef.current) clearTimeout(waitingDebounceTimerRef.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedQuality?.url, stepDownQuality]);

  // Handle Manual Quality Selection (Persistent memory saved in localStorage)
  const handleQualityChange = (newQuality: StreamQuality, isAuto: boolean = false) => {
    const video = videoRef.current;
    const currentPos = video ? video.currentTime : currentTime;
    const wasPlaying = video ? !video.paused : isPlaying;

    savedPlaybackTimeRef.current = currentPos;
    shouldResumePlayRef.current = wasPlaying;
    stallCountRef.current = 0;

    setIsAutoQuality(isAuto);

    if (isAuto) {
      localStorage.setItem(PREFERRED_QUALITY_KEY, 'auto');
      // In auto mode, pick 1080p if available
      const p1080 = sortedQualities.find((q) => (q.resolution || 0) === 1080) || sortedQualities[0];
      setSelectedQuality(p1080);
      showNetworkToast('⚡ Auto quality enabled (Adaptive)');
    } else {
      const shortPref = newQuality.shortLabel || '1080p';
      localStorage.setItem(PREFERRED_QUALITY_KEY, shortPref.toLowerCase());
      setSelectedQuality(newQuality);
    }

    setMenuView('closed');
  };

  // Monitor playback buffering/stalls to trigger smart YouTube auto-downgrade
  const handleWaiting = () => {
    // Debounce setting isLoading so transient sub-second buffering does not flash the spinner
    if (waitingDebounceTimerRef.current) clearTimeout(waitingDebounceTimerRef.current);
    waitingDebounceTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 3) {
        setIsLoading(true);
      }
    }, 300);

    // If stall lasts longer than 4.5 seconds on high quality (4K / 1080p), adaptively step down
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 3) {
        stallCountRef.current += 1;
        const currentRes = getResolutionNumber(selectedQualityRef.current);
        if (currentRes > 480 && (isAutoQualityRef.current || stallCountRef.current >= 2)) {
          stepDownQuality('buffering delay');
        }
      }
    }, 4500);
  };

  // Video Time & Buffer Updates
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;
    const dur = video.duration || 0;
    setCurrentTime(current);
    if (dur && dur > 0) setDuration(dur);
    savedPlaybackTimeRef.current = current;

    // Clear any pending waiting debounce timer and spinner if video is playing smoothly
    if (waitingDebounceTimerRef.current) {
      clearTimeout(waitingDebounceTimerRef.current);
      waitingDebounceTimerRef.current = null;
    }
    if (isLoading && video.readyState >= 3) {
      setIsLoading(false);
    }

    // Update buffer
    if (video.buffered.length > 0) {
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= current && current <= video.buffered.end(i)) {
          setBufferedEnd(video.buffered.end(i));
          break;
        }
      }
    }

    onProgressUpdateRef.current?.(current, dur);
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

  const triggerSkipFeedback = (text: string, side: 'left' | 'right') => {
    setSkipIndicator({ text, side });
    if (skipIndicatorTimerRef.current) clearTimeout(skipIndicatorTimerRef.current);
    skipIndicatorTimerRef.current = window.setTimeout(() => {
      setSkipIndicator(null);
    }, 650);
  };

  const handleSkip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
    savedPlaybackTimeRef.current = newTime;
    triggerSkipFeedback(seconds > 0 ? `+${seconds}s` : `${seconds}s`, seconds > 0 ? 'right' : 'left');
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const newTime = (Number(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    savedPlaybackTimeRef.current = newTime;
  };

  const handleMouseMoveProgressBar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = pos / rect.width;
    setHoverPosition(pos);
    setHoverTime(percentage * duration);
  };

  const handleMouseLeaveProgressBar = () => {
    setHoverTime(null);
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
    setMenuView('closed');
  };

  const toggleCaptionsQuick = () => {
    if (subtitles.length === 0) return;
    if (selectedSubtitle !== 'off') {
      setSelectedSubtitle('off');
    } else {
      const defaultSub = subtitles.find((s) => s.isDefault) || subtitles[0];
      setSelectedSubtitle(defaultSub ? defaultSub.language : 'off');
    }
  };

  // Auto-hide controls timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
        setMenuView('closed');
      }, 3500);
    }
  };

  // Double Click / Double Tap for 10s skip
  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeft = clickX < rect.width / 2;

    if (now - lastTouchTimeRef.current < 300) {
      // Double click/tap detected
      handleSkip(isLeft ? -10 : 10);
    } else {
      handlePlayPause();
    }
    lastTouchTimeRef.current = now;
  };

  // YouTube Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        case 'c':
          e.preventDefault();
          toggleCaptionsQuick();
          break;
        case 'j':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'l':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSkip(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          handleSkip(5);
          break;
        case 'arrowup':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(1, (videoRef.current.volume || 0) + 0.05);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(false);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, (videoRef.current.volume || 0) - 0.05);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
          }
          break;
        case '>':
          if (e.shiftKey && videoRef.current) {
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const next = speeds.find((s) => s > playbackSpeed) || 2;
            handleSpeedChange(next);
          }
          break;
        case '<':
          if (e.shiftKey && videoRef.current) {
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const prev = [...speeds].reverse().find((s) => s < playbackSpeed) || 0.25;
            handleSpeedChange(prev);
          }
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          if (duration > 0 && videoRef.current) {
            const percent = Number(e.key) / 10;
            const newPos = percent * duration;
            videoRef.current.currentTime = newPos;
            setCurrentTime(newPos);
            savedPlaybackTimeRef.current = newPos;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, playbackSpeed, duration, subtitles, selectedSubtitle]);

  // Synchronize Subtitle TextTracks with selectedSubtitle state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (selectedSubtitle === 'off') {
        track.mode = 'disabled';
      } else if (
        track.language === selectedSubtitle ||
        track.label.toLowerCase() === selectedSubtitle.toLowerCase() ||
        (selectedSubtitle.startsWith('en') && track.language.startsWith('en'))
      ) {
        track.mode = 'showing';
      } else {
        track.mode = 'disabled';
      }
    }
  }, [selectedSubtitle, subtitles]);

  // Active Quality Badge Display in Bottom Bar (e.g. "Auto (1080p)", "4K", "1080p")
  const currentBadgeText = isAutoQuality
    ? `Auto (${selectedQuality.shortLabel || '1080p'})`
    : selectedQuality.shortLabel || '1080p';

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group select-none flex items-center justify-center font-sans"
    >
      {/* HTML5 Video Element with WebVTT Subtitle Tracks */}
      <video
        ref={videoRef}
        title={title}
        aria-label={title}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onWaiting={handleWaiting}
        onPlaying={() => {
          if (waitingDebounceTimerRef.current) {
            clearTimeout(waitingDebounceTimerRef.current);
            waitingDebounceTimerRef.current = null;
          }
          setIsLoading(false);
          setIsPlaying(true);
          if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => onEndedRef.current?.()}
        onClick={handleVideoClick}
        onDoubleClick={toggleFullscreen}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      >
        {subtitles.map((sub) => (
          <track
            key={sub.url}
            kind="subtitles"
            src={sub.url}
            srcLang={sub.language}
            label={sub.label}
            default={selectedSubtitle === sub.language}
          />
        ))}
      </video>

      {/* Smart Network Toast Notification (YouTube Style) */}
      {networkToast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/95 text-white text-xs font-semibold shadow-2xl border border-zinc-700/80 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
          <Wifi className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{networkToast}</span>
        </div>
      )}

      {/* YouTube Double-Tap Skip Feedback Animation */}
      {skipIndicator && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center w-28 h-28 rounded-full bg-black/60 text-white backdrop-blur-md animate-in zoom-in-75 duration-150 pointer-events-none ${
            skipIndicator.side === 'left' ? 'left-12' : 'right-12'
          }`}
        >
          {skipIndicator.side === 'left' ? (
            <RotateCcw className="w-8 h-8 text-red-500 mb-1" />
          ) : (
            <RotateCw className="w-8 h-8 text-red-500 mb-1" />
          )}
          <span className="text-xs font-bold tracking-wide">{skipIndicator.text}</span>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-20">
          <div className="w-14 h-14 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin shadow-xl" />
        </div>
      )}

      {/* Error Fallback Recovery Screen */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center z-30 space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-white">Stream Temporarily Unavailable</h3>
            <p className="text-xs text-zinc-400">
              The selected stream could not connect. Switch to Server 2 (VidLink) for instant HD playback.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {onSwitchToBackup && (
              <button
                onClick={() => onSwitchToBackupRef.current?.()}
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

      {/* Center Play Button Overlay */}
      {!isPlaying && !isLoading && !hasError && (
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition cursor-pointer z-10"
        >
          <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transform scale-100 hover:scale-110 transition duration-200 ring-4 ring-red-600/30">
            <Play className="w-7 h-7 fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Bottom YouTube Control Bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 px-4 pb-3 pt-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying || menuView !== 'closed' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* YouTube Scrubber Progress Bar */}
        <div
          ref={progressBarRef}
          onMouseMove={handleMouseMoveProgressBar}
          onMouseLeave={handleMouseLeaveProgressBar}
          className="relative w-full h-1.5 hover:h-2.5 mb-3 flex items-center group/progress cursor-pointer transition-all duration-150"
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-8 px-2 py-1 bg-zinc-900/95 text-white text-[11px] font-mono font-bold rounded shadow-lg border border-zinc-700 pointer-events-none transform -translate-x-1/2 z-40"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Background Gray Track */}
          <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
            {/* Buffered Download Progress */}
            <div
              className="h-full bg-white/40 transition-all duration-150"
              style={{ width: `${bufferedPercent}%` }}
            />
          </div>

          {/* Active Red Progress Bar */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-red-600 rounded-full pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Scrubber Thumb */}
          <div
            className="absolute w-3.5 h-3.5 bg-red-600 rounded-full shadow-lg transform -translate-x-1/2 scale-0 group-hover/progress:scale-100 transition-transform pointer-events-none ring-2 ring-white"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Native Range Slider */}
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
          {/* Left Controls (Play, Skip, Volume, Timestamp) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-lg hover:bg-white/15 transition cursor-pointer text-zinc-100 hover:text-white"
              title={isPlaying ? 'Pause (k / Space)' : 'Play (k / Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer text-zinc-300 hover:text-white"
              title="Rewind 10s (j)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer text-zinc-300 hover:text-white"
              title="Forward 10s (l)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer text-zinc-300 hover:text-white"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
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
                className="w-14 sm:w-20 h-1 bg-zinc-600 rounded-lg accent-red-600 cursor-pointer opacity-80 group-hover/volume:opacity-100 transition"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[11px] font-mono text-zinc-300 pl-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls (Quality Badge, Subtitles, Settings, Fullscreen) */}
          <div className="flex items-center gap-2 relative">
            {/* YouTube Quality Badge Button */}
            <button
              onClick={() => setMenuView(menuView === 'quality' ? 'closed' : 'quality')}
              className="px-2 py-1 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-white font-mono text-[11px] font-bold border border-white/10 hover:border-red-500/40 transition cursor-pointer flex items-center gap-1 shadow-sm"
              title="Change Video Quality"
            >
              {isAutoQuality ? (
                <span className="text-emerald-400 font-bold">{currentBadgeText}</span>
              ) : (
                <span className="text-red-400 font-extrabold">{currentBadgeText}</span>
              )}
            </button>

            {/* Subtitles / CC Button */}
            {subtitles.length > 0 && (
              <button
                onClick={() => setMenuView(menuView === 'subtitles' ? 'closed' : 'subtitles')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  selectedSubtitle !== 'off'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'hover:bg-white/15 text-zinc-300 hover:text-white'
                }`}
                title="Subtitles / Closed Captions (c)"
              >
                <Subtitles className="w-4 h-4" />
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={() => setMenuView(menuView === 'closed' ? 'main' : 'closed')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                menuView !== 'closed'
                  ? 'bg-white/20 text-white rotate-45'
                  : 'hover:bg-white/15 text-zinc-300 hover:text-white'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4 transition-transform duration-200" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer text-zinc-300 hover:text-white"
              title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* YouTube-Style Popover Menu */}
            {menuView !== 'closed' && (
              <div className="absolute right-0 bottom-12 z-50 w-64 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl p-2 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
                {/* 1. Main Settings Menu */}
                {menuView === 'main' && (
                  <>
                    <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                      Settings
                    </div>
                    {/* Quality Row */}
                    <button
                      onClick={() => setMenuView('quality')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sliders className="w-4 h-4 text-red-500" />
                        <span className="font-medium">Quality</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                        <span className="font-bold text-white">{currentBadgeText}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Speed Row */}
                    <button
                      onClick={() => setMenuView('speed')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Gauge className="w-4 h-4 text-red-500" />
                        <span className="font-medium">Playback Speed</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                        <span>{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Subtitles Row */}
                    {subtitles.length > 0 && (
                      <button
                        onClick={() => setMenuView('subtitles')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Subtitles className="w-4 h-4 text-red-500" />
                          <span className="font-medium">Subtitles</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                          <span className="capitalize">{selectedSubtitle}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    )}
                  </>
                )}

                {/* 2. Quality Selection Sub-Menu (YouTube Style with Smart Auto option) */}
                {menuView === 'quality' && (
                  <>
                    <button
                      onClick={() => setMenuView('main')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-zinc-400 hover:text-white text-left font-bold text-xs border-b border-zinc-800 mb-1 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Quality for current video</span>
                    </button>

                    <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                      {/* 1. YouTube-style Smart Auto option */}
                      <button
                        onClick={() => handleQualityChange(selectedQuality, true)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                          isAutoQuality
                            ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/30'
                            : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>Auto (Smart Adaptive)</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                            Auto
                          </span>
                        </div>
                        {isAutoQuality && <Check className="w-4 h-4 shrink-0" />}
                      </button>

                      {/* 2. Distinct Sorted Resolutions */}
                      {sortedQualities.map((q) => {
                        const isSelected = !isAutoQuality && selectedQuality.url === q.url;
                        const res = q.resolution || 1080;
                        const is4k = res >= 2160;
                        const isHd = (res === 1080 || res === 720) && !is4k;
                        const isVip = (q as any).badgeType === 'vip';

                        return (
                          <button
                            key={q.url}
                            onClick={() => handleQualityChange(q, false)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/30'
                                : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{q.label}</span>
                              {is4k && !isVip && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                                  4K
                                </span>
                              )}
                              {isHd && (
                                <span className="px-1 py-0.5 rounded text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                                  HD
                                </span>
                              )}
                              {isVip && (
                                <span className="px-1 py-0.5 rounded text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase">
                                  VIP
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* 3. Playback Speed Sub-Menu */}
                {menuView === 'speed' && (
                  <>
                    <button
                      onClick={() => setMenuView('main')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-zinc-400 hover:text-white text-left font-bold text-xs border-b border-zinc-800 mb-1 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Playback Speed</span>
                    </button>

                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => {
                        const isSelected = playbackSpeed === s;
                        return (
                          <button
                            key={s}
                            onClick={() => handleSpeedChange(s)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white font-bold'
                                : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                            }`}
                          >
                            <span>{s === 1 ? 'Normal (1x)' : `${s}x`}</span>
                            {isSelected && <Check className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* 4. Subtitles Sub-Menu */}
                {menuView === 'subtitles' && (
                  <>
                    <button
                      onClick={() => setMenuView('main')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-zinc-400 hover:text-white text-left font-bold text-xs border-b border-zinc-800 mb-1 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Subtitles / Captions</span>
                    </button>

                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      <button
                        onClick={() => {
                          setSelectedSubtitle('off');
                          setMenuView('closed');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                          selectedSubtitle === 'off'
                            ? 'bg-red-600 text-white font-bold'
                            : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                        }`}
                      >
                        <span>Off</span>
                        {selectedSubtitle === 'off' && <Check className="w-4 h-4" />}
                      </button>

                      {subtitles.map((sub) => {
                        const isSelected = selectedSubtitle === sub.language;
                        return (
                          <button
                            key={sub.language}
                            onClick={() => {
                              setSelectedSubtitle(sub.language);
                              setMenuView('closed');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white font-bold'
                                : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                            }`}
                          >
                            <span>{sub.label}</span>
                            {isSelected && <Check className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
