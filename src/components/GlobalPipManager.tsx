import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { usePlayer } from '../context/PlayerContext';
import { directStreamService, type DirectStreamResult } from '../services/directStreamService';

/**
 * GlobalPipManager
 * Handles background streaming and seamless OS Picture-in-Picture lifecycle.
 * Renders ZERO in-app UI cards so that the webpage remains 100% clean,
 * while the native OS Picture-in-Picture window continues streaming uninterrupted across pages.
 */
export default function GlobalPipManager() {
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
  } = usePlayer();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [streamData, setStreamData] = useState<DirectStreamResult | null>(null);
  const activeMediaIdRef = useRef<string | number | null>(null);

  // Synchronize Picture-in-Picture lifecycle events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPip = () => {
      setIsPipActive(true);
    };

    const onLeavePip = () => {
      setIsPipActive(false);
      // If user closed the OS PiP window while navigating outside /watch, close playback cleanly
      if (isDocked) {
        closePlayer();
      }
    };

    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, [isDocked, closePlayer, setIsPipActive]);

  // Fetch Direct Stream data when active media changes
  useEffect(() => {
    if (!isDocked || !activeMedia) {
      setStreamData(null);
      return;
    }

    const mediaKey = `${activeMedia.id}-${activeMedia.type}-${activeMedia.season || 1}-${activeMedia.episode || 1}`;
    if (activeMediaIdRef.current === mediaKey && streamData) return;

    activeMediaIdRef.current = mediaKey;

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
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStreamData(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isDocked, activeMedia, streamData]);

  // Setup HLS / Video playback in the background for OS PiP
  useEffect(() => {
    if (!isDocked || !activeMedia || !streamData?.qualities?.length) return;

    const video = videoRef.current;
    if (!video) return;

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

    const triggerPipIfAllowed = () => {
      if (video && video.requestPictureInPicture && !document.pictureInPictureElement) {
        video
          .requestPictureInPicture()
          .then(() => setIsPipActive(true))
          .catch(() => {});
      }
    };

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
        triggerPipIfAllowed();
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
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
        triggerPipIfAllowed();
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isDocked, activeMedia, streamData, isPlaying, isPipActive, setIsPipActive]);

  // Video Time updates
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    updatePlayback(video.currentTime, video.duration || duration, !video.paused);
  };

  if (!isDocked || !activeMedia) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed -bottom-[9999px] -right-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden -z-50"
    >
      <video
        ref={videoRef}
        className="w-1 h-1 object-cover"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          updatePlayback(duration, duration, false);
          closePlayer();
        }}
        playsInline
        // @ts-expect-error autoPictureInPicture is supported in modern Chromium
        autoPictureInPicture={true}
      />
    </div>
  );
}
