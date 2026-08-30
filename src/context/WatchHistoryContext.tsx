import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { WatchHistoryItem } from '../types/media';
import { useAuth } from './AuthContext';
import { cloudHistoryService, isSupabaseConfigured } from '../services/supabase';

export interface WatchHistoryContextType {
  history: WatchHistoryItem[];
  addToHistory: (item: Omit<WatchHistoryItem, 'timestamp'>) => void;
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
            currentList.forEach((i) => combinedMap.set(`${i.type}_${i.id}`, i));
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

  const addToHistory = useCallback((item: Omit<WatchHistoryItem, 'timestamp'>) => {
    setHistory((prev) => {
      const filtered = prev.filter(
        (i) => !(i.id === item.id && i.type === item.type)
      );
      const newItem: WatchHistoryItem = { ...item, timestamp: Date.now() };
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
  }, [currentKey, user]);

  const removeFromHistory = useCallback((id: number, type: 'movie' | 'tv') => {
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
  }, [currentKey, user]);

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
        removeFromHistory,
        clearHistory,
      }}
    >
      {children}
    </WatchHistoryContext.Provider>
  );
}
