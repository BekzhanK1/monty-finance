import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { journalApi } from './api';
import type { JournalEntry } from './types';

export const journalKeys = {
  all: ['journal'] as const,
  overview: () => [...journalKeys.all, 'overview'] as const,
  entries: (params: object) => [...journalKeys.all, 'entries', params] as const,
  entry: (id: string) => [...journalKeys.all, 'entry', id] as const,
  analytics: (days: number) => [...journalKeys.all, 'analytics', days] as const,
  settings: () => [...journalKeys.all, 'settings'] as const,
};

/** Any write can move streaks, lists and charts, so it refreshes the whole journal. */
export function useJournalMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.all }),
  });
}

const isPending = (e: JournalEntry) => e.analysis_status === 'pending';
// AI runs after the save returns; poll briefly until the summary/tags (or AI mood) land.
const pollWhilePending = (entries: JournalEntry[] | undefined) => (entries?.some(isPending) ? 2000 : false);

export const useJournalOverview = () => useQuery({ queryKey: journalKeys.overview(), queryFn: journalApi.overview });

export function useJournalEntries(params: { date_from?: string; date_to?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: journalKeys.entries(params),
    queryFn: () => journalApi.entries(params),
    refetchInterval: q => pollWhilePending(q.state.data?.entries),
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: journalKeys.entry(id),
    queryFn: () => journalApi.entry(id),
    refetchInterval: q => pollWhilePending(q.state.data ? [q.state.data] : undefined),
  });
}

export const useJournalAnalytics = (days: number) =>
  useQuery({ queryKey: journalKeys.analytics(days), queryFn: () => journalApi.analytics(days) });

export const useJournalSettings = () => useQuery({ queryKey: journalKeys.settings(), queryFn: journalApi.settings });
