export interface PeriodTotals {
  income: number;
  expense: number;
  savings: number;
  balance: number;
  savings_rate: number | null;
}

export interface CategoryStat {
  category_id: number;
  name: string;
  icon: string;
  group: 'BASE' | 'COMFORT' | 'SAVINGS' | 'INCOME';
  type: 'income' | 'expense' | 'savings';
  amount: number;
  count: number;
  previous_amount: number;
  change_pct: number | null;
  limit: number | null;
}

export interface NotableTx {
  id: string;
  date: string;
  amount: number;
  category_id: number;
  category_name: string;
  category_icon: string;
  comment: string | null;
  user_name: string;
  typical?: number;
  times?: number | null;
}

export interface Insight {
  tone: 'good' | 'warning' | 'info';
  title: string;
  text: string;
}

export interface Overview {
  period: { start: string; end: string; days_total: number; days_elapsed: number; is_current: boolean };
  previous: PeriodTotals & { start: string; end: string };
  totals: PeriodTotals;
  budget_limit: number;
  forecast: {
    spent: number;
    projected: number;
    budget_limit: number;
    over_by: number;
    days_left: number;
    safe_per_day: number | null;
  } | null;
  cumulative: { date: string; actual: number | null; pace: number | null; forecast: number | null }[];
  structure: {
    basis: 'income' | 'spending';
    basis_amount: number;
    groups: { group: 'BASE' | 'COMFORT' | 'SAVINGS'; amount: number; share: number; target_share: number }[];
  };
  categories: CategoryStat[];
  weekdays: { weekday: number; average: number; days: number }[];
  heatmap: { date: string; expense: number; future: boolean }[];
  top_expenses: NotableTx[];
  anomalies: NotableTx[];
  by_user: { user_id: number; user_name: string; income: number; expense: number; savings: number; count: number }[];
  insights: Insight[];
}

export interface TrendPoint extends PeriodTotals {
  start: string;
  end: string;
  is_current: boolean;
}

export interface RecurringPayment {
  category_id: number;
  category_name: string;
  category_icon: string;
  label: string;
  amount: number;
  interval_days: number;
  cadence: 'weekly' | 'monthly';
  last_date: string;
  next_date: string;
  count: number;
}
