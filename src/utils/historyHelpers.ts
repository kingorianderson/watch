/**
 * Video Playback & Tracking Thresholds:
 *
 * 1. Preview Threshold (First 3 minutes / 180 seconds):
 *    - If watched <= 180s, the user was just previewing.
 *    - The item is recorded in watch history, but the resume timestamp remains at 0:00 (normal time).
 *
 * 2. Outro / Completed Threshold:
 *    - TV Series: Last 3 minutes (180s) of the episode is considered outro/credits.
 *    - Movies: Last 4 minutes (240s) of the movie is considered outro/credits.
 *    - If reached or video ends, the item is marked as Completed, and the resume timestamp resets to 0:00.
 */

export const PREVIEW_THRESHOLD_SECONDS = 180; // 3 minutes
export const TV_OUTRO_THRESHOLD_SECONDS = 180; // 3 minutes
export const MOVIE_OUTRO_THRESHOLD_SECONDS = 240; // 4 minutes

export function getOutroThreshold(type: 'movie' | 'tv'): number {
  return type === 'tv' ? TV_OUTRO_THRESHOLD_SECONDS : MOVIE_OUTRO_THRESHOLD_SECONDS;
}

export function isPlaybackCompleted(
  progress?: number,
  duration?: number,
  type: 'movie' | 'tv' = 'movie',
  completedFlag?: boolean
): boolean {
  if (completedFlag) return true;
  if (!duration || duration <= 300 || typeof progress !== 'number') return false;
  const threshold = getOutroThreshold(type);
  return progress >= duration - threshold;
}

export function isPlaybackPreview(
  progress?: number,
  completedFlag?: boolean
): boolean {
  if (completedFlag) return false;
  if (typeof progress !== 'number' || progress <= 0) return false;
  return progress <= PREVIEW_THRESHOLD_SECONDS;
}

export function getEffectiveResumePosition(
  progress?: number,
  duration?: number,
  type: 'movie' | 'tv' = 'movie',
  completedFlag?: boolean
): number {
  if (!progress || progress <= 0) return 0;
  if (isPlaybackCompleted(progress, duration, type, completedFlag)) return 0;
  if (isPlaybackPreview(progress, completedFlag)) return 0;
  return Math.floor(progress);
}
