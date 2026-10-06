import { useCallback, useRef } from 'react';

export const SECRET_TAPS = 5;
export const SECRET_WINDOW_MS = 2000;

/** Pure tap counter: `required` taps within `windowMs` unlock and reset the sequence. */
export function registerTap(
  taps: number[],
  now: number,
  required = SECRET_TAPS,
  windowMs = SECRET_WINDOW_MS,
): { taps: number[]; unlocked: boolean } {
  const recent = [...taps.filter(t => now - t <= windowMs), now];
  return recent.length >= required ? { taps: [], unlocked: true } : { taps: recent, unlocked: false };
}

/** Click handler that calls `onUnlock` after five quick taps; single taps do nothing visible. */
export function useSecretTap(onUnlock: () => void) {
  const taps = useRef<number[]>([]);
  return useCallback(() => {
    const result = registerTap(taps.current, Date.now());
    taps.current = result.taps;
    if (result.unlocked) onUnlock();
  }, [onUnlock]);
}
