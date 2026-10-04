import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { budgetsApi, categoriesApi, goalsApi, settingsApi, transactionsApi } from '../../services/finance';
import type { TransactionInput } from '../../types';

export const financeKeys = {
  all: ['finance'] as const,
  categories: () => [...financeKeys.all, 'categories'] as const,
  dashboard: () => [...financeKeys.all, 'dashboard'] as const,
  goal: () => [...financeKeys.all, 'goal'] as const,
  settings: () => [...financeKeys.all, 'settings'] as const,
  transactions: () => [...financeKeys.all, 'transactions'] as const,
  analytics: () => [...financeKeys.all, 'analytics'] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: financeKeys.categories(),
    queryFn: categoriesApi.getAll,
    staleTime: 5 * 60_000,
  });
}

export interface TransactionFilters {
  category_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export function useTransactions(filters: TransactionFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...financeKeys.transactions(), filters],
    queryFn: () => transactionsApi.getAll(filters),
    enabled: options.enabled ?? true,
  });
}

export function useDashboard() {
  return useQuery({ queryKey: financeKeys.dashboard(), queryFn: budgetsApi.current });
}

export function useGoal() {
  return useQuery({ queryKey: financeKeys.goal(), queryFn: goalsApi.get });
}

export function useSettings() {
  return useQuery({ queryKey: financeKeys.settings(), queryFn: settingsApi.get });
}

/** Everything derived from transactions: budgets, goal progress, history, analytics. */
export function invalidateMoneyQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() }),
    queryClient.invalidateQueries({ queryKey: financeKeys.goal() }),
    queryClient.invalidateQueries({ queryKey: financeKeys.transactions() }),
    queryClient.invalidateQueries({ queryKey: financeKeys.analytics() }),
  ]);
}

export function useCreateTransactionsBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: TransactionInput[]) => transactionsApi.createBulk(items),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}

export function useUpdateBudgetLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, limitAmount }: { categoryId: number; limitAmount: number }) =>
      settingsApi.updateBudget(categoryId, limitAmount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() }),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; category_id?: number; amount?: number; comment?: string }) =>
      transactionsApi.update(id, payload),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: TransactionInput) => transactionsApi.createOne(item),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}
