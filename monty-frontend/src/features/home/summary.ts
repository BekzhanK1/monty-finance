import type { BudgetWithSpent, DashboardResponse } from '../../types';

export interface GroupTotals {
  limit: number;
  spent: number;
  /** spent / limit in %, 0 when no limit. */
  percent: number;
}

export interface HomeSummary {
  hasBudgets: boolean;
  limit: number;
  spent: number;
  remaining: number;
  /** What can be spent per day for the rest of the period (never negative). */
  safePerDay: number;
  daysLeft: number;
  totalDays: number;
  /** Share of the period already elapsed, 0–100. */
  timePercent: number;
  /** Share of the budget already spent, 0–100+. */
  spentPercent: number;
  /** Spending at the current daily pace extrapolated to the period end. */
  forecast: number;
  pace: 'under' | 'on' | 'over';
  savings: number;
  base: GroupTotals;
  comfort: GroupTotals;
  periodEnd: Date | null;
}

const DAY_MS = 86_400_000;

function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function totals(budgets: BudgetWithSpent[]): GroupTotals {
  const limit = budgets.reduce((s, b) => s + b.limit_amount, 0);
  const spent = budgets.reduce((s, b) => s + b.spent, 0);
  return { limit, spent, percent: limit > 0 ? (spent / limit) * 100 : 0 };
}

export function computeHomeSummary(dashboard: DashboardResponse, now: Date = new Date()): HomeSummary {
  const base = totals(dashboard.budgets.filter(b => b.group === 'BASE'));
  const comfort = totals(dashboard.budgets.filter(b => b.group === 'COMFORT'));
  const savings = dashboard.budgets.filter(b => b.group === 'SAVINGS').reduce((s, b) => s + b.spent, 0);

  const limit = base.limit + comfort.limit;
  const spent = base.spent + comfort.spent;
  const remaining = limit - spent;

  const today = startOfDay(now);
  const start = dashboard.period_start ? localDate(dashboard.period_start) : null;
  const end = dashboard.period_end ? localDate(dashboard.period_end) : null;
  const totalDays = start && end ? Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1 : 30;
  const daysLeft = end ? Math.max(1, Math.round((end.getTime() - today.getTime()) / DAY_MS) + 1) : 1;
  const elapsedDays = Math.min(totalDays, Math.max(1, totalDays - daysLeft + 1));

  const timePercent = (elapsedDays / totalDays) * 100;
  const spentPercent = limit > 0 ? (spent / limit) * 100 : 0;
  const forecast = Math.round((spent / elapsedDays) * totalDays);
  // ±5 percentage points of the time elapsed counts as "on pace".
  const pace = limit === 0 ? 'on'
    : spentPercent > timePercent + 5 ? 'over'
    : spentPercent < timePercent - 5 ? 'under'
    : 'on';

  return {
    hasBudgets: limit > 0,
    limit,
    spent,
    remaining,
    safePerDay: Math.max(0, Math.floor(remaining / daysLeft)),
    daysLeft,
    totalDays,
    timePercent,
    spentPercent,
    forecast,
    pace,
    savings,
    base,
    comfort,
    periodEnd: end,
  };
}
