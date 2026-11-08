import { describe, expect, it } from 'vitest';
import { entryPreview, formatMood, frozenThisWeek, groupByDay, moodEmoji, moodOf, spendingInsight, streakLabel } from './mood';

describe('moodOf', () => {
  it('rounds averages and clamps', () => {
    expect(moodOf(3.6)?.value).toBe(4);
    expect(moodOf(0)?.value).toBe(1);
    expect(moodOf(9)?.value).toBe(5);
  });
  it('keeps unknown as unknown', () => {
    expect(moodOf(null)).toBeNull();
    expect(moodEmoji(null)).toBe('·');
    expect(formatMood(null)).toBe('—');
  });
  it('formats with a comma', () => {
    expect(formatMood(3.25)).toBe('3,3');
  });
});

describe('streakLabel', () => {
  it('pluralizes in Russian', () => {
    expect(streakLabel(1)).toBe('1 день');
    expect(streakLabel(3)).toBe('3 дня');
    expect(streakLabel(11)).toBe('11 дней');
    expect(streakLabel(22)).toBe('22 дня');
  });
});

describe('groupByDay', () => {
  it('groups consecutive entries of the same day, keeping order', () => {
    const groups = groupByDay([
      { id: 'a', entry_date: '2026-11-05' },
      { id: 'b', entry_date: '2026-11-05' },
      { id: 'c', entry_date: '2026-11-03' },
    ]);
    expect(groups.map(g => [g.date, g.items.map(i => i.id)])).toEqual([
      ['2026-11-05', ['a', 'b']],
      ['2026-11-03', ['c']],
    ]);
  });
});

describe('entryPreview', () => {
  it('prefers the summary, then text, then a mood-only label', () => {
    expect(entryPreview({ summary: 'Итог', content: 'Текст' })).toBe('Итог');
    expect(entryPreview({ summary: null, content: '  много\n\nпробелов ' })).toBe('много пробелов');
    expect(entryPreview({ summary: null, content: null })).toBe('Только настроение');
    expect(entryPreview({ summary: null, content: 'абвгд' }, 4)).toBe('абв…');
  });
});

describe('spendingInsight', () => {
  const b = (days: number, avg_spent: number | null) => ({ days, avg_spent });
  it('needs at least two days on each side', () => {
    expect(spendingInsight(b(1, 100), b(5, 50))).toBeNull();
  });
  it('describes the difference', () => {
    expect(spendingInsight(b(3, 15000), b(4, 10000))).toBe('В плохие дни вы тратите на 50% больше, чем в хорошие');
    expect(spendingInsight(b(3, 5000), b(4, 10000))).toBe('В хорошие дни вы тратите на 100% больше, чем в плохие');
    expect(spendingInsight(b(3, 10500), b(4, 10000))).toBe('Настроение почти не влияет на траты');
  });
});

describe('frozenThisWeek', () => {
  it('only counts freezes from the current Mon–Sun week', () => {
    // 2026-11-08 is a Sunday; its week starts on 2026-11-02.
    expect(frozenThisWeek(['2026-11-05'], '2026-11-08')).toBe(true);
    expect(frozenThisWeek(['2026-11-01'], '2026-11-08')).toBe(false);
    expect(frozenThisWeek(['2026-11-02'], '2026-11-02')).toBe(true);
  });
});
