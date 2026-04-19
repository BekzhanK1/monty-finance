import { useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Text,
  Stack,
  Card,
  Group,
  SimpleGrid,
  Badge,
  ActionIcon,
  SegmentedControl,
  TextInput,
  Button,
  Modal,
  NumberInput,
  Select,
  Box,
  useMantineColorScheme,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconSearch, IconDownload, IconTrash, IconX } from '@tabler/icons-react';
import { transactionsApi, categoriesApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Transaction, Category } from '../types';
import { modalShellResponsive } from '../theme/dashboardChrome';

const TIMEZONE = 'Asia/Almaty';

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
  const { haptic } = useTelegram();
  const { colorScheme } = useMantineColorScheme();
  const isNarrow = useMediaQuery('(max-width: 36em)');

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
    const t = setTimeout(() => setSearchDebounced(search), 500);
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
    haptic('light');
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  
  const goNextDay = () => {
    haptic('light');
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };
  
  const dayLabel = selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const openEditModal = (tx: Transaction) => {
    haptic('medium');
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
      haptic('success');
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
      haptic('success');
      setEditModalOpen(false);
      setEditingTx(null);
      loadTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    haptic('medium');
    try {
      const start = viewMode === 'day' ? toDateString(selectedDate) : undefined;
      let end: string | undefined;
      if (viewMode === 'day') {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        end = toDateString(d);
      }
      await transactionsApi.exportCsv(start, end);
      haptic('success');
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
    return s + (cat?.type === 'EXPENSE' && cat?.group !== 'SAVINGS' ? tx.amount : 0);
  }, 0);
  const savings = transactions.reduce((s, tx) => {
    const cat = categoryMap[tx.category_id];
    return s + (cat?.group === 'SAVINGS' ? tx.amount : 0);
  }, 0);
  const balance = income - expense;

  if (loading && transactions.length === 0) {
    return (
      <Container size="sm" pb={100}>
        <LoadingSkeleton />
      </Container>
    );
  }

  const title = categoryId && categoryMap[categoryId]
    ? `${categoryMap[categoryId].icon} ${categoryMap[categoryId].name}`
    : 'История транзакций';

  return (
    <Container size="sm" pb={100}>
      <Stack gap="lg">
        {/* Header */}
        <Box className="animate-slide-down">
          <Text fw={700} size="xl" mb="xs">{title}</Text>
          <Text size="sm" c="dimmed">Управляйте своими финансами</Text>
        </Box>

        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" className="stagger-item">
          <Card 
            shadow="md" 
            padding="md" 
            radius="xl" 
            withBorder
            className="hover-lift"
            style={{
              background: colorScheme === 'dark' 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(236, 253, 245, 0.9) 0%, rgba(209, 250, 229, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Text size="xs" c="dimmed" mb={4}>Доход</Text>
            <Text fw={700} size="lg" c="green">{formatNumber(income)} ₸</Text>
          </Card>
          <Card 
            shadow="md" 
            padding="md" 
            radius="xl" 
            withBorder
            className="hover-lift"
            style={{
              background: colorScheme === 'dark' 
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(254, 242, 242, 0.9) 0%, rgba(254, 226, 226, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Text size="xs" c="dimmed" mb={4}>Расход</Text>
            <Text fw={700} size="lg" c="red">{formatNumber(expense)} ₸</Text>
          </Card>
          {savings > 0 && (
            <Card 
              shadow="md" 
              padding="md" 
              radius="xl" 
              withBorder
              className="hover-lift"
              style={{
                background: colorScheme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, rgba(219, 234, 254, 0.9) 100%)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Text size="xs" c="dimmed" mb={4}>Накопления</Text>
              <Text fw={700} size="lg" c="blue">{formatNumber(savings)} ₸</Text>
            </Card>
          )}
          <Card 
            shadow="md" 
            padding="md" 
            radius="xl" 
            withBorder
            className="hover-lift"
            style={{
              background: colorScheme === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Text size="xs" c="dimmed" mb={4}>Баланс</Text>
            <Text fw={700} size="lg" c={balance >= 0 ? 'green' : 'red'}>{formatNumber(balance)} ₸</Text>
          </Card>
        </SimpleGrid>

        {/* Search Bar */}
        <Card 
          shadow="md" 
          padding="md" 
          radius="xl" 
          withBorder
          className="stagger-item"
          style={{
            background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <TextInput
            placeholder="Поиск по комментарию или категории..."
            leftSection={<IconSearch size={18} />}
            rightSection={
              search && (
                <ActionIcon 
                  variant="subtle" 
                  size="sm"
                  onClick={() => {
                    haptic('light');
                    setSearch('');
                  }}
                >
                  <IconX size={16} />
                </ActionIcon>
              )
            }
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="md"
            radius="lg"
            styles={{
              input: {
                border: 'none',
                background: 'transparent',
              }
            }}
          />
        </Card>

        {/* Controls */}
        <Group gap="md" className="stagger-item">
          <SegmentedControl
            value={viewMode}
            onChange={(v) => {
              haptic('light');
              setViewMode(v as 'all' | 'day');
            }}
            data={[
              { value: 'all', label: 'Все' },
              { value: 'day', label: 'По дням' },
            ]}
            radius="xl"
            style={{ flex: 1 }}
          />
          <Button
            leftSection={<IconDownload size={18} />}
            variant="light"
            radius="xl"
            loading={exporting}
            onClick={handleExport}
          >
            CSV
          </Button>
        </Group>

        {/* Day Navigator */}
        {viewMode === 'day' && (
          <Card 
            shadow="md" 
            padding="md" 
            radius="xl" 
            withBorder
            className="animate-scale-in"
            style={{
              background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Group justify="space-between" align="center">
              <ActionIcon 
                variant="light" 
                size="lg" 
                radius="xl"
                onClick={goPrevDay}
                className="hover-scale"
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
              <Text fw={600} size="md">{dayLabel}</Text>
              <ActionIcon 
                variant="light" 
                size="lg" 
                radius="xl"
                onClick={goNextDay}
                className="hover-scale"
              >
                <IconChevronRight size={20} />
              </ActionIcon>
            </Group>
          </Card>
        )}

        {/* Transactions List */}
        <Stack gap="sm">
          {transactions.length === 0 ? (
            <Card 
              shadow="md" 
              padding="xl" 
              radius="xl" 
              withBorder
              className="animate-fade-in"
              style={{
                background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Text c="dimmed" ta="center" size="lg">Нет транзакций</Text>
              <Text c="dimmed" ta="center" size="sm" mt="xs">Добавьте первую транзакцию</Text>
            </Card>
          ) : (
            transactions.map((tx, index) => {
              const cat = categoryMap[tx.category_id];
              const isIncome = cat?.type === 'INCOME';
              const isSavings = cat?.group === 'SAVINGS';
              const badgeColor = isIncome ? 'green' : isSavings ? 'blue' : 'red';
              const badgePrefix = isIncome ? '+' : '−';
              return (
                <Card
                  key={tx.id}
                  shadow="md"
                  padding="md"
                  radius="xl"
                  withBorder
                  className="stagger-item hover-lift"
                  style={{
                    cursor: 'pointer',
                    background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    animationDelay: `${index * 0.05}s`,
                  }}
                  onClick={() => openEditModal(tx)}
                >
                  <Group justify="space-between" wrap="nowrap" gap="md">
                    <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <Text size="2rem">{cat?.icon ?? '📦'}</Text>
                      <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                        <Text fw={600} size="md">{cat?.name ?? '—'}</Text>
                        <Text size="xs" c="dimmed">{formatDateUTC5(tx.transaction_date)}</Text>
                        {tx.comment && (
                          <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                            💬 {tx.comment}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                    <Badge 
                      color={badgeColor} 
                      variant="light" 
                      size="lg"
                      radius="md"
                      style={{ 
                        fontSize: '0.9rem',
                        padding: '12px 16px',
                        fontWeight: 700,
                      }}
                    >
                      {badgePrefix}{formatNumber(tx.amount)} ₸
                    </Badge>
                  </Group>
                </Card>
              );
            })
          )}
        </Stack>
      </Stack>

      {/* Edit Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => { 
          haptic('light');
          setEditModalOpen(false); 
          setEditingTx(null); 
        }}
        title={<Text fw={700} size="lg">Редактировать транзакцию</Text>}
        {...modalShellResponsive(!!isNarrow)}
      >
        {editingTx && (
          <Stack gap="md">
            <Select
              label="Категория"
              data={editCategoryOptions}
              value={editCategoryId}
              onChange={setEditCategoryId}
              radius="lg"
              comboboxProps={{ withinPortal: true }}
            />
            <NumberInput
              label="Сумма (₸)"
              value={editAmount}
              onChange={(v) => setEditAmount(Number(v) || 0)}
              min={0}
              thousandSeparator=" "
              radius="lg"
            />
            <TextInput
              label="Комментарий"
              value={editComment}
              onChange={(e) => setEditComment(e.currentTarget.value)}
              placeholder="Необязательно"
              radius="lg"
            />
            {isNarrow ? (
              <Stack gap="sm" mt="md">
                <Button
                  onClick={handleSaveEdit}
                  radius="xl"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'violet', deg: 135 }}
                  fullWidth
                >
                  Сохранить
                </Button>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={18} />}
                  onClick={handleDelete}
                  radius="xl"
                  fullWidth
                >
                  Удалить
                </Button>
              </Stack>
            ) : (
              <Group justify="space-between" mt="md" wrap="wrap">
                <Button 
                  variant="light" 
                  color="red" 
                  leftSection={<IconTrash size={18} />} 
                  onClick={handleDelete}
                  radius="xl"
                >
                  Удалить
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  radius="xl"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'violet', deg: 135 }}
                >
                  Сохранить
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
