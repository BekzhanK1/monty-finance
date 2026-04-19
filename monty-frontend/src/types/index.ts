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
  total_budget: string;
}

export interface Analytics {
  total_income: number;
  total_expenses: number;
  total_savings: number;
  balance: number;
  by_category: { name: string; icon: string; amount: number; type: 'income' | 'expense' | 'savings' }[];
  by_group: { group: string; amount: number; type: 'income' | 'expense' }[];
  daily_data: { date: string; income: number; expense: number }[];
  top_expenses?: { name: string; icon: string; amount: number; type: string }[];
  by_user?: { user_id: number; user_name: string; income: number; expense: number; savings: number }[];
  comparison_previous_period?: { total_income: number; total_expenses: number; balance: number };
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

/** Food service — meal slot (e.g. breakfast), MVP single household on backend */
export interface FoodMealCategory {
  id: number;
  household_id: number;
  name: string;
  sort_order: number;
}

export interface FoodDishIngredientLine {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_id: number;
  unit_code: string;
  unit_name: string;
  is_optional: boolean;
  note: string | null;
  sort_order: number;
}

export interface FoodDish {
  id: number;
  household_id: number;
  meal_category_id: number;
  title: string;
  recipe_text: string;
  description: string | null;
  servings_default: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string | null;
  ingredients: FoodDishIngredientLine[];
}

export interface FoodUnit {
  id: number;
  code: string;
  name: string;
  system: string;
}

export interface FoodIngredient {
  id: number;
  household_id: number;
  name: string;
  default_unit_id: number;
  category: string | null;
  notes: string | null;
}

export type FoodSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodMealSlot {
  id: number;
  household_id: number;
  slot_date: string;
  slot_key: FoodSlotKey;
  dish_id: number | null;
  custom_title: string | null;
  servings: number;
  notes: string | null;
  dish_title: string | null;
}

export interface FoodShoppingItem {
  id: number;
  ingredient_id: number | null;
  label: string;
  quantity: number | null;
  unit_id: number | null;
  unit_code: string | null;
  checked: boolean;
  sort_order: number;
}

export interface FoodShoppingList {
  id: number;
  household_id: number;
  title: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  created_at: string;
  items: FoodShoppingItem[];
}

export interface FoodPantryItem {
  id: number;
  household_id: number;
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_id: number;
  unit_code: string;
  note: string | null;
  updated_at: string | null;
}
