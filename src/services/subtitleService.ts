/**
 * Multi-Language Subtitle Resolver Service
 * Queries OpenSubtitles REST API with fallback cascade and provides
 * on-the-fly WebVTT decompression, blob URL conversion, and structured cue parsing.
 */

import type { SubtitleTrack } from './directStreamService';

const WORKER_ENDPOINT = 'https://febbox-resolver.kingzart254.workers.dev';
const vttBlobCache = new Map<string, string>();
const cueCache = new Map<string, SubtitleCue[]>();

export interface SubtitleCue {
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  lines: string[];
}

export function cleanSubtitleLine(line: string): string {
  if (!line) return '';
  return line
    .replace(/<[^>]+>/g, '') // remove HTML tags (<i>, <font>, <b>, etc.)
    .replace(/\{[^}]+\}/g, '') // remove ASS/SSA style tags ({\an8}, {\pos}, etc.)
    .trim();
}

export function parseSubtitleCues(rawText: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const clean = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = clean.split(/\n\s*\n/);

  for (const block of blocks) {
    const rawLines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (rawLines.length < 2) continue;

    let timeLineIdx = -1;
    for (let i = 0; i < rawLines.length; i++) {
      if (rawLines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1) continue;

    const timeLine = rawLines[timeLineIdx];
    const match = timeLine.match(
      /(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/
    );
    if (!match) continue;

    const parseSeconds = (hrs: string | undefined, mins: string, secs: string, ms: string) => {
      const h = hrs ? parseInt(hrs.replace(':', ''), 10) : 0;
      const m = parseInt(mins, 10);
      const s = parseInt(secs, 10);
      const milli = parseInt(ms, 10);
      return h * 3600 + m * 60 + s + milli / 1000;
    };

    const start = parseSeconds(match[1], match[2], match[3], match[4]);
    const end = parseSeconds(match[5], match[6], match[7], match[8]);

    const contentLines = rawLines
      .slice(timeLineIdx + 1)
      .map(cleanSubtitleLine)
      .filter((l) => Boolean(l) && !/^\d+$/.test(l));

    if (contentLines.length > 0) {
      cues.push({
        start,
        end,
        text: contentLines.join('\n'),
        lines: contentLines,
      });
    }
  }

  // Sort ascending by timestamp
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

/**
 * Decompresses GZIP / reads raw text and converts SRT to clean WebVTT blob URL
 */
export async function convertSrtToVttBlob(downloadUrl: string): Promise<string> {
  if (vttBlobCache.has(downloadUrl)) {
    return vttBlobCache.get(downloadUrl)!;
  }

  try {
    let res: Response;
    // 1. Try direct fetch
    try {
      res = await fetch(downloadUrl, {
        headers: {
          Accept: '*/*',
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

    // Cache cues for custom renderer
    const cues = parseSubtitleCues(text);
    if (cues.length > 0) {
      cueCache.set(downloadUrl, cues);
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
    if (cues.length > 0) {
      cueCache.set(blobUrl, cues);
    }
    return blobUrl;
  } catch (err) {
    console.warn('VTT conversion error for URL:', downloadUrl, err);
    const emptyBlob = new Blob(['WEBVTT\n\n'], { type: 'text/vtt;charset=utf-8' });
    return URL.createObjectURL(emptyBlob);
  }
}

/**
 * Fetches and parses structured subtitle cues for custom rendering
 */
export async function fetchSubtitleCues(urlOrDownloadUrl: string): Promise<SubtitleCue[]> {
  if (cueCache.has(urlOrDownloadUrl)) {
    return cueCache.get(urlOrDownloadUrl)!;
  }

  try {
    let text = '';
    if (urlOrDownloadUrl.startsWith('blob:')) {
      const res = await fetch(urlOrDownloadUrl);
      text = await res.text();
    } else {
      let res: Response;
      try {
        res = await fetch(urlOrDownloadUrl, { headers: { Accept: '*/*' } });
        if (!res.ok) throw new Error();
      } catch (_) {
        const proxyUrl = `${WORKER_ENDPOINT}/?url=${encodeURIComponent(urlOrDownloadUrl)}`;
        res = await fetch(proxyUrl);
      }

      const buffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      if (uint8.length >= 2 && uint8[0] === 0x1f && uint8[1] === 0x8b) {
        if (typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('gzip');
          const stream = new Response(buffer).body?.pipeThrough(ds);
          text = stream ? await new Response(stream).text() : new TextDecoder('utf-8').decode(buffer);
        } else {
          text = new TextDecoder('utf-8').decode(buffer);
        }
      } else {
        text = new TextDecoder('utf-8').decode(buffer);
      }
    }

    const cues = parseSubtitleCues(text);
    cueCache.set(urlOrDownloadUrl, cues);
    return cues;
  } catch (err) {
    console.warn('Failed to parse subtitle cues:', err);
    return [];
  }
}

async function queryOpenSubtitles(querySlug: string): Promise<any[]> {
  const osUrl = `https://rest.opensubtitles.org/search/query-${querySlug}`;
  const proxyUrl = `${WORKER_ENDPOINT}/?url=${encodeURIComponent(osUrl)}`;

  // 1. Try via Cloudflare Worker proxy
  try {
    const res = await fetch(proxyUrl, {
      headers: {
        Accept: 'application/json',
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
        Accept: 'application/json',
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
      if (
        !rawTitle ||
        rawTitle.toLowerCase() === 'loading...' ||
        rawTitle.toLowerCase() === 'loading' ||
        rawTitle.toLowerCase() === 'stream'
      ) {
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
          convertSrtToVttBlob(sub.downloadUrl)
            .then((blobUrl) => {
              sub.url = blobUrl;
            })
            .catch(() => {});
        }
      }

      return subtitles;
    } catch (err) {
      console.warn('Subtitle service error:', err);
      return [];
    }
  },
};
