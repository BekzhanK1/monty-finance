import { useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Text,
  Card,
  Group,
  LoadingOverlay,
  SimpleGrid,
  SegmentedControl,
  Button,
  Progress,
  Box,
} from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconWallet, IconPigMoney } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { analyticsApi } from '../api';
import type { Analytics } from '../types';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('3');
  const [viewMode, setViewMode] = useState<'preset' | 'custom'>('preset');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    if (viewMode === 'preset') {
      loadAnalyticsByPeriod();
    }
  }, [period, viewMode]);

  const loadAnalyticsByPeriod = async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.get(parseInt(period));
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsByDateRange = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      const data = await analyticsApi.getPeriod(start, end);
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" pb={100}>
      <Stack gap="md">
        <SegmentedControl
          value={viewMode}
          onChange={(val) => setViewMode(val as 'preset' | 'custom')}
          data={[
            { value: 'preset', label: 'Период' },
            { value: 'custom', label: 'Даты' },
          ]}
          fullWidth
        />

        {viewMode === 'preset' ? (
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            data={[
              { value: '1', label: 'Месяц' },
              { value: '3', label: '3 месяца' },
              { value: '6', label: '6 месяцев' },
              { value: '12', label: 'Год' },
            ]}
            fullWidth
          />
        ) : (
          <Stack gap="xs">
            <Group grow>
              <div>
                <Text size="sm" fw={500} mb={4} component="label">С</Text>
                <input
                  type="date"
                  value={startDate ? startDate.toISOString().slice(0, 10) : ''}
                  onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid var(--mantine-color-default-border)' }}
                />
              </div>
              <div>
                <Text size="sm" fw={500} mb={4} component="label">По</Text>
                <input
                  type="date"
                  value={endDate ? endDate.toISOString().slice(0, 10) : ''}
                  onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid var(--mantine-color-default-border)' }}
                />
              </div>
            </Group>
            <Button
              onClick={loadAnalyticsByDateRange}
              disabled={!startDate || !endDate}
              loading={loading}
            >
              Показать
            </Button>
          </Stack>
        )}

        {loading ? (
          <LoadingOverlay visible />
        ) : analytics && (
          <>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              <SummaryCard
                title="Доходы"
                value={analytics.total_income || 0}
                icon={<IconArrowUpRight size={24} color="#40c057" />}
                color="#40c057"
              />
              <SummaryCard
                title="Расходы"
                value={analytics.total_expenses || 0}
                icon={<IconArrowDownRight size={24} color="#fa5252" />}
                color="#fa5252"
                subtitle={analytics.total_income > 0 ? `${Math.round((analytics.total_expenses / analytics.total_income) * 100)}% от дохода` : undefined}
              />
              <SummaryCard
                title="В накопления"
                value={analytics.total_savings ?? 0}
                icon={<IconPigMoney size={24} color="#228be6" />}
                color="#228be6"
                subtitle={analytics.total_income > 0 ? `${Math.round((analytics.total_savings / analytics.total_income) * 100)}% от дохода` : undefined}
              />
              <SummaryCard
                title="Баланс"
                value={analytics.balance ?? 0}
                icon={<IconWallet size={24} color={analytics.balance >= 0 ? '#40c057' : '#fa5252'} />}
                color={analytics.balance >= 0 ? '#40c057' : '#fa5252'}
              />
            </SimpleGrid>

            {/* Сравнение с предыдущим периодом */}
            {analytics.comparison_previous_period && (
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Text fw={600} mb="sm">Сравнение с предыдущим периодом</Text>
                <SimpleGrid cols={3} spacing="xs">
                  <Box>
                    <Text size="xs" c="dimmed">Доходы</Text>
                    <Text size="sm" fw={500} c="green">
                      {formatNumber(analytics.comparison_previous_period.total_income)} ₸
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Расходы</Text>
                    <Text size="sm" fw={500} c="red">
                      {formatNumber(analytics.comparison_previous_period.total_expenses)} ₸
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Баланс</Text>
                    <Text size="sm" fw={500} c={analytics.comparison_previous_period.balance >= 0 ? 'green' : 'red'}>
                      {formatNumber(analytics.comparison_previous_period.balance)} ₸
                    </Text>
                  </Box>
                </SimpleGrid>
              </Card>
            )}

            {/* Топ расходов и накоплений */}
            {analytics.top_expenses && analytics.top_expenses.length > 0 && (
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Text fw={600} mb="sm">Топ расходов и накоплений</Text>
                <Stack gap="xs">
                  {analytics.top_expenses.map((item, idx) => {
                    const isSavings = item.type === 'savings';
                    const color = isSavings ? 'blue' : 'red';
                    const prefix = isSavings ? '' : '−';
                    return (
                      <Group key={idx} justify="space-between">
                        <Group gap="xs">
                          <Text size="lg">{item.icon}</Text>
                          <Text size="sm">{item.name}</Text>
                        </Group>
                        <Text size="sm" fw={500} c={color}>
                          {prefix}{formatNumber(item.amount)} ₸
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </Card>
            )}

            {/* Кто сколько потратил */}
            {analytics.by_user && analytics.by_user.length > 0 && (
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Text fw={600} mb="sm">Кто сколько потратил</Text>
                <Stack gap="xs">
                  {analytics.by_user.map((u) => (
                    <Group key={u.user_id} justify="space-between">
                      <Text size="sm" fw={500}>{u.user_name}</Text>
                      <Group gap="md">
                        <Text size="xs" c="green">+{formatNumber(u.income)}</Text>
                        <Text size="xs" c="red">−{formatNumber(u.expense)}</Text>
                        {u.savings > 0 && (
                          <Text size="xs" c="blue">накопл. {formatNumber(u.savings)}</Text>
                        )}
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </Card>
            )}

            {/* Сводка: доля расходов/дохода/накоплений */}
            {analytics.total_income > 0 && (
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Text fw={600} mb="sm">Структура</Text>
                <Stack gap="xs">
                  <Box>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed">Расходы</Text>
                      <Text size="xs" fw={500}>{Math.round((analytics.total_expenses / analytics.total_income) * 100)}%</Text>
                    </Group>
                    <Progress value={Math.min(100, (analytics.total_expenses / analytics.total_income) * 100)} color="red" size="sm" radius="xl" />
                  </Box>
                  <Box>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed">В накопления</Text>
                      <Text size="xs" fw={500}>{Math.round((analytics.total_savings / analytics.total_income) * 100)}%</Text>
                    </Group>
                    <Progress value={Math.min(100, (analytics.total_savings / analytics.total_income) * 100)} color="blue" size="sm" radius="xl" />
                  </Box>
                  <Box>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed">Свободно (баланс)</Text>
                      <Text size="xs" fw={500}>{Math.round(Math.max(0, (analytics.balance / analytics.total_income) * 100))}%</Text>
                    </Group>
                    <Progress value={Math.max(0, Math.min(100, (analytics.balance / analytics.total_income) * 100))} color="green" size="sm" radius="xl" />
                  </Box>
                </Stack>
              </Card>
            )}

            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text fw={600} mb="md">По категориям</Text>
              <Stack gap="sm">
                {analytics.by_category.length > 0 && (() => {
                  const maxAmount = Math.max(...analytics.by_category.map(c => c.amount));
                  const totalForPct = analytics.total_income + analytics.total_expenses + analytics.total_savings;
                  return analytics.by_category.map((cat, idx) => {
                    const isIncome = cat.type === 'income';
                    const isSavings = cat.type === 'savings';
                    const color = isIncome ? 'green' : isSavings ? 'blue' : 'red';
                    const prefix = isIncome ? '+' : isSavings ? '' : '−';
                    const barPct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
                    const sharePct = totalForPct > 0 ? ((cat.amount / totalForPct) * 100) : 0;
                    return (
                      <Box key={idx}>
                        <Group justify="space-between" mb={4}>
                          <Group gap="xs">
                            <Text size="lg">{cat.icon}</Text>
                            <Text size="sm">{cat.name}</Text>
                          </Group>
                          <Text size="sm" fw={500} c={color}>
                            {prefix}{formatNumber(cat.amount)} ₸
                            <Text span size="xs" c="dimmed" ml={4}>({sharePct.toFixed(0)}%)</Text>
                          </Text>
                        </Group>
                        <Progress value={barPct} color={cat.type === 'income' ? 'green' : 'red'} size="sm" radius="xl" />
                      </Box>
                    );
                  });
                })()}
                {analytics.by_category.length === 0 && (
                  <Text c="dimmed" ta="center">Нет данных</Text>
                )}
              </Stack>
            </Card>

            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text fw={600} mb="md">По группам</Text>
              <Stack gap="sm">
                {analytics.by_group.length > 0 && (() => {
                  const maxGroupAmount = Math.max(...analytics.by_group.map(g => g.amount));
                  const totalGroup = analytics.by_group.reduce((s, g) => s + g.amount, 0);
                  return analytics.by_group.map((group, idx) => {
                    const isIncome = group.type === 'income';
                    const isSavings = group.type === 'savings';
                    const color = isIncome ? 'green' : isSavings ? 'blue' : 'red';
                    const prefix = isIncome ? '+' : isSavings ? '' : '−';
                    const barPct = maxGroupAmount > 0 ? (group.amount / maxGroupAmount) * 100 : 0;
                    const sharePct = totalGroup > 0 ? ((group.amount / totalGroup) * 100) : 0;
                    const label = group.group === 'BASE' ? 'База' : group.group === 'COMFORT' ? 'Комфорт' : group.group === 'SAVINGS' ? 'Накопления' : 'Доход';
                    return (
                      <Box key={idx}>
                        <Group justify="space-between" mb={4}>
                          <Text size="sm" fw={500}>{label}</Text>
                          <Text size="sm" fw={500} c={color}>
                            {prefix}{formatNumber(group.amount)} ₸
                            <Text span size="xs" c="dimmed" ml={4}>({sharePct.toFixed(0)}%)</Text>
                          </Text>
                        </Group>
                        <Progress value={barPct} color={color} size="sm" radius="xl" />
                      </Box>
                    );
                  });
                })()}
                {analytics.by_group.length === 0 && (
                  <Text c="dimmed" ta="center">Нет данных</Text>
                )}
              </Stack>
            </Card>

            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text fw={600} mb="md">По дням (график)</Text>
              {analytics.daily_data.length > 0 ? (
                <Box style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...analytics.daily_data].reverse().map(d => ({
                        date: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
                        Доходы: d.income,
                        Расходы: d.expense,
                      }))}
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-default-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number | undefined) => [v != null ? formatNumber(v) + ' ₸' : '', '']} labelFormatter={(label) => label} />
                      <Legend />
                      <Bar dataKey="Доходы" fill="#40c057" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Расходы" fill="#fa5252" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Text c="dimmed" ta="center" py="xl">Нет данных</Text>
              )}
            </Card>

            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text fw={600} mb="md">По дням (список)</Text>
              <Stack gap="xs">
                {analytics.daily_data.slice(-10).reverse().map((day, idx) => (
                  <Group key={idx} justify="space-between">
                    <Text size="sm" c="dimmed">{new Date(day.date).toLocaleDateString('ru-RU')}</Text>
                    <Group gap="sm">
                      <Text size="xs" c="green">{formatNumber(day.income)}</Text>
                      <Text size="xs" c="red">−{formatNumber(day.expense)}</Text>
                    </Group>
                  </Group>
                ))}
                {analytics.daily_data.length === 0 && (
                  <Text c="dimmed" ta="center">Нет данных</Text>
                )}
              </Stack>
            </Card>
          </>
        )}
      </Stack>
    </Container>
  );
}

function SummaryCard({ title, value, icon, color, subtitle }: { title: string; value: number; icon: React.ReactNode; color: string; subtitle?: string }) {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">{title}</Text>
        {icon}
      </Group>
      <Text fw={700} size="lg" style={{ color }}>
        {formatNumber(value)} ₸
      </Text>
      {subtitle && <Text size="xs" c="dimmed" mt={4}>{subtitle}</Text>}
    </Card>
  );
}
