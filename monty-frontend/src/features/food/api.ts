import api from '../../services/http';
import type {
  ConsumedLine,
  Dish,
  DishAvailability,
  DishInput,
  FoodIngredient,
  FoodUnit,
  Location,
  MealCategory,
  MealSlot,
  PantryItem,
  ShoppingList,
  SlotKey,
  TodayResponse,
} from './types';

const get = async <T,>(url: string, params?: object) => (await api.get<T>(url, { params })).data;
const post = async <T,>(url: string, body?: object) => (await api.post<T>(url, body ?? {})).data;
const patch = async <T,>(url: string, body: object) => (await api.patch<T>(url, body)).data;
const del = async <T,>(url: string) => (await api.delete<T>(url)).data;

export const foodApi = {
  bootstrap: () => get<{ dish_count: number }>('/food/bootstrap'),
  today: () => get<TodayResponse>('/food/today'),

  units: () => get<FoodUnit[]>('/food/units'),
  ingredients: () => get<FoodIngredient[]>('/food/ingredients'),
  createIngredient: (body: { name: string; default_unit_id: number }) => post<FoodIngredient>('/food/ingredients', body),

  categories: () => get<MealCategory[]>('/food/meal-categories'),
  dishes: () => get<Dish[]>('/food/dishes', { include_pantry_status: true }),
  createDish: (body: DishInput) => post<Dish>('/food/dishes', body),
  updateDish: async (id: number, { ingredients, ...rest }: DishInput) => {
    await patch<Dish>(`/food/dishes/${id}`, rest);
    return (await api.put<Dish>(`/food/dishes/${id}/ingredients`, { items: ingredients })).data;
  },
  archiveDish: (id: number) => patch<Dish>(`/food/dishes/${id}`, { is_archived: true }),
  availability: (id: number, servings?: number) =>
    get<DishAvailability>(`/food/dishes/${id}/availability`, servings ? { servings } : undefined),
  cookDish: (id: number, servings?: number) =>
    post<{ consumed: ConsumedLine[] }>(`/food/dishes/${id}/cook`, { servings }),
  dishToShopping: (id: number, servings?: number) =>
    post<{ list: ShoppingList; added: number }>(`/food/dishes/${id}/to-shopping`, { servings }),

  menu: (from: string, to: string) => get<MealSlot[]>('/food/menu', { from, to }),
  createSlot: (body: { slot_date: string; slot_key: SlotKey; dish_id?: number | null; custom_title?: string | null; servings: number }) =>
    post<MealSlot>('/food/menu/slots', body),
  updateSlot: (id: number, body: { dish_id?: number | null; custom_title?: string | null; servings?: number }) =>
    patch<MealSlot>(`/food/menu/slots/${id}`, body),
  deleteSlot: (id: number) => del<void>(`/food/menu/slots/${id}`),
  cookSlot: (id: number) => post<{ consumed: ConsumedLine[]; slot: MealSlot }>(`/food/menu/slots/${id}/cook`),
  uncookSlot: (id: number) => post<{ slot: MealSlot }>(`/food/menu/slots/${id}/uncook`),
  copyWeek: (targetWeekStart: string) =>
    post<{ slots_created: number }>('/food/menu/copy-week', { target_week_start: targetWeekStart }),

  shoppingList: () => get<ShoppingList>('/food/shopping-list'),
  addShoppingItem: (body: { label: string; quantity?: number | null; unit_id?: number | null; ingredient_id?: number | null }) =>
    post<ShoppingList>('/food/shopping-list/items', body),
  updateShoppingItem: (id: number, body: { checked?: boolean; label?: string; quantity?: number | null; unit_id?: number | null; category?: string }) =>
    patch<ShoppingList>(`/food/shopping-list/items/${id}`, body),
  deleteShoppingItem: (id: number) => del<ShoppingList>(`/food/shopping-list/items/${id}`),
  shoppingFromMenu: (date_from: string, date_to: string) =>
    post<{ list: ShoppingList; added: number }>('/food/shopping-list/from-menu', { date_from, date_to }),
  shoppingLowStock: () => post<{ list: ShoppingList; added: number }>('/food/shopping-list/low-stock'),
  completeShopping: (body: { to_pantry: boolean; total_amount: number | null }) =>
    post<{ list: ShoppingList; moved_to_pantry: number; skipped: string[]; transaction_id: string | null }>(
      '/food/shopping-list/complete', body),

  pantry: () => get<PantryItem[]>('/food/pantry'),
  addPantry: (body: {
    ingredient_id?: number | null; name?: string; quantity: number; unit_id: number;
    location?: Location | null; expires_on?: string | null; min_quantity?: number | null;
  }) => post<PantryItem>('/food/pantry', body),
  updatePantry: (id: number, body: Partial<Pick<PantryItem, 'quantity' | 'unit_id' | 'location' | 'expires_on' | 'min_quantity'>>) =>
    patch<PantryItem>(`/food/pantry/${id}`, body),
  adjustPantry: (id: number, delta: number) => post<PantryItem>(`/food/pantry/${id}/adjust`, { delta }),
  deletePantry: (id: number) => del<void>(`/food/pantry/${id}`),
};
