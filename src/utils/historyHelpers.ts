/**
 * Video Playback & Tracking Thresholds:
 *
 * 1. Preview Threshold (First 30 seconds):
 *    - If watched <= 30s, the user was just previewing or testing the stream.
 *    - The item is recorded in watch history, but the resume timestamp remains at 0:00.
 *    - If watched > 30s, the exact second is preserved so you can resume where you left off.
 *
 * 2. 100% End of Video Rule:
 *    - An episode or movie is ONLY considered completed when it has truly reached 100%
 *      (either video 'ended' event fired, or playback reached the final 3 seconds of the stream).
 *    - No early outro cutoffs are applied, preserving climaxes and post-credit scenes.
 */

export const PREVIEW_THRESHOLD_SECONDS = 30; // 30 seconds

export function isPlaybackCompleted(
  progress?: number,
  duration?: number,
  _type: 'movie' | 'tv' = 'movie',
  completedFlag?: boolean
): boolean {
  if (completedFlag) return true;
  if (!duration || duration <= 10 || typeof progress !== 'number') return false;
  // Strict 100% completion: video has finished or is within final 3 seconds of total duration
  return progress >= duration - 3;
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
