import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Progress,
  Card,
  Group,
  Stack,
  Badge,
  ActionIcon,
  ProgressRoot,
  LoadingOverlay,
} from '@mantine/core';
import { IconPlus, IconTarget } from '@tabler/icons-react';
import { budgetsApi, goalsApi } from '../api';
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

  if (loading) {
    return <LoadingOverlay visible />;
  }

  const savingsProgress = goal 
    ? Math.min(100, (goal.current_savings / goal.target_amount) * 100) 
    : 0;

  const baseBudgets = dashboard?.budgets.filter(b => b.group === 'BASE') || [];
  const comfortBudgets = dashboard?.budgets.filter(b => b.group === 'COMFORT') || [];
  const savingsBudgets = dashboard?.budgets.filter(b => b.group === 'SAVINGS') || [];

  return (
    <Container size="sm" p="md" pb={100}>
      <Stack gap="md">
        {/* Goal Progress */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconTarget size={20} />
              <Text fw={600}>Цель: {goal ? formatNumber(goal.target_amount) : 0} ₸</Text>
            </Group>
            <Badge color="green" variant="light">
              {savingsProgress.toFixed(1)}%
            </Badge>
          </Group>
          <ProgressRoot size="lg" radius="xl">
            <Progress value={savingsProgress} color="green" />
          </ProgressRoot>
          <Group justify="space-between" mt="xs">
            <Text size="sm" c="dimmed">Накоплено: {goal ? formatNumber(goal.current_savings) : 0} ₸</Text>
            <Text size="sm" c="dimmed">{goal?.days_remaining} дней осталось</Text>
          </Group>
        </Card>

        {/* Budget Categories */}
        {baseBudgets.length > 0 && (
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">База</Text>
            {baseBudgets.map(budget => (
              <BudgetCard key={budget.category_id} budget={budget} />
            ))}
          </Stack>
        )}

        {comfortBudgets.length > 0 && (
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">Комфорт</Text>
            {comfortBudgets.map(budget => (
              <BudgetCard key={budget.category_id} budget={budget} />
            ))}
          </Stack>
        )}

        {savingsBudgets.length > 0 && (
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">Накопления</Text>
            {savingsBudgets.map(budget => (
              <BudgetCard key={budget.category_id} budget={budget} />
            ))}
          </Stack>
        )}
      </Stack>

      {/* FAB */}
      <ActionIcon
        size={60}
        radius="xl"
        variant="filled"
        color="blue"
        onClick={handleAddClick}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <IconPlus size={30} />
      </ActionIcon>
    </Container>
  );
}

function BudgetCard({ budget }: { budget: DashboardResponse['budgets'][0] }) {
  const percent = (budget.spent / budget.limit_amount) * 100;
  const isOverBudget = budget.remaining < 0;
  const color = isOverBudget ? 'red' : percent > 80 ? 'yellow' : 'green';

  return (
    <Card shadow="xs" padding="sm" radius="md" withBorder>
      <Group justify="space-between" mb={4}>
        <Group gap="xs">
          <Text size="lg">{budget.category_icon}</Text>
          <Text fw={500}>{budget.category_name}</Text>
        </Group>
        <Text size="sm" c={isOverBudget ? 'red' : 'dimmed'}>
          {formatNumber(budget.remaining)} ₸
        </Text>
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
