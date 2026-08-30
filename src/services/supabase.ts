import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { WatchlistItem, WatchHistoryItem } from '../types/media';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ================= WATCHLIST CLOUD SERVICE =================

export const cloudWatchlistService = {
  async getWatchlist(userId: string): Promise<WatchlistItem[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        console.warn('Supabase getWatchlist error:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.media_id,
        title: row.title,
        poster_path: row.poster_path,
        backdrop_path: row.backdrop_path,
        type: row.type,
        vote_average: row.vote_average || 0,
        release_date: row.release_date,
        added_at: row.added_at ? new Date(row.added_at).getTime() : Date.now(),
      }));
    } catch (err) {
      console.warn('Failed to fetch cloud watchlist:', err);
      return null;
    }
  },

  async addToWatchlist(userId: string, item: WatchlistItem): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('watchlist').upsert(
        {
          user_id: userId,
          media_id: item.id,
          title: item.title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          type: item.type,
          vote_average: item.vote_average,
          release_date: item.release_date,
          added_at: new Date(item.added_at || Date.now()).toISOString(),
        },
        { onConflict: 'user_id,media_id' }
      );

      if (error) {
        console.warn('Supabase addToWatchlist error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Failed to add to cloud watchlist:', err);
      return false;
    }
  },

  async removeFromWatchlist(userId: string, mediaId: number): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', userId)
        .eq('media_id', mediaId);

      if (error) {
        console.warn('Supabase removeFromWatchlist error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Failed to remove from cloud watchlist:', err);
      return false;
    }
  },
};

// ================= WATCH HISTORY CLOUD SERVICE =================

export const cloudHistoryService = {
  async getHistory(userId: string): Promise<WatchHistoryItem[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Supabase getHistory error:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.media_id,
        title: row.title,
        poster_path: row.poster_path,
        backdrop_path: row.backdrop_path,
        type: row.type,
        season: row.season,
        episode: row.episode,
        timestamp: row.timestamp ? new Date(row.timestamp).getTime() : Date.now(),
      }));
    } catch (err) {
      console.warn('Failed to fetch cloud watch history:', err);
      return null;
    }
  },

  async addToHistory(userId: string, item: WatchHistoryItem): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('watch_history').upsert(
        {
          user_id: userId,
          media_id: item.id,
          title: item.title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          type: item.type,
          season: item.season,
          episode: item.episode,
          timestamp: new Date(item.timestamp || Date.now()).toISOString(),
        },
        { onConflict: 'user_id,media_id,type' }
      );

      if (error) {
        console.warn('Supabase addToHistory error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Failed to add to cloud history:', err);
      return false;
    }
  },

  async removeFromHistory(userId: string, mediaId: number, type: 'movie' | 'tv'): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('watch_history')
        .delete()
        .eq('user_id', userId)
        .eq('media_id', mediaId)
        .eq('type', type);

      if (error) {
        console.warn('Supabase removeFromHistory error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Failed to remove from cloud history:', err);
      return false;
    }
  },

  async clearHistory(userId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('watch_history')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.warn('Supabase clearHistory error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Failed to clear cloud history:', err);
      return false;
    }
  },
};

