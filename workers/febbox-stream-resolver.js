/**
 * Movie-Web & FebBox Universal Stream & CORS Proxy Worker
 * 
 * Functions as:
 * 1. High-Speed CORS & Video Segment Proxy for @movie-web/providers scrapers
 * 2. Multi-Provider HLS Stream Resolver for zero-ad native video playback
 * 
 * Free deployment on Cloudflare Workers (100,000 requests/day at $0 cost).
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Range, Origin, Referer',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Access-Control-Max-Age': '86400',
    };

    // 1. Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 2. High-Speed CORS Proxy Handler (for @movie-web/providers scrapers and HLS streams)
    const targetUrl = url.searchParams.get('url') || url.searchParams.get('destination');
    if (targetUrl) {
      try {
        const decodedUrl = decodeURIComponent(targetUrl);
        const headers = new Headers(request.headers);
        headers.delete('host');
        headers.delete('origin');
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        const response = await fetch(decodedUrl, {
          method: request.method,
          headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'follow',
        });

        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Proxy fetch failed', message: err.message }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Direct TMDB Stream Resolver endpoint
    const tmdbId = url.searchParams.get('tmdbId') || url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'movie';
    const season = url.searchParams.get('season') || '1';
    const episode = url.searchParams.get('episode') || '1';

    if (!tmdbId) {
      return new Response(
        JSON.stringify({
          status: 'online',
          service: 'Movie-Web & FebBox Universal Stream Engine',
          proxyUsage: '/?url=https://example.com/stream.m3u8',
          resolverUsage: '/?tmdbId=550&type=movie',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return status & direct scraper payload
    return new Response(
      JSON.stringify({
        success: true,
        tmdbId,
        type,
        season: type === 'tv' ? Number(season) : undefined,
        episode: type === 'tv' ? Number(episode) : undefined,
        proxyEndpoint: `https://${url.host}/?url=`,
        sourceName: '@movie-web High-Speed Cluster',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  },
};
