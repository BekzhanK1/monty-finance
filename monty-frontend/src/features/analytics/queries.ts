import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api from '../../services/http';
import { financeKeys } from '../finance/queries';
import type { Overview, RecurringPayment, TrendPoint } from './types';

export interface Range {
  start: string;
  end: string;
}

const keys = {
  overview: (range: Range | null) => [...financeKeys.analytics(), 'overview', range] as const,
  trends: (periods: number) => [...financeKeys.analytics(), 'trends', periods] as const,
  recurring: () => [...financeKeys.analytics(), 'recurring'] as const,
};

export function useOverview(range: Range | null) {
  return useQuery({
    queryKey: keys.overview(range),
    queryFn: async () =>
      (await api.get<Overview>('/analytics/overview', {
        params: range ? { start_date: range.start, end_date: range.end } : undefined,
      })).data,
    // Keep the previous period on screen while the next one loads (no skeleton flash).
    placeholderData: keepPreviousData,
  });
}

export function useTrends(periods = 6) {
  return useQuery({
    queryKey: keys.trends(periods),
    queryFn: async () => (await api.get<TrendPoint[]>('/analytics/trends', { params: { periods } })).data,
  });
}

export function useRecurring() {
  return useQuery({
    queryKey: keys.recurring(),
    queryFn: async () => (await api.get<RecurringPayment[]>('/analytics/recurring')).data,
    staleTime: 10 * 60_000,
  });
}
