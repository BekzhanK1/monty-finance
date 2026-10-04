import { describe, expect, it } from 'vitest';
import type { Category, Transaction } from '../../types';
import { dayLabel, groupByDay, monthBounds, totalsByKind } from './history';

const cats = new Map<number, Category>([
  [1, { id: 1, name: 'Еда', group: 'BASE', type: 'EXPENSE', icon: '🛒' }],
  [2, { id: 2, name: 'ЗП', group: 'INCOME', type: 'INCOME', icon: '💰' }],
  [3, { id: 3, name: 'Депозит', group: 'SAVINGS', type: 'EXPENSE', icon: '🏦' }],
]);

const tx = (id: string, category_id: number, amount: number, utc: string): Transaction => ({
  id, user_id: 1, category_id, amount, transaction_date: utc, comment: null,
});

describe('history helpers', () => {
  it('groups by local day, newest first, with a signed daily net', () => {
    const groups = groupByDay([
      tx('a', 1, 500, '2026-10-02T08:00:00'),
      tx('b', 2, 10_000, '2026-10-03T09:00:00'),
      tx('c', 1, 1_500, '2026-10-03T10:00:00'),
      tx('d', 3, 2_000, '2026-10-03T11:00:00'),
    ], cats);
    expect(groups.map(g => g.items.map(t => t.id))).toEqual([['d', 'c', 'b'], ['a']]);
    expect(groups[0].net).toBe(10_000 - 1_500 - 2_000);
    expect(groups[1].net).toBe(-500);
  });

  it('totals expenses, income and savings separately', () => {
    expect(totalsByKind([
      tx('a', 1, 500, '2026-10-02T08:00:00'),
      tx('b', 2, 10_000, '2026-10-03T09:00:00'),
      tx('d', 3, 2_000, '2026-10-03T11:00:00'),
    ], cats)).toEqual({ expense: 500, income: 10_000, savings: 2_000 });
  });

  it('labels recent days', () => {
    const now = new Date(2026, 9, 4, 15);
    expect(dayLabel(new Date(2026, 9, 4), now)).toBe('Сегодня');
    expect(dayLabel(new Date(2026, 9, 3), now)).toBe('Вчера');
    expect(dayLabel(new Date(2026, 9, 1), now)).toBe("Чт, 1 октября");
  });

  it('builds month bounds covering the whole local month', () => {
    const { start_date, end_date } = monthBounds(2026, 9);
    expect(new Date(`${start_date}Z`).getTime()).toBe(new Date(2026, 9, 1).getTime());
    expect(new Date(`${end_date}Z`).getTime()).toBe(new Date(2026, 10, 1).getTime() - 1000);
  });
});
