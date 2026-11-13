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
import type { BudgetWithSpent } from '../../types';
import { haptic } from '../../lib/telegram';
import { useDashboard, useSettings, useUpdateBudgetLimit } from './queries';
import {
  AmountText,
  CategoryIcon,
  EmptyState,
  ListRow,
  PageHeader,
  Section,
  formatMoney,
  groupTint,
} from '../../ui';
import { computeHomeSummary, type HomeSummary } from '../home/summary';

/** Budget details: group rings, the overall budget and every category limit (tap to edit). */
export function BudgetsPage() {
  const navigate = useNavigate();
  const dashboardQuery = useDashboard();
  const settingsQuery = useSettings();
  const dashboard = dashboardQuery.data;
  const [editing, setEditing] = useState<BudgetWithSpent | null>(null);
  const summary = useMemo(() => (dashboard ? computeHomeSummary(dashboard) : null), [dashboard]);
  const totalBudget = parseInt(settingsQuery.data?.total_budget || '0', 10);
  const budgets = dashboard?.budgets ?? [];

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader title="Бюджеты" onBack={() => navigate('/')} />

      {dashboardQuery.isError ? (
        <EmptyState
          icon="⚠️"
          title="Не удалось загрузить бюджет"
          action={{ label: 'Повторить', onClick: () => void dashboardQuery.refetch() }}
        />
      ) : !summary ? (
        <Stack gap="md" mt="sm">
          <Skeleton h={80} radius="lg" />
          <Skeleton h={220} radius="lg" />
        </Stack>
      ) : (
        <Stack gap="lg" mt="sm">
          {summary.hasBudgets ? (
            <GroupRings summary={summary} />
          ) : (
            <EmptyState
              icon="🗂️"
              title="Бюджетов пока нет"
              description="Задайте лимиты по категориям — и Monty посчитает, сколько можно тратить в день."
              action={{ label: 'Настроить', onClick: () => navigate('/settings') }}
            />
          )}

          {totalBudget > 0 && (
            <Section title="Общий бюджет">
              <ListRow title="На период" trailing={<AmountText value={totalBudget} fw={600} />} />
              <ListRow divider title="Свободно после трат" trailing={<AmountText value={totalBudget - summary.spent} tone="auto" fw={600} />} />
              <ListRow divider title="Свободно после плана" trailing={<AmountText value={totalBudget - summary.limit} tone="auto" fw={600} />} />
            </Section>
          )}

          <BudgetGroupSection title="База" budgets={budgets.filter(b => b.group === 'BASE')} onSelect={setEditing} />
          <BudgetGroupSection title="Комфорт" budgets={budgets.filter(b => b.group === 'COMFORT')} onSelect={setEditing} />
          <BudgetGroupSection title="Накопления" budgets={budgets.filter(b => b.group === 'SAVINGS')} onSelect={setEditing} />

          <Button variant="light" onClick={() => navigate('/settings')}>Изменить категории и лимиты</Button>
        </Stack>
      )}

      <BudgetSheet budget={editing} onClose={() => setEditing(null)} />
    </Container>
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
