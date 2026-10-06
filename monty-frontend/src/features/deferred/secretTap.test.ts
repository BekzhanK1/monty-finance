import { describe, expect, it } from 'vitest';
import { registerTap } from './secretTap';

const tapAll = (times: number[]) => {
  let taps: number[] = [];
  const results = times.map(now => {
    const r = registerTap(taps, now);
    taps = r.taps;
    return r.unlocked;
  });
  return results;
};

describe('registerTap', () => {
  it('unlocks on the fifth quick tap', () => {
    expect(tapAll([0, 200, 400, 600, 800])).toEqual([false, false, false, false, true]);
  });

  it('resets after unlocking', () => {
    expect(tapAll([0, 100, 200, 300, 400, 500, 600]).filter(Boolean)).toHaveLength(1);
  });

  it('forgets taps older than the window', () => {
    expect(tapAll([0, 100, 200, 300, 2500, 2600, 2700, 2800]).some(Boolean)).toBe(false);
    expect(tapAll([0, 100, 200, 300, 2500, 2600, 2700, 2800, 2900])).toContain(true);
  });
});
