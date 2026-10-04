import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Drawer,
  Group,
  NumberInput,
  Progress,
  RingProgress,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowDownLeft, IconArrowUpRight, IconMicrophone } from '@tabler/icons-react';
import type { BudgetWithSpent } from '../../types';
import { haptic } from '../../lib/telegram';
import { useVoiceInput } from '../voice/VoiceContext';
import {
  useCategories,
  useDashboard,
  useGoal,
  useSettings,
  useTransactions,
  useUpdateBudgetLimit,
} from '../finance/queries';
import { TransactionRow } from '../finance/TransactionRow';
import {
  AmountText,
  CategoryIcon,
  EmptyState,
  ListRow,
  PageHeader,
  Section,
  formatMoney,
  groupTint,
  pluralRu,
} from '../../ui';
import { computeHomeSummary, type HomeSummary } from './summary';

const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function HomePage() {
  const navigate = useNavigate();
  const dashboardQuery = useDashboard();
  const goalQuery = useGoal();
  const settingsQuery = useSettings();
  const categoriesQuery = useCategories();
  const dashboard = dashboardQuery.data;
  const recentQuery = useTransactions(
    { start_date: dashboard?.period_start },
    { enabled: !!dashboard?.period_start },
  );
  const [editing, setEditing] = useState<BudgetWithSpent | null>(null);

  const summary = useMemo(() => (dashboard ? computeHomeSummary(dashboard) : null), [dashboard]);
  const categoriesById = useMemo(
    () => new Map((categoriesQuery.data ?? []).map(c => [c.id, c])),
    [categoriesQuery.data],
  );
  const totalBudget = parseInt(settingsQuery.data?.total_budget || '0', 10);

  if (dashboardQuery.isError) {
    return (
      <Container size="sm" pb="var(--monty-page-pb)">
        <PageHeader title="Главная" />
        <EmptyState
          icon="⚠️"
          title="Не удалось загрузить бюджет"
          description="Проверьте соединение и попробуйте ещё раз."
          action={{ label: 'Повторить', onClick: () => void dashboardQuery.refetch() }}
        />
      </Container>
    );
  }

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader title={greeting()} subtitle={summary?.periodEnd ? `Период до ${shortDate.format(summary.periodEnd)}` : undefined} />

      <Stack gap="lg" mt="sm">
        {summary ? <Hero summary={summary} /> : <Skeleton h={190} radius="lg" />}
        <QuickActions />

        {summary && summary.hasBudgets && <GroupRings summary={summary} />}

        {totalBudget > 0 && summary && (
          <Section title="Общий бюджет">
            <ListRow title="На период" trailing={<AmountText value={totalBudget} fw={600} />} />
            <ListRow divider title="Свободно после трат" trailing={<AmountText value={totalBudget - summary.spent} tone="auto" fw={600} />} />
            <ListRow divider title="Свободно после плана" trailing={<AmountText value={totalBudget - summary.limit} tone="auto" fw={600} />} />
          </Section>
        )}

        {goalQuery.data && goalQuery.data.target_amount > 0 && <GoalSection />}

        <BudgetGroupSection title="База" budgets={dashboard?.budgets.filter(b => b.group === 'BASE') ?? []} onSelect={setEditing} />
        <BudgetGroupSection title="Комфорт" budgets={dashboard?.budgets.filter(b => b.group === 'COMFORT') ?? []} onSelect={setEditing} />
        <BudgetGroupSection title="Накопления" budgets={dashboard?.budgets.filter(b => b.group === 'SAVINGS') ?? []} onSelect={setEditing} />

        <Section title="Последние операции" action={{ label: 'Все', onClick: () => navigate('/transactions') }}>
          {recentQuery.isPending && dashboard?.period_start ? (
            <Stack p="md" gap="sm">
              {[0, 1, 2].map(i => <Skeleton key={i} h={36} radius="md" />)}
            </Stack>
          ) : (recentQuery.data ?? []).length === 0 ? (
            <EmptyState icon="🧾" title="Пока пусто" description="Добавьте первую трату — кнопкой ＋ или голосом." />
          ) : (
            (recentQuery.data ?? []).slice(0, 5).map((t, i) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                category={categoriesById.get(t.category_id)}
                showDate
                divider={i > 0}
                onClick={() => navigate(`/transactions?focus=${t.id}`)}
              />
            ))
          )}
        </Section>
      </Stack>

      <BudgetSheet budget={editing} onClose={() => setEditing(null)} />
    </Container>
  );
}

function Hero({ summary }: { summary: HomeSummary }) {
  const navigate = useNavigate();

  if (!summary.hasBudgets) {
    return (
      <Box p="lg" style={{ borderRadius: 'var(--monty-radius-card)', background: 'var(--monty-surface)' }}>
        <Text size="sm" style={{ color: 'var(--monty-hint)' }}>Потрачено за период</Text>
        <AmountText value={summary.spent} fz={36} fw={700} lh={1.2} />
        <Text size="sm" mt="xs" style={{ color: 'var(--monty-hint)' }}>
          Задайте бюджеты по категориям — и Monty посчитает, сколько можно тратить в день.
        </Text>
        <Button mt="md" variant="light" onClick={() => navigate('/settings')}>Настроить бюджеты</Button>
      </Box>
    );
  }

  const over = summary.remaining < 0;
  const paceText = {
    under: 'Тратите медленнее плана 👍',
    on: 'Идёте по плану',
    over: `Темп выше плана: к концу периода выйдет ${formatMoney(summary.forecast)}`,
  }[summary.pace];

  return (
    <Box
      p="lg"
      style={{
        borderRadius: 'var(--monty-radius-card)',
        background: over
          ? 'color-mix(in srgb, var(--monty-negative) 12%, var(--monty-surface))'
          : 'color-mix(in srgb, var(--monty-accent) 12%, var(--monty-surface))',
      }}
    >
      <Text size="sm" fw={500} style={{ color: 'var(--monty-subtitle)' }}>
        {over ? 'Бюджет превышен на' : 'Можно потратить сегодня'}
      </Text>
      <AmountText
        value={over ? -summary.remaining : summary.safePerDay}
        fz={40}
        fw={800}
        lh={1.15}
        style={{ color: over ? 'var(--monty-negative)' : 'var(--monty-text)', letterSpacing: -0.5 }}
      />
      <Text size="sm" mt={4} style={{ color: 'var(--monty-subtitle)' }}>
        {over
          ? `Потрачено ${formatMoney(summary.spent)} из ${formatMoney(summary.limit)}`
          : `Осталось ${formatMoney(summary.remaining)} на ${summary.daysLeft} ${pluralRu(summary.daysLeft, ['день', 'дня', 'дней'])}`}
      </Text>

      <Box mt="md" style={{ position: 'relative' }}>
        <Progress
          value={Math.min(100, summary.spentPercent)}
          size={8}
          radius="xl"
          color={over || summary.pace === 'over' ? 'var(--monty-negative)' : 'var(--monty-accent)'}
          styles={{ root: { background: 'color-mix(in srgb, var(--monty-text) 10%, transparent)' } }}
          aria-label={`Потрачено ${Math.round(summary.spentPercent)}% бюджета`}
        />
        {/* Where spending "should" be today. */}
        <Box
          aria-hidden
          style={{
            position: 'absolute',
            top: -3,
            left: `calc(${Math.min(100, summary.timePercent)}% - 1px)`,
            width: 2,
            height: 14,
            borderRadius: 1,
            background: 'var(--monty-text)',
            opacity: 0.45,
          }}
        />
      </Box>
      <Text size="xs" mt={8} style={{ color: summary.pace === 'over' ? 'var(--monty-negative)' : 'var(--monty-subtitle)' }}>
        {paceText}
      </Text>
    </Box>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const openVoice = useVoiceInput();
  const actions = [
    { label: 'Голосом', icon: IconMicrophone, onClick: () => openVoice() },
    { label: 'Расход', icon: IconArrowUpRight, onClick: () => navigate('/add') },
    { label: 'Доход', icon: IconArrowDownLeft, onClick: () => navigate('/add?type=INCOME') },
  ];
  return (
    <Group grow gap="sm">
      {actions.map(a => (
        <UnstyledButton
          key={a.label}
          onClick={() => {
            haptic('light');
            a.onClick();
          }}
          className="monty-pressable"
          py={12}
          style={{
            borderRadius: 14,
            background: 'var(--monty-surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: 'var(--monty-accent)',
          }}
        >
          <a.icon size={22} />
          <Text size="xs" fw={600} style={{ color: 'var(--monty-text)' }}>{a.label}</Text>
        </UnstyledButton>
      ))}
    </Group>
  );
}

function GroupRings({ summary }: { summary: HomeSummary }) {
  const rings = [
    { label: 'База', totals: summary.base, color: groupTint('BASE') },
    { label: 'Комфорт', totals: summary.comfort, color: groupTint('COMFORT') },
  ].filter(r => r.totals.limit > 0);

  return (
    <Group grow gap="sm" align="stretch">
      {rings.map(r => {
        const over = r.totals.spent > r.totals.limit;
        return (
          <Group
            key={r.label}
            gap="sm"
            wrap="nowrap"
            p="sm"
            style={{ borderRadius: 'var(--monty-radius-card)', background: 'var(--monty-surface)' }}
          >
            <RingProgress
              size={56}
              thickness={6}
              roundCaps
              sections={[{ value: Math.min(100, r.totals.percent), color: over ? 'var(--monty-negative)' : r.color }]}
              rootColor="color-mix(in srgb, var(--monty-text) 10%, transparent)"
              label={<Text ta="center" fz={12} fw={700} className="monty-tabular">{Math.round(r.totals.percent)}%</Text>}
            />
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="sm" fw={600}>{r.label}</Text>
              <Text size="xs" className="monty-tabular" style={{ color: over ? 'var(--monty-negative)' : 'var(--monty-hint)' }}>
                {over ? `−${formatMoney(r.totals.spent - r.totals.limit)}` : `${formatMoney(r.totals.limit - r.totals.spent)} ост.`}
              </Text>
            </Stack>
          </Group>
        );
      })}
      {summary.savings > 0 && (
        <Stack
          gap={0}
          p="sm"
          justify="center"
          style={{ borderRadius: 'var(--monty-radius-card)', background: 'var(--monty-surface)' }}
        >
          <Text size="xs" style={{ color: 'var(--monty-hint)' }}>Отложено</Text>
          <AmountText value={summary.savings} tone="savings" fw={700} />
        </Stack>
      )}
    </Group>
  );
}

function GoalSection() {
  const { data: goal } = useGoal();
  if (!goal) return null;
  const progress = Math.min(100, Math.max(0, goal.progress_percent ?? (goal.current_savings / goal.target_amount) * 100));
  const daysText = goal.days_remaining > 0
    ? `${goal.days_remaining} ${pluralRu(goal.days_remaining, ['день', 'дня', 'дней'])} до цели`
    : goal.days_remaining === 0 ? 'Срок цели сегодня' : 'Срок цели прошёл';
  return (
    <Section title="Цель" padded>
      <Group justify="space-between" align="flex-end" mb={8} wrap="nowrap">
        <Stack gap={0}>
          <AmountText value={goal.current_savings} fz={22} fw={700} tone="savings" />
          <Text size="xs" style={{ color: 'var(--monty-hint)' }}>из {formatMoney(goal.target_amount)}</Text>
        </Stack>
        <Text fw={700} className="monty-tabular" style={{ color: 'var(--monty-savings)' }}>{progress.toFixed(0)}%</Text>
      </Group>
      <Progress value={progress} size={8} radius="xl" color="var(--monty-savings)"
        styles={{ root: { background: 'color-mix(in srgb, var(--monty-text) 10%, transparent)' } }} />
      <Text size="xs" mt={8} style={{ color: 'var(--monty-hint)' }}>
        {daysText}{goal.daily_needed > 0 && goal.days_remaining > 0 ? ` · откладывать ${formatMoney(goal.daily_needed)} в день` : ''}
      </Text>
    </Section>
  );
}

function BudgetGroupSection({ title, budgets, onSelect }: { title: string; budgets: BudgetWithSpent[]; onSelect: (b: BudgetWithSpent) => void }) {
  if (budgets.length === 0) return null;
  return (
    <Section title={title}>
      {budgets.map((b, i) => <BudgetRow key={b.category_id} budget={b} divider={i > 0} onClick={() => onSelect(b)} />)}
    </Section>
  );
}

function BudgetRow({ budget, divider, onClick }: { budget: BudgetWithSpent; divider: boolean; onClick: () => void }) {
  const isSavings = budget.group === 'SAVINGS';
  const percent = budget.limit_amount > 0 ? (budget.spent / budget.limit_amount) * 100 : 0;
  const over = !isSavings && budget.remaining < 0;
  const tint = groupTint(budget.group);

  return (
    <UnstyledButton
      onClick={() => {
        haptic('light');
        onClick();
      }}
      className="monty-pressable"
      style={{ display: 'block', width: '100%', position: 'relative' }}
    >
      {divider && (
        <Box aria-hidden style={{ position: 'absolute', top: 0, left: 64, right: 0, height: 1, transform: 'scaleY(0.5)', background: 'var(--monty-separator)' }} />
      )}
      <Group wrap="nowrap" gap={12} px={16} py={10}>
        <CategoryIcon icon={budget.category_icon} tint={tint} />
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text fw={500} lineClamp={1}>{budget.category_name}</Text>
            {isSavings ? (
              <AmountText value={budget.spent} tone="savings" fw={600} />
            ) : (
              <AmountText value={budget.remaining} tone="auto" fw={600} />
            )}
          </Group>
          {!isSavings && budget.limit_amount > 0 && (
            <>
              <Progress
                value={Math.min(100, percent)}
                size={4}
                radius="xl"
                color={over || percent >= 90 ? 'var(--monty-negative)' : percent >= 70 ? 'var(--monty-warning)' : tint}
                styles={{ root: { background: 'color-mix(in srgb, var(--monty-text) 8%, transparent)' } }}
              />
              <Text size="xs" className="monty-tabular" style={{ color: 'var(--monty-hint)' }}>
                {formatMoney(budget.spent)} из {formatMoney(budget.limit_amount)}
              </Text>
            </>
          )}
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

function BudgetSheet({ budget, onClose }: { budget: BudgetWithSpent | null; onClose: () => void }) {
  const navigate = useNavigate();
  const updateLimit = useUpdateBudgetLimit();
  const [value, setValue] = useState<number | string>('');
  const [lastId, setLastId] = useState<number | null>(null);

  // Reset the input when a different budget opens (state derived from props, no effect needed).
  if (budget && budget.category_id !== lastId) {
    setLastId(budget.category_id);
    setValue(budget.limit_amount);
  }

  const save = async () => {
    if (!budget) return;
    const limit = typeof value === 'number' ? Math.max(0, Math.round(value)) : 0;
    await updateLimit.mutateAsync({ categoryId: budget.category_id, limitAmount: limit });
    haptic('success');
    onClose();
  };

  return (
    <Drawer
      opened={budget !== null}
      onClose={onClose}
      position="bottom"
      size="auto"
      radius="lg"
      title={budget && (
        <Group gap="sm">
          <CategoryIcon icon={budget.category_icon} tint={groupTint(budget.group)} size={32} />
          <Text fw={700} size="lg">{budget.category_name}</Text>
        </Group>
      )}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}
    >
      {budget && (
        <Stack gap="md">
          <Group grow>
            <Stack gap={0}>
              <Text size="xs" style={{ color: 'var(--monty-hint)' }}>Потрачено</Text>
              <AmountText value={budget.spent} fw={700} fz="lg" />
            </Stack>
            {budget.group !== 'SAVINGS' && (
              <Stack gap={0}>
                <Text size="xs" style={{ color: 'var(--monty-hint)' }}>Осталось</Text>
                <AmountText value={budget.remaining} tone="auto" fw={700} fz="lg" />
              </Stack>
            )}
          </Group>
          <NumberInput
            label="Лимит на период"
            value={value}
            onChange={setValue}
            min={0}
            step={1000}
            thousandSeparator=" "
            suffix=" ₸"
            allowDecimal={false}
            allowNegative={false}
            size="md"
          />
          <Group grow>
            <Button
              variant="default"
              size="md"
              onClick={() => {
                onClose();
                navigate(`/transactions?category_id=${budget.category_id}`);
              }}
            >
              Операции
            </Button>
            <Button size="md" loading={updateLimit.isPending} onClick={save}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      )}
    </Drawer>
  );
}
