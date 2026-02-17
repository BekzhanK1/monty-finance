import axios from 'axios';
import type { Category, DashboardResponse, Goal, Transaction, User, Settings } from '../types';

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
  getAll: async (params?: { category_id?: number; start_date?: string; end_date?: string }) => {
    const { data } = await api.get<Transaction[]>('/transactions', { params });
    return data;
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
};

export const digestApi = {
  send: async () => {
    const { data } = await api.post('/digest/send');
    return data;
  },
};

export default api;
