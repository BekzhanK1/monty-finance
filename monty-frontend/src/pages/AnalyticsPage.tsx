import { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Text,
  Card,
  Group,
  SegmentedControl,
  Progress,
  Box,
  useMantineColorScheme,
  SimpleGrid,
  ActionIcon,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconTrendingUp, IconTrendingDown, IconWallet, IconTarget } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsApi, settingsApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Analytics, Settings } from '../types';

type CategoryRow = Analytics['by_category'][number];

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

function periodChangePct(current: number, previous: number | undefined): number | null {
  if (previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function periodChangeLabel(current: number, previous: number | undefined, pct: number | null): string {
  if ((previous == null || previous === 0) && current > 0) return 'новое';
  if (pct == null) return '—';
  if (pct === 0) return '0%';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function periodChangeColor(
  pct: number | null,
  kind: 'expense' | 'income' | 'savings',
  current: number,
  previous: number | undefined,
): string {
  const isNew = (previous == null || previous === 0) && current > 0;
  if (isNew || pct == null || pct === 0) return 'dimmed';
  const upIsBad = kind === 'expense';
  if (pct > 0) return upIsBad ? 'red' : 'teal';
  return upIsBad ? 'teal' : 'red';
}

function PeriodDelta({
  current,
  previous,
  kind,
}: {
  current: number;
  previous: number | undefined;
  kind: 'expense' | 'income' | 'savings';
}) {
  const pct = periodChangePct(current, previous);
  const color = periodChangeColor(pct, kind, current, previous);
  return (
    <Text size="xs" fw={600} c={color} mt={4}>
      {periodChangeLabel(current, previous, pct)}
    </Text>
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function inclusiveDays(a: Date, b: Date): number {
  const s = startOfDay(a).getTime();
  const e = startOfDay(b).getTime();
  return Math.floor((e - s) / 86400000) + 1;
}

function periodElapsedDays(periodStart: Date, periodEnd: Date, ref: Date = new Date()): number {
  const total = inclusiveDays(periodStart, periodEnd);
  const t = startOfDay(ref);
  const s = startOfDay(periodStart);
  const e = startOfDay(periodEnd);
  if (t < s) return 0;
  if (t > e) return total;
  return inclusiveDays(s, t);
}

function resolvePeriodBounds(analytics: Analytics): { start: Date; end: Date } | null {
  if (analytics.period_start && analytics.period_end) {
    return {
      start: parseISODateLocal(analytics.period_start),
      end: parseISODateLocal(analytics.period_end),
    };
  }
  if (!analytics.daily_data.length) return null;
  const dates = [...analytics.daily_data.map((d) => d.date)].sort();
  return {
    start: parseISODateLocal(dates[0]),
    end: parseISODateLocal(dates[dates.length - 1]),
  };
}

function buildExpenseBarData(analytics: Analytics): { dateIso: string; expense: number; dayNum: string; fullLabel: string }[] {
  const bounds = resolvePeriodBounds(analytics);
  if (!bounds) return [];
  const expenseByDay = new Map(analytics.daily_data.map((d) => [d.date, d.expense]));
  const out: { dateIso: string; expense: number; dayNum: string; fullLabel: string }[] = [];
  const cur = startOfDay(bounds.start);
  const last = startOfDay(bounds.end);
  for (let t = cur.getTime(); t <= last.getTime(); t += 86400000) {
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    out.push({
      dateIso: iso,
      expense: expenseByDay.get(iso) ?? 0,
      dayNum: String(d.getDate()),
      fullLabel: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    });
  }
  return out;
}

function CategoryBreakdown({
  categories,
  totalExpenses,
  totalSavings,
  isCurrentPeriod,
}: {
  categories: CategoryRow[];
  totalExpenses: number;
  totalSavings: number;
  isCurrentPeriod: boolean;
}) {
  const { colorScheme } = useMantineColorScheme();
  const rows = categories.filter((c) => c.type === 'expense' || c.type === 'savings');
  if (rows.length === 0) return null;

  return (
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
      <Text fw={600} size="md">Категории</Text>
      <Text size="xs" c="dimmed" mb="md">
        по убыванию · vs прошлый период
      </Text>
      <Stack gap="md">
        {rows.map((item, idx) => {
          const isSavings = item.type === 'savings';
          const color = isSavings ? 'blue' : 'red';
          const prefix = isSavings ? '' : '−';
          const base = isSavings ? totalSavings : totalExpenses;
          const sharePct = base > 0 ? Math.round((item.amount / base) * 100) : 0;
          const pct = item.change_pct ?? periodChangePct(item.amount, item.previous_amount);
          const changeColor = periodChangeColor(pct, item.type, item.amount, item.previous_amount);
          return (
            <Box key={`${item.name}-${idx}`}>
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Text size="xs" c="dimmed" w={16} ta="right">{idx + 1}</Text>
                  <Text size="xl">{item.icon}</Text>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={1}>{item.name}</Text>
                    <Text size="xs" c="dimmed">
                      {sharePct}%
                      {item.previous_amount != null && item.previous_amount > 0
                        ? ` · было ${formatNumber(item.previous_amount)} ₸`
                        : ''}
                    </Text>
                  </Box>
                </Group>
                <Box ta="right" style={{ flexShrink: 0 }}>
                  <Text size="sm" fw={700} c={color}>
                    {prefix}{formatNumber(item.amount)} ₸
                  </Text>
                  <Text size="xs" fw={600} c={changeColor}>
                    {periodChangeLabel(item.amount, item.previous_amount, pct)}
                  </Text>
                </Box>
              </Group>
              <Progress
                value={Math.min(100, sharePct)}
                color={isSavings ? 'blue' : 'orange'}
                size="sm"
                radius="xl"
                mt={8}
              />
            </Box>
          );
        })}
      </Stack>
      {isCurrentPeriod && (
        <Text size="xs" c="dimmed" mt="md">
          Период ещё идёт — сравнение с прошлым неполное
        </Text>
      )}
    </Card>
  );
}

export function AnalyticsPage() {
  const { haptic } = useTelegram();
  const { colorScheme } = useMantineColorScheme();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('current');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [financialOffset, setFinancialOffset] = useState(0);
  const [financialLabel, setFinancialLabel] = useState<string | null>(null);

  const salaryDay = settings?.salary_day ? parseInt(settings.salary_day, 10) || 19 : 19;

  function getFinancialPeriod(refDate: Date, salaryDayLocal: number): { start: Date; end: Date } {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const day = refDate.getDate();
    let start: Date;
    let end: Date;

    if (day >= salaryDayLocal) {
      start = new Date(year, month, salaryDayLocal);
      if (month === 11) {
        end = new Date(year + 1, 0, salaryDayLocal - 1);
      } else {
        end = new Date(year, month + 1, salaryDayLocal - 1);
      }
    } else {
      if (month === 0) {
        start = new Date(year - 1, 11, salaryDayLocal);
      } else {
        start = new Date(year, month - 1, salaryDayLocal);
      }
      end = new Date(year, month, salaryDayLocal - 1);
    }

    return { start, end };
  }

  function getFinancialPeriodWithOffset(offset: number, salaryDayLocal: number): { start: Date; end: Date } {
    let ref = new Date();
    if (offset === 0) {
      return getFinancialPeriod(ref, salaryDayLocal);
    }
    if (offset < 0) {
      for (let i = 0; i > offset; i--) {
        const { start } = getFinancialPeriod(ref, salaryDayLocal);
        const prevRef = new Date(start);
        prevRef.setDate(prevRef.getDate() - 1);
        ref = prevRef;
      }
    } else {
      for (let i = 0; i < offset; i++) {
        const { end } = getFinancialPeriod(ref, salaryDayLocal);
        const nextRef = new Date(end);
        nextRef.setDate(nextRef.getDate() + 1);
        ref = nextRef;
      }
    }
    return getFinancialPeriod(ref, salaryDayLocal);
  }

  const loadAnalyticsByPeriod = useCallback(async () => {
    setLoading(true);
    try {
      let data: Analytics;
      if (period === 'current') {
        const { start, end } = getFinancialPeriodWithOffset(financialOffset, salaryDay);
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        data = await analyticsApi.getPeriod(startStr, endStr);
        const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
        setFinancialLabel(`${formatter.format(start)} – ${formatter.format(end)}`);
      } else {
        data = await analyticsApi.get(parseInt(period, 10));
        setFinancialLabel(null);
      }
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period, financialOffset, salaryDay]);

  useEffect(() => {
    settingsApi
      .get()
      .then((data) => setSettings(data))
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    setFinancialOffset(0);
  }, [period]);

  useEffect(() => {
    void loadAnalyticsByPeriod();
  }, [loadAnalyticsByPeriod]);

  const barData = analytics ? buildExpenseBarData(analytics) : [];
  const maxExpense = Math.max(...barData.map((d) => d.expense), 1);

  if (loading && !analytics) {
    return (
      <Container size="sm" pb={100}>
        <LoadingSkeleton />
      </Container>
    );
  }

  const bounds = analytics ? resolvePeriodBounds(analytics) : null;
  const daysTotal = bounds ? inclusiveDays(bounds.start, bounds.end) : 0;
  const elapsed = bounds ? periodElapsedDays(bounds.start, bounds.end) : 0;
  const pace = analytics && elapsed > 0 ? Math.round(analytics.total_expenses / elapsed) : 0;
  const progressPct = daysTotal > 0 ? Math.min(100, (elapsed / daysTotal) * 100) : 0;

  return (
    <Container size="sm" pb={100}>
      <Stack gap="lg">
        <Box className="animate-slide-down">
          <Text fw={700} size="xl" mb="xs">Аналитика</Text>
          <Text size="sm" c="dimmed">Отслеживайте свои финансы</Text>
        </Box>

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
          <SegmentedControl
            value={period}
            onChange={(val) => {
              haptic('light');
              setPeriod(val);
            }}
            data={[
              { value: 'current', label: 'Период' },
              { value: '1', label: 'Месяц' },
              { value: '3', label: '3 мес' },
              { value: '6', label: '6 мес' },
            ]}
            fullWidth
            radius="lg"
          />
          {period === 'current' && (
            <Group justify="space-between" align="center" mt="md">
              <ActionIcon 
                variant="subtle" 
                size="lg" 
                radius="xl"
                onClick={() => {
                  haptic('light');
                  setFinancialOffset((prev) => prev - 1);
                }}
                className="hover-scale"
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
              <Text size="sm" fw={600} ta="center">
                {financialLabel ?? '—'}
              </Text>
              <ActionIcon 
                variant="subtle" 
                size="lg" 
                radius="xl"
                onClick={() => {
                  if (financialOffset < 0) {
                    haptic('light');
                    setFinancialOffset((prev) => prev + 1);
                  }
                }}
                disabled={financialOffset >= 0}
                className="hover-scale"
                style={{ opacity: financialOffset < 0 ? 1 : 0.3 }}
              >
                <IconChevronRight size={20} />
              </ActionIcon>
            </Group>
          )}
        </Card>

        {analytics && (
          <>
            <Card 
              shadow="lg" 
              padding="xl" 
              radius="xl" 
              withBorder
              className="stagger-item"
              style={{
                background: colorScheme === 'dark'
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Group gap="xs" mb="sm">
                <IconWallet size={24} style={{ color: '#667eea' }} />
                <Text size="sm" c="dimmed">Остаток доходов</Text>
              </Group>
              <Text fw={800} size="2.5rem" lh={1.2} className="gradient-text">
                {formatNumber(analytics.balance ?? 0)} ₸
              </Text>
              <Text size="xs" c="dimmed" mt="sm">
                после расходов · без сбережений
              </Text>
            </Card>

            <SimpleGrid cols={3} spacing="md" className="stagger-item">
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
                <IconTrendingUp size={20} style={{ color: '#10b981', marginBottom: '8px' }} />
                <Text size="xs" c="dimmed" mb={4}>Пришло</Text>
                <Text size="lg" fw={700} c="green">{formatNumber(analytics.total_income || 0)} ₸</Text>
                <PeriodDelta
                  current={analytics.total_income || 0}
                  previous={analytics.comparison_previous_period?.total_income}
                  kind="income"
                />
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
                <IconTrendingDown size={20} style={{ color: '#ef4444', marginBottom: '8px' }} />
                <Text size="xs" c="dimmed" mb={4}>Потрачено</Text>
                <Text size="lg" fw={700} c="red">{formatNumber(analytics.total_expenses || 0)} ₸</Text>
                <PeriodDelta
                  current={analytics.total_expenses || 0}
                  previous={analytics.comparison_previous_period?.total_expenses}
                  kind="expense"
                />
              </Card>
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
                <IconTarget size={20} style={{ color: '#3b82f6', marginBottom: '8px' }} />
                <Text size="xs" c="dimmed" mb={4}>Отложено</Text>
                <Text size="lg" fw={700} c="blue">{formatNumber(analytics.total_savings ?? 0)} ₸</Text>
                <PeriodDelta
                  current={analytics.total_savings ?? 0}
                  previous={analytics.comparison_previous_period?.total_savings}
                  kind="savings"
                />
              </Card>
            </SimpleGrid>

            <CategoryBreakdown
              categories={analytics.by_category}
              totalExpenses={analytics.total_expenses || 0}
              totalSavings={analytics.total_savings ?? 0}
              isCurrentPeriod={period === 'current' && financialOffset === 0}
            />

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
                <Text fw={600} size="md">Прогресс периода</Text>
                <Text size="sm" c="dimmed">
                  день {elapsed} из {daysTotal}
                </Text>
              </Group>
              <Progress 
                value={progressPct} 
                color="blue" 
                size="lg" 
                radius="xl"
                className="progress-animated"
                style={{
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
                }}
              />
              <Group justify="space-between" mt="md">
                <Text size="sm" c="dimmed">Темп расходов</Text>
                <Text size="md" fw={700}>{formatNumber(pace)} ₸/день</Text>
              </Group>
            </Card>

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
              <Text fw={600} mb="lg" size="md">Расходы по дням</Text>
              {barData.length > 0 ? (
                <Box style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                        vertical={false} 
                      />
                      <XAxis
                        dataKey="dayNum"
                        tick={{ fontSize: 10, fill: colorScheme === 'dark' ? '#9ca3af' : '#6b7280' }}
                        interval={barData.length > 18 ? Math.ceil(barData.length / 14) - 1 : 0}
                        height={28}
                        tickMargin={4}
                      />
                      <YAxis hide domain={[0, maxExpense * 1.05]} />
                      <Tooltip
                        formatter={(v: number | undefined) => (v != null ? `${formatNumber(v)} ₸` : '')}
                        labelFormatter={(_, items) => {
                          const p = items?.[0]?.payload as { fullLabel?: string } | undefined;
                          return p?.fullLabel ?? '';
                        }}
                        contentStyle={{
                          background: colorScheme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar 
                        dataKey="expense" 
                        fill="url(#colorExpense)" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={16} 
                      />
                      <defs>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#ea580c" stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Text c="dimmed" ta="center" py="xl">Нет данных</Text>
              )}
            </Card>
          </>
        )}
      </Stack>
    </Container>
  );
}
