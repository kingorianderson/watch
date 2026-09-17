/**
 * Direct Stream Resolver Service powered by FebBox 4K Native VIP Engine & @movie-web/providers
 * Resolves ad-free, direct Native 4K & 1080p HLS streaming sources with multi-resolution switcher,
 * custom red scrubber, and WebVTT subtitles.
 */

import {
  buildProviders,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
  targets,
  type Stream,
  type ProviderControls,
} from '@movie-web/providers';
import { subtitleService } from './subtitleService';

export interface StreamQuality {
  label: string;
  shortLabel?: string;
  resolution?: number;
  url: string;
  isDefault?: boolean;
}

export interface SubtitleTrack {
  label: string;
  language: string;
  url: string;
  downloadUrl?: string;
  isDefault?: boolean;
}

export interface DirectStreamResult {
  title?: string;
  qualities: StreamQuality[];
  subtitles: SubtitleTrack[];
  sourceName: string;
}

const WORKER_ENDPOINT = 'https://febbox-resolver.kingzart254.workers.dev';
const CORS_PROXY_URL = `${WORKER_ENDPOINT}/?url=`;

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
   * Resolves direct HLS / MP4 stream sources from FebBox VIP Engine & fallback scraper cluster
   */
  async getDirectStream(
    tmdbId: number | string,
    type: 'movie' | 'tv',
    season: number = 1,
    episode: number = 1,
    title?: string,
    releaseYear?: number
  ): Promise<DirectStreamResult | null> {
    const isTv = type === 'tv';
    const cleanTitle = title || 'Media';
    const year = releaseYear || new Date().getFullYear();

    // 1. First Priority: Query Cloudflare Worker with FebBox 4K VIP Engine
    try {
      const queryParams = new URLSearchParams({
        title: cleanTitle,
        type: isTv ? 'tv' : 'movie',
        season: String(season),
        episode: String(episode),
        tmdbId: String(tmdbId),
        ...(year ? { year: String(year) } : {}),
      });

      const febboxPromise = fetch(`${WORKER_ENDPOINT}/?${queryParams.toString()}`, {
        headers: {
          Accept: 'application/json',
        },
      }).then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      });

      // 6-second timeout for FebBox resolution
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
      const febboxData: any = await Promise.race([febboxPromise, timeoutPromise]);

      if (febboxData && febboxData.success && Array.isArray(febboxData.qualities) && febboxData.qualities.length > 0) {
        const streamQualities: StreamQuality[] = febboxData.qualities.map((q: any) => ({
          label: q.label || '1080p (Full HD)',
          shortLabel: q.shortLabel || (q.label?.includes('4K') ? '4K' : q.label?.includes('720') ? '720p' : '1080p'),
          resolution: q.resolution || (q.label?.includes('4K') ? 2160 : q.label?.includes('720') ? 720 : 1080),
          url: q.url,
          isDefault: q.isDefault || false,
        }));

        // Sort descending by resolution (4K -> 1080p -> 720p -> 480p -> 360p)
        streamQualities.sort((a, b) => (b.resolution || 0) - (a.resolution || 0));

        // Ensure at least one default
        if (!streamQualities.some((q) => q.isDefault)) {
          const defaultChoice =
            streamQualities.find((q) => q.shortLabel === '1080p') ||
            streamQualities.find((q) => q.shortLabel === '4K') ||
            streamQualities[0];
          if (defaultChoice) defaultChoice.isDefault = true;
        }

        let subtitles: SubtitleTrack[] = Array.isArray(febboxData.subtitles)
          ? febboxData.subtitles.map((s: any) => ({
              label: s.label || s.language || 'English',
              language: s.language || 'en',
              url: s.url,
              isDefault: s.isDefault || false,
            }))
          : [];

        // Fallback to subtitleService if worker returned no subtitles
        if (subtitles.length === 0) {
          try {
            subtitles = await subtitleService.getSubtitles(cleanTitle, isTv ? 'tv' : 'movie', season, episode, year);
          } catch (subErr) {
            console.warn('Subtitle fallback error:', subErr);
          }
        }

        return {
          title: febboxData.title || cleanTitle,
          qualities: streamQualities,
          subtitles,
          sourceName: 'FebBox 4K VIP (Zero Ads)',
        };
      }
    } catch (workerErr) {
      console.warn('FebBox Worker resolver error, falling back to @movie-web scraper:', workerErr);
    }

    // 2. Second Priority: Fallback to @movie-web/providers scraper cluster
    try {
      const runner = getProviderRunner();

      if (runner) {
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

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
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

          let subtitles: SubtitleTrack[] = (stream.captions || []).map((c) => ({
            label: `${c.language.toUpperCase()} ${c.type ? `[${c.type.toUpperCase()}]` : ''}`,
            language: c.language,
            url: c.url,
            isDefault: c.language.toLowerCase().startsWith('en'),
          }));

          // Fallback to subtitleService if scraper cluster returned no captions
          if (subtitles.length === 0) {
            try {
              subtitles = await subtitleService.getSubtitles(cleanTitle, isTv ? 'tv' : 'movie', season, episode, year);
            } catch (subErr) {
              console.warn('Subtitle fallback error for scraper cluster:', subErr);
            }
          }

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
