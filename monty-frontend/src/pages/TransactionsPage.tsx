import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Text,
  Stack,
  Card,
  Group,
  LoadingOverlay,
  Badge,
  ActionIcon,
  SegmentedControl,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { transactionsApi, categoriesApi } from '../api';
import type { Transaction, Category } from '../types';

const TIMEZONE = 'Asia/Almaty'; // UTC+5

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

function formatDateUTC5(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getTodayUTC5(): Date {
  const now = new Date();
  const str = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  return new Date(str + 'T12:00:00');
}

export function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const categoryIdParam = searchParams.get('category_id');
  const categoryId = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined;

  const [viewMode, setViewMode] = useState<'all' | 'day'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(() => getTodayUTC5());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: { category_id?: number; start_date?: string; end_date?: string } = {};
    if (categoryId) params.category_id = categoryId;
    if (viewMode === 'day') {
      params.start_date = toDateString(selectedDate);
      const end = new Date(selectedDate);
      end.setDate(end.getDate() + 1);
      params.end_date = toDateString(end);
    }
    Promise.all([
      transactionsApi.getAll(params),
      categoriesApi.getAll(),
    ])
      .then(([txs, cats]) => {
        setTransactions(txs);
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categoryId, viewMode, selectedDate]);

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };
  const dayLabel = selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  const income = transactions.reduce((s, tx) => {
    const cat = categoryMap[tx.category_id];
    return s + (cat?.type === 'INCOME' ? tx.amount : 0);
  }, 0);
  const expense = transactions.reduce((s, tx) => {
    const cat = categoryMap[tx.category_id];
    return s + (cat?.type === 'EXPENSE' ? tx.amount : 0);
  }, 0);
  const balance = income - expense;

  if (loading) {
    return <LoadingOverlay visible />;
  }

  const title = categoryId && categoryMap[categoryId]
    ? `История: ${categoryMap[categoryId].icon} ${categoryMap[categoryId].name}`
    : 'Все транзакции';

  return (
    <Container size="sm" pb={100}>
      <Text fw={700} size="lg" mb="md">{title}</Text>

      <Group grow mb="md">
        <Card withBorder padding="xs" radius="md">
          <Text size="xs" c="dimmed">Расход</Text>
          <Text fw={600} size="sm" c="red">{formatNumber(expense)} ₸</Text>
        </Card>
        <Card withBorder padding="xs" radius="md">
          <Text size="xs" c="dimmed">Доход</Text>
          <Text fw={600} size="sm" c="green">{formatNumber(income)} ₸</Text>
        </Card>
        <Card withBorder padding="xs" radius="md">
          <Text size="xs" c="dimmed">Баланс</Text>
          <Text fw={600} size="sm" c={balance >= 0 ? 'green' : 'red'}>{formatNumber(balance)} ₸</Text>
        </Card>
      </Group>

      <SegmentedControl
        value={viewMode}
        onChange={(v) => setViewMode(v as 'all' | 'day')}
        data={[
          { value: 'all', label: 'Все' },
          { value: 'day', label: 'По дням' },
        ]}
        fullWidth
        mb="md"
      />

      {viewMode === 'day' && (
        <Group justify="space-between" align="center" mb="md">
          <ActionIcon variant="light" size="lg" onClick={goPrevDay} aria-label="Предыдущий день">
            <IconChevronLeft size={20} />
          </ActionIcon>
          <Text fw={600} size="sm">{dayLabel}</Text>
          <ActionIcon variant="light" size="lg" onClick={goNextDay} aria-label="Следующий день">
            <IconChevronRight size={20} />
          </ActionIcon>
        </Group>
      )}

      <Stack gap="xs">
        {transactions.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">Нет транзакций</Text>
        ) : (
          transactions.map((tx) => {
            const cat = categoryMap[tx.category_id];
            const isIncome = cat?.type === 'INCOME';
            return (
              <Card key={tx.id} shadow="xs" padding="sm" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Text size="lg">{cat?.icon ?? '📦'}</Text>
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Text fw={500} size="sm">{cat?.name ?? '—'}</Text>
                      <Text size="xs" c="dimmed">{formatDateUTC5(tx.transaction_date)}</Text>
                      {tx.comment && (
                        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>📝 {tx.comment}</Text>
                      )}
                    </Stack>
                  </Group>
                  <Badge color={isIncome ? 'green' : 'red'} variant="light" size="lg">
                    {isIncome ? '+' : '−'}{formatNumber(tx.amount)} ₸
                  </Badge>
                </Group>
              </Card>
            );
          })
        )}
      </Stack>
    </Container>
  );
}
