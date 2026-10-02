/** Transparent deterministic approximation of a CompTIA-style scaled score.
 *  This does NOT reproduce CompTIA's proprietary scoring algorithm.
 *  Range 100-900, passing threshold 750. Label everywhere as "Estimated scaled score".
 */
export const SCALED_MIN = 100;
export const SCALED_MAX = 900;
export const PASS_THRESHOLD = 750;
export const EXAM_DEFAULT_COUNT = 85;
export const EXAM_DEFAULT_MINUTES = 165;

export function scaledScore(percentage: number): number {
  const p = Math.max(0, Math.min(100, percentage));
  const raw = Math.round(100 + p * 8);
  return Math.max(SCALED_MIN, Math.min(SCALED_MAX, raw));
}

export function percentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function isPass(scaled: number): boolean {
  return scaled >= PASS_THRESHOLD;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function formatDurationShort(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}
