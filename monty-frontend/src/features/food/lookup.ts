import type { FoodIngredient, FoodUnit } from './types';

/** Case-insensitive product lookup by name. */
export function findIngredient(ingredients: FoodIngredient[], name: string): FoodIngredient | null {
  const key = name.trim().toLowerCase();
  return ingredients.find(i => i.name.trim().toLowerCase() === key) ?? null;
}

export function unitIdByCode(units: Pick<FoodUnit, 'id' | 'code'>[], code: string | null | undefined): number | null {
  if (!code) return null;
  return units.find(u => u.code === code)?.id ?? null;
}
