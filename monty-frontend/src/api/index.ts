import axios from 'axios';
import type { Category, DashboardResponse, Goal, Transaction, User, Settings, Analytics, BudgetConfig, CategoryInput } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  telegram: async (initData: string) => {
    const { data } = await api.post('/auth/telegram', { initData });
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
    }
    return data;
  },
  me: async () => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};

export const categoriesApi = {
  getAll: async () => {
    const { data } = await api.get<Category[]>('/categories');
    return data;
  },
  create: async (category: CategoryInput) => {
    const { data } = await api.post<Category>('/categories', category);
    return data;
  },
  update: async (id: number, category: Partial<CategoryInput>) => {
    const { data } = await api.put<Category>(`/categories/${id}`, category);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/categories/${id}`);
    return data;
  },
};

export const transactionsApi = {
  create: async (categoryId: number, amount: number, comment?: string) => {
    const { data } = await api.post<Transaction>('/transactions', {
      category_id: categoryId,
      amount,
      comment,
    });
    return data;
  },
  getAll: async (params?: { category_id?: number; start_date?: string; end_date?: string; search?: string }) => {
    const { data } = await api.get<Transaction[]>('/transactions', { params });
    return data;
  },
  update: async (id: string, payload: { category_id?: number; amount?: number; comment?: string }) => {
    const { data } = await api.patch<Transaction>(`/transactions/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/transactions/${id}`);
  },
  exportCsv: async (start_date?: string, end_date?: string) => {
    const { data } = await api.get<Blob>('/transactions/export/csv', {
      params: { start_date, end_date },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const budgetsApi = {
  current: async () => {
    const { data } = await api.get<DashboardResponse>('/budgets/current');
    return data;
  },
};

export const goalsApi = {
  get: async () => {
    const { data } = await api.get<Goal>('/goals');
    return data;
  },
};

export const settingsApi = {
  get: async () => {
    const { data } = await api.get<Settings>('/settings');
    return data;
  },
  update: async (key: string, value: string) => {
    const { data } = await api.post('/settings', { key, value });
    return data;
  },
  getBudgets: async () => {
    const { data } = await api.get<BudgetConfig[]>('/settings/budgets');
    return data;
  },
  updateBudget: async (categoryId: number, limitAmount: number) => {
    const { data } = await api.post('/settings/budgets', { category_id: categoryId, limit_amount: limitAmount, period: new Date().toISOString().split('T')[0] });
    return data;
  },
};

export const analyticsApi = {
  get: async (months: number = 3) => {
    const { data } = await api.get<Analytics>('/analytics', { params: { months } });
    return data;
  },
  getPeriod: async (startDate?: string, endDate?: string) => {
    const { data } = await api.get<Analytics>('/analytics/period', { params: { start_date: startDate, end_date: endDate } });
    return data;
  },
};

export const digestApi = {
  send: async () => {
    const { data } = await api.post('/digest/send');
    return data;
  },
};

export default api;
