import { useEffect, useState, useCallback } from 'react';
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
  TextInput,
  Button,
  Modal,
  NumberInput,
  Select,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconSearch, IconDownload, IconEdit, IconTrash } from '@tabler/icons-react';
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
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [exporting, setExporting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 1500);
    return () => clearTimeout(t);
  }, [search]);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    const params: { category_id?: number; start_date?: string; end_date?: string; search?: string } = {};
    if (categoryId) params.category_id = categoryId;
    if (viewMode === 'day') {
      params.start_date = toDateString(selectedDate);
      const end = new Date(selectedDate);
      end.setDate(end.getDate() + 1);
      params.end_date = toDateString(end);
    }
    if (searchDebounced.trim()) params.search = searchDebounced.trim();
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
  }, [categoryId, viewMode, selectedDate, searchDebounced]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(tx.amount);
    setEditCategoryId(String(tx.category_id));
    setEditComment(tx.comment ?? '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    try {
      await transactionsApi.update(editingTx.id, {
        amount: editAmount,
        category_id: editCategoryId ? parseInt(editCategoryId, 10) : undefined,
        comment: editComment || undefined,
      });
      setEditModalOpen(false);
      setEditingTx(null);
      loadTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!editingTx || !window.confirm('Удалить транзакцию?')) return;
    try {
      await transactionsApi.delete(editingTx.id);
      setEditModalOpen(false);
      setEditingTx(null);
      loadTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const start = viewMode === 'day' ? toDateString(selectedDate) : undefined;
      let end: string | undefined;
      if (viewMode === 'day') {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        end = toDateString(d);
      }
      await transactionsApi.exportCsv(start, end);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const editCategoryOptions = [
    ...expenseCategories.map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` })),
    ...incomeCategories.map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` })),
  ];

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

      <TextInput
        placeholder="Поиск по комментарию или категории"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="md"
      />

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

      <Group mb="md">
        <Button
          leftSection={<IconDownload size={16} />}
          variant="light"
          size="xs"
          loading={exporting}
          onClick={handleExport}
        >
          Экспорт CSV
        </Button>
      </Group>

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
              <Card
                key={tx.id}
                shadow="xs"
                padding="sm"
                radius="md"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => openEditModal(tx)}
              >
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
                  <Group gap="xs" wrap="nowrap">
                    <Badge color={isIncome ? 'green' : 'red'} variant="light" size="lg">
                      {isIncome ? '+' : '−'}{formatNumber(tx.amount)} ₸
                    </Badge>
                    <ActionIcon variant="subtle" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(tx); }} aria-label="Редактировать">
                      <IconEdit size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            );
          })
        )}
      </Stack>

      <Modal
        opened={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingTx(null); }}
        title="Редактировать транзакцию"
      >
        {editingTx && (
          <Stack gap="md">
            <Select
              label="Категория"
              data={editCategoryOptions}
              value={editCategoryId}
              onChange={setEditCategoryId}
            />
            <NumberInput
              label="Сумма (₸)"
              value={editAmount}
              onChange={(v) => setEditAmount(Number(v) || 0)}
              min={0}
            />
            <TextInput
              label="Комментарий"
              value={editComment}
              onChange={(e) => setEditComment(e.currentTarget.value)}
              placeholder="Необязательно"
            />
            <Group justify="space-between">
              <Button variant="light" color="red" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
                Удалить
              </Button>
              <Button onClick={handleSaveEdit}>Сохранить</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
