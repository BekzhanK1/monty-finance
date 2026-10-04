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
  StockMovement,
  TodayResponse,
  Transfer,
  Warehouse,
} from './types';

const get = async <T,>(url: string, params?: object) => (await api.get<T>(url, { params })).data;
const post = async <T,>(url: string, body?: object) => (await api.post<T>(url, body ?? {})).data;
const patch = async <T,>(url: string, body: object) => (await api.patch<T>(url, body)).data;
const del = async <T,>(url: string) => (await api.delete<T>(url)).data;

export const foodApi = {
  bootstrap: () => get<{ dish_count: number }>('/food/bootstrap'),
  today: (wid: number) => get<TodayResponse>('/food/today', { warehouse_id: wid }),

  units: () => get<FoodUnit[]>('/food/units'),
  ingredients: () => get<FoodIngredient[]>('/food/ingredients'),
  createIngredient: (body: { name: string; default_unit_id: number }) => post<FoodIngredient>('/food/ingredients', body),

  categories: () => get<MealCategory[]>('/food/meal-categories'),
  dishes: (wid: number) => get<Dish[]>('/food/dishes', { include_pantry_status: true, warehouse_id: wid }),
  createDish: (body: DishInput) => post<Dish>('/food/dishes', body),
  updateDish: async (id: number, { ingredients, ...rest }: DishInput) => {
    await patch<Dish>(`/food/dishes/${id}`, rest);
    return (await api.put<Dish>(`/food/dishes/${id}/ingredients`, { items: ingredients })).data;
  },
  archiveDish: (id: number) => patch<Dish>(`/food/dishes/${id}`, { is_archived: true }),
  availability: (id: number, wid: number, servings?: number) =>
    get<DishAvailability>(`/food/dishes/${id}/availability`, { warehouse_id: wid, ...(servings ? { servings } : {}) }),
  cookDish: (id: number, wid: number, servings?: number) =>
    post<{ consumed: ConsumedLine[] }>(`/food/dishes/${id}/cook?warehouse_id=${wid}`, { servings }),
  dishToShopping: (id: number, wid: number, servings?: number) =>
    post<{ list: ShoppingList; added: number }>(`/food/dishes/${id}/to-shopping?warehouse_id=${wid}`, { servings }),

  menu: (from: string, to: string, wid: number) => get<MealSlot[]>('/food/menu', { from, to, warehouse_id: wid }),
  createSlot: (body: { slot_date: string; slot_key: SlotKey; dish_id?: number | null; custom_title?: string | null; servings: number }) =>
    post<MealSlot>('/food/menu/slots', body),
  updateSlot: (id: number, body: { dish_id?: number | null; custom_title?: string | null; servings?: number }) =>
    patch<MealSlot>(`/food/menu/slots/${id}`, body),
  deleteSlot: (id: number) => del<void>(`/food/menu/slots/${id}`),
  cookSlot: (id: number, wid: number) =>
    post<{ consumed: ConsumedLine[]; slot: MealSlot }>(`/food/menu/slots/${id}/cook?warehouse_id=${wid}`),
  uncookSlot: (id: number) => post<{ slot: MealSlot }>(`/food/menu/slots/${id}/uncook`),
  copyWeek: (targetWeekStart: string) =>
    post<{ slots_created: number }>('/food/menu/copy-week', { target_week_start: targetWeekStart }),

  shoppingList: () => get<ShoppingList>('/food/shopping-list'),
  addShoppingItem: (body: { label: string; quantity?: number | null; unit_id?: number | null; ingredient_id?: number | null }) =>
    post<ShoppingList>('/food/shopping-list/items', body),
  updateShoppingItem: (id: number, body: { checked?: boolean; label?: string; quantity?: number | null; unit_id?: number | null; category?: string }) =>
    patch<ShoppingList>(`/food/shopping-list/items/${id}`, body),
  deleteShoppingItem: (id: number) => del<ShoppingList>(`/food/shopping-list/items/${id}`),
  shoppingFromMenu: (date_from: string, date_to: string, wid: number) =>
    post<{ list: ShoppingList; added: number }>(`/food/shopping-list/from-menu?warehouse_id=${wid}`, { date_from, date_to }),
  shoppingLowStock: (wid: number) =>
    post<{ list: ShoppingList; added: number }>(`/food/shopping-list/low-stock?warehouse_id=${wid}`),
  completeShopping: ({ wid, ...body }: { to_pantry: boolean; total_amount: number | null; wid: number }) =>
    post<{ list: ShoppingList; moved_to_pantry: number; skipped: string[]; transaction_id: string | null }>(
      `/food/shopping-list/complete?warehouse_id=${wid}`, body),

  pantry: (wid: number | 'all') => get<PantryItem[]>('/food/pantry', { warehouse_id: wid }),
  addPantry: (body: {
    ingredient_id?: number | null; name?: string; quantity: number; unit_id: number; warehouse_id: number;
    location?: Location | null; expires_on?: string | null; min_quantity?: number | null;
  }) => post<PantryItem>('/food/pantry', body),
  updatePantry: (id: number, body: Partial<Pick<PantryItem, 'quantity' | 'unit_id' | 'location' | 'expires_on' | 'min_quantity'>>) =>
    patch<PantryItem>(`/food/pantry/${id}`, body),
  adjustPantry: (id: number, delta: number) => post<PantryItem>(`/food/pantry/${id}/adjust`, { delta }),
  deletePantry: (id: number) => del<void>(`/food/pantry/${id}`),
  movements: (id: number) => get<StockMovement[]>(`/food/pantry/${id}/movements`),

  warehouses: () => get<Warehouse[]>('/food/warehouses'),
  createWarehouse: (body: { name: string; emoji: string }) => post<Warehouse>('/food/warehouses', body),
  updateWarehouse: (id: number, body: { name?: string; emoji?: string; is_default?: boolean }) =>
    patch<Warehouse>(`/food/warehouses/${id}`, body),
  deleteWarehouse: (id: number) => del<void>(`/food/warehouses/${id}`),
  transfers: () => get<Transfer[]>('/food/transfers'),
  createTransfer: (body: {
    from_warehouse_id: number; to_warehouse_id: number; comment?: string | null;
    lines: { ingredient_id: number; quantity: number; unit_id: number }[];
  }) => post<Transfer>('/food/transfers', body),
  cancelTransfer: (id: number) => post<Transfer>(`/food/transfers/${id}/cancel`),
};
