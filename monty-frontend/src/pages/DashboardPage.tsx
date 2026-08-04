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
  LoadingOverlay,
  SimpleGrid,
  NumberInput,
  useMantineColorScheme,
} from '@mantine/core';
import { IconTarget, IconTrendingUp, IconWallet } from '@tabler/icons-react';
import { budgetsApi, goalsApi, settingsApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import { FloatingActionButton } from '../components/FloatingActionButton';
import type { DashboardResponse, Goal } from '../types';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { colorScheme } = useMantineColorScheme();
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
  const budgetExpensePercent = expensesBudget > 0 ? Math.round((expensesSpent / expensesBudget) * 100) : 0;
  const afterPlannedSpending = totalBudget > 0 ? totalBudget - expensesBudget : 0;

  return (
    <Container size="sm" p="md" pb={100}>
      <Stack gap="lg">
        {/* Общий бюджет */}
        {totalBudget > 0 && (
          <Card 
            shadow="lg" 
            padding="lg" 
            radius="xl" 
            withBorder
            className="stagger-item hover-lift"
            style={{
              background: colorScheme === 'dark'
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
              backdropFilter: 'blur(10px)',
              border: colorScheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            }}
          >
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <IconWallet size={24} style={{ color: '#667eea' }} />
                <Text fw={700} size="lg">Общий бюджет</Text>
              </Group>
              <Badge 
                size="lg" 
                variant="gradient" 
                gradient={{ from: 'blue', to: 'violet', deg: 135 }}
                style={{ fontSize: '14px', padding: '8px 12px' }}
              >
                {formatNumber(totalBudget)} ₸
              </Badge>
            </Group>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Запланировано на траты</Text>
                <Text size="sm" fw={600}>{formatNumber(expensesBudget)} ₸</Text>
              </Group>
              <div>
                <Group justify="space-between" mb={8}>
                  <Text size="sm" c="dimmed">Потрачено на расходы</Text>
                  <Text size="sm" fw={600}>{formatNumber(expensesSpent)} ₸ ({budgetExpensePercent}%)</Text>
                </Group>
                <Progress 
                  value={budgetExpensePercent} 
                  color={budgetExpensePercent >= 80 ? 'red' : budgetExpensePercent >= 60 ? 'yellow' : 'blue'} 
                  size="lg" 
                  radius="xl"
                  className="progress-animated"
                  style={{
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </div>
              <Card
                padding="md"
                radius="lg"
                style={{
                  background: budgetRemain >= 0 
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                  border: budgetRemain >= 0 
                    ? '1px solid rgba(34, 197, 94, 0.2)'
                    : '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <Group justify="space-between">
                  <Text size="sm" fw={600}>Текущий баланс</Text>
                  <Text size="xl" fw={700} c={budgetRemain >= 0 ? 'green' : 'red'}>
                    {formatNumber(budgetRemain)} ₸
                  </Text>
                </Group>
              </Card>
              <Card
                padding="md"
                radius="lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <Group justify="space-between">
                  <Text size="sm" fw={600}>После трат по бюджету</Text>
                  <Text size="lg" fw={700} c={afterPlannedSpending >= 0 ? 'blue' : 'red'}>
                    {formatNumber(afterPlannedSpending)} ₸
                  </Text>
                </Group>
              </Card>
            </Stack>
          </Card>
        )}

        {/* Goal Progress */}
        <Card 
          shadow="lg" 
          padding="lg" 
          radius="xl" 
          withBorder
          className="stagger-item hover-lift"
          style={{
            background: colorScheme === 'dark'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(236, 253, 245, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            border: colorScheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconTarget size={24} style={{ color: '#10b981' }} />
              <Text fw={700} size="lg">Цель</Text>
            </Group>
            <Badge 
              size="lg" 
              variant="gradient" 
              gradient={{ from: 'teal', to: 'green', deg: 135 }}
              style={{ fontSize: '14px', padding: '8px 12px' }}
            >
              {progressValue.toFixed(1)}%
            </Badge>
          </Group>
          <Progress 
            value={progressValue} 
            color="green" 
            size="xl" 
            radius="xl"
            className="progress-animated"
            style={{
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
            }}
          />
          <Group justify="space-between" mt="md">
            <Text size="md" fw={600}>{formatNumber(goal?.current_savings || 0)} / {formatNumber(goal?.target_amount || 0)} ₸</Text>
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

        {/* Total Budget Summary */}
        <SimpleGrid cols={2} spacing="md">
          <Card 
            shadow="md" 
            padding="lg" 
            radius="xl" 
            withBorder
            className="stagger-item hover-lift"
            style={{
              background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <IconTrendingUp size={24} style={{ color: '#ef4444', marginBottom: '12px' }} />
            <Text size="xs" c="dimmed" mb={8}>Потрачено</Text>
            <Text fw={700} size="lg" style={{ fontSize: '1.25rem', wordBreak: 'break-word' }}>{formatNumber(expensesSpent)} ₸</Text>
            <Text size="xs" c="dimmed" mt={8}>{spentPercent}%</Text>
          </Card>
          <Card 
            shadow="md" 
            padding="lg" 
            radius="xl" 
            withBorder
            className="stagger-item hover-lift"
            style={{
              background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <IconWallet size={24} style={{ color: totalRemaining < 0 ? '#ef4444' : '#10b981', marginBottom: '12px' }} />
            <Text size="xs" c="dimmed" mb={8}>Осталось</Text>
            <Text fw={700} size="lg" c={totalRemaining < 0 ? 'red' : 'green'} style={{ fontSize: '1.25rem', wordBreak: 'break-word' }}>{formatNumber(totalRemaining)} ₸</Text>
            <Text size="xs" c="dimmed" mt={8}>{remainingPercent}%</Text>
          </Card>
        </SimpleGrid>

        {/* Budget Categories */}
        {baseBudgets.length > 0 && (
          <Card 
            shadow="md" 
            padding="lg" 
            radius="xl" 
            withBorder
            className="stagger-item"
            style={{
              background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Group justify="space-between" mb="md">
              <Text fw={700} size="md">База</Text>
              <Badge size="md" color={percentColor(basePercent)} variant="light">
                {basePercent.toFixed(0)}%
              </Badge>
            </Group>
            <Stack gap="sm">
              {baseBudgets.map((budget, index) => (
                <div key={budget.category_id} className="stagger-item" style={{ animationDelay: `${0.05 * (index + 1)}s` }}>
                  <BudgetCard budget={budget} onBudgetChange={handleBudgetChange} onOpenHistory={() => { haptic('light'); navigate(`/transactions?category_id=${budget.category_id}`); }} />
                </div>
              ))}
            </Stack>
          </Card>
        )}

        {comfortBudgets.length > 0 && (
          <Card 
            shadow="md" 
            padding="lg" 
            radius="xl" 
            withBorder
            className="stagger-item"
            style={{
              background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Group justify="space-between" mb="md">
              <Text fw={700} size="md">Комфорт</Text>
              <Badge size="md" color={percentColor(comfortPercent)} variant="light">
                {comfortPercent.toFixed(0)}%
              </Badge>
            </Group>
            <Stack gap="sm">
              {comfortBudgets.map((budget, index) => (
                <div key={budget.category_id} className="stagger-item" style={{ animationDelay: `${0.05 * (index + 1)}s` }}>
                  <BudgetCard budget={budget} onBudgetChange={handleBudgetChange} onOpenHistory={() => { haptic('light'); navigate(`/transactions?category_id=${budget.category_id}`); }} />
                </div>
              ))}
            </Stack>
          </Card>
        )}

        {savingsBudgets.length > 0 && (
          <Card 
            shadow="md" 
            padding="lg" 
            radius="xl" 
            withBorder
            className="stagger-item"
            style={{
              background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Text fw={700} size="md" mb="md">Накопления</Text>
            <Stack gap="sm">
              {savingsBudgets.map((budget, index) => (
                <div key={budget.category_id} className="stagger-item" style={{ animationDelay: `${0.05 * (index + 1)}s` }}>
                  <BudgetCard budget={budget} onBudgetChange={handleBudgetChange} onOpenHistory={() => { haptic('light'); navigate(`/transactions?category_id=${budget.category_id}`); }} />
                </div>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>

      <FloatingActionButton />
    </Container>
  );
}

function BudgetCard({ budget, onBudgetChange, onOpenHistory }: { budget: DashboardResponse['budgets'][0]; onBudgetChange: (categoryId: number, limitAmount: number) => void; onOpenHistory?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(budget.limit_amount);
  const { haptic } = useTelegram();
  const { colorScheme } = useMantineColorScheme();
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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    setEditing(true);
  };

  if (isSavings) {
    return (
      <Card 
        withBorder 
        padding="md" 
        radius="lg"
        className="hover-lift transition-all"
        style={{ 
          borderColor: 'var(--mantine-color-teal-3)', 
          cursor: onOpenHistory ? 'pointer' : undefined,
          background: colorScheme === 'dark' 
            ? 'rgba(20, 184, 166, 0.1)' 
            : 'rgba(20, 184, 166, 0.05)',
        }} 
        onClick={onOpenHistory}
      >
        <Group justify="space-between">
          <Group gap="sm">
            <Text size="xl">{budget.category_icon}</Text>
            <Text fw={600} size="md">{budget.category_name}</Text>
          </Group>
          <Text fw={700} size="lg" c="teal">{formatNumber(budget.spent)} ₸</Text>
        </Group>
      </Card>
    );
  }

  return (
    <Card 
      withBorder 
      padding="md" 
      radius="lg"
      className="hover-lift transition-all"
      style={{ 
        cursor: onOpenHistory && !editing ? 'pointer' : undefined,
        background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)',
      }} 
      onClick={!editing ? onOpenHistory : undefined}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm" mb={8}>
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Text size="xl">{budget.category_icon}</Text>
          <Text fw={600} size="md" lineClamp={1}>{budget.category_name}</Text>
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
            size="sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            styles={{
              input: {
                fontWeight: 600,
                borderRadius: '8px',
              }
            }}
          />
        ) : (
          <Text
            size="md"
            fw={700}
            c={isOverBudget ? 'red' : 'dimmed'}
            className="transition-colors"
            style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={handleEditClick}
          >
            {isOverBudget ? `−${formatNumber(-budget.remaining)}` : formatNumber(budget.remaining)} ₸
          </Text>
        )}
      </Group>
      <Text size="sm" c="dimmed" mb={8}>Потрачено {formatNumber(budget.spent)} ₸</Text>
      <Progress 
        value={Math.min(100, Math.max(0, percent))} 
        color={color} 
        size="md" 
        radius="xl"
        className="progress-animated"
        style={{
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      />
    </Card>
  );
}
