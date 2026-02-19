import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Text,
  Progress,
  Card,
  Group,
  Stack,
  Badge,
  ActionIcon,
  ProgressRoot,
  LoadingOverlay,
  SimpleGrid,
  NumberInput,
} from '@mantine/core';
import { IconPlus, IconTarget } from '@tabler/icons-react';
import { budgetsApi, goalsApi, settingsApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import type { DashboardResponse, Goal } from '../types';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([budgetsApi.current(), goalsApi.get()])
      .then(([dash, g]) => {
        setDashboard(dash);
        setGoal(g);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddClick = () => {
    haptic('medium');
    navigate('/add');
  };

  const handleBudgetChange = async (categoryId: number, limitAmount: number) => {
    await settingsApi.updateBudget(categoryId, limitAmount);
    haptic('success');
    const dash = await budgetsApi.current();
    setDashboard(dash);
  };

  if (loading) {
    return <LoadingOverlay visible />;
  }

  const savingsProgress = goal 
    ? Math.min(100, (goal.current_savings / goal.target_amount) * 100) 
    : 0;

  const baseBudgets = dashboard?.budgets.filter(b => b.group === 'BASE') || [];
  const comfortBudgets = dashboard?.budgets.filter(b => b.group === 'COMFORT') || [];
  const savingsBudgets = dashboard?.budgets.filter(b => b.group === 'SAVINGS') || [];

  const expensesBudget = baseBudgets.reduce((sum, b) => sum + b.limit_amount, 0) +
                         comfortBudgets.reduce((sum, b) => sum + b.limit_amount, 0);
  const expensesSpent = baseBudgets.reduce((sum, b) => sum + b.spent, 0) +
                        comfortBudgets.reduce((sum, b) => sum + b.spent, 0);
  const savingsSpent = savingsBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = expensesBudget - expensesSpent;

  return (
    <Container size="sm" p="md" pb={100}>
      <Stack gap="md">
        {/* Goal Progress */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconTarget size={20} />
              <Text fw={600}>Цель</Text>
            </Group>
            <Badge color="green" variant="light">
              {savingsProgress.toFixed(1)}%
            </Badge>
          </Group>
          <ProgressRoot size="lg" radius="xl">
            <Progress value={savingsProgress} color="green" />
          </ProgressRoot>
          <Group justify="space-between" mt="xs">
            <Text size="sm" c="dimmed">{formatNumber(goal?.current_savings || 0)} / {formatNumber(goal?.target_amount || 0)} ₸</Text>
            <Text size="sm" c="dimmed">{goal?.days_remaining} дней</Text>
          </Group>
        </Card>

        {/* Total Budget Summary: траты отдельно от накоплений */}
        <SimpleGrid cols={3} spacing="sm">
          <Card shadow="xs" padding="sm" radius="md" withBorder>
            <Text size="xs" c="dimmed">Потрачено</Text>
            <Text fw={600} size="sm">{formatNumber(expensesSpent)} ₸</Text>
          </Card>
          <Card shadow="xs" padding="sm" radius="md" withBorder>
            <Text size="xs" c="dimmed">В накопления</Text>
            <Text fw={600} size="sm" c="teal">{formatNumber(savingsSpent)} ₸</Text>
          </Card>
          <Card shadow="xs" padding="sm" radius="md" withBorder>
            <Text size="xs" c="dimmed">Осталось</Text>
            <Text fw={600} size="sm" c={totalRemaining < 0 ? 'red' : 'green'}>{formatNumber(totalRemaining)} ₸</Text>
          </Card>
        </SimpleGrid>

        {/* Budget Categories */}
        {baseBudgets.length > 0 && (
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">База</Text>
            {baseBudgets.map(budget => (
              <BudgetCard key={budget.category_id} budget={budget} onBudgetChange={handleBudgetChange} />
            ))}
          </Stack>
        )}

        {comfortBudgets.length > 0 && (
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">Комфорт</Text>
            {comfortBudgets.map(budget => (
              <BudgetCard key={budget.category_id} budget={budget} onBudgetChange={handleBudgetChange} />
            ))}
          </Stack>
        )}

        {savingsBudgets.length > 0 && (
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">Накопления</Text>
            {savingsBudgets.map(budget => (
              <BudgetCard key={budget.category_id} budget={budget} onBudgetChange={handleBudgetChange} />
            ))}
          </Stack>
        )}
      </Stack>

      {/* FAB — выше нижнего меню, по центру */}
      <ActionIcon
        size={56}
        radius="xl"
        variant="filled"
        color="blue"
        onClick={handleAddClick}
        style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
        }}
      >
        <IconPlus size={28} />
      </ActionIcon>
    </Container>
  );
}

function BudgetCard({ budget, onBudgetChange }: { budget: DashboardResponse['budgets'][0]; onBudgetChange: (categoryId: number, limitAmount: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(budget.limit_amount);
  const isSavings = budget.group === 'SAVINGS';

  const percent = budget.limit_amount > 0 ? (budget.spent / budget.limit_amount) * 100 : 0;
  const isOverBudget = !isSavings && budget.remaining < 0;
  const color = isOverBudget ? 'red' : percent > 80 ? 'yellow' : 'green';

  const handleSave = async () => {
    if (editValue !== budget.limit_amount) {
      await onBudgetChange(budget.category_id, editValue);
    }
    setEditing(false);
  };

  if (isSavings) {
    return (
      <Card shadow="xs" padding="sm" radius="md" withBorder>
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="lg">{budget.category_icon}</Text>
            <Text fw={500} size="sm">{budget.category_name}</Text>
          </Group>
          <Text size="sm" fw={500} c="teal">
            Отложено: {formatNumber(budget.spent)} ₸
          </Text>
        </Group>
      </Card>
    );
  }

  return (
    <Card shadow="xs" padding="sm" radius="md" withBorder>
      <Group justify="space-between" mb={4}>
        <Group gap="xs">
          <Text size="lg">{budget.category_icon}</Text>
          <Text fw={500} size="sm">{budget.category_name}</Text>
        </Group>
        {editing ? (
          <NumberInput
            value={editValue}
            onChange={(val) => setEditValue(Number(val) || 0)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            thousandSeparator=" "
            suffix=" ₸"
            w={120}
            size="xs"
            autoFocus
          />
        ) : (
          <Text
            size="sm"
            c={isOverBudget ? 'red' : 'dimmed'}
            style={{ cursor: 'pointer' }}
            onClick={() => setEditing(true)}
          >
            {formatNumber(budget.remaining)} ₸
          </Text>
        )}
      </Group>
      <ProgressRoot size="sm" radius="xl">
        <Progress value={Math.min(percent, 100)} color={color} />
      </ProgressRoot>
      <Text size="xs" c="dimmed" mt={2}>
        {formatNumber(budget.spent)} / {formatNumber(budget.limit_amount)} ₸
      </Text>
    </Card>
  );
}
