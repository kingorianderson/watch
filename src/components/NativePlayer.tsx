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
  Sparkles,
  Type,
  PictureInPicture2,
} from 'lucide-react';
import type { StreamQuality, SubtitleTrack } from '../services/directStreamService';
import {
  subtitleService,
  convertSrtToVttBlob,
  fetchSubtitleCues,
  type SubtitleCue,
} from '../services/subtitleService';

interface NativePlayerProps {
  qualities: StreamQuality[];
  subtitles?: SubtitleTrack[];
  title: string;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  releaseYear?: number;
  startAt?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onSwitchToBackup?: () => void;
}

const PREFERRED_QUALITY_KEY = 'watchd_preferred_quality';
const SUB_SIZE_KEY = 'watchd_sub_size';
const SUB_COLOR_KEY = 'watchd_sub_color';
const SUB_BG_KEY = 'watchd_sub_bg';

export type SubtitleSize = 'small' | 'medium' | 'large' | 'huge';
export type SubtitleColor = 'white' | 'yellow' | 'cyan' | 'green';
export type SubtitleBg = 'shadow' | 'semi' | 'solid';

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
  const isVipOrg =
    (q.shortLabel || q.label || '').toLowerCase().includes('vip') ||
    (q.shortLabel || q.label || '').toLowerCase().includes('org');

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

function getSubSizeClasses(size: SubtitleSize) {
  switch (size) {
    case 'small':
      return 'text-sm sm:text-base font-semibold';
    case 'medium':
      return 'text-base sm:text-xl font-bold';
    case 'huge':
      return 'text-2xl sm:text-4xl font-black';
    case 'large':
    default:
      return 'text-xl sm:text-3xl font-extrabold';
  }
}

function getSubColorClasses(color: SubtitleColor) {
  switch (color) {
    case 'yellow':
      return 'text-yellow-300';
    case 'cyan':
      return 'text-cyan-300';
    case 'green':
      return 'text-emerald-300';
    case 'white':
    default:
      return 'text-white';
  }
}

function getSubBgClasses(bg: SubtitleBg) {
  switch (bg) {
    case 'semi':
      return 'bg-black/75 backdrop-blur-xs px-3.5 py-1 rounded-xl shadow-lg';
    case 'solid':
      return 'bg-black px-4 py-1.5 rounded-xl shadow-2xl';
    case 'shadow':
    default:
      return 'bg-transparent px-1.5 py-0.5';
  }
}

export default function NativePlayer({
  qualities,
  subtitles = [],
  title,
  mediaType = 'movie',
  season = 1,
  episode = 1,
  releaseYear,
  startAt = 0,
  onProgressUpdate,
  onEnded,
  onSwitchToBackup,
}: NativePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Dual-Video Element Refs for Gapless YouTube-Grade Crossfade
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const hlsRefA = useRef<Hls | null>(null);
  const hlsRefB = useRef<Hls | null>(null);

  // Active Video Slot ('A' or 'B')
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const activeSlotRef = useRef<'A' | 'B'>('A');
  activeSlotRef.current = activeSlot;

  // Track currently active stream URL
  const currentStreamUrlRef = useRef<string>('');
  const isInitialLoadedRef = useRef<boolean>(false);
  const isSwitchingRef = useRef<boolean>(false);

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
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isQualitySwitching, setIsQualitySwitching] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Subtitle Customization State (Loaded from localStorage)
  const [subSize, setSubSize] = useState<SubtitleSize>(() => {
    return (localStorage.getItem(SUB_SIZE_KEY) as SubtitleSize) || 'large';
  });
  const [subColor, setSubColor] = useState<SubtitleColor>(() => {
    return (localStorage.getItem(SUB_COLOR_KEY) as SubtitleColor) || 'white';
  });
  const [subBg, setSubBg] = useState<SubtitleBg>(() => {
    return (localStorage.getItem(SUB_BG_KEY) as SubtitleBg) || 'shadow';
  });

  const handleSubSizeChange = (s: SubtitleSize) => {
    setSubSize(s);
    localStorage.setItem(SUB_SIZE_KEY, s);
  };
  const handleSubColorChange = (c: SubtitleColor) => {
    setSubColor(c);
    localStorage.setItem(SUB_COLOR_KEY, c);
  };
  const handleSubBgChange = (b: SubtitleBg) => {
    setSubBg(b);
    localStorage.setItem(SUB_BG_KEY, b);
  };

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

    return sortedQualities.find((q) => q.isDefault) || sortedQualities[0] || qualities[0];
  });

  // Subtitle State & Dynamic Fetching
  const [loadedSubtitles, setLoadedSubtitles] = useState<SubtitleTrack[]>(subtitles || []);
  const [isFetchingSubtitles, setIsFetchingSubtitles] = useState<boolean>(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('off');
  const [parsedCues, setParsedCues] = useState<SubtitleCue[]>([]);

  // Sync loadedSubtitles if parent passes new subtitles
  useEffect(() => {
    if (subtitles && subtitles.length > 0) {
      setLoadedSubtitles(subtitles);
    }
  }, [subtitles]);

  // Background subtitle fetch if initially empty
  useEffect(() => {
    if (
      loadedSubtitles.length > 0 ||
      !title ||
      title.toLowerCase() === 'loading...' ||
      title.toLowerCase() === 'stream'
    )
      return;
    let isMounted = true;
    setIsFetchingSubtitles(true);

    subtitleService
      .getSubtitles(title, mediaType, season, episode, releaseYear)
      .then((subs) => {
        if (isMounted && subs.length > 0) {
          setLoadedSubtitles(subs);
        }
      })
      .catch((err) => {
        console.warn('Background subtitle fetch failed:', err);
      })
      .finally(() => {
        if (isMounted) setIsFetchingSubtitles(false);
      });

    return () => {
      isMounted = false;
    };
  }, [title, mediaType, season, episode, releaseYear, loadedSubtitles.length]);

  // Fetch structured cues whenever selected subtitle changes
  useEffect(() => {
    if (selectedSubtitle === 'off') {
      setParsedCues([]);
      return;
    }

    const track = loadedSubtitles.find((s) => s.language === selectedSubtitle);
    if (track) {
      fetchSubtitleCues(track.downloadUrl || track.url)
        .then((cues) => {
          setParsedCues(cues);
        })
        .catch((err) => {
          console.warn('Error fetching subtitle cues:', err);
        });
    }
  }, [selectedSubtitle, loadedSubtitles]);

  // Derive current active subtitle cue for real-time overlay
  const activeCue = useMemo(() => {
    if (!parsedCues.length || selectedSubtitle === 'off') return null;
    return parsedCues.find((c) => currentTime >= c.start && currentTime <= c.end) || null;
  }, [parsedCues, currentTime, selectedSubtitle]);

  // Keep selectedQuality synchronized if sortedQualities updates
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

  // Settings Menu Navigation
  const [menuView, setMenuView] = useState<
    'closed' | 'main' | 'quality' | 'speed' | 'subtitles' | 'sub_style'
  >('closed');

  // Hover Scrubber Preview Time
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Visual Skip Ripple Indicator (+10s, -10s)
  const [skipIndicator, setSkipIndicator] = useState<{ text: string; side: 'left' | 'right' } | null>(null);
  const skipIndicatorTimerRef = useRef<number | null>(null);

  // Smart Network Toast Notification
  const [networkToast, setNetworkToast] = useState<{ message: string; isQuality?: boolean } | null>(null);
  const networkToastTimerRef = useRef<number | null>(null);

  // Active getters helper
  const getActiveVideo = useCallback(() => {
    return activeSlotRef.current === 'A' ? videoRefA.current : videoRefB.current;
  }, []);

  const getInactiveVideo = useCallback(() => {
    return activeSlotRef.current === 'A' ? videoRefB.current : videoRefA.current;
  }, []);

  // Playback Refs for stable state tracking
  const savedPlaybackTimeRef = useRef<number>(startAt);
  const hideControlsTimerRef = useRef<number | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const stallCountRef = useRef<number>(0);
  const stallTimerRef = useRef<number | null>(null);
  const waitingDebounceTimerRef = useRef<number | null>(null);
  const smoothPlaybackSecondsRef = useRef<number>(0);

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
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;

  const showNetworkToast = useCallback((message: string, isQuality: boolean = false) => {
    setNetworkToast({ message, isQuality });
    if (networkToastTimerRef.current) clearTimeout(networkToastTimerRef.current);
    networkToastTimerRef.current = window.setTimeout(() => {
      setNetworkToast(null);
    }, 3200);
  }, []);

  // Step down quality adaptively when internet is slow or buffering stalls
  const stepDownQuality = useCallback(
    (reason: string = 'slow connection') => {
      const currentQ = selectedQualityRef.current;
      if (!currentQ) return;
      const currentRes = getResolutionNumber(currentQ);
      const lowerQualities = sortedQualitiesRef.current.filter((q) => (q.resolution || 0) < currentRes);

      if (lowerQualities.length > 0) {
        const nextLower = lowerQualities[0];
        setSelectedQuality(nextLower);
        showNetworkToast(`⚡ Auto: Switched to ${nextLower.shortLabel || 'lower resolution'} (${reason})`, true);
      }
    },
    [showNetworkToast]
  );

  // Step up quality adaptively when connection is healthy and smooth
  const stepUpQuality = useCallback(() => {
    if (!isAutoQualityRef.current) return;
    const currentQ = selectedQualityRef.current;
    if (!currentQ) return;
    const currentRes = getResolutionNumber(currentQ);
    if (currentRes >= 1080) return;

    const higherQualities = sortedQualitiesRef.current.filter(
      (q) => (q.resolution || 0) > currentRes && (q.resolution || 0) <= 1080
    );

    if (higherQualities.length > 0) {
      const nextHigher = higherQualities[higherQualities.length - 1] || higherQualities[0];
      setSelectedQuality(nextHigher);
      showNetworkToast(`⚡ Auto: Upgraded to ${nextHigher.shortLabel || '1080p HD'} (Connection Fast)`, true);
    }
  }, [showNetworkToast]);

  // Main Seamless Dual-Buffer Stream Loader & Quality Switcher
  useEffect(() => {
    const targetQuality = selectedQuality;
    if (!targetQuality?.url) return;

    const streamUrl = targetQuality.url;
    if (currentStreamUrlRef.current === streamUrl) return;

    const isHlsStream = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');

    // 1. Initial Cold Load Path
    if (!isInitialLoadedRef.current) {
      setIsLoading(true);
      setHasError(false);
      currentStreamUrlRef.current = streamUrl;

      const videoA = videoRefA.current;
      if (!videoA) return;

      let initialTimeout: number | null = window.setTimeout(() => {
        if (videoA.readyState < 2) {
          const currentRes = getResolutionNumber(targetQuality);
          if (currentRes > 720) {
            stepDownQuality('network timeout');
          } else {
            setIsLoading(false);
            setHasError(true);
          }
        }
      }, 14000);

      if (hlsRefA.current) {
        hlsRefA.current.destroy();
        hlsRefA.current = null;
      }

      if (isHlsStream && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        hlsRefA.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(videoA);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (initialTimeout) clearTimeout(initialTimeout);
          setIsLoading(false);
          setHasError(false);
          isInitialLoadedRef.current = true;
          stallCountRef.current = 0;

          if (startAt > 0) {
            videoA.currentTime = startAt;
          }

          videoA
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              if (initialTimeout) clearTimeout(initialTimeout);
              hls.destroy();
              setHasError(true);
              setIsLoading(false);
            }
          }
        });
      } else {
        videoA.src = streamUrl;
        videoA.load();

        const onInitialReady = () => {
          if (initialTimeout) clearTimeout(initialTimeout);
          setIsLoading(false);
          setHasError(false);
          isInitialLoadedRef.current = true;
          stallCountRef.current = 0;

          if (startAt > 0) {
            videoA.currentTime = startAt;
          }

          videoA
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        };

        const onInitialError = () => {
          if (initialTimeout) clearTimeout(initialTimeout);
          const currentRes = getResolutionNumber(targetQuality);
          if (currentRes > 720) {
            stepDownQuality('stream error');
          } else {
            setHasError(true);
            setIsLoading(false);
          }
        };

        videoA.addEventListener('loadedmetadata', onInitialReady, { once: true });
        videoA.addEventListener('error', onInitialError, { once: true });
      }

      return () => {
        if (initialTimeout) clearTimeout(initialTimeout);
      };
    }

    // 2. Seamless Hot Quality Switch Path (Gapless Dual-Buffer Transition)
    isSwitchingRef.current = true;
    setIsQualitySwitching(true);

    const activeSlotCurrent = activeSlotRef.current;
    const inactiveSlot = activeSlotCurrent === 'A' ? 'B' : 'A';
    const activeVid = activeSlotCurrent === 'A' ? videoRefA.current : videoRefB.current;
    const inactiveVid = inactiveSlot === 'B' ? videoRefB.current : videoRefA.current;

    if (!activeVid || !inactiveVid) return;

    const currentPos = activeVid.currentTime || savedPlaybackTimeRef.current || 0;
    const wasPlaying = !activeVid.paused;

    // Check if active HLS instance supports native multi-level bitrate switching
    const activeHls = activeSlotCurrent === 'A' ? hlsRefA.current : hlsRefB.current;
    if (activeHls && activeHls.levels && activeHls.levels.length > 1) {
      const targetRes = getResolutionNumber(targetQuality);
      const levelIdx = activeHls.levels.findIndex(
        (lvl) => lvl.height === targetRes || Math.abs(lvl.height - targetRes) <= 60
      );

      if (levelIdx !== -1) {
        activeHls.currentLevel = levelIdx;
        currentStreamUrlRef.current = streamUrl;
        isSwitchingRef.current = false;
        setIsQualitySwitching(false);
        showNetworkToast(`⚡ Quality: ${targetQuality.shortLabel || 'Updated'}`, true);
        return;
      }
    }

    // Prepare Inactive Video in background
    inactiveVid.muted = true;
    inactiveVid.playbackRate = activeVid.playbackRate || 1;

    if (inactiveSlot === 'B' && hlsRefB.current) {
      hlsRefB.current.destroy();
      hlsRefB.current = null;
    } else if (inactiveSlot === 'A' && hlsRefA.current) {
      hlsRefA.current.destroy();
      hlsRefA.current = null;
    }

    let isSwapped = false;

    const executeSeamlessSwap = () => {
      if (isSwapped) return;
      isSwapped = true;

      const liveCurrentTime = activeVid.currentTime;
      if (liveCurrentTime > 0 && Math.abs(inactiveVid.currentTime - liveCurrentTime) > 0.25) {
        inactiveVid.currentTime = liveCurrentTime;
      }

      inactiveVid.muted = isMutedRef.current;
      inactiveVid.volume = volumeRef.current;

      activeVid.muted = true;
      activeVid.pause();

      if (activeSlotCurrent === 'A' && hlsRefA.current) {
        hlsRefA.current.destroy();
        hlsRefA.current = null;
      } else if (activeSlotCurrent === 'B' && hlsRefB.current) {
        hlsRefB.current.destroy();
        hlsRefB.current = null;
      }

      // Transfer Picture-in-Picture seamlessly if active
      if (typeof document !== 'undefined' && document.pictureInPictureElement && inactiveVid.requestPictureInPicture) {
        inactiveVid.requestPictureInPicture().catch(() => {});
      }

      activeVid.removeAttribute('src');
      activeVid.load();

      setActiveSlot(inactiveSlot);
      activeSlotRef.current = inactiveSlot;
      currentStreamUrlRef.current = streamUrl;
      isSwitchingRef.current = false;
      setIsQualitySwitching(false);
      showNetworkToast(`⚡ Quality: ${targetQuality.shortLabel || 'Updated'}`, true);
    };

    if (isHlsStream && Hls.isSupported()) {
      const newHls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      if (inactiveSlot === 'B') hlsRefB.current = newHls;
      else hlsRefA.current = newHls;

      newHls.loadSource(streamUrl);
      newHls.attachMedia(inactiveVid);

      newHls.on(Hls.Events.MANIFEST_PARSED, () => {
        inactiveVid.currentTime = activeVid.currentTime || currentPos;
        if (wasPlaying) {
          inactiveVid
            .play()
            .then(() => executeSeamlessSwap())
            .catch(() => executeSeamlessSwap());
        } else {
          executeSeamlessSwap();
        }
      });

      newHls.on(Hls.Events.ERROR, (_evt, errData) => {
        if (errData.fatal) {
          newHls.destroy();
          isSwitchingRef.current = false;
          setIsQualitySwitching(false);
        }
      });
    } else {
      inactiveVid.src = streamUrl;
      inactiveVid.load();

      const onCanPlay = () => {
        inactiveVid.currentTime = activeVid.currentTime || currentPos;
        if (wasPlaying) {
          inactiveVid
            .play()
            .then(() => executeSeamlessSwap())
            .catch(() => executeSeamlessSwap());
        } else {
          executeSeamlessSwap();
        }
      };

      const onError = () => {
        isSwitchingRef.current = false;
        setIsQualitySwitching(false);
      };

      inactiveVid.addEventListener('canplay', onCanPlay, { once: true });
      inactiveVid.addEventListener('error', onError, { once: true });
    }
  }, [selectedQuality, startAt, stepDownQuality, showNetworkToast]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hlsRefA.current) hlsRefA.current.destroy();
      if (hlsRefB.current) hlsRefB.current.destroy();
      if (networkToastTimerRef.current) clearTimeout(networkToastTimerRef.current);
      if (skipIndicatorTimerRef.current) clearTimeout(skipIndicatorTimerRef.current);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      if (waitingDebounceTimerRef.current) clearTimeout(waitingDebounceTimerRef.current);
    };
  }, []);

  // Handle Manual Quality Selection
  const handleQualityChange = (newQuality: StreamQuality, isAuto: boolean = false) => {
    const video = getActiveVideo();
    const currentPos = video ? video.currentTime : currentTime;

    savedPlaybackTimeRef.current = currentPos;
    stallCountRef.current = 0;
    smoothPlaybackSecondsRef.current = 0;

    setIsAutoQuality(isAuto);

    if (isAuto) {
      localStorage.setItem(PREFERRED_QUALITY_KEY, 'auto');
      const p1080 = sortedQualities.find((q) => (q.resolution || 0) === 1080) || sortedQualities[0];
      setSelectedQuality(p1080);
      showNetworkToast('⚡ Auto Quality Enabled (Adaptive)', true);
    } else {
      const shortPref = newQuality.shortLabel || '1080p';
      localStorage.setItem(PREFERRED_QUALITY_KEY, shortPref.toLowerCase());
      setSelectedQuality(newQuality);
    }

    setMenuView('closed');
  };

  // Monitor playback buffering/stalls
  const handleWaiting = () => {
    if (isSwitchingRef.current) return;

    if (waitingDebounceTimerRef.current) clearTimeout(waitingDebounceTimerRef.current);
    waitingDebounceTimerRef.current = window.setTimeout(() => {
      const activeVid = getActiveVideo();
      if (activeVid && activeVid.readyState < 3 && !isSwitchingRef.current) {
        setIsLoading(true);
      }
    }, 450);

    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = window.setTimeout(() => {
      const activeVid = getActiveVideo();
      if (activeVid && activeVid.readyState < 3) {
        stallCountRef.current += 1;
        const currentRes = getResolutionNumber(selectedQualityRef.current);
        if (currentRes > 480 && (isAutoQualityRef.current || stallCountRef.current >= 2)) {
          stepDownQuality('buffering delay');
        }
      }
    }, 3500);
  };

  // Video Time & Buffer Updates
  const handleTimeUpdate = () => {
    const video = getActiveVideo();
    if (!video) return;

    const current = video.currentTime;
    const dur = video.duration || 0;
    setCurrentTime(current);
    if (dur && dur > 0) setDuration(dur);
    savedPlaybackTimeRef.current = current;

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
          const bEnd = video.buffered.end(i);
          setBufferedEnd(bEnd);

          if (isAutoQualityRef.current && bEnd - current > 18 && !video.paused) {
            smoothPlaybackSecondsRef.current += 0.25;
            if (smoothPlaybackSecondsRef.current >= 45) {
              smoothPlaybackSecondsRef.current = 0;
              stepUpQuality();
            }
          } else {
            smoothPlaybackSecondsRef.current = 0;
          }
          break;
        }
      }
    }

    onProgressUpdateRef.current?.(current, dur);
  };

  const handlePlayPause = useCallback(() => {
    const video = getActiveVideo();
    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [getActiveVideo]);

  const triggerSkipFeedback = (text: string, side: 'left' | 'right') => {
    setSkipIndicator({ text, side });
    if (skipIndicatorTimerRef.current) clearTimeout(skipIndicatorTimerRef.current);
    skipIndicatorTimerRef.current = window.setTimeout(() => {
      setSkipIndicator(null);
    }, 650);
  };

  const handleSkip = (seconds: number) => {
    const video = getActiveVideo();
    if (!video) return;
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
    savedPlaybackTimeRef.current = newTime;

    const inactive = getInactiveVideo();
    if (inactive && isSwitchingRef.current) {
      inactive.currentTime = newTime;
    }

    triggerSkipFeedback(seconds > 0 ? `+${seconds}s` : `${seconds}s`, seconds > 0 ? 'right' : 'left');
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = getActiveVideo();
    if (!video || !duration) return;

    const newTime = (Number(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    savedPlaybackTimeRef.current = newTime;

    const inactive = getInactiveVideo();
    if (inactive && isSwitchingRef.current) {
      inactive.currentTime = newTime;
    }
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
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);

    const video = getActiveVideo();
    if (video) {
      video.volume = val;
      video.muted = val === 0;
    }
  };

  const toggleMute = () => {
    const video = getActiveVideo();
    if (isMuted) {
      const newVol = volume || 0.5;
      setIsMuted(false);
      setVolume(newVol);
      if (video) {
        video.muted = false;
        video.volume = newVol;
      }
    } else {
      setIsMuted(true);
      if (video) {
        video.muted = true;
      }
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

  const togglePictureInPicture = useCallback(async () => {
    try {
      const activeVid = getActiveVideo();
      if (!activeVid) return;

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else if (document.pictureInPictureEnabled && activeVid.requestPictureInPicture) {
        await activeVid.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (err) {
      console.warn('Picture-in-Picture error:', err);
    }
  }, [getActiveVideo]);

  // Picture in Picture event synchronization
  useEffect(() => {
    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);

    const vA = videoRefA.current;
    const vB = videoRefB.current;

    vA?.addEventListener('enterpictureinpicture', onEnterPip);
    vA?.addEventListener('leavepictureinpicture', onLeavePip);
    vB?.addEventListener('enterpictureinpicture', onEnterPip);
    vB?.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      vA?.removeEventListener('enterpictureinpicture', onEnterPip);
      vA?.removeEventListener('leavepictureinpicture', onLeavePip);
      vB?.removeEventListener('enterpictureinpicture', onEnterPip);
      vB?.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    const video = getActiveVideo();
    if (video) video.playbackRate = speed;
    const inactive = getInactiveVideo();
    if (inactive) inactive.playbackRate = speed;
    setMenuView('closed');
  };

  const handleSubtitleSelect = async (lang: string) => {
    if (lang === 'off') {
      setSelectedSubtitle('off');
      setMenuView('closed');
      return;
    }

    setSelectedSubtitle(lang);
    setMenuView('closed');

    const targetSub = loadedSubtitles.find((s) => s.language === lang);
    if (targetSub && targetSub.downloadUrl && !targetSub.url.startsWith('blob:')) {
      try {
        const blobUrl = await convertSrtToVttBlob(targetSub.downloadUrl);
        setLoadedSubtitles((prev) =>
          prev.map((s) => (s.language === lang ? { ...s, url: blobUrl } : s))
        );
      } catch (err) {
        console.warn('Subtitle blob conversion error:', err);
      }
    }
  };

  const toggleCaptionsQuick = () => {
    if (selectedSubtitle !== 'off') {
      setSelectedSubtitle('off');
    } else {
      const defaultSub = loadedSubtitles.find((s) => s.isDefault) || loadedSubtitles[0];
      if (defaultSub) {
        handleSubtitleSelect(defaultSub.language);
      } else {
        setMenuView('subtitles');
      }
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
        case 'i':
          e.preventDefault();
          togglePictureInPicture();
          break;
        case 'p':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            togglePictureInPicture();
          }
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
        case 'arrowup': {
          e.preventDefault();
          const newVol = Math.min(1, volumeRef.current + 0.05);
          setVolume(newVol);
          setIsMuted(false);
          const v = getActiveVideo();
          if (v) {
            v.volume = newVol;
            v.muted = false;
          }
          break;
        }
        case 'arrowdown': {
          e.preventDefault();
          const newVol = Math.max(0, volumeRef.current - 0.05);
          setVolume(newVol);
          setIsMuted(newVol === 0);
          const v = getActiveVideo();
          if (v) {
            v.volume = newVol;
            v.muted = newVol === 0;
          }
          break;
        }
        case '>':
        case '.':
          if (e.shiftKey || e.key === '>') {
            e.preventDefault();
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const next = speeds.find((s) => s > playbackSpeedRef.current) || 2;
            handleSpeedChange(next);
            showNetworkToast(`⚡ Speed: ${next}x`);
          }
          break;
        case '<':
        case ',':
          if (e.shiftKey || e.key === '<') {
            e.preventDefault();
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const prev = [...speeds].reverse().find((s) => s < playbackSpeedRef.current) || 0.25;
            handleSpeedChange(prev);
            showNetworkToast(`⚡ Speed: ${prev}x`);
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
        case '9': {
          if (duration > 0) {
            const percent = Number(e.key) / 10;
            const newPos = percent * duration;
            const v = getActiveVideo();
            if (v) v.currentTime = newPos;
            setCurrentTime(newPos);
            savedPlaybackTimeRef.current = newPos;
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, duration, getActiveVideo]);

  // Disable native video text tracks so custom high-fidelity React overlay renders exclusively
  useEffect(() => {
    const disableNativeTracks = (vid: HTMLVideoElement | null) => {
      if (!vid || !vid.textTracks) return;
      for (let i = 0; i < vid.textTracks.length; i++) {
        vid.textTracks[i].mode = 'disabled';
      }
    };
    disableNativeTracks(videoRefA.current);
    disableNativeTracks(videoRefB.current);
  }, [selectedSubtitle, activeSlot]);

  // Active Quality Badge Display in Bottom Bar
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
      {/* Video Slot A */}
      <video
        ref={videoRefA}
        title={title}
        aria-label={title}
        crossOrigin="anonymous"
        playsInline
        onTimeUpdate={activeSlot === 'A' ? handleTimeUpdate : undefined}
        onWaiting={activeSlot === 'A' ? handleWaiting : undefined}
        onPlaying={() => {
          if (activeSlot === 'A') {
            if (waitingDebounceTimerRef.current) {
              clearTimeout(waitingDebounceTimerRef.current);
              waitingDebounceTimerRef.current = null;
            }
            setIsLoading(false);
            setIsPlaying(true);
            if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
          }
        }}
        onPause={() => activeSlot === 'A' && setIsPlaying(false)}
        onEnded={() => activeSlot === 'A' && onEndedRef.current?.()}
        onClick={handleVideoClick}
        onDoubleClick={toggleFullscreen}
        className={`absolute inset-0 w-full h-full object-contain cursor-pointer transition-opacity duration-300 ${
          activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />

      {/* Video Slot B */}
      <video
        ref={videoRefB}
        title={title}
        aria-label={title}
        crossOrigin="anonymous"
        playsInline
        onTimeUpdate={activeSlot === 'B' ? handleTimeUpdate : undefined}
        onWaiting={activeSlot === 'B' ? handleWaiting : undefined}
        onPlaying={() => {
          if (activeSlot === 'B') {
            if (waitingDebounceTimerRef.current) {
              clearTimeout(waitingDebounceTimerRef.current);
              waitingDebounceTimerRef.current = null;
            }
            setIsLoading(false);
            setIsPlaying(true);
            if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
          }
        }}
        onPause={() => activeSlot === 'B' && setIsPlaying(false)}
        onEnded={() => activeSlot === 'B' && onEndedRef.current?.()}
        onClick={handleVideoClick}
        onDoubleClick={toggleFullscreen}
        className={`absolute inset-0 w-full h-full object-contain cursor-pointer transition-opacity duration-300 ${
          activeSlot === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />

      {/* Custom High-Fidelity Subtitle Overlay (Dynamic elevation above controls) */}
      {activeCue && selectedSubtitle !== 'off' && (
        <div
          className={`absolute inset-x-0 pointer-events-none flex justify-center z-25 px-4 transition-all duration-300 ${
            showControls || !isPlaying ? 'bottom-24 sm:bottom-28' : 'bottom-8 sm:bottom-12'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-1 text-center max-w-4xl">
            {activeCue.lines.map((line, idx) => (
              <span
                key={idx}
                className={`inline-block font-sans select-none tracking-normal leading-snug transition-all duration-150 ${getSubSizeClasses(
                  subSize
                )} ${getSubColorClasses(subColor)} ${getSubBgClasses(subBg)}`}
                style={{
                  textShadow:
                    subBg === 'shadow'
                      ? '0 2px 4px rgba(0,0,0,0.98), 0 0 3px #000, 0 0 6px #000, 0 0 10px rgba(0,0,0,0.9)'
                      : '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {line}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Smart Network / Quality Toast Notification */}
      {networkToast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/95 text-white text-xs font-semibold shadow-2xl border border-zinc-700/80 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
          {networkToast.isQuality ? (
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span>{networkToast.message}</span>
        </div>
      )}

      {/* Subtle Quality Prebuffering Indicator Pill */}
      {isQualitySwitching && !networkToast && (
        <div className="absolute top-5 right-5 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 text-white text-[11px] font-medium shadow-lg border border-zinc-700/60 backdrop-blur-md animate-pulse">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Switching Quality...</span>
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

      {/* Cold-Start Initial Loading Spinner Only */}
      {isLoading && !hasError && !isQualitySwitching && (
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
                const active = getActiveVideo();
                if (active) active.load();
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
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition cursor-pointer z-20"
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
            {/* Quality Badge Button */}
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
            <button
              onClick={toggleCaptionsQuick}
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                selectedSubtitle !== 'off'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'hover:bg-white/15 text-zinc-300 hover:text-white'
              }`}
              title={
                selectedSubtitle !== 'off'
                  ? `Subtitles: ${selectedSubtitle.toUpperCase()} (Click to toggle off, c)`
                  : 'Subtitles / Closed Captions (c)'
              }
            >
              <Subtitles className="w-4 h-4" />
            </button>

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

            {/* Picture-in-Picture (PiP) Button */}
            {typeof document !== 'undefined' && (
              <button
                onClick={togglePictureInPicture}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isPip
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'hover:bg-white/15 text-zinc-300 hover:text-white'
                }`}
                title={isPip ? 'Exit Picture in Picture (i)' : 'Picture in Picture (i)'}
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer text-zinc-300 hover:text-white"
              title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Settings Popover Menu */}
            {menuView !== 'closed' && (
              <div className="absolute right-0 bottom-12 z-50 w-72 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl p-2 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
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
                    <button
                      onClick={() => setMenuView('subtitles')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Subtitles className="w-4 h-4 text-red-500" />
                        <span className="font-medium">Subtitles Track</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                        <span className="capitalize font-medium text-white">{selectedSubtitle}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Subtitle Style & Size Row */}
                    <button
                      onClick={() => setMenuView('sub_style')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Type className="w-4 h-4 text-amber-400" />
                        <span className="font-medium">Subtitle Size & Style</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                        <span className="capitalize text-zinc-300 font-medium">{subSize}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </>
                )}

                {/* 2. Quality Selection Sub-Menu */}
                {menuView === 'quality' && (
                  <>
                    <button
                      onClick={() => setMenuView('main')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-zinc-400 hover:text-white text-left font-bold text-xs border-b border-zinc-800 mb-1 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Quality</span>
                    </button>

                    <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
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

                {/* 4. Subtitles Track Sub-Menu */}
                {menuView === 'subtitles' && (
                  <>
                    <div className="flex items-center justify-between border-b border-zinc-800 mb-1 px-1 py-1">
                      <button
                        onClick={() => setMenuView('main')}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-white font-bold text-xs transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Subtitles Track</span>
                      </button>
                      <button
                        onClick={() => setMenuView('sub_style')}
                        className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Type className="w-3 h-3" />
                        <span>Style & Size</span>
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                      <button
                        onClick={() => handleSubtitleSelect('off')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                          selectedSubtitle === 'off'
                            ? 'bg-red-600 text-white font-bold'
                            : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                        }`}
                      >
                        <span>Off</span>
                        {selectedSubtitle === 'off' && <Check className="w-4 h-4" />}
                      </button>

                      {loadedSubtitles.map((sub) => {
                        const isSelected = selectedSubtitle === sub.language;
                        return (
                          <button
                            key={sub.language}
                            onClick={() => handleSubtitleSelect(sub.language)}
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

                      {loadedSubtitles.length === 0 && (
                        <div className="p-3 text-center text-zinc-400 text-xs">
                          {isFetchingSubtitles ? 'Searching multi-language subtitles...' : 'No subtitles found for this title'}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 5. Subtitle Style & Size Sub-Menu */}
                {menuView === 'sub_style' && (
                  <div className="space-y-2.5 p-1">
                    <button
                      onClick={() => setMenuView('main')}
                      className="w-full flex items-center gap-2 px-1 py-1 text-zinc-400 hover:text-white text-left font-bold text-xs border-b border-zinc-800 mb-2 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Subtitle Style & Size</span>
                    </button>

                    {/* Live Preview Box */}
                    <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col items-center justify-center min-h-[68px] text-center overflow-hidden">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">
                        Live Preview
                      </span>
                      <div
                        className={`font-sans tracking-normal leading-snug ${getSubSizeClasses(
                          subSize
                        )} ${getSubColorClasses(subColor)} ${getSubBgClasses(subBg)}`}
                        style={{
                          textShadow:
                            subBg === 'shadow'
                              ? '0 2px 4px rgba(0,0,0,0.98), 0 0 3px #000, 0 0 6px #000'
                              : undefined,
                        }}
                      >
                        -Not necessary.
                        <br />
                        -Well, I owe you.
                      </div>
                    </div>

                    {/* 1. Font Size Selector */}
                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                        Font Size
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: 'small', label: '75%' },
                          { id: 'medium', label: '100%' },
                          { id: 'large', label: '125%' },
                          { id: 'huge', label: '150%' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSubSizeChange(item.id as SubtitleSize)}
                            className={`py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition cursor-pointer ${
                              subSize === item.id
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Font Color Selector */}
                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                        Text Color
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: 'white', label: 'White', colorClass: 'text-white' },
                          { id: 'yellow', label: 'Yellow', colorClass: 'text-yellow-300' },
                          { id: 'cyan', label: 'Cyan', colorClass: 'text-cyan-300' },
                          { id: 'green', label: 'Green', colorClass: 'text-emerald-300' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSubColorChange(item.id as SubtitleColor)}
                            className={`py-1.5 px-1 rounded-lg text-center font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
                              subColor === item.id
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                            }`}
                          >
                            <span className={item.colorClass}>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Background Style Selector */}
                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                        Background
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'shadow', label: 'Outline' },
                          { id: 'semi', label: 'Semi-Box' },
                          { id: 'solid', label: 'Solid Box' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSubBgChange(item.id as SubtitleBg)}
                            className={`py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition cursor-pointer ${
                              subBg === item.id
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
