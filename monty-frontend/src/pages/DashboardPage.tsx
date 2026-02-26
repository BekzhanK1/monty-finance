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
  LoadingOverlay,
  SimpleGrid,
  NumberInput,
  Box,
} from '@mantine/core';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([budgetsApi.current(), goalsApi.get(), settingsApi.get()])
      .then(([dash, g, settings]) => {
        setDashboard(dash);
        setGoal(g);
        setTotalBudget(parseInt(settings?.total_budget || '0', 10));
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

  const savingsProgress = goal != null
    ? (goal.target_amount > 0 ? (goal.progress_percent ?? (goal.current_savings / goal.target_amount) * 100) : 0)
    : 0;
  const progressValue = Math.min(100, Math.max(0, Number(savingsProgress)));

  const baseBudgets = dashboard?.budgets.filter(b => b.group === 'BASE') || [];
  const comfortBudgets = dashboard?.budgets.filter(b => b.group === 'COMFORT') || [];
  const savingsBudgets = dashboard?.budgets.filter(b => b.group === 'SAVINGS') || [];

  const expensesBudget = baseBudgets.reduce((sum, b) => sum + b.limit_amount, 0) +
                         comfortBudgets.reduce((sum, b) => sum + b.limit_amount, 0);
  const expensesSpent = baseBudgets.reduce((sum, b) => sum + b.spent, 0) +
                        comfortBudgets.reduce((sum, b) => sum + b.spent, 0);
  const savingsSpent = savingsBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = expensesBudget - expensesSpent;
  const spentPercent = expensesBudget > 0 ? Math.round((expensesSpent / expensesBudget) * 100) : 0;
  const remainingPercent = expensesBudget > 0 ? Math.round((totalRemaining / expensesBudget) * 100) : 0;

  const baseTotal = baseBudgets.reduce((s, b) => s + b.limit_amount, 0);
  const baseSpent = baseBudgets.reduce((s, b) => s + b.spent, 0);
  const basePercent = baseTotal > 0 ? (baseSpent / baseTotal) * 100 : 0;
  const comfortTotal = comfortBudgets.reduce((s, b) => s + b.limit_amount, 0);
  const comfortSpent = comfortBudgets.reduce((s, b) => s + b.spent, 0);
  const comfortPercent = comfortTotal > 0 ? (comfortSpent / comfortTotal) * 100 : 0;

  const percentColor = (p: number) => (p >= 75 ? 'red' : p >= 50 ? 'yellow' : 'green');

  const budgetRemain = totalBudget > 0 ? totalBudget - expensesSpent : 0;
  const budgetExpensePercent = totalBudget > 0 ? Math.round((expensesSpent / totalBudget) * 100) : 0;
  const budgetRemainPercent = totalBudget > 0 ? Math.round((budgetRemain / totalBudget) * 100) : 0;
  const afterPlannedSpending = totalBudget > 0 ? totalBudget - expensesBudget : 0;

  return (
    <Container size="sm" p="md" pb={100}>
      <Stack gap="md">
        {/* Общий бюджет: запланировано на траты, текущий баланс, что останется после трат по бюджету */}
        {totalBudget > 0 && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm" c="dimmed">Общий бюджет</Text>
              <Badge size="sm" variant="light" color="blue">{formatNumber(totalBudget)} ₸</Badge>
            </Group>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Запланировано на траты</Text>
                <Text size="sm" fw={600}>{formatNumber(expensesBudget)} ₸</Text>
              </Group>
              <div>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" c="dimmed">Потрачено на расходы</Text>
                  <Text size="sm" fw={600}>{formatNumber(expensesSpent)} ₸ ({budgetExpensePercent}%)</Text>
                </Group>
                <Progress 
                  value={budgetExpensePercent} 
                  color={budgetExpensePercent >= 80 ? 'red' : budgetExpensePercent >= 60 ? 'yellow' : 'blue'} 
                  size="sm" 
                  radius="xl" 
                />
              </div>
              <Group justify="space-between" p="xs" style={{ backgroundColor: budgetRemain >= 0 ? '#e6f7ed' : '#ffe6e6', borderRadius: '8px' }}>
                <Text size="sm" fw={600}>Текущий баланс</Text>
                <Text size="md" fw={700} c={budgetRemain >= 0 ? 'green' : 'red'}>
                  {formatNumber(budgetRemain)} ₸ ({budgetRemainPercent}%)
                </Text>
              </Group>
              <Group justify="space-between" p="xs" style={{ backgroundColor: '#e6f4ff', borderRadius: '8px' }}>
                <Text size="sm" fw={600}>После трат по бюджету останется</Text>
                <Text size="md" fw={700} c={afterPlannedSpending >= 0 ? 'blue' : 'red'}>
                  {formatNumber(afterPlannedSpending)} ₸
                </Text>
              </Group>
            </Stack>
          </Card>
        )}

        {totalBudget > 0 && expensesBudget > 0 && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Text fw={600} size="sm" c="dimmed" mb="xs">Общий бюджет (колесо)</Text>
            <Box style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Потрачено', value: Math.min(expensesSpent, expensesBudget, totalBudget) },
                      { name: 'Остаток по бюджету', value: Math.max(Math.min(expensesBudget, totalBudget) - Math.min(expensesSpent, expensesBudget, totalBudget), 0) },
                      { name: 'Не запланировано', value: Math.max(totalBudget - Math.min(expensesBudget, totalBudget), 0) },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    <Cell fill="#fa5252" />
                    <Cell fill="#fab005" />
                    <Cell fill="#228be6" />
                  </Pie>
                  <Tooltip formatter={(v) => (typeof v === 'number' ? `${formatNumber(v)} ₸` : '')} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        )}

        {/* Goal Progress */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconTarget size={20} />
              <Text fw={600}>Цель</Text>
            </Group>
            <Badge color="green" variant="light">
              {progressValue.toFixed(1)}%
            </Badge>
          </Group>
          <Progress value={progressValue} color="green" size="lg" radius="xl" />
          <Group justify="space-between" mt="xs">
            <Text size="sm" c="dimmed">{formatNumber(goal?.current_savings || 0)} / {formatNumber(goal?.target_amount || 0)} ₸</Text>
            <Text size="sm" c="dimmed">
              {goal && goal.days_remaining > 0
                ? `Осталось ${goal.days_remaining} дн.`
                : goal && goal.days_passed !== undefined && goal.days_passed > 0
                  ? `Прошло ${goal.days_passed} дн. с цели`
                  : goal?.days_remaining === 0
                    ? 'Срок цели сегодня'
                    : '—'}
            </Text>
          </Group>
        </Card>

        {/* Total Budget Summary: короткие подписи, крупнее цифры */}
        <SimpleGrid cols={3} spacing="sm">
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Text size="xs" c="dimmed">Потрачено</Text>
            <Text fw={700} size="lg">{formatNumber(expensesSpent)} ₸</Text>
            <Text size="xs" c="dimmed">{spentPercent}%</Text>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Text size="xs" c="dimmed">Накопления</Text>
            <Text fw={700} size="lg" c="teal">{formatNumber(savingsSpent)} ₸</Text>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Text size="xs" c="dimmed">Осталось</Text>
            <Text fw={700} size="lg" c={totalRemaining < 0 ? 'red' : 'green'}>{formatNumber(totalRemaining)} ₸</Text>
            <Text size="xs" c="dimmed">{remainingPercent}%</Text>
          </Card>
        </SimpleGrid>

        {/* Budget Categories */}
        {baseBudgets.length > 0 && (
          <Card shadow="xs" padding="sm" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm" c="dimmed">База</Text>
              <Badge size="xs" color={percentColor(basePercent)} variant="light">{basePercent.toFixed(0)}%</Badge>
            </Group>
            <Stack gap="xs">
              {baseBudgets.map(budget => (
                <BudgetCard key={budget.category_id} budget={budget} onBudgetChange={handleBudgetChange} onOpenHistory={() => { haptic('light'); navigate(`/transactions?category_id=${budget.category_id}`); }} />
              ))}
            </Stack>
          </Card>
        )}

        {comfortBudgets.length > 0 && (
          <Card shadow="xs" padding="sm" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm" c="dimmed">Комфорт</Text>
              <Badge size="xs" color={percentColor(comfortPercent)} variant="light">{comfortPercent.toFixed(0)}%</Badge>
            </Group>
            <Stack gap="xs">
              {comfortBudgets.map(budget => (
                <BudgetCard key={budget.category_id} budget={budget} onBudgetChange={handleBudgetChange} onOpenHistory={() => { haptic('light'); navigate(`/transactions?category_id=${budget.category_id}`); }} />
              ))}
            </Stack>
          </Card>
        )}

        {savingsBudgets.length > 0 && (
          <Card shadow="xs" padding="sm" radius="md" withBorder>
            <Text fw={600} size="sm" c="dimmed" mb="xs">Накопления</Text>
            <Stack gap="xs">
              {savingsBudgets.map(budget => (
                <BudgetCard key={budget.category_id} budget={budget} onBudgetChange={handleBudgetChange} onOpenHistory={() => { haptic('light'); navigate(`/transactions?category_id=${budget.category_id}`); }} />
              ))}
            </Stack>
          </Card>
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

function BudgetCard({ budget, onBudgetChange, onOpenHistory }: { budget: DashboardResponse['budgets'][0]; onBudgetChange: (categoryId: number, limitAmount: number) => void; onOpenHistory?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(budget.limit_amount);
  const isSavings = budget.group === 'SAVINGS';

  const percent = budget.limit_amount > 0 ? (budget.spent / budget.limit_amount) * 100 : 0;
  const isOverBudget = !isSavings && budget.remaining < 0;
  const color = isOverBudget ? 'red' : percent >= 75 ? 'red' : percent >= 50 ? 'yellow' : 'green';

  const handleSave = async () => {
    if (editValue !== budget.limit_amount) {
      await onBudgetChange(budget.category_id, editValue);
    }
    setEditing(false);
  };

  if (isSavings) {
    return (
      <Card withBorder padding="xs" radius="md" style={{ borderColor: 'var(--mantine-color-teal-3)', cursor: onOpenHistory ? 'pointer' : undefined }} onClick={onOpenHistory}>
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="md">{budget.category_icon}</Text>
            <Text fw={500} size="sm">{budget.category_name}</Text>
          </Group>
          <Text fw={600} size="sm" c="teal">{formatNumber(budget.spent)} ₸</Text>
        </Group>
      </Card>
    );
  }

  return (
    <Card withBorder padding="xs" radius="md" style={{ cursor: onOpenHistory ? 'pointer' : undefined }} onClick={!editing ? onOpenHistory : undefined}>
      <Group justify="space-between" wrap="nowrap" gap="xs" mb={2}>
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Text size="md">{budget.category_icon}</Text>
          <Text fw={500} size="sm" lineClamp={1}>{budget.category_name}</Text>
        </Group>
        {editing ? (
          <NumberInput
            value={editValue}
            onChange={(val) => setEditValue(Number(val) || 0)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            thousandSeparator=" "
            suffix=" ₸"
            w={100}
            size="xs"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <Text
            size="sm"
            fw={600}
            c={isOverBudget ? 'red' : 'dimmed'}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {isOverBudget ? `−${formatNumber(-budget.remaining)}` : formatNumber(budget.remaining)} ₸
          </Text>
        )}
      </Group>
      <Text size="xs" c="dimmed">Потрачено {formatNumber(budget.spent)} ₸</Text>
      <Progress value={Math.min(100, Math.max(0, percent))} color={color} size={4} radius="xl" mt={4} />
    </Card>
  );
}
