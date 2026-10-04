import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { foodApi } from './api';
import { financeKeys } from '../finance/queries';

export const foodKeys = {
  all: ['food'] as const,
  bootstrap: () => [...foodKeys.all, 'bootstrap'] as const,
  today: () => [...foodKeys.all, 'today'] as const,
  units: () => [...foodKeys.all, 'units'] as const,
  ingredients: () => [...foodKeys.all, 'ingredients'] as const,
  categories: () => [...foodKeys.all, 'categories'] as const,
  dishes: () => [...foodKeys.all, 'dishes'] as const,
  availability: (id: number, servings?: number) => [...foodKeys.all, 'availability', id, servings ?? null] as const,
  menu: (from: string, to: string) => [...foodKeys.all, 'menu', from, to] as const,
  shopping: () => [...foodKeys.all, 'shopping'] as const,
  pantry: () => [...foodKeys.all, 'pantry'] as const,
};

// Food data is small and interlinked (cooking changes stock, stock changes readiness,
// readiness shows in menu/recipes/today), so every mutation refreshes all of it.
export function useFoodMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: foodKeys.all }),
  });
}

export const useFoodBootstrap = () => useQuery({ queryKey: foodKeys.bootstrap(), queryFn: foodApi.bootstrap, staleTime: Infinity });
export const useToday = () => useQuery({ queryKey: foodKeys.today(), queryFn: foodApi.today });
export const useUnits = () => useQuery({ queryKey: foodKeys.units(), queryFn: foodApi.units, staleTime: Infinity });
export const useIngredients = () => useQuery({ queryKey: foodKeys.ingredients(), queryFn: foodApi.ingredients, staleTime: 5 * 60_000 });
export const useMealCategories = () => useQuery({ queryKey: foodKeys.categories(), queryFn: foodApi.categories, staleTime: 5 * 60_000 });
export const useDishes = () => useQuery({ queryKey: foodKeys.dishes(), queryFn: foodApi.dishes });
export const useMenu = (from: string, to: string) =>
  useQuery({ queryKey: foodKeys.menu(from, to), queryFn: () => foodApi.menu(from, to) });
export const useShoppingList = () => useQuery({ queryKey: foodKeys.shopping(), queryFn: foodApi.shoppingList });
export const usePantry = () => useQuery({ queryKey: foodKeys.pantry(), queryFn: foodApi.pantry });
export const useAvailability = (id: number, servings?: number) =>
  useQuery({ queryKey: foodKeys.availability(id, servings), queryFn: () => foodApi.availability(id, servings) });

/** Completing a purchase may also create a Finance expense. */
export function useCompleteShopping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: foodApi.completeShopping,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: foodKeys.all }),
      queryClient.invalidateQueries({ queryKey: financeKeys.all }),
    ]),
  });
}
