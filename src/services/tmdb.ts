import axios from 'axios';
import type { MediaItem, Episode, CastMember, VideoTrailer } from '../types/media';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'e72a65315316bb3693595b379ad9c1f5';
const BASE_URL = 'https://api.themoviedb.org/3';

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
export const getPosterUrl = (path: string | null, size = 'w500') =>
  path ? `${IMAGE_BASE_URL}/${size}${path}` : 'https://placehold.co/500x750/18181b/ffffff?text=No+Poster';
export const getBackdropUrl = (path: string | null, size = 'original') =>
  path ? `${IMAGE_BASE_URL}/${size}${path}` : 'https://placehold.co/1920x1080/18181b/ffffff?text=No+Backdrop';
export const getProfileUrl = (path: string | null) =>
  path ? `${IMAGE_BASE_URL}/w185${path}` : 'https://placehold.co/185x278/18181b/ffffff?text=No+Image';

const api = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
});

export const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export const tmdbService = {
  // Trending
  getTrending: async (type: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'day'): Promise<MediaItem[]> => {
    const res = await api.get(`/trending/${type}/${timeWindow}`);
    return res.data.results.map((item: any) => ({
      ...item,
      media_type: item.media_type || (type === 'all' ? 'movie' : type),
    }));
  },

  // Popular
  getPopularMovies: async (page = 1): Promise<MediaItem[]> => {
    const res = await api.get('/movie/popular', { params: { page } });
    return res.data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
  },
  getPopularTv: async (page = 1): Promise<MediaItem[]> => {
    const res = await api.get('/tv/popular', { params: { page } });
    return res.data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
  },

  // Top Rated
  getTopRatedMovies: async (page = 1): Promise<MediaItem[]> => {
    const res = await api.get('/movie/top_rated', { params: { page } });
    return res.data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
  },
  getTopRatedTv: async (page = 1): Promise<MediaItem[]> => {
    const res = await api.get('/tv/top_rated', { params: { page } });
    return res.data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
  },

  // By Genre
  getMoviesByGenre: async (genreId: number, page = 1): Promise<MediaItem[]> => {
    const res = await api.get('/discover/movie', {
      params: { with_genres: genreId, sort_by: 'popularity.desc', page },
    });
    return res.data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
  },
  getTvByGenre: async (genreId: number, page = 1): Promise<MediaItem[]> => {
    const res = await api.get('/discover/tv', {
      params: { with_genres: genreId, sort_by: 'popularity.desc', page },
    });
    return res.data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
  },

  // Details
  getMovieDetails: async (id: number | string): Promise<MediaItem> => {
    const res = await api.get(`/movie/${id}`);
    return { ...res.data, media_type: 'movie' };
  },
  getTvDetails: async (id: number | string): Promise<MediaItem> => {
    const res = await api.get(`/tv/${id}`);
    return { ...res.data, media_type: 'tv' };
  },

  // TV Seasons & Episodes
  getTvSeasonEpisodes: async (tvId: number | string, seasonNumber: number): Promise<Episode[]> => {
    const res = await api.get(`/tv/${tvId}/season/${seasonNumber}`);
    return res.data.episodes;
  },

  // Credits & Cast
  getCredits: async (type: 'movie' | 'tv', id: number | string): Promise<CastMember[]> => {
    const res = await api.get(`/${type}/${id}/credits`);
    return (res.data.cast || []).slice(0, 15);
  },

  // Videos / Trailers
  getVideos: async (type: 'movie' | 'tv', id: number | string): Promise<VideoTrailer[]> => {
    const res = await api.get(`/${type}/${id}/videos`);
    return res.data.results || [];
  },

  // Recommendations / Similar
  getSimilar: async (type: 'movie' | 'tv', id: number | string): Promise<MediaItem[]> => {
    const res = await api.get(`/${type}/${id}/recommendations`);
    return (res.data.results || []).map((item: any) => ({ ...item, media_type: type }));
  },

  // Search
  searchMulti: async (query: string, page = 1): Promise<MediaItem[]> => {
    if (!query.trim()) return [];
    const res = await api.get('/search/multi', { params: { query, page } });
    return (res.data.results || [])
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any) => ({ ...item, media_type: item.media_type }));
  },

  // Discover with Filters
  discover: async (
    type: 'movie' | 'tv',
    params: {
      genre?: string;
      year?: string;
      sortBy?: string;
      page?: number;
    }
  ): Promise<{ results: MediaItem[]; totalPages: number }> => {
    const apiParams: Record<string, any> = {
      page: params.page || 1,
      sort_by: params.sortBy || 'popularity.desc',
      'vote_count.gte': 50,
    };

    if (params.genre && params.genre !== 'all') {
      apiParams.with_genres = params.genre;
    }
    if (params.year && params.year !== 'all') {
      if (type === 'movie') {
        apiParams.primary_release_year = params.year;
      } else {
        apiParams.first_air_date_year = params.year;
      }
    }

    const res = await api.get(`/discover/${type}`, { params: apiParams });
    return {
      results: res.data.results.map((item: any) => ({ ...item, media_type: type })),
      totalPages: Math.min(res.data.total_pages || 1, 50),
    };
  },
};

