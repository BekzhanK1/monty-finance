import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { VoiceSheet } from './VoiceSheet';

const api = vi.hoisted(() => ({
  parse: vi.fn(),
  createBulk: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock('../../services/finance', () => ({
  voiceApi: { parse: api.parse },
  transactionsApi: { createBulk: api.createBulk },
  categoriesApi: { getAll: api.getCategories },
  budgetsApi: {},
  goalsApi: {},
  settingsApi: {},
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MantineProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MantineProvider>
  );
}

describe('VoiceSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCategories.mockResolvedValue([
      { id: 2, name: 'Транспорт', group: 'BASE', type: 'EXPENSE', icon: '🚕' },
      { id: 3, name: 'Зарплата', group: 'INCOME', type: 'INCOME', icon: '💰' },
    ]);
  });

  it('parses typed text, lets the user edit the draft, and saves it', async () => {
    api.parse.mockResolvedValue({
      text: '500 такси',
      drafts: [{ amount: 500, category_id: 2, category_name: 'Транспорт', category_icon: '🚕', type: 'EXPENSE', comment: 'такси', transaction_date: null }],
    });
    api.createBulk.mockResolvedValue([]);
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(<VoiceSheet opened onClose={onClose} onSaved={onSaved} />, { wrapper });

    fireEvent.change(screen.getByPlaceholderText(/500 такси/), { target: { value: '500 такси' } });
    fireEvent.click(screen.getByLabelText('Разобрать текст'));

    expect(api.parse).toHaveBeenCalledWith({ text: '500 такси' });
    const amount = await screen.findByLabelText('Сумма');
    fireEvent.change(amount, { target: { value: '650' } });
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1));
    expect(api.createBulk).toHaveBeenCalledWith([
      { category_id: 2, amount: 650, comment: 'такси', transaction_date: null, source: 'voice', raw_text: '500 такси' },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the server message when parsing fails and stays on capture', async () => {
    api.parse.mockRejectedValue(Object.assign(new Error('422'), {
      isAxiosError: true,
      response: { status: 422, data: { detail: 'Не понял сумму.' } },
    }));

    render(<VoiceSheet opened onClose={() => {}} />, { wrapper });
    fireEvent.change(screen.getByPlaceholderText(/500 такси/), { target: { value: 'что-то' } });
    fireEvent.keyDown(screen.getByPlaceholderText(/500 такси/), { key: 'Enter' });

    expect(await screen.findByText('Не понял сумму.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/500 такси/)).toBeInTheDocument();
  });

  it('falls back to text when recording is unsupported', () => {
    render(<VoiceSheet opened onClose={() => {}} />, { wrapper });
    expect(screen.getByText(/Запись голоса недоступна/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Начать запись')).not.toBeInTheDocument();
  });
});
