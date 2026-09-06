import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { WatchHistoryItem } from '../types/media';
import { useAuth } from './AuthContext';
import { cloudHistoryService, isSupabaseConfigured } from '../services/supabase';

export interface WatchHistoryContextType {
  history: WatchHistoryItem[];
  addToHistory: (item: Omit<WatchHistoryItem, 'timestamp'>) => void;
  updateProgress: (
    id: number,
    type: 'movie' | 'tv',
    progress: number,
    duration: number,
    season?: number,
    episode?: number
  ) => void;
  getLastWatched: (id: number, type: 'movie' | 'tv') => WatchHistoryItem | undefined;
  getEpisodeProgress: (
    id: number,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number
  ) => { progress: number; duration: number } | null;
  removeFromHistory: (id: number, type: 'movie' | 'tv') => void;
  clearHistory: () => void;
}

export const WatchHistoryContext = createContext<WatchHistoryContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'watch_history_v1_guest';

function getUserStorageKey(userId: string) {
  return `watch_history_v1_${userId}`;
}

export function WatchHistoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const currentKey = user ? getUserStorageKey(user.id) : GUEST_STORAGE_KEY;

  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(currentKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const lastProgressSyncRef = useRef<{ [key: string]: number }>({});

  // When user signs in or out, sync local + cloud
  useEffect(() => {
    let isMounted = true;

    async function syncData() {
      if (user) {
        const userKey = getUserStorageKey(user.id);
        const userStored = localStorage.getItem(userKey);
        let currentList: WatchHistoryItem[] = userStored ? JSON.parse(userStored) : [];

        // Check if there are guest items to merge into account
        const guestStored = localStorage.getItem(GUEST_STORAGE_KEY);
        if (guestStored) {
          try {
            const guestList: WatchHistoryItem[] = JSON.parse(guestStored);
            if (guestList.length > 0) {
              const existingKeys = new Set(currentList.map((i) => `${i.type}_${i.id}`));
              const newItems = guestList.filter((i) => !existingKeys.has(`${i.type}_${i.id}`));
              if (newItems.length > 0) {
                currentList = [...newItems, ...currentList].slice(0, 50);
                localStorage.setItem(userKey, JSON.stringify(currentList));
              }
              localStorage.removeItem(GUEST_STORAGE_KEY);
            }
          } catch {
            // Ignore parse error
          }
        }

        if (isMounted) {
          setHistory(currentList);
        }

        // Fetch & sync with Supabase cloud
        if (isSupabaseConfigured()) {
          const cloudData = await cloudHistoryService.getHistory(user.id);
          if (isMounted) {
            const cloudItems = cloudData || [];

            // 1. Push any local history items not yet in cloud to Supabase
            const cloudKeySet = new Set(cloudItems.map((i) => `${i.type}_${i.id}`));
            const missingInCloud = currentList.filter((i) => !cloudKeySet.has(`${i.type}_${i.id}`));
            if (missingInCloud.length > 0) {
              for (const item of missingInCloud) {
                await cloudHistoryService.addToHistory(user.id, item);
              }
            }

            // 2. Merge local + cloud items
            const combinedMap = new Map<string, WatchHistoryItem>();
            cloudItems.forEach((i) => combinedMap.set(`${i.type}_${i.id}`, i));
            currentList.forEach((i) => {
              const existing = combinedMap.get(`${i.type}_${i.id}`);
              // Preserve highest timestamp or progress
              if (!existing || (i.timestamp || 0) >= (existing.timestamp || 0)) {
                combinedMap.set(`${i.type}_${i.id}`, i);
              }
            });
            const merged = Array.from(combinedMap.values())
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
              .slice(0, 50);

            setHistory(merged);
            localStorage.setItem(userKey, JSON.stringify(merged));
          }
        }
      } else {
        // Guest mode
        const guestStored = localStorage.getItem(GUEST_STORAGE_KEY);
        if (isMounted) {
          setHistory(guestStored ? JSON.parse(guestStored) : []);
        }
      }
    }

    syncData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const addToHistory = useCallback(
    (item: Omit<WatchHistoryItem, 'timestamp'>) => {
      setHistory((prev) => {
        const existing = prev.find((i) => i.id === item.id && i.type === item.type);
        const filtered = prev.filter((i) => !(i.id === item.id && i.type === item.type));

        const newItem: WatchHistoryItem = {
          ...existing,
          ...item,
          timestamp: Date.now(),
        };

        const updated = [newItem, ...filtered].slice(0, 50);

        if (user && isSupabaseConfigured()) {
          cloudHistoryService.addToHistory(user.id, newItem);
        }

        try {
          localStorage.setItem(currentKey, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save history', e);
        }
        return updated;
      });
    },
    [currentKey, user]
  );

  const updateProgress = useCallback(
    (
      id: number,
      type: 'movie' | 'tv',
      progress: number,
      duration: number,
      season?: number,
      episode?: number
    ) => {
      const epKey = `watch_progress_${type}_${id}_${season || 1}_${episode || 1}`;
      try {
        localStorage.setItem(
          epKey,
          JSON.stringify({ progress: Math.floor(progress), duration: Math.floor(duration), updatedAt: Date.now() })
        );
      } catch {
        // Ignore storage write error
      }

      // Throttle cloud updates to every 10 seconds per item
      const syncKey = `${type}_${id}`;
      const now = Date.now();
      const lastSync = lastProgressSyncRef.current[syncKey] || 0;
      const shouldSyncCloud = now - lastSync > 10000;

      setHistory((prev) => {
        const index = prev.findIndex((i) => i.id === id && i.type === type);
        if (index === -1) return prev;

        const currentItem = prev[index];
        const updatedItem: WatchHistoryItem = {
          ...currentItem,
          progress: Math.floor(progress),
          duration: Math.floor(duration),
          season: type === 'tv' ? season ?? currentItem.season : undefined,
          episode: type === 'tv' ? episode ?? currentItem.episode : undefined,
          timestamp: now,
        };

        const updated = [...prev];
        updated[index] = updatedItem;

        try {
          localStorage.setItem(currentKey, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to update progress', e);
        }

        if (shouldSyncCloud && user && isSupabaseConfigured()) {
          lastProgressSyncRef.current[syncKey] = now;
          cloudHistoryService.addToHistory(user.id, updatedItem);
        }

        return updated;
      });
    },
    [currentKey, user]
  );

  const getLastWatched = useCallback(
    (id: number, type: 'movie' | 'tv') => {
      return history.find((i) => i.id === id && i.type === type);
    },
    [history]
  );

  const getEpisodeProgress = useCallback(
    (id: number, type: 'movie' | 'tv', season = 1, episode = 1) => {
      try {
        const epKey = `watch_progress_${type}_${id}_${season}_${episode}`;
        const stored = localStorage.getItem(epKey);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore
      }
      return null;
    },
    []
  );

  const removeFromHistory = useCallback(
    (id: number, type: 'movie' | 'tv') => {
      setHistory((prev) => {
        const updated = prev.filter((i) => !(i.id === id && i.type === type));
        if (user && isSupabaseConfigured()) {
          cloudHistoryService.removeFromHistory(user.id, id, type);
        }
        try {
          localStorage.setItem(currentKey, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to remove history item', e);
        }
        return updated;
      });
    },
    [currentKey, user]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (user && isSupabaseConfigured()) {
      cloudHistoryService.clearHistory(user.id);
    }
    try {
      localStorage.removeItem(currentKey);
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  }, [currentKey, user]);

  return (
    <WatchHistoryContext.Provider
      value={{
        history,
        addToHistory,
        updateProgress,
        getLastWatched,
        getEpisodeProgress,
        removeFromHistory,
        clearHistory,
      }}
    >
      {children}
    </WatchHistoryContext.Provider>
  );
}
