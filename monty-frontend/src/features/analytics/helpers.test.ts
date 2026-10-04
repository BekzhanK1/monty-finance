import { describe, expect, it } from 'vitest';
import { calendarWeeks, compactTick, delta, heatLevel, heatThresholds, rangeLabel } from './helpers';

describe('analytics helpers', () => {
  it('bins heat levels by quintile so one outlier does not flatten the rest', () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 185];
    const t = heatThresholds(values);
    expect(t).toEqual([3, 5, 7, 9]);
    expect([0, 1, 4, 6, 8, 185].map(v => heatLevel(v, t))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(heatThresholds([0, 0])).toEqual([]);
    expect(heatLevel(5, [])).toBe(1);
  });

  it('lays a period out in Monday-first weeks', () => {
    // 10 Sep 2026 is a Thursday → three empty slots before it.
    const days = Array.from({ length: 5 }, (_, i) => ({ date: `2026-09-${10 + i}`, expense: i, future: false }));
    const weeks = calendarWeeks(days);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]?.date).toBe('2026-09-10');
    expect(weeks[1][0]?.date).toBe('2026-09-14');
    expect(weeks[1].filter(Boolean)).toHaveLength(1);
  });

  it('judges deltas by direction', () => {
    expect(delta(120, 100, false)).toEqual({ pct: 20, good: false });
    expect(delta(80, 100, false)).toEqual({ pct: -20, good: true });
    expect(delta(120, 100, true)).toEqual({ pct: 20, good: true });
    expect(delta(5, 0, true)).toBeNull();
  });

  it('formats labels', () => {
    expect(rangeLabel('2026-09-10', '2026-10-09')).toBe('10 сент. – 9 окт.');
    expect(compactTick(1_250_000)).toBe('1,3\u00a0млн');
    expect(compactTick(45_000)).toBe('45\u00a0тыс');
  });
});
