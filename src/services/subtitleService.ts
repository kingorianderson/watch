/**
 * Multi-Language Subtitle Resolver Service
 * Queries OpenSubtitles REST API with fallback cascade and provides
 * on-the-fly WebVTT decompression and blob URL conversion.
 */

import type { SubtitleTrack } from './directStreamService';

const WORKER_ENDPOINT = 'https://febbox-resolver.kingzart254.workers.dev';
const vttBlobCache = new Map<string, string>();

/**
 * Decompresses GZIP / reads raw text and converts SRT to clean WebVTT blob URL
 */
export async function convertSrtToVttBlob(downloadUrl: string): Promise<string> {
  if (vttBlobCache.has(downloadUrl)) {
    return vttBlobCache.get(downloadUrl)!;
  }

  try {
    let res: Response;
    // 1. Try direct fetch (dl.opensubtitles.org sends access-control-allow-origin: *)
    try {
      res = await fetch(downloadUrl, {
        headers: {
          'Accept': '*/*',
        },
      });
      if (!res.ok) throw new Error(`Direct status: ${res.status}`);
    } catch (_) {
      // 2. Fallback to Cloudflare Worker proxy
      const proxyUrl = `${WORKER_ENDPOINT}/?url=${encodeURIComponent(downloadUrl)}`;
      res = await fetch(proxyUrl);
    }

    if (!res.ok) throw new Error(`Failed to load subtitle file`);

    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let text = '';

    if (uint8.length >= 2 && uint8[0] === 0x1f && uint8[1] === 0x8b) {
      // Gzip compressed from OpenSubtitles
      try {
        if (typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('gzip');
          const stream = new Response(buffer).body?.pipeThrough(ds);
          if (stream) {
            text = await new Response(stream).text();
          } else {
            text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          }
        } else {
          text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        }
      } catch (decompErr) {
        text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      }
    } else {
      text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    }

    // Convert SRT timestamp format (00:00:00,000) to WebVTT format (00:00:00.000)
    let vtt = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

    if (!vtt.startsWith('WEBVTT')) {
      vtt = 'WEBVTT\n\n' + vtt;
    }

    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    vttBlobCache.set(downloadUrl, blobUrl);
    return blobUrl;
  } catch (err) {
    console.warn('VTT conversion error for URL:', downloadUrl, err);
    const emptyBlob = new Blob(['WEBVTT\n\n'], { type: 'text/vtt;charset=utf-8' });
    return URL.createObjectURL(emptyBlob);
  }
}

async function queryOpenSubtitles(querySlug: string): Promise<any[]> {
  const osUrl = `https://rest.opensubtitles.org/search/query-${querySlug}`;
  const proxyUrl = `${WORKER_ENDPOINT}/?url=${encodeURIComponent(osUrl)}`;

  // 1. Try via Cloudflare Worker proxy
  try {
    const res = await fetch(proxyUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (_) {}

  // 2. Try direct fetch
  try {
    const res = await fetch(osUrl, {
      headers: {
        'User-Agent': 'VLCMediaPlayer 3.0.18',
        'Accept': 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (_) {}

  return [];
}

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
      const rawTitle = (title || '').trim();
      if (!rawTitle || rawTitle.toLowerCase() === 'loading...' || rawTitle.toLowerCase() === 'loading' || rawTitle.toLowerCase() === 'stream') {
        return [];
      }

      // Format clean query separated by '+' to prevent double encoding issues
      const cleanSlug = rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '+')
        .replace(/^\+|\+$/g, '');

      if (!cleanSlug) return [];

      const isTv = type === 'tv';
      const querySlugs: string[] = [];

      if (isTv) {
        const sPad = String(season).padStart(2, '0');
        const ePad = String(episode).padStart(2, '0');
        querySlugs.push(`${cleanSlug}+s${sPad}e${ePad}`);
        querySlugs.push(`${cleanSlug}+season+${season}+episode+${episode}`);
        querySlugs.push(cleanSlug);
      } else {
        if (year) {
          querySlugs.push(`${cleanSlug}+${year}`);
        }
        querySlugs.push(cleanSlug);
      }

      let rawData: any[] = [];
      for (const slug of querySlugs) {
        rawData = await queryOpenSubtitles(slug);
        if (rawData.length > 0) break;
      }

      if (rawData.length === 0) return [];

      const languageMap = new Map<string, SubtitleTrack>();

      for (const sub of rawData) {
        if (!sub.SubDownloadLink) continue;
        const langName = sub.LanguageName || 'English';
        const langIso = (sub.SubLanguageID || sub.ISO639 || 'en').toLowerCase();

        if (!languageMap.has(langIso)) {
          languageMap.set(langIso, {
            label: langName,
            language: langIso,
            url: sub.SubDownloadLink,
            downloadUrl: sub.SubDownloadLink,
            isDefault: langIso === 'eng' || langIso === 'en',
          });
        }
      }

      const subtitles = Array.from(languageMap.values());
      // Sort English first, then alphabetical by language label
      subtitles.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.label.localeCompare(b.label);
      });

      // Pre-convert top subtitles (English, etc.) to WebVTT blobs in background for instantaneous playback
      for (const sub of subtitles.slice(0, 3)) {
        if (sub.downloadUrl) {
          convertSrtToVttBlob(sub.downloadUrl).then((blobUrl) => {
            sub.url = blobUrl;
          }).catch(() => {});
        }
      }

      return subtitles;
    } catch (err) {
      console.warn('Subtitle service error:', err);
      return [];
    }
  },
};
