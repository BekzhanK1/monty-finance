import { describe, expect, it } from 'vitest';
import type { BudgetWithSpent, DashboardResponse } from '../../types';
import { computeHomeSummary } from './summary';
import { montySays } from './montyMood';

const budget = (group: string, limit: number, spent: number, id = Math.random()): BudgetWithSpent => ({
  category_id: id,
  category_name: 'x',
  category_icon: '•',
  group,
  limit_amount: limit,
  spent,
  remaining: limit - spent,
});

const summaryFor = (budgets: BudgetWithSpent[], now: Date, spentToday = 0) => {
  const d: DashboardResponse = {
    total_savings_goal: 0,
    current_savings: 0,
    budgets,
    period_start: '2026-10-01',
    period_end: '2026-10-30',
    spent_today: spentToday,
  } as DashboardResponse;
  return computeHomeSummary(d, now);
};

const noon = new Date(2026, 9, 15, 12, 0);

describe('montySays', () => {
  it('waits while the dashboard loads and asks for budgets when there are none', () => {
    expect(montySays(null).mood).toBe('idle');
    expect(montySays(summaryFor([], noon), { now: noon }).mood).toBe('thinking');
  });

  it('worries when the budget is blown, even late at night', () => {
    const night = new Date(2026, 9, 15, 23, 30);
    const s = summaryFor([budget('BASE', 100_000, 120_000)], night);
    const says = montySays(s, { now: night });
    expect(says.mood).toBe('worried');
    expect(says.text).toContain('20');
  });

  it('worries when the pace is above plan', () => {
    // Day 15 of 30 with 80% gone.
    const s = summaryFor([budget('BASE', 100_000, 80_000)], noon, 1_000);
    expect(montySays(s, { now: noon }).mood).toBe('worried');
  });

  it('is happy under plan and celebrates a no-spend evening or a reached goal', () => {
    const s = summaryFor([budget('BASE', 100_000, 20_000)], noon, 500);
    expect(montySays(s, { now: noon }).mood).toBe('happy');
    const evening = new Date(2026, 9, 15, 20, 0);
    expect(montySays(summaryFor([budget('BASE', 100_000, 20_000)], evening, 0), { now: evening }).mood).toBe('celebrate');
    expect(montySays(s, { now: noon, goalPercent: 100 }).mood).toBe('celebrate');
  });

  it('sleeps at night when nothing is wrong', () => {
    const night = new Date(2026, 9, 15, 1, 0);
    expect(montySays(summaryFor([budget('BASE', 100_000, 45_000)], night, 0), { now: night }).mood).toBe('sleepy');
  });
});
