export interface StreamServer {
  id: string;
  name: string;
  badge?: string;
  getMovieUrl: (tmdbId: number | string) => string;
  getTvUrl: (tmdbId: number | string, season: number, episode: number) => string;
}

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidlink',
    name: 'Server 1 (VidLink)',
    badge: '⚡ Low Ads / Fast',
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=ef4444&secondaryColor=18181b`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=ef4444&secondaryColor=18181b`,
  },
  {
    id: 'embed-su',
    name: 'Server 2 (Embed.su)',
    badge: '🌟 1080p / Subtitles',
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'autoembed',
    name: 'Server 3 (AutoEmbed)',
    badge: '🚀 High Speed',
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'vidsrc-cc',
    name: 'Server 4 (VidSrc CC)',
    badge: 'Multi-Source',
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'multiembed',
    name: 'Server 5 (SuperEmbed)',
    badge: 'Global Mirror',
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    id: 'vidsrc-xyz',
    name: 'Server 6 (VidSrc PRO)',
    badge: 'Backup',
    getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
];
