export type SlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Readiness = 'ready' | 'partial' | 'missing';
export type Location = 'fridge' | 'freezer' | 'pantry';
export type StockStatus = 'ok' | 'low' | 'out' | 'expiring' | 'expired';
export type Aisle =
  | 'produce' | 'dairy' | 'meat' | 'bakery' | 'grocery' | 'frozen'
  | 'spices' | 'drinks' | 'sweets' | 'household' | 'other';

export interface FoodUnit {
  id: number;
  code: string;
  name: string;
}

export interface FoodIngredient {
  id: number;
  name: string;
  default_unit_id: number;
  category: string | null;
  is_pantry_default: boolean;
  aisle: Aisle;
}

export interface MealCategory {
  id: number;
  name: string;
  sort_order: number;
}

export interface DishLine {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_id: number;
  unit_code: string;
  is_optional: boolean;
  note: string | null;
  sort_order: number;
}

export interface Dish {
  id: number;
  meal_category_id: number;
  title: string;
  recipe_text: string;
  description: string | null;
  servings_default: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  is_archived: boolean;
  ingredients: DishLine[];
  pantry_status: Readiness | null;
}

export interface DishInput {
  title: string;
  meal_category_id: number;
  recipe_text: string;
  servings_default: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  ingredients: { ingredient_id: number; quantity: number; unit_id: number; sort_order: number }[];
}

export interface MealSlot {
  id: number;
  slot_date: string;
  slot_key: SlotKey;
  dish_id: number | null;
  custom_title: string | null;
  servings: number;
  notes: string | null;
  dish_title: string | null;
  cooked_at: string | null;
  readiness: Readiness | null;
  missing_count: number;
}

export interface PantryItem {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_id: number;
  unit_code: string;
  note: string | null;
  location: Location;
  expires_on: string | null;
  min_quantity: number | null;
  aisle: Aisle;
  status: StockStatus;
  days_left: number | null;
}

export interface ShoppingItem {
  id: number;
  ingredient_id: number | null;
  label: string;
  quantity: number | null;
  unit_id: number | null;
  unit_code: string | null;
  checked: boolean;
  sort_order: number;
  category: Aisle;
  sources: string | null;
}

export interface ShoppingList {
  id: number;
  title: string;
  status: string;
  items: ShoppingItem[];
}

export interface TodayResponse {
  date: string;
  slots: MealSlot[];
  tomorrow_planned: number;
  expiring: PantryItem[];
  low_stock: PantryItem[];
  shopping_list_id: number;
  shopping_open: number;
}

export interface ConsumedLine {
  ingredient_id: number;
  name: string;
  quantity: number;
  unit_code: string;
  shortfall: boolean;
}

export interface AvailabilityLine {
  ingredient_id: number;
  name: string;
  need: number;
  unit_id: number;
  unit_code: string;
  have: number | null;
  missing: number;
  status: 'ok' | 'short' | 'none' | 'unit_mismatch' | 'always_home';
}

export interface DishAvailability {
  dish_id: number;
  servings: number;
  readiness: Readiness;
  lines: AvailabilityLine[];
}
