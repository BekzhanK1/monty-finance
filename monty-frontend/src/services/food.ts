import axios from 'axios';
import type {
  FoodDish,
  FoodDishIngredientLine,
  FoodIngredient,
  FoodMealCategory,
  FoodMealSlot,
  FoodPantryItem,
  FoodShoppingList,
  FoodSlotKey,
  FoodUnit,
} from '../types';
import api from './http';

export type FoodDishIngredientPayload = {
  ingredient_id: number;
  quantity: number;
  unit_id: number;
  is_optional?: boolean;
  note?: string | null;
  sort_order?: number;
};

export const foodApi = {
  mealCategories: {
    list: async () => {
      const { data } = await api.get<FoodMealCategory[]>('/food/meal-categories');
      return data;
    },
    create: async (payload: { name: string; sort_order?: number }) => {
      const { data } = await api.post<FoodMealCategory>('/food/meal-categories', payload);
      return data;
    },
    update: async (id: number, payload: { name?: string; sort_order?: number }) => {
      const { data } = await api.patch<FoodMealCategory>(`/food/meal-categories/${id}`, payload);
      return data;
    },
    delete: async (id: number) => {
      await api.delete(`/food/meal-categories/${id}`);
    },
  },
  units: {
    list: async () => {
      const { data } = await api.get<FoodUnit[]>('/food/units');
      return data;
    },
  },
  ingredients: {
    list: async (q?: string) => {
      const { data } = await api.get<FoodIngredient[]>('/food/ingredients', {
        params: q?.trim() ? { q: q.trim() } : {},
      });
      return data;
    },
    create: async (payload: {
      name: string;
      default_unit_id: number;
      category?: string | null;
      notes?: string | null;
    }) => {
      const { data } = await api.post<FoodIngredient>('/food/ingredients', payload);
      return data;
    },
  },
  dishes: {
    list: async (meal_category_id?: number) => {
      const { data } = await api.get<FoodDish[]>('/food/dishes', {
        params: meal_category_id != null ? { meal_category_id } : {},
      });
      return data;
    },
    create: async (payload: {
      title: string;
      recipe_text?: string;
      meal_category_id: number;
      description?: string | null;
      servings_default?: number;
      prep_minutes?: number | null;
      cook_minutes?: number | null;
      is_archived?: boolean;
      ingredients?: FoodDishIngredientPayload[] | null;
    }) => {
      const { data } = await api.post<FoodDish>('/food/dishes', payload);
      return data;
    },
    update: async (
      id: number,
      payload: {
        title?: string;
        recipe_text?: string;
        meal_category_id?: number;
        description?: string | null;
        servings_default?: number;
        prep_minutes?: number | null;
        cook_minutes?: number | null;
        is_archived?: boolean;
      },
    ) => {
      const { data } = await api.patch<FoodDish>(`/food/dishes/${id}`, payload);
      return data;
    },
    replaceIngredients: async (id: number, items: FoodDishIngredientPayload[]) => {
      const { data } = await api.put<FoodDish>(`/food/dishes/${id}/ingredients`, { items });
      return data;
    },
    delete: async (id: number) => {
      await api.delete(`/food/dishes/${id}`);
    },
  },
  menu: {
    list: async (from: string, to: string) => {
      const { data } = await api.get<FoodMealSlot[]>('/food/menu', { params: { from, to } });
      return data;
    },
    createSlot: async (payload: {
      slot_date: string;
      slot_key: FoodSlotKey;
      dish_id?: number | null;
      custom_title?: string | null;
      servings?: number;
      notes?: string | null;
    }) => {
      const { data } = await api.post<FoodMealSlot>('/food/menu/slots', payload);
      return data;
    },
    updateSlot: async (
      id: number,
      payload: {
        dish_id?: number | null;
        custom_title?: string | null;
        servings?: number;
        notes?: string | null;
      },
    ) => {
      const { data } = await api.patch<FoodMealSlot>(`/food/menu/slots/${id}`, payload);
      return data;
    },
    deleteSlot: async (id: number) => {
      await api.delete(`/food/menu/slots/${id}`);
    },
  },
  shopping: {
    getLatest: async (): Promise<FoodShoppingList | null> => {
      try {
        const { data } = await api.get<FoodShoppingList>('/food/shopping-lists/latest');
        return data;
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) return null;
        throw e;
      }
    },
    generate: async (date_from: string, date_to: string) => {
      const { data } = await api.post<FoodShoppingList>('/food/shopping-lists/generate', {
        date_from,
        date_to,
      });
      return data;
    },
    addItem: async (
      listId: number,
      payload: {
        label: string;
        quantity?: number | null;
        unit_id?: number | null;
        ingredient_id?: number | null;
      },
    ) => {
      const { data } = await api.post<FoodShoppingList>(`/food/shopping-lists/${listId}/items`, payload);
      return data;
    },
    patchItem: async (itemId: number, payload: { checked?: boolean }) => {
      const { data } = await api.patch<FoodShoppingList>(`/food/shopping-items/${itemId}`, payload);
      return data;
    },
  },
  pantry: {
    list: async () => {
      const { data } = await api.get<FoodPantryItem[]>('/food/pantry');
      return data;
    },
    upsert: async (payload: { ingredient_id: number; quantity: number; unit_id: number; note?: string | null }) => {
      const { data } = await api.post<FoodPantryItem>('/food/pantry', payload);
      return data;
    },
    update: async (
      id: number,
      payload: { quantity?: number; unit_id?: number; note?: string | null },
    ) => {
      const { data } = await api.patch<FoodPantryItem>(`/food/pantry/${id}`, payload);
      return data;
    },
    delete: async (id: number) => {
      await api.delete(`/food/pantry/${id}`);
    },
  },
};

export function formatIngredientSummary(lines: FoodDishIngredientLine[]): string {
  if (!lines.length) return '';
  return lines
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((l) => `${l.ingredient_name} — ${l.quantity} ${l.unit_code}`)
    .join(' · ');
}
