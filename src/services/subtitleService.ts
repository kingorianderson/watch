/**
 * Multi-Language Subtitle Resolver Service
 * Queries OpenSubtitles REST API through the Cloudflare proxy and converts subtitles to WebVTT.
 */

import type { SubtitleTrack } from './directStreamService';

const WORKER_ENDPOINT = 'https://febbox-resolver.kingzart254.workers.dev';

export const subtitleService = {
  /**
   * Fetch multi-language subtitles for a movie or TV episode
   */
  async getSubtitles(
    title: string,
    type: 'movie' | 'tv' = 'movie',
    season: number = 1,
    episode: number = 1,
    year?: number
  ): Promise<SubtitleTrack[]> {
    try {
      const cleanTitle = (title || '').trim();
      if (!cleanTitle) return [];

      const isTv = type === 'tv';
      let searchParam = '';

      if (isTv) {
        const sPad = String(season).padStart(2, '0');
        const ePad = String(episode).padStart(2, '0');
        searchParam = `query-${encodeURIComponent(`${cleanTitle} s${sPad}e${ePad}`)}`;
      } else {
        searchParam = `query-${encodeURIComponent(`${cleanTitle} ${year || ''}`.trim())}`;
      }

      const osUrl = `https://rest.opensubtitles.org/search/${searchParam}`;
      const proxyUrl = `${WORKER_ENDPOINT}/?url=${encodeURIComponent(osUrl)}`;

      const res = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return [];

      const languageMap = new Map<string, SubtitleTrack>();

      for (const sub of data) {
        if (!sub.SubDownloadLink) continue;
        const langName = sub.LanguageName || 'English';
        const langIso = (sub.SubLanguageID || sub.ISO639 || 'en').toLowerCase();

        if (!languageMap.has(langIso)) {
          const vttUrl = `${WORKER_ENDPOINT}/?sub_url=${encodeURIComponent(sub.SubDownloadLink)}`;
          languageMap.set(langIso, {
            label: langName,
            language: langIso,
            url: vttUrl,
            isDefault: langIso === 'eng' || langIso === 'en',
          });
        }
      }

      const subtitles = Array.from(languageMap.values());
      subtitles.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.label.localeCompare(b.label);
      });

      return subtitles;
    } catch (err) {
      console.warn('Subtitle service error:', err);
      return [];
    }
  },
};
