import { describe, expect, it } from 'vitest';
import type { BudgetWithSpent, DashboardResponse } from '../../types';
import { computeHomeSummary } from './summary';

const budget = (group: string, limit: number, spent: number, id = Math.random()): BudgetWithSpent => ({
  category_id: id,
  category_name: 'x',
  category_icon: '•',
  group,
  limit_amount: limit,
  spent,
  remaining: limit - spent,
});

const dashboard = (budgets: BudgetWithSpent[]): DashboardResponse => ({
  total_savings_goal: 0,
  current_savings: 0,
  budgets,
  period_start: '2026-09-10',
  period_end: '2026-10-09',
});

describe('computeHomeSummary', () => {
  it('spreads the remaining expense budget over the days left, inclusive of today', () => {
    const s = computeHomeSummary(
      dashboard([budget('BASE', 200_000, 120_000), budget('COMFORT', 100_000, 30_000), budget('SAVINGS', 0, 50_000)]),
      new Date(2026, 9, 4, 18, 30),
    );
    expect(s.limit).toBe(300_000);
    expect(s.spent).toBe(150_000);
    expect(s.remaining).toBe(150_000);
    expect(s.totalDays).toBe(30);
    expect(s.daysLeft).toBe(6); // Oct 4..9
    expect(s.safePerDay).toBe(25_000);
    expect(s.savings).toBe(50_000);
    expect(s.base.percent).toBe(60);
  });

  it('flags overspending pace and forecasts the period total', () => {
    // Day 5 of 30 with half the budget gone.
    const s = computeHomeSummary(dashboard([budget('BASE', 100_000, 50_000)]), new Date(2026, 8, 14));
    expect(s.daysLeft).toBe(26);
    expect(s.pace).toBe('over');
    expect(s.forecast).toBe(300_000);
  });

  it('never suggests a negative daily amount when over budget', () => {
    const s = computeHomeSummary(dashboard([budget('BASE', 100_000, 130_000)]), new Date(2026, 9, 1));
    expect(s.remaining).toBe(-30_000);
    expect(s.safePerDay).toBe(0);
  });

  it('handles no budgets and the last day of the period', () => {
    const s = computeHomeSummary(dashboard([]), new Date(2026, 9, 9));
    expect(s.hasBudgets).toBe(false);
    expect(s.daysLeft).toBe(1);
    expect(s.pace).toBe('on');
  });

  it('takes today\'s spending off today\'s amount in full', () => {
    // 6 days left (Oct 4..9), 120 000 left before today → 20 000 a day.
    const morning = computeHomeSummary(dashboard([budget('BASE', 300_000, 180_000)]), new Date(2026, 9, 4));
    expect(morning.dailyLimit).toBe(20_000);
    expect(morning.safePerDay).toBe(20_000);

    // Spending 2 000 today leaves 18 000 for today, not (118 000 / 6) ≈ 19 666.
    const evening = computeHomeSummary(
      { ...dashboard([budget('BASE', 300_000, 182_000)]), spent_today: 2_000 },
      new Date(2026, 9, 4),
    );
    expect(evening.dailyLimit).toBe(20_000);
    expect(evening.spentToday).toBe(2_000);
    expect(evening.safePerDay).toBe(18_000);
    expect(evening.overToday).toBe(0);
  });

  it('reports how much today\'s limit is exceeded by', () => {
    const s = computeHomeSummary(
      { ...dashboard([budget('BASE', 300_000, 205_000)]), spent_today: 25_000 },
      new Date(2026, 9, 4),
    );
    expect(s.dailyLimit).toBe(20_000);
    expect(s.safePerDay).toBe(0);
    expect(s.overToday).toBe(5_000);
  });
});
