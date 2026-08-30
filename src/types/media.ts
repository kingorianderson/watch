export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: SeasonSummary[];
  status?: string;
  tagline?: string;
}

export interface SeasonSummary {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  runtime?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface VideoTrailer {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface WatchHistoryItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  timestamp: number;
}

export interface WatchlistItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  type: 'movie' | 'tv';
  vote_average: number;
  release_date?: string;
  added_at: number;
}

