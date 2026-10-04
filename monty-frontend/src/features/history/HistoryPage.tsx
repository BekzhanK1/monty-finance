import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Button,
  Chip,
  CloseButton,
  Container,
  Drawer,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconChevronLeft, IconChevronRight, IconDownload, IconSearch } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { transactionsApi } from '../../services/finance';
import type { Category, Transaction } from '../../types';
import {
  useCategories,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '../finance/queries';
import { TransactionRow } from '../finance/TransactionRow';
import { AmountText, CategoryIcon, EmptyState, PageHeader, Section, groupTint, parseServerDate } from '../../ui';
import { dayLabel, groupByDay, kindOf, monthBounds, totalsByKind, type KindFilter } from './history';

const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
const fullDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const KIND_CHIPS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
  { value: 'savings', label: 'Накопления' },
];

export function HistoryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const categoryFilter = params.get('category_id') ? Number(params.get('category_id')) : null;
  const focusId = params.get('focus');

  const now = new Date();
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [kind, setKind] = useState<KindFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search.trim().toLowerCase(), 200);
  const [editingId, setEditingId] = useState<string | null>(null);

  const categoriesQuery = useCategories();
  const transactionsQuery = useTransactions(monthBounds(month.year, month.month));
  const categories = useMemo(
    () => new Map((categoriesQuery.data ?? []).map(c => [c.id, c])),
    [categoriesQuery.data],
  );

  const monthTx = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);
  const filtered = useMemo(() => monthTx.filter(t => {
    const category = categories.get(t.category_id);
    if (categoryFilter !== null && t.category_id !== categoryFilter) return false;
    if (kind !== 'all' && kindOf(category) !== kind) return false;
    if (debouncedSearch) {
      const haystack = `${t.comment ?? ''} ${category?.name ?? ''} ${t.raw_text ?? ''}`.toLowerCase();
      if (!haystack.includes(debouncedSearch)) return false;
    }
    return true;
  }), [monthTx, categories, categoryFilter, kind, debouncedSearch]);

  const groups = useMemo(() => groupByDay(filtered, categories), [filtered, categories]);
  const totals = useMemo(() => totalsByKind(filtered, categories), [filtered, categories]);

  // A row opened from Home (`?focus=<id>`) — derived, so it needs no effect.
  const sheetTx = monthTx.find(t => t.id === (editingId ?? focusId)) ?? null;

  const isCurrentMonth = month.year === now.getFullYear() && month.month === now.getMonth();
  const shiftMonth = (delta: number) => {
    haptic('selection');
    setMonth(m => {
      const d = new Date(m.year, m.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const closeSheet = () => {
    setEditingId(null);
    if (focusId) {
      params.delete('focus');
      setParams(params, { replace: true });
    }
  };

  const clearCategory = () => {
    params.delete('category_id');
    setParams(params, { replace: true });
  };

  const filterCategory = categoryFilter !== null ? categories.get(categoryFilter) : undefined;
  const monthLabel = monthFormat.format(new Date(month.year, month.month, 1)).replace(' г.', '');

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader
        title="История"
        right={
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="xl"
            aria-label="Экспорт месяца в CSV"
            onClick={() => {
              const { start_date, end_date } = monthBounds(month.year, month.month);
              void transactionsApi.exportCsv(start_date, end_date);
            }}
          >
            <IconDownload size={20} />
          </ActionIcon>
        }
      />

      <Stack gap="md" mt="sm">
        <Group justify="space-between" wrap="nowrap">
          <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
            <IconChevronLeft size={22} />
          </ActionIcon>
          <Text fw={600} tt="capitalize">{monthLabel}</Text>
          <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Следующий месяц" disabled={isCurrentMonth} onClick={() => shiftMonth(1)}>
            <IconChevronRight size={22} />
          </ActionIcon>
        </Group>

        <Group grow gap="sm">
          <Total label="Расходы" value={-totals.expense} tone="expense" />
          <Total label="Доходы" value={totals.income} tone="income" />
          {totals.savings > 0 && <Total label="Отложено" value={totals.savings} tone="savings" />}
        </Group>

        <TextInput
          placeholder="Поиск по комментарию и категории"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          rightSection={search ? <CloseButton size="sm" aria-label="Очистить поиск" onClick={() => setSearch('')} /> : null}
        />

        <ScrollArea type="never" offsetScrollbars={false}>
          <Group gap={8} wrap="nowrap">
            {filterCategory && (
              <Chip checked onChange={clearCategory} variant="filled" radius="xl">
                {filterCategory.icon} {filterCategory.name} ✕
              </Chip>
            )}
            {KIND_CHIPS.map(c => (
              <Chip
                key={c.value}
                checked={kind === c.value}
                onChange={() => {
                  haptic('selection');
                  setKind(c.value);
                }}
                variant={kind === c.value ? 'filled' : 'light'}
                radius="xl"
              >
                {c.label}
              </Chip>
            ))}
          </Group>
        </ScrollArea>

        {transactionsQuery.isPending ? (
          <Stack gap="sm">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} h={56} radius="lg" />)}
          </Stack>
        ) : transactionsQuery.isError ? (
          <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void transactionsQuery.refetch() }} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={search || kind !== 'all' || filterCategory ? '🔍' : '🧾'}
            title={search || kind !== 'all' || filterCategory ? 'Ничего не найдено' : 'В этом месяце операций нет'}
            action={isCurrentMonth && !search ? { label: 'Добавить', onClick: () => navigate('/add') } : undefined}
          />
        ) : (
          groups.map(group => (
            <Section
              key={group.key}
              title={
                <Group gap={6} component="span">
                  <span>{dayLabel(group.date)}</span>
                  <span style={{ fontWeight: 500, textTransform: 'none' }}>
                    · {group.net > 0 ? '+' : group.net < 0 ? '−' : ''}{Math.abs(group.net).toLocaleString('ru-RU')} ₸
                  </span>
                </Group>
              }
            >
              {group.items.map((t, i) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  category={categories.get(t.category_id)}
                  divider={i > 0}
                  onClick={() => {
                    haptic('light');
                    setEditingId(t.id);
                  }}
                />
              ))}
            </Section>
          ))
        )}
      </Stack>

      <TransactionSheet
        transaction={sheetTx}
        categories={categoriesQuery.data ?? []}
        onClose={closeSheet}
      />
    </Container>
  );
}

function Total({ label, value, tone }: { label: string; value: number; tone: 'expense' | 'income' | 'savings' }) {
  return (
    <Stack gap={0} p="sm" style={{ background: 'var(--monty-surface)', borderRadius: 14 }}>
      <Text size="xs" style={{ color: 'var(--monty-hint)' }}>{label}</Text>
      <AmountText value={value} tone={tone} sign={tone === 'income' && value > 0 ? 'always' : 'auto'} fw={700} />
    </Stack>
  );
}

function TransactionSheet({
  transaction,
  categories,
  onClose,
}: {
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
}) {
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const [draft, setDraft] = useState<{ id: string; amount: number | string; categoryId: string; comment: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Seed the form whenever a different transaction opens.
  if (transaction && draft?.id !== transaction.id) {
    setDraft({
      id: transaction.id,
      amount: transaction.amount,
      categoryId: String(transaction.category_id),
      comment: transaction.comment ?? '',
    });
    setConfirmDelete(false);
  }

  const category = categories.find(c => String(c.id) === draft?.categoryId);
  const options = [
    { group: 'Расходы', items: categories.filter(c => c.type === 'EXPENSE').map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` })) },
    { group: 'Доходы', items: categories.filter(c => c.type === 'INCOME').map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` })) },
  ].filter(g => g.items.length > 0);

  const amount = typeof draft?.amount === 'number' ? Math.round(draft.amount) : 0;

  const save = async () => {
    if (!transaction || !draft || amount <= 0) return;
    await update.mutateAsync({
      id: transaction.id,
      amount,
      category_id: Number(draft.categoryId),
      comment: draft.comment.trim(),
    });
    haptic('success');
    onClose();
  };

  const doDelete = async () => {
    if (!transaction) return;
    if (!confirmDelete) {
      haptic('warning');
      setConfirmDelete(true);
      return;
    }
    await remove.mutateAsync(transaction.id);
    haptic('success');
    onClose();
  };

  return (
    <Drawer
      opened={transaction !== null}
      onClose={onClose}
      position="bottom"
      size="auto"
      radius="lg"
      title={category && (
        <Group gap="sm">
          <CategoryIcon icon={category.icon} tint={groupTint(category.group)} size={32} />
          <Text fw={700} size="lg">{category.name}</Text>
        </Group>
      )}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}
    >
      {transaction && draft && (
        <Stack gap="sm">
          <Text size="xs" style={{ color: 'var(--monty-hint)' }}>
            {fullDateFormat.format(parseServerDate(transaction.transaction_date))}
            {transaction.raw_text ? ` · «${transaction.raw_text}»` : ''}
          </Text>
          <NumberInput
            label="Сумма"
            value={draft.amount}
            onChange={value => setDraft({ ...draft, amount: value })}
            min={1}
            thousandSeparator=" "
            suffix=" ₸"
            allowDecimal={false}
            allowNegative={false}
            hideControls
            size="md"
            error={amount > 0 ? undefined : 'Сумма должна быть больше нуля'}
          />
          <Select
            label="Категория"
            data={options}
            value={draft.categoryId}
            onChange={value => value && setDraft({ ...draft, categoryId: value })}
            allowDeselect={false}
            searchable
            size="md"
            comboboxProps={{ withinPortal: true, zIndex: 1000 }}
          />
          <TextInput
            label="Комментарий"
            value={draft.comment}
            onChange={e => setDraft({ ...draft, comment: e.currentTarget.value })}
            maxLength={255}
            size="md"
          />
          <Group grow mt="xs">
            <Button variant="light" color="red" size="md" loading={remove.isPending} onClick={doDelete}>
              {confirmDelete ? 'Точно удалить?' : 'Удалить'}
            </Button>
            <Button size="md" loading={update.isPending} disabled={amount <= 0} onClick={save}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      )}
    </Drawer>
  );
}
