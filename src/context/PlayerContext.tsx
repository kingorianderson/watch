import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface ActiveMedia {
  id: number | string;
  type: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  releaseYear?: number;
  startAt?: number;
}

interface PlayerContextType {
  activeMedia: ActiveMedia | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isDocked: boolean;
  playMedia: (media: ActiveMedia) => void;
  updatePlayback: (current: number, dur: number, playing?: boolean) => void;
  closePlayer: () => void;
  expandPlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [activeMedia, setActiveMedia] = useState<ActiveMedia | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const location = useLocation();
  const navigate = useNavigate();

  const activeMediaRef = useRef(activeMedia);
  activeMediaRef.current = activeMedia;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Determine if player should be docked in miniplayer mode
  const isOnWatchPage = location.pathname.startsWith('/watch/');
  const isDocked = Boolean(activeMedia && !isOnWatchPage);

  const playMedia = useCallback((media: ActiveMedia) => {
    setActiveMedia(media);
    if (media.startAt !== undefined) {
      setCurrentTime(media.startAt);
    }
    setIsPlaying(true);
  }, []);

  const updatePlayback = useCallback((current: number, dur: number, playing?: boolean) => {
    setCurrentTime(current);
    if (dur > 0) setDuration(dur);
    if (playing !== undefined) setIsPlaying(playing);
  }, []);

  const closePlayer = useCallback(() => {
    setActiveMedia(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  const expandPlayer = useCallback(() => {
    const current = activeMediaRef.current;
    if (!current) return;

    const time = currentTimeRef.current;
    const path =
      current.type === 'tv'
        ? `/watch/tv/${current.id}/${current.season || 1}/${current.episode || 1}`
        : `/watch/movie/${current.id}`;

    navigate(path, { state: { resumeAt: time } });
  }, [navigate]);

  return (
    <PlayerContext.Provider
      value={{
        activeMedia,
        currentTime,
        duration,
        isPlaying,
        isDocked,
        playMedia,
        updatePlayback,
        closePlayer,
        expandPlayer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

