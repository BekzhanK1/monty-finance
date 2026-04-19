import type { FoodDish, FoodMealCategory } from '../types';
import api from './http';

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
  dishes: {
    list: async (meal_category_id?: number) => {
      const { data } = await api.get<FoodDish[]>('/food/dishes', {
        params: meal_category_id != null ? { meal_category_id } : {},
      });
      return data;
    },
    create: async (payload: { title: string; recipe_text: string; meal_category_id: number }) => {
      const { data } = await api.post<FoodDish>('/food/dishes', payload);
      return data;
    },
    update: async (
      id: number,
      payload: { title?: string; recipe_text?: string; meal_category_id?: number },
    ) => {
      const { data } = await api.patch<FoodDish>(`/food/dishes/${id}`, payload);
      return data;
    },
    delete: async (id: number) => {
      await api.delete(`/food/dishes/${id}`);
    },
  },
};
