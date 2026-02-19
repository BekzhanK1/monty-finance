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
}

export interface Settings {
  target_amount: string;
  target_date: string;
  salary_day: string;
  base_budget: string;
  comfort_budget: string;
  savings_budget: string;
}

export interface Analytics {
  total_income: number;
  total_expenses: number;
  total_savings: number;
  balance: number;
  by_category: { name: string; icon: string; amount: number; type: 'income' | 'expense' | 'savings' }[];
  by_group: { group: string; amount: number; type: 'income' | 'expense' }[];
  daily_data: { date: string; income: number; expense: number }[];
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
