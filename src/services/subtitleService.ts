/**
 * Multi-Language Subtitle Resolver Service
 * Queries Stremio OpenSubtitles v3 & OpenSubtitles REST API with fallback cascade
 * Provides on-the-fly WebVTT decompression, blob URL conversion, and high-performance structured cue parsing.
 */

import type { SubtitleTrack } from './directStreamService';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'e72a65315316bb3693595b379ad9c1f5';
const WORKER_ENDPOINT = 'https://febbox-resolver.kingzart254.workers.dev';

const vttBlobCache = new Map<string, string>();
const cueCache = new Map<string, SubtitleCue[]>();
const imdbCache = new Map<string, string>();

export interface SubtitleCue {
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  lines: string[];
}

export const LANGUAGE_DICTIONARY: Record<string, string> = {
  eng: 'English',
  en: 'English',
  spa: 'Spanish',
  es: 'Spanish',
  fre: 'French',
  fra: 'French',
  fr: 'French',
  ger: 'German',
  deu: 'German',
  de: 'German',
  ita: 'Italian',
  it: 'Italian',
  por: 'Portuguese',
  pt: 'Portuguese',
  pob: 'Portuguese (BR)',
  'pt-br': 'Portuguese (BR)',
  ara: 'Arabic',
  ar: 'Arabic',
  rus: 'Russian',
  ru: 'Russian',
  hin: 'Hindi',
  hi: 'Hindi',
  chi: 'Chinese',
  zho: 'Chinese',
  zh: 'Chinese',
  zht: 'Chinese (Trad)',
  jpn: 'Japanese',
  ja: 'Japanese',
  kor: 'Korean',
  ko: 'Korean',
  ind: 'Indonesian',
  id: 'Indonesian',
  tur: 'Turkish',
  tr: 'Turkish',
  pol: 'Polish',
  pl: 'Polish',
  dut: 'Dutch',
  nld: 'Dutch',
  nl: 'Dutch',
  swe: 'Swedish',
  sv: 'Swedish',
  nor: 'Norwegian',
  no: 'Norwegian',
  dan: 'Danish',
  da: 'Danish',
  fin: 'Finnish',
  fi: 'Finnish',
  gre: 'Greek',
  ell: 'Greek',
  el: 'Greek',
  heb: 'Hebrew',
  he: 'Hebrew',
  tha: 'Thai',
  th: 'Thai',
  vie: 'Vietnamese',
  vi: 'Vietnamese',
  fil: 'Filipino',
  tl: 'Tagalog',
  tgl: 'Tagalog',
  cze: 'Czech',
  cs: 'Czech',
  ces: 'Czech',
  hun: 'Hungarian',
  hu: 'Hungarian',
  rum: 'Romanian',
  ron: 'Romanian',
  ro: 'Romanian',
  bul: 'Bulgarian',
  bg: 'Bulgarian',
  ukr: 'Ukrainian',
  uk: 'Ukrainian',
  hrv: 'Croatian',
  hr: 'Croatian',
  srp: 'Serbian',
  sr: 'Serbian',
  slv: 'Slovenian',
  sl: 'Slovenian',
  slo: 'Slovak',
  sk: 'Slovak',
  slk: 'Slovak',
  tam: 'Tamil',
  ta: 'Tamil',
  tel: 'Telugu',
  te: 'Telugu',
  mal: 'Malayalam',
  ml: 'Malayalam',
  afr: 'Afrikaans',
  af: 'Afrikaans',
  alb: 'Albanian',
  sq: 'Albanian',
  amh: 'Amharic',
  aze: 'Azerbaijani',
  az: 'Azerbaijani',
  ben: 'Bengali',
  bn: 'Bengali',
  bur: 'Burmese',
  my: 'Burmese',
  cat: 'Catalan',
  ca: 'Catalan',
  est: 'Estonian',
  et: 'Estonian',
  glg: 'Galician',
  gl: 'Galician',
  ice: 'Icelandic',
  is: 'Icelandic',
  isl: 'Icelandic',
  khm: 'Khmer',
  km: 'Khmer',
  lav: 'Latvian',
  lv: 'Latvian',
  lit: 'Lithuanian',
  lt: 'Lithuanian',
  mac: 'Macedonian',
  mk: 'Macedonian',
  may: 'Malay',
  ms: 'Malay',
  sin: 'Sinhala',
  si: 'Sinhala',
  swa: 'Swahili',
  sw: 'Swahili',
  urd: 'Urdu',
  ur: 'Urdu',
};

export function cleanSubtitleLine(line: string): string {
  if (!line) return '';
  return line
    .replace(/<[^>]+>/g, '') // remove HTML tags (<i>, <font>, <b>, etc.)
    .replace(/\{[^}]+\}/g, '') // remove ASS/SSA style tags ({\an8}, {\pos}, etc.)
    .trim();
}

/**
 * Parses raw WebVTT / SRT subtitle text into structured cue objects
 */
export function parseSubtitleCues(rawText: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  if (!rawText || typeof rawText !== 'string') return cues;

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
    // Supports: 00:01:23.456 --> 00:01:25.789, 01:23,456 --> 01:25,789, 00:01:23.45 --> 00:01:25.45, etc.
    const match = timeLine.match(
      /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})/
    );
    if (!match) continue;

    const parseSeconds = (hrs: string | undefined, mins: string, secs: string, ms: string) => {
      const h = hrs ? parseInt(hrs, 10) : 0;
      const m = parseInt(mins, 10);
      const s = parseInt(secs, 10);
      const milli = parseInt(ms.padEnd(3, '0').slice(0, 3), 10);
      return h * 3600 + m * 60 + s + milli / 1000;
    };

    const start = parseSeconds(match[1], match[2], match[3], match[4]);
    const end = parseSeconds(match[5], match[6], match[7], match[8]);

    const contentLines = rawLines
      .slice(timeLineIdx + 1)
      .map(cleanSubtitleLine)
      .filter((l) => Boolean(l) && !/^\d+$/.test(l));

    if (contentLines.length > 0 && end > start) {
      cues.push({
        start,
        end,
        text: contentLines.join('\n'),
        lines: contentLines,
      });
    }
  }

  // Sort ascending by start timestamp
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

/**
 * Resolves TMDB ID to IMDb ID for high-accuracy subtitle lookups
 */
export async function getImdbIdFromTmdb(
  tmdbId: number | string,
  type: 'movie' | 'tv' = 'movie'
): Promise<string | null> {
  if (!tmdbId) return null;
  const key = `${type}_${tmdbId}`;
  if (imdbCache.has(key)) return imdbCache.get(key)!;

  try {
    if (String(tmdbId).startsWith('tt')) {
      imdbCache.set(key, String(tmdbId));
      return String(tmdbId);
    }

    const url =
      type === 'tv'
        ? `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`
        : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const imdbId = data.imdb_id || null;
    if (imdbId) {
      imdbCache.set(key, imdbId);
    }
    return imdbId;
  } catch {
    return null;
  }
}

/**
 * Decompresses GZIP / reads raw text and converts SRT to clean WebVTT blob URL
 */
export async function convertSrtToVttBlob(downloadUrl: string): Promise<string> {
  if (vttBlobCache.has(downloadUrl)) {
    return vttBlobCache.get(downloadUrl)!;
  }

  try {
    let text = '';
    // 1. Fetch subtitle file
    try {
      const res = await fetch(downloadUrl, { headers: { Accept: '*/*' } });
      if (res.ok) {
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
      } else {
        throw new Error(`Direct status: ${res.status}`);
      }
    } catch (_) {
      // 2. Fallback to Worker Subtitle Proxy
      const proxyUrl = `${WORKER_ENDPOINT}/?sub_url=${encodeURIComponent(downloadUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        text = await res.text();
      }
    }

    if (!text) {
      throw new Error('Empty subtitle response');
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
      try {
        const res = await fetch(urlOrDownloadUrl, { headers: { Accept: '*/*' } });
        if (res.ok) {
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
        } else {
          throw new Error();
        }
      } catch (_) {
        const proxyUrl = `${WORKER_ENDPOINT}/?sub_url=${encodeURIComponent(urlOrDownloadUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          text = await res.text();
        }
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

export const subtitleService = {
  /**
   * Fetch multi-language subtitles for a movie or TV episode using Stremio OpenSubtitles v3 & fallback cascade
   */
  async getSubtitles(
    title: string,
    type: 'movie' | 'tv' = 'movie',
    season: number = 1,
    episode: number = 1,
    year?: number,
    tmdbId?: number | string
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

      const isTv = type === 'tv';
      let subtitleTracks: SubtitleTrack[] = [];

      // 1. Primary High-Accuracy Provider: Stremio OpenSubtitles v3 via IMDb ID
      let imdbId: string | null = null;
      if (tmdbId) {
        imdbId = await getImdbIdFromTmdb(tmdbId, type);
      }

      if (imdbId) {
        try {
          const stremioUrl = isTv
            ? `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season}:${episode}.json`
            : `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;

          const res = await fetch(stremioUrl, { headers: { Accept: 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            const rawSubs = data?.subtitles || [];

            const langMap = new Map<string, SubtitleTrack>();
            for (const sub of rawSubs) {
              if (!sub.url) continue;
              const rawLang = (sub.lang || 'eng').toLowerCase();
              const langName = LANGUAGE_DICTIONARY[rawLang] || sub.lang || 'English';

              if (!langMap.has(rawLang)) {
                langMap.set(rawLang, {
                  label: langName,
                  language: rawLang,
                  url: sub.url,
                  downloadUrl: sub.url,
                  isDefault: rawLang === 'eng' || rawLang === 'en',
                });
              }
            }

            subtitleTracks = Array.from(langMap.values());
          }
        } catch (stremioErr) {
          console.warn('Stremio subtitle lookup error:', stremioErr);
        }
      }

      // 2. Fallback: Query OpenSubtitles via Cloudflare Worker proxy by title
      if (subtitleTracks.length === 0) {
        const cleanSlug = rawTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '+')
          .replace(/^\+|\+$/g, '');

        if (cleanSlug) {
          const querySlugs: string[] = [];
          if (isTv) {
            const sPad = String(season).padStart(2, '0');
            const ePad = String(episode).padStart(2, '0');
            querySlugs.push(`${cleanSlug}+s${sPad}e${ePad}`);
            querySlugs.push(cleanSlug);
          } else {
            if (year) querySlugs.push(`${cleanSlug}+${year}`);
            querySlugs.push(cleanSlug);
          }

          for (const slug of querySlugs) {
            try {
              const osUrl = `https://rest.opensubtitles.org/search/query-${slug}`;
              const proxyUrl = `${WORKER_ENDPOINT}/?url=${encodeURIComponent(osUrl)}`;
              const res = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                  const langMap = new Map<string, SubtitleTrack>();
                  for (const sub of data) {
                    if (!sub.SubDownloadLink) continue;
                    const langIso = (sub.SubLanguageID || sub.ISO639 || 'en').toLowerCase();
                    const langName = LANGUAGE_DICTIONARY[langIso] || sub.LanguageName || 'English';

                    if (!langMap.has(langIso)) {
                      langMap.set(langIso, {
                        label: langName,
                        language: langIso,
                        url: sub.SubDownloadLink,
                        downloadUrl: sub.SubDownloadLink,
                        isDefault: langIso === 'eng' || langIso === 'en',
                      });
                    }
                  }
                  subtitleTracks = Array.from(langMap.values());
                  if (subtitleTracks.length > 0) break;
                }
              }
            } catch (_) {}
          }
        }
      }

      // Sort English first, then alphabetical by language label
      subtitleTracks.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.label.localeCompare(b.label);
      });

      // Pre-convert top subtitles (English, etc.) to WebVTT blobs in background for instantaneous playback
      for (const sub of subtitleTracks.slice(0, 3)) {
        if (sub.downloadUrl) {
          convertSrtToVttBlob(sub.downloadUrl)
            .then((blobUrl) => {
              sub.url = blobUrl;
            })
            .catch(() => {});
        }
      }

      return subtitleTracks;
    } catch (err) {
      console.warn('Subtitle service error:', err);
      return [];
    }
  },
};
