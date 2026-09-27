/**
 * User Account Migration & Email Alias Mapping Utility for WATCHD
 * Maps legacy or changed user accounts (e.g. kingzart254@gmail.com -> kingoriwandeto@gmail.com)
 * ensuring seamless preservation of Watch History, Watchlist, and Cloud Profile state.
 */

import type { WatchHistoryItem, WatchlistItem } from '../types/media';

export const EMAIL_MIGRATIONS: Record<string, string> = {
  'kingzart254@gmail.com': 'kingoriwandeto@gmail.com',
};

const USER_SESSION_KEY = 'watchflix_user_session';

/**
 * Returns the canonical (new) email for any given email address.
 */
export function getCanonicalEmail(email?: string | null): string {
  if (!email) return '';
  const normalized = email.toLowerCase().trim();
  return EMAIL_MIGRATIONS[normalized] || normalized;
}

/**
 * Returns all historical email aliases associated with a canonical email address.
 */
export function getEmailAliases(canonicalEmail?: string | null): string[] {
  if (!canonicalEmail) return [];
  const normalized = canonicalEmail.toLowerCase().trim();
  const canonical = EMAIL_MIGRATIONS[normalized] || normalized;

  const aliases = new Set<string>([canonical]);

  for (const [oldEmail, targetEmail] of Object.entries(EMAIL_MIGRATIONS)) {
    if (targetEmail.toLowerCase().trim() === canonical) {
      aliases.add(oldEmail.toLowerCase().trim());
    }
  }

  return Array.from(aliases);
}

/**
 * Migrates local storage data (Watch History, Watchlist, User Session) from an old email to a new email.
 */
export function migrateUserLocalStorage(oldEmail: string, newEmail: string): void {
  const oldKey = oldEmail.toLowerCase().trim();
  const newKey = newEmail.toLowerCase().trim();

  if (oldKey === newKey) return;

  try {
    // 1. Migrate Watch History
    const oldHistoryKey = `watch_history_v1_${oldKey}`;
    const newHistoryKey = `watch_history_v1_${newKey}`;
    const oldHistoryRaw = localStorage.getItem(oldHistoryKey);

    if (oldHistoryRaw) {
      const oldItems: WatchHistoryItem[] = JSON.parse(oldHistoryRaw);
      const newHistoryRaw = localStorage.getItem(newHistoryKey);
      const existingItems: WatchHistoryItem[] = newHistoryRaw ? JSON.parse(newHistoryRaw) : [];

      const itemMap = new Map<string, WatchHistoryItem>();
      // Put old items first
      oldItems.forEach((item) => {
        itemMap.set(`${item.type}_${item.id}`, item);
      });
      // Merge newer items
      existingItems.forEach((item) => {
        const key = `${item.type}_${item.id}`;
        const prev = itemMap.get(key);
        if (!prev || (item.timestamp || 0) >= (prev.timestamp || 0)) {
          itemMap.set(key, item);
        }
      });

      const mergedHistory = Array.from(itemMap.values())
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 50);

      localStorage.setItem(newHistoryKey, JSON.stringify(mergedHistory));
    }

    // 2. Migrate Watchlist
    const oldWatchlistKey = `watchlist_v1_${oldKey}`;
    const newWatchlistKey = `watchlist_v1_${newKey}`;
    const oldWatchlistRaw = localStorage.getItem(oldWatchlistKey);

    if (oldWatchlistRaw) {
      const oldItems: WatchlistItem[] = JSON.parse(oldWatchlistRaw);
      const newWatchlistRaw = localStorage.getItem(newWatchlistKey);
      const existingItems: WatchlistItem[] = newWatchlistRaw ? JSON.parse(newWatchlistRaw) : [];

      const itemMap = new Map<number, WatchlistItem>();
      oldItems.forEach((item) => itemMap.set(Number(item.id), item));
      existingItems.forEach((item) => itemMap.set(Number(item.id), item));

      const mergedWatchlist = Array.from(itemMap.values()).sort(
        (a, b) => (b.added_at || 0) - (a.added_at || 0)
      );

      localStorage.setItem(newWatchlistKey, JSON.stringify(mergedWatchlist));
    }

    // 3. Migrate Active Session if it points to oldEmail
    const sessionRaw = localStorage.getItem(USER_SESSION_KEY);
    if (sessionRaw) {
      const user = JSON.parse(sessionRaw);
      if (user?.email?.toLowerCase().trim() === oldKey || user?.id?.toLowerCase().trim() === oldKey) {
        user.id = newKey;
        user.email = newKey;
        if (user.name === oldKey.split('@')[0]) {
          user.name = newKey.split('@')[0];
        }
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      }
    }
  } catch (err) {
    console.warn(`Local storage migration from ${oldEmail} to ${newEmail} encountered an error:`, err);
  }
}

/**
 * Executes all registered account migrations automatically on startup.
 */
export function runAllUserMigrations(): void {
  for (const [oldEmail, newEmail] of Object.entries(EMAIL_MIGRATIONS)) {
    migrateUserLocalStorage(oldEmail, newEmail);
  }
}

