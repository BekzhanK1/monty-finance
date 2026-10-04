export interface User {
  user_id: number;
  telegram_id: number;
  first_name: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  group: 'BASE' | 'COMFORT' | 'SAVINGS' | 'INCOME';
  type: 'EXPENSE' | 'INCOME';
  icon: string;
}

export interface BudgetWithSpent {
  category_id: number;
  category_name: string;
  category_icon: string;
  group: string;
  limit_amount: number;
  spent: number;
  remaining: number;
}

export interface DashboardResponse {
  total_savings_goal: number;
  current_savings: number;
  budgets: BudgetWithSpent[];
  /** Inclusive salary-to-salary period, `YYYY-MM-DD`. */
  period_start?: string;
  period_end?: string;
}

export interface Goal {
  target_amount: number;
  target_date: string;
  current_savings: number;
  progress_percent: number;
  days_remaining: number;
  days_passed?: number;
  daily_needed: number;
}

export interface Transaction {
  id: string;
  user_id: number;
  category_id: number;
  amount: number;
  transaction_date: string;
  comment: string | null;
  source?: TransactionSource;
  raw_text?: string | null;
}

export type TransactionSource = 'manual' | 'voice' | 'siri' | 'bot';

export interface TransactionInput {
  category_id: number;
  amount: number;
  comment?: string;
  /** Local date `YYYY-MM-DD`; omitted means now. */
  transaction_date?: string | null;
  source?: 'manual' | 'voice';
  raw_text?: string;
}

export interface VoiceDraft {
  amount: number;
  category_id: number;
  category_name: string;
  category_icon: string;
  type: 'EXPENSE' | 'INCOME';
  comment: string;
  transaction_date: string | null;
}

export interface VoiceParseResponse {
  text: string;
  drafts: VoiceDraft[];
}

export interface Settings {
  target_amount: string;
  target_date: string;
  salary_day: string;
  total_budget: string;
}

export interface Analytics {
  total_income: number;
  total_expenses: number;
  total_savings: number;
  balance: number;
  by_category: {
    name: string;
    icon: string;
    amount: number;
    type: 'income' | 'expense' | 'savings';
    previous_amount?: number;
    change_pct?: number | null;
  }[];
  by_group: { group: string; amount: number; type: 'income' | 'expense' }[];
  daily_data: { date: string; income: number; expense: number }[];
  top_expenses?: { name: string; icon: string; amount: number; type: string }[];
  by_user?: { user_id: number; user_name: string; income: number; expense: number; savings: number }[];
  comparison_previous_period?: {
    total_income: number;
    total_expenses: number;
    total_savings?: number;
    balance: number;
  };
  period_start?: string;
  period_end?: string;
  large_one_off_total?: number;
  budgets_with_spent?: BudgetWithSpent[];
}

export interface BudgetConfig {
  category_id: number;
  category_name: string;
  category_icon: string;
  group: string;
  type: string;
  limit_amount: number;
}

export interface CategoryInput {
  name: string;
  group: 'BASE' | 'COMFORT' | 'SAVINGS' | 'INCOME';
  type: 'EXPENSE' | 'INCOME';
  icon: string;
}
