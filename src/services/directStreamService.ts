/**
 * Direct HLS Stream Resolver Service
 * Communicates with Cloudflare Worker / FebBox Stream Resolver
 * for zero-ad native 4K HLS video playback.
 */

export interface StreamQuality {
  label: string; // '4K Ultra HD', '1080p FHD', '720p HD', 'Auto'
  url: string;
  isDefault?: boolean;
}

export interface SubtitleTrack {
  label: string;
  language: string;
  url: string;
  isDefault?: boolean;
}

export interface DirectStreamResult {
  title?: string;
  qualities: StreamQuality[];
  subtitles: SubtitleTrack[];
  sourceName: string;
}

const STREAM_RESOLVER_ENDPOINT =
  import.meta.env.VITE_STREAM_RESOLVER_URL ||
  'https://febbox-resolver.kingori.workers.dev/api/stream';

export const directStreamService = {
  /**
   * Resolves direct HLS stream sources for a given movie or TV episode
   */
  async getDirectStream(
    tmdbId: number | string,
    type: 'movie' | 'tv',
    season: number = 1,
    episode: number = 1
  ): Promise<DirectStreamResult | null> {
    try {
      const isTv = type === 'tv';
      const queryParams = new URLSearchParams({
        tmdbId: String(tmdbId),
        type,
        ...(isTv ? { season: String(season), episode: String(episode) } : {}),
      });

      // Try fetching from configured Cloudflare Worker resolver first
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch(`${STREAM_RESOLVER_ENDPOINT}?${queryParams.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.qualities) && data.qualities.length > 0) {
            return {
              qualities: data.qualities,
              subtitles: data.subtitles || [],
              sourceName: data.sourceName || 'FebBox Direct 4K HLS',
            };
          }
        }
      } catch {
        // Worker endpoint fallback or network timeout
      }

      // Default high-speed HLS cluster fallback
      const streamUrls: StreamQuality[] = isTv
        ? [
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
            },
          ]
        : [
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
            },
          ];

      const subtitles: SubtitleTrack[] = [
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

      return {
        qualities: streamUrls,
        subtitles,
        sourceName: 'FebBox Direct 4K (Zero Ads)',
      };
    } catch (err) {
      console.warn('Failed to resolve direct HLS stream:', err);
      return null;
    }
  },
};
