import api from '../../services/http';
import type { JournalAnalytics, JournalEntry, JournalOverview, JournalSettings } from './types';

const get = async <T,>(url: string, params?: object) => (await api.get<T>(url, { params })).data;

export const journalApi = {
  overview: () => get<JournalOverview>('/journal/overview'),
  entries: (params: { date_from?: string; date_to?: string; limit?: number; offset?: number } = {}) =>
    get<{ entries: JournalEntry[]; total: number }>('/journal/entries', params),
  entry: (id: string) => get<JournalEntry>(`/journal/entries/${id}`),
  create: async (body: { content?: string; mood?: number }) => (await api.post<JournalEntry>('/journal/entries', body)).data,
  update: async (id: string, body: { content?: string; mood?: number }) =>
    (await api.patch<JournalEntry>(`/journal/entries/${id}`, body)).data,
  reanalyze: async (id: string) => (await api.post<JournalEntry>(`/journal/entries/${id}/analyze`)).data,
  remove: async (id: string) => { await api.delete(`/journal/entries/${id}`); },
  analytics: (days: number) => get<JournalAnalytics>('/journal/analytics', { days }),
  settings: () => get<JournalSettings>('/journal/settings'),
  updateSettings: async (body: Partial<JournalSettings>) => (await api.put<JournalSettings>('/journal/settings', body)).data,
  testReminder: async () => { await api.post('/journal/settings/test-reminder'); },
};

/** FastAPI `detail` string, or a fallback. */
export function errorDetail(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}
