import { PREVIEW_THRESHOLD_SECONDS } from '../utils/historyHelpers';

export interface StreamServer {
  id: string;
  name: string;
  badge?: string;
  isNativeHls?: boolean;
  getMovieUrl: (tmdbId: number | string, startAt?: number) => string;
  getTvUrl: (tmdbId: number | string, season: number, episode: number, startAt?: number) => string;
}

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'direct-hls',
    name: 'Server 1 (Direct 4K)',
    badge: '👑 Zero Ads / 4K Player',
    isNativeHls: true,
    getMovieUrl: (id) => `https://vidsrc.stream/hls/movie/${id}/master.m3u8`,
    getTvUrl: (id, s, e) => `https://vidsrc.stream/hls/tv/${id}/${s}/${e}/master.m3u8`,
  },
  {
    id: 'vidlink',
    name: 'Server 2 (VidLink)',
    badge: '⚡ Low Ads / Auto-Resume',
    getMovieUrl: (id, startAt) =>
      `https://vidlink.pro/movie/${id}?primaryColor=ef4444&secondaryColor=18181b${
        startAt && startAt > PREVIEW_THRESHOLD_SECONDS ? `&startAt=${Math.floor(startAt)}` : ''
      }`,
    getTvUrl: (id, s, e, startAt) =>
      `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=ef4444&secondaryColor=18181b${
        startAt && startAt > PREVIEW_THRESHOLD_SECONDS ? `&startAt=${Math.floor(startAt)}` : ''
      }`,
  },
  {
    id: 'embed-su',
    name: 'Server 3 (Embed.su)',
    badge: '🌟 1080p / Subtitles',
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'videasy',
    name: 'Server 4 (Videasy)',
    badge: '🚀 Ultra Fast',
    getMovieUrl: (id) => `https://player.videasy.net/movie/${id}?color=ef4444`,
    getTvUrl: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}?color=ef4444`,
  },
  {
    id: 'autoembed',
    name: 'Server 5 (AutoEmbed)',
    badge: '⚡ High Speed',
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'smashystream',
    name: 'Server 6 (Smashy)',
    badge: '🍿 Anime & Multi-Lang',
    getMovieUrl: (id) => `https://player.smashystream.com/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.smashystream.com/tv/${id}/${s}/${e}`,
  },
  {
    id: 'vidsrc-cc',
    name: 'Server 7 (VidSrc CC)',
    badge: 'Multi-Source',
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'twoembed',
    name: 'Server 8 (2Embed)',
    badge: '📼 Deep Archive',
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: 'moviesapi',
    name: 'Server 9 (MoviesAPI)',
    badge: 'HD Mirror',
    getMovieUrl: (id) => `https://moviesapi.club/movie/${id}`,
    getTvUrl: (id, s, e) => `https://moviesapi.club/tv/${id}-${s}-${e}`,
  },
  {
    id: 'multiembed',
    name: 'Server 10 (SuperEmbed)',
    badge: 'Global Mirror',
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    id: 'vidsrc-xyz',
    name: 'Server 11 (VidSrc PRO)',
    badge: 'Backup',
    getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
];
