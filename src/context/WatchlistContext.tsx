import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { WatchlistItem, MediaItem } from '../types/media';
import { useAuth } from './AuthContext';
import { cloudWatchlistService, isSupabaseConfigured } from '../services/supabase';

export interface WatchlistContextType {
  watchlist: WatchlistItem[];
  toggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: number) => boolean;
  removeFromWatchlist: (id: number) => void;
}

export const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'watchlist_v1_guest';

function getUserStorageKey(userId: string) {
  return `watchlist_v1_${userId}`;
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const currentKey = user ? getUserStorageKey(user.id) : GUEST_STORAGE_KEY;

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const stored = localStorage.getItem(currentKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // When user signs in or signs out, sync local + cloud
  useEffect(() => {
    let isMounted = true;

    async function syncData() {
      if (user) {
        const userKey = getUserStorageKey(user.id);
        const userStored = localStorage.getItem(userKey);
        let currentList: WatchlistItem[] = userStored ? JSON.parse(userStored) : [];

        // Check if there are guest items to merge into account
        const guestStored = localStorage.getItem(GUEST_STORAGE_KEY);
        if (guestStored) {
          try {
            const guestList: WatchlistItem[] = JSON.parse(guestStored);
            if (guestList.length > 0) {
              const existingIds = new Set(currentList.map((i) => i.id));
              const newItems = guestList.filter((i) => !existingIds.has(i.id));
              if (newItems.length > 0) {
                currentList = [...newItems, ...currentList];
                localStorage.setItem(userKey, JSON.stringify(currentList));
              }
              localStorage.removeItem(GUEST_STORAGE_KEY);
            }
          } catch {
            // Ignore parse error
          }
        }

        if (isMounted) {
          setWatchlist(currentList);
        }

        // Fetch & sync with Supabase cloud
        if (isSupabaseConfigured()) {
          const cloudData = await cloudWatchlistService.getWatchlist(user.id);
          if (isMounted) {
            const cloudItems = cloudData || [];

            // 1. Push any local items not yet in cloud to Supabase
            const cloudIdSet = new Set(cloudItems.map((i) => i.id));
            const missingInCloud = currentList.filter((i) => !cloudIdSet.has(i.id));
            if (missingInCloud.length > 0) {
              for (const item of missingInCloud) {
                await cloudWatchlistService.addToWatchlist(user.id, item);
              }
            }

            // 2. Merge local + cloud items
            const combinedMap = new Map<number, WatchlistItem>();
            cloudItems.forEach((i) => combinedMap.set(i.id, i));
            currentList.forEach((i) => combinedMap.set(i.id, i));
            const merged = Array.from(combinedMap.values()).sort(
              (a, b) => (b.added_at || 0) - (a.added_at || 0)
            );

            setWatchlist(merged);
            localStorage.setItem(userKey, JSON.stringify(merged));
          }
        }
      } else {
        // Guest mode
        const guestStored = localStorage.getItem(GUEST_STORAGE_KEY);
        if (isMounted) {
          setWatchlist(guestStored ? JSON.parse(guestStored) : []);
        }
      }
    }

    syncData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const toggleWatchlist = useCallback((item: MediaItem) => {
    setWatchlist((prev) => {
      const isSaved = prev.some((i) => i.id === item.id);
      let updated: WatchlistItem[];

      if (isSaved) {
        updated = prev.filter((i) => i.id !== item.id);
        if (user && isSupabaseConfigured()) {
          cloudWatchlistService.removeFromWatchlist(user.id, item.id);
        }
      } else {
        const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const title = item.title || item.name || 'Untitled';
        const newItem: WatchlistItem = {
          id: item.id,
          title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          type: mediaType,
          vote_average: item.vote_average || 0,
          release_date: item.release_date || item.first_air_date,
          added_at: Date.now(),
        };
        updated = [newItem, ...prev];

        if (user && isSupabaseConfigured()) {
          cloudWatchlistService.addToWatchlist(user.id, newItem);
        }
      }

      try {
        localStorage.setItem(currentKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save watchlist', e);
      }
      return updated;
    });
  }, [currentKey, user]);

  const isInWatchlist = useCallback((id: number) => {
    return watchlist.some((i) => i.id === id);
  }, [watchlist]);

  const removeFromWatchlist = useCallback((id: number) => {
    setWatchlist((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      if (user && isSupabaseConfigured()) {
        cloudWatchlistService.removeFromWatchlist(user.id, id);
      }
      try {
        localStorage.setItem(currentKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to remove from watchlist', e);
      }
      return updated;
    });
  }, [currentKey, user]);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        toggleWatchlist,
        isInWatchlist,
        removeFromWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}
