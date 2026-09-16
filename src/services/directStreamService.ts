/**
 * Direct Stream Resolver Service powered by @movie-web/providers
 * Scrapes 15+ streaming hosts in parallel (FlixHQ, VidCloud, Showbox, Smashy, SuperStream, etc.)
 * with zero third-party ads, multi-resolution streams (4K, 1080p, 720p), and WebVTT subtitles.
 */

import {
  buildProviders,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
  targets,
  type Stream,
  type ProviderControls,
} from '@movie-web/providers';

export interface StreamQuality {
  label: string;
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

const CORS_PROXY_URL =
  import.meta.env.VITE_STREAM_PROXY_URL ||
  'https://febbox-resolver.kingzart254.workers.dev/?url=';

// Cached initialized provider runner
let providerRunner: ProviderControls | null = null;

function getProviderRunner() {
  if (!providerRunner) {
    try {
      providerRunner = buildProviders()
        .setTarget(targets.BROWSER)
        .setFetcher(makeStandardFetcher(fetch))
        .setProxiedFetcher(makeSimpleProxyFetcher(CORS_PROXY_URL, fetch))
        .addBuiltinProviders()
        .build();
    } catch (err) {
      console.warn('Failed to build @movie-web/providers runner:', err);
    }
  }
  return providerRunner;
}

export const directStreamService = {
  /**
   * Resolves direct HLS / MP4 stream sources across 15+ providers in parallel
   */
  async getDirectStream(
    tmdbId: number | string,
    type: 'movie' | 'tv',
    season: number = 1,
    episode: number = 1,
    title?: string,
    releaseYear?: number
  ): Promise<DirectStreamResult | null> {
    try {
      const runner = getProviderRunner();
      const isTv = type === 'tv';
      const cleanTitle = title || 'Media';
      const year = releaseYear || new Date().getFullYear();

      if (runner) {
        // Scrape movie or show using @movie-web/providers
        const scrapePromise = isTv
          ? runner.runAll({
              media: {
                type: 'show',
                title: cleanTitle,
                releaseYear: year,
                tmdbId: String(tmdbId),
                season: { number: season, tmdbId: String(tmdbId) },
                episode: { number: episode, tmdbId: String(tmdbId) },
              },
            })
          : runner.runAll({
              media: {
                type: 'movie',
                title: cleanTitle,
                releaseYear: year,
                tmdbId: String(tmdbId),
              },
            });

        // Timeout race to prevent long hangs (max 7 seconds for scraper resolution)
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000));
        const output = await Promise.race([scrapePromise, timeoutPromise]);

        if (output && output.stream) {
          const stream: Stream = output.stream;
          const qualities: StreamQuality[] = [];

          if (stream.type === 'hls') {
            qualities.push({
              label: 'Auto (1080p Adaptive HLS)',
              url: stream.playlist,
              isDefault: true,
            });
          } else if (stream.type === 'file') {
            const sortedKeys = Object.keys(stream.qualities).sort((a, b) => {
              const order = ['4k', '1080', '720', '480', '360', 'unknown'];
              return order.indexOf(a) - order.indexOf(b);
            });

            for (const q of sortedKeys) {
              const file = stream.qualities[q as keyof typeof stream.qualities];
              if (file && file.url) {
                const label = q === '4k' ? '4K Ultra HD' : `${q}p HD`;
                qualities.push({
                  label,
                  url: file.url,
                  isDefault: q === '1080' || q === '720',
                });
              }
            }
          }

          const subtitles: SubtitleTrack[] = (stream.captions || []).map((c) => ({
            label: `${c.language.toUpperCase()} ${c.type ? `[${c.type.toUpperCase()}]` : ''}`,
            language: c.language,
            url: c.url,
            isDefault: c.language.toLowerCase().startsWith('en'),
          }));

          if (qualities.length > 0) {
            return {
              title: cleanTitle,
              qualities,
              subtitles,
              sourceName: output.sourceId ? `${output.sourceId.toUpperCase()} (Zero Ads)` : '@movie-web',
            };
          }
        }
      }

      return null;
    } catch (err) {
      console.warn('Scraper runner error:', err);
      return null;
    }
  },
};
