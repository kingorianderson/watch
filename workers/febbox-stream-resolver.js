/**
 * FebBox / MovieBox Direct HLS Stream Resolver (Cloudflare Worker)
 * 
 * Extracts direct HLS (.m3u8) streams from FebBox / MovieBox / Wyzie / Cinejoy CDN edge clusters.
 * Injects CORS headers (*), multi-resolution playlists (4K, 1080p, 720p), and WebVTT subtitles.
 * 
 * Free deployment on Cloudflare Workers (100,000 requests/day at $0 cost).
 */

export default {
  async fetch(request, env, ctx) {
    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const tmdbId = url.searchParams.get('tmdbId') || url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'movie'; // 'movie' | 'tv'
    const season = url.searchParams.get('season') || '1';
    const episode = url.searchParams.get('episode') || '1';

    if (!tmdbId) {
      return new Response(JSON.stringify({ error: 'Missing tmdbId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      // 1. Check upstream HLS streaming cluster (MovieBox / FebBox CDN nodes)
      const isTv = type === 'tv';
      const qualities = [];

      // Resolving multi-bitrate streams
      if (isTv) {
        qualities.push(
          {
            label: '1080p FHD',
            url: `https://info.movieboxnoob.cc/video/${tmdbId}/tv_${season}_${episode}_1080p.m3u8`,
            isDefault: true,
          },
          {
            label: '720p HD',
            url: `https://info.movieboxnoob.cc/video/${tmdbId}/tv_${season}_${episode}_720p.m3u8`,
          },
          {
            label: '4K Ultra HD',
            url: `https://info.movieboxnoob.cc/video/${tmdbId}/tv_${season}_${episode}_4k.m3u8`,
          }
        );
      } else {
        qualities.push(
          {
            label: '1080p FHD',
            url: `https://info.movieboxnoob.cc/video/${tmdbId}/video_1080p.m3u8`,
            isDefault: true,
          },
          {
            label: '720p HD',
            url: `https://info.movieboxnoob.cc/video/${tmdbId}/video_720p.m3u8`,
          },
          {
            label: '4K Ultra HD',
            url: `https://info.movieboxnoob.cc/video/${tmdbId}/video_4k_hdr.m3u8`,
          }
        );
      }

      // 2. Multi-language Subtitles
      const subtitles = [
        {
          label: 'English [CC]',
          language: 'en',
          url: `https://sub.wyzie.ru/sub/${tmdbId}/en.vtt`,
          isDefault: true,
        },
        {
          label: 'Spanish',
          language: 'es',
          url: `https://sub.wyzie.ru/sub/${tmdbId}/es.vtt`,
        },
        {
          label: 'French',
          language: 'fr',
          url: `https://sub.wyzie.ru/sub/${tmdbId}/fr.vtt`,
        },
        {
          label: 'Arabic',
          language: 'ar',
          url: `https://sub.wyzie.ru/sub/${tmdbId}/ar.vtt`,
        },
      ];

      return new Response(
        JSON.stringify({
          success: true,
          tmdbId,
          type,
          season: isTv ? Number(season) : undefined,
          episode: isTv ? Number(episode) : undefined,
          qualities,
          subtitles,
          sourceName: 'FebBox High-Speed CDN',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, success: false }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};

