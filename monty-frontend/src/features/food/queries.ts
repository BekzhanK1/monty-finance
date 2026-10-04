import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { foodApi } from './api';
import { financeKeys } from '../finance/queries';
import { useWarehouseId } from './WarehouseContext';

export const foodKeys = {
  all: ['food'] as const,
  bootstrap: () => [...foodKeys.all, 'bootstrap'] as const,
  today: (wid: number) => [...foodKeys.all, 'today', wid] as const,
  units: () => [...foodKeys.all, 'units'] as const,
  ingredients: () => [...foodKeys.all, 'ingredients'] as const,
  categories: () => [...foodKeys.all, 'categories'] as const,
  dishes: (wid: number) => [...foodKeys.all, 'dishes', wid] as const,
  availability: (id: number, wid: number, servings?: number) => [...foodKeys.all, 'availability', id, wid, servings ?? null] as const,
  menu: (from: string, to: string, wid: number) => [...foodKeys.all, 'menu', from, to, wid] as const,
  shopping: () => [...foodKeys.all, 'shopping'] as const,
  pantry: (wid: number | 'all') => [...foodKeys.all, 'pantry', wid] as const,
  movements: (id: number) => [...foodKeys.all, 'movements', id] as const,
  transfers: () => [...foodKeys.all, 'transfers'] as const,
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
export function useToday() {
  const wid = useWarehouseId();
  return useQuery({ queryKey: foodKeys.today(wid), queryFn: () => foodApi.today(wid), enabled: wid > 0 });
}
export const useUnits = () => useQuery({ queryKey: foodKeys.units(), queryFn: foodApi.units, staleTime: Infinity });
export const useIngredients = () => useQuery({ queryKey: foodKeys.ingredients(), queryFn: foodApi.ingredients, staleTime: 5 * 60_000 });
export const useMealCategories = () => useQuery({ queryKey: foodKeys.categories(), queryFn: foodApi.categories, staleTime: 5 * 60_000 });
export function useDishes() {
  const wid = useWarehouseId();
  return useQuery({ queryKey: foodKeys.dishes(wid), queryFn: () => foodApi.dishes(wid), enabled: wid > 0 });
}
export function useMenu(from: string, to: string) {
  const wid = useWarehouseId();
  return useQuery({ queryKey: foodKeys.menu(from, to, wid), queryFn: () => foodApi.menu(from, to, wid), enabled: wid > 0 });
}
export const useShoppingList = () => useQuery({ queryKey: foodKeys.shopping(), queryFn: foodApi.shoppingList });
/** Stock of the current warehouse, or of another one / all when `scope` is given. */
export function usePantry(scope?: number | 'all') {
  const current = useWarehouseId();
  const wid = scope ?? current;
  return useQuery({ queryKey: foodKeys.pantry(wid), queryFn: () => foodApi.pantry(wid), enabled: wid === 'all' || wid > 0 });
}
export function useAvailability(id: number, servings?: number) {
  const wid = useWarehouseId();
  return useQuery({
    queryKey: foodKeys.availability(id, wid, servings),
    queryFn: () => foodApi.availability(id, wid, servings),
    enabled: wid > 0,
  });
}
export const useMovements = (id: number | null) =>
  useQuery({ queryKey: foodKeys.movements(id ?? 0), queryFn: () => foodApi.movements(id!), enabled: id !== null });
export const useTransfers = () => useQuery({ queryKey: foodKeys.transfers(), queryFn: foodApi.transfers });

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
