import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Stack,
  Text,
  Card,
  Group,
  LoadingOverlay,
  SegmentedControl,
  Button,
  Progress,
  Box,
  Anchor,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsApi, settingsApi } from '../api';
import type { Analytics, BudgetWithSpent, Settings } from '../types';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
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
      fullLabel: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
  }
  return out;
}

function limitUsageColor(ratio: number): 'green' | 'yellow' | 'red' {
  if (ratio >= 1) return 'red';
  if (ratio >= 0.7) return 'yellow';
  return 'green';
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('current');
  const [viewMode, setViewMode] = useState<'preset' | 'custom'>('preset');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
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
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
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
    if (viewMode === 'preset') {
      setFinancialOffset(0);
    }
  }, [viewMode, period]);

  useEffect(() => {
    if (viewMode === 'preset') {
      void loadAnalyticsByPeriod();
    }
  }, [viewMode, loadAnalyticsByPeriod]);

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

  const presetPeriodLabel = (a: Analytics): string | null => {
    if (viewMode === 'preset' && period === 'current' && financialLabel) return financialLabel;
    if (a.period_start && a.period_end) {
      const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
      const s = parseISODateLocal(a.period_start);
      const e = parseISODateLocal(a.period_end);
      return `${formatter.format(s)} – ${formatter.format(e)}`;
    }
    return null;
  };

  const limitsRows: BudgetWithSpent[] = (analytics?.budgets_with_spent ?? []).filter(
    (b) => b.group === 'BASE' || b.group === 'COMFORT',
  );

  const barData = analytics ? buildExpenseBarData(analytics) : [];
  const maxExpense = Math.max(...barData.map((d) => d.expense), 1);

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
          <>
            <SegmentedControl
              value={period}
              onChange={(val) => {
                setPeriod(val);
                setFinancialOffset(0);
              }}
              data={[
                { value: 'current', label: 'Фин. период' },
                { value: '1', label: 'Календарный месяц' },
                { value: '3', label: '3 месяца' },
                { value: '6', label: '6 месяцев' },
                { value: '12', label: 'Год' },
              ]}
              fullWidth
            />
            {period === 'current' && (
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  {financialOffset === 0 ? 'Текущий фин. период' : `${-financialOffset}-й период назад`}
                </Text>
              </Stack>
            )}
          </>
        ) : (
          <Stack gap="xs">
            <Group grow>
              <div>
                <Text size="sm" fw={500} mb={4} component="label">
                  С
                </Text>
                <input
                  type="date"
                  value={startDate ? startDate.toISOString().slice(0, 10) : ''}
                  onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid var(--mantine-color-default-border)',
                  }}
                />
              </div>
              <div>
                <Text size="sm" fw={500} mb={4} component="label">
                  По
                </Text>
                <input
                  type="date"
                  value={endDate ? endDate.toISOString().slice(0, 10) : ''}
                  onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid var(--mantine-color-default-border)',
                  }}
                />
              </div>
            </Group>
            <Button onClick={loadAnalyticsByDateRange} disabled={!startDate || !endDate} loading={loading}>
              Показать
            </Button>
          </Stack>
        )}

        <Box pos="relative" mih={loading && !analytics ? 240 : undefined}>
          <LoadingOverlay visible={loading} zIndex={10} />
          {analytics && (
            <>
              <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                <Text fw={700} size="lg" style={{ flex: '0 1 auto', minWidth: 0 }} truncate>
                  Финансовый дашборд
                </Text>
                {viewMode === 'preset' && period === 'current' ? (
                  <Group gap={4} wrap="nowrap">
                    <IconChevronLeft
                      size={18}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => setFinancialOffset((prev) => prev - 1)}
                    />
                    <Text size="sm" c="dimmed" ta="center" style={{ whiteSpace: 'nowrap' }}>
                      {financialLabel ?? '—'}
                    </Text>
                    <IconChevronRight
                      size={18}
                      style={{
                        cursor: financialOffset < 0 ? 'pointer' : 'default',
                        opacity: financialOffset < 0 ? 1 : 0.35,
                        flexShrink: 0,
                      }}
                      onClick={() => {
                        if (financialOffset < 0) {
                          setFinancialOffset((prev) => prev + 1);
                        }
                      }}
                    />
                  </Group>
                ) : (
                  presetPeriodLabel(analytics) && (
                    <Text size="sm" c="dimmed" ta="right" style={{ whiteSpace: 'nowrap' }}>
                      {presetPeriodLabel(analytics)}
                    </Text>
                  )
                )}
              </Group>

              <Box>
                <Text size="sm" c="dimmed" mb={4}>
                  Остаток доходов
                </Text>
                <Text fw={800} size="2.25rem" lh={1.2}>
                  {formatNumber(analytics.balance ?? 0)} ₸
                </Text>
                <Text size="xs" c="dimmed" mt={6}>
                  после расходов · без сбережений
                </Text>
              </Box>

              <Group gap="xs" grow wrap="nowrap">
                <Box
                  py={6}
                  px={10}
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--mantine-color-default-border)',
                    textAlign: 'center',
                  }}
                >
                  <Text size="xs" c="dimmed" mb={2}>
                    Пришло
                  </Text>
                  <Text size="sm" fw={600} c="green">
                    {formatNumber(analytics.total_income || 0)} ₸
                  </Text>
                </Box>
                <Box
                  py={6}
                  px={10}
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--mantine-color-default-border)',
                    textAlign: 'center',
                  }}
                >
                  <Text size="xs" c="dimmed" mb={2}>
                    Потрачено
                  </Text>
                  <Text size="sm" fw={600} c="orange">
                    {formatNumber(analytics.total_expenses || 0)} ₸
                  </Text>
                </Box>
                <Box
                  py={6}
                  px={10}
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--mantine-color-default-border)',
                    textAlign: 'center',
                  }}
                >
                  <Text size="xs" c="dimmed" mb={2}>
                    Отложено
                  </Text>
                  <Text size="sm" fw={600} c="blue">
                    {formatNumber(analytics.total_savings ?? 0)} ₸
                  </Text>
                </Box>
              </Group>

              {(analytics.large_one_off_total ?? 0) > 0 && (
                <Box
                  py="sm"
                  px="md"
                  style={{
                    borderRadius: 12,
                    backgroundColor: 'var(--mantine-color-red-0)',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text size="sm" fw={500} style={{ flex: 1, color: 'var(--mantine-color-red-8)' }}>
                      Крупные разовые траты в периоде
                    </Text>
                    <Text size="sm" fw={700} style={{ whiteSpace: 'nowrap', color: 'var(--mantine-color-red-9)' }}>
                      {formatNumber(analytics.large_one_off_total!)} ₸
                    </Text>
                  </Group>
                </Box>
              )}

              {(() => {
                const bounds = resolvePeriodBounds(analytics);
                if (!bounds) return null;
                const daysTotal = inclusiveDays(bounds.start, bounds.end);
                const elapsed = periodElapsedDays(bounds.start, bounds.end);
                const pace = Math.round(analytics.total_expenses / Math.max(1, elapsed));
                const progressPct = daysTotal > 0 ? Math.min(100, (elapsed / daysTotal) * 100) : 0;
                return (
                  <Stack gap="sm">
                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={500}>
                          Период
                        </Text>
                        <Text size="sm" c="dimmed">
                          день {elapsed} из {daysTotal}
                        </Text>
                      </Group>
                      <Progress value={progressPct} color="green" size="sm" radius="xl" />
                    </Box>
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        Темп расходов
                      </Text>
                      <Text size="sm" fw={600}>
                        {formatNumber(pace)} ₸/день
                      </Text>
                    </Group>
                  </Stack>
                );
              })()}

              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Лимиты</Text>
                  <Anchor size="sm" onClick={() => navigate('/')}>
                    все →
                  </Anchor>
                </Group>
                {limitsRows.length > 0 ? (
                  <Stack gap="md">
                    {limitsRows.map((b) => {
                      const limit = Math.max(1, b.limit_amount);
                      const ratio = b.spent / limit;
                      const barPct = Math.min(100, ratio * 100);
                      const color = limitUsageColor(ratio);
                      const over = b.spent - b.limit_amount;
                      return (
                        <Box key={b.category_id}>
                          <Group justify="space-between" mb={6} wrap="nowrap" gap="xs">
                            <Group gap="xs" style={{ minWidth: 0 }}>
                              <Text size="lg">{b.category_icon}</Text>
                              <Text size="sm" fw={500} truncate>
                                {b.category_name}
                              </Text>
                            </Group>
                            <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
                              {formatNumber(b.spent)} / {formatNumber(b.limit_amount)} ₸
                            </Text>
                          </Group>
                          <Progress value={barPct} color={color} size="sm" radius="xl" />
                          {over > 0 && (
                            <Text size="xs" c="red" mt={4}>
                              Превышение +{formatNumber(over)} ₸
                            </Text>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                ) : (
                  <Text c="dimmed" size="sm" ta="center">
                    Нет лимитов по категориям (база / комфорт)
                  </Text>
                )}
              </Card>

              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Text fw={600} mb="md">
                  Расходы по дням
                </Text>
                {barData.length > 0 ? (
                  <Box style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-default-border)" vertical={false} />
                        <XAxis
                          dataKey="dayNum"
                          tick={{ fontSize: 9 }}
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
                        />
                        <Bar dataKey="expense" fill="var(--mantine-color-orange-6)" radius={[3, 3, 0, 0]} maxBarSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">
                    Нет данных
                  </Text>
                )}
              </Card>

              {analytics.top_expenses && analytics.top_expenses.length > 0 && (
                <Card shadow="sm" padding="md" radius="md" withBorder>
                  <Text fw={600} mb="sm">
                    Топ расходов и накоплений
                  </Text>
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
                            {prefix}
                            {formatNumber(item.amount)} ₸
                          </Text>
                        </Group>
                      );
                    })}
                  </Stack>
                </Card>
              )}

              {analytics.by_user && analytics.by_user.length > 0 && (
                <Card shadow="sm" padding="md" radius="md" withBorder>
                  <Text fw={600} mb="sm">
                    Кто сколько потратил
                  </Text>
                  <Stack gap="xs">
                    {analytics.by_user.map((u) => (
                      <Group key={u.user_id} justify="space-between">
                        <Text size="sm" fw={500}>
                          {u.user_name}
                        </Text>
                        <Group gap="md">
                          <Text size="xs" c="green">
                            +{formatNumber(u.income)}
                          </Text>
                          <Text size="xs" c="red">
                            −{formatNumber(u.expense)}
                          </Text>
                          {u.savings > 0 && (
                            <Text size="xs" c="blue">
                              накопл. {formatNumber(u.savings)}
                            </Text>
                          )}
                        </Group>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              )}

              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Text fw={600} mb="md">
                  По категориям
                </Text>
                <Stack gap="sm">
                  {analytics.by_category.length > 0 &&
                    (() => {
                      const maxAmount = Math.max(...analytics.by_category.map((c) => c.amount));
                      const totalForPct = analytics.total_income + analytics.total_expenses + analytics.total_savings;
                      return analytics.by_category.map((cat, idx) => {
                        const isIncome = cat.type === 'income';
                        const isSavings = cat.type === 'savings';
                        const color = isIncome ? 'green' : isSavings ? 'blue' : 'red';
                        const prefix = isIncome ? '+' : isSavings ? '' : '−';
                        const barPct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
                        const sharePct = totalForPct > 0 ? (cat.amount / totalForPct) * 100 : 0;
                        return (
                          <Box key={idx}>
                            <Group justify="space-between" mb={4}>
                              <Group gap="xs">
                                <Text size="lg">{cat.icon}</Text>
                                <Text size="sm">{cat.name}</Text>
                              </Group>
                              <Text size="sm" fw={500} c={color}>
                                {prefix}
                                {formatNumber(cat.amount)} ₸
                                <Text span size="xs" c="dimmed" ml={4}>
                                  ({sharePct.toFixed(0)}%)
                                </Text>
                              </Text>
                            </Group>
                            <Progress value={barPct} color={cat.type === 'income' ? 'green' : 'red'} size="sm" radius="xl" />
                          </Box>
                        );
                      });
                    })()}
                  {analytics.by_category.length === 0 && (
                    <Text c="dimmed" ta="center">
                      Нет данных
                    </Text>
                  )}
                </Stack>
              </Card>

              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Text fw={600} mb="md">
                  По группам
                </Text>
                <Stack gap="sm">
                  {analytics.by_group.length > 0 &&
                    (() => {
                      const maxGroupAmount = Math.max(...analytics.by_group.map((g) => g.amount));
                      const totalGroup = analytics.by_group.reduce((s, g) => s + g.amount, 0);
                      return analytics.by_group.map((group, idx) => {
                        const isIncome = group.type === 'income';
                        const isSavings = group.group === 'SAVINGS';
                        const color = isIncome ? 'green' : isSavings ? 'blue' : 'red';
                        const prefix = isIncome ? '+' : isSavings ? '' : '−';
                        const barPct = maxGroupAmount > 0 ? (group.amount / maxGroupAmount) * 100 : 0;
                        const sharePct = totalGroup > 0 ? (group.amount / totalGroup) * 100 : 0;
                        const label =
                          group.group === 'BASE'
                            ? 'База'
                            : group.group === 'COMFORT'
                              ? 'Комфорт'
                              : group.group === 'SAVINGS'
                                ? 'Накопления'
                                : 'Доход';
                        return (
                          <Box key={idx}>
                            <Group justify="space-between" mb={4}>
                              <Text size="sm" fw={500}>
                                {label}
                              </Text>
                              <Text size="sm" fw={500} c={color}>
                                {prefix}
                                {formatNumber(group.amount)} ₸
                                <Text span size="xs" c="dimmed" ml={4}>
                                  ({sharePct.toFixed(0)}%)
                                </Text>
                              </Text>
                            </Group>
                            <Progress value={barPct} color={color} size="sm" radius="xl" />
                          </Box>
                        );
                      });
                    })()}
                  {analytics.by_group.length === 0 && (
                    <Text c="dimmed" ta="center">
                      Нет данных
                    </Text>
                  )}
                </Stack>
              </Card>

              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Text fw={600} mb="md">
                  По дням (список)
                </Text>
                <Stack gap="xs">
                  {analytics.daily_data
                    .slice(-10)
                    .reverse()
                    .map((day, idx) => (
                      <Group key={idx} justify="space-between">
                        <Text size="sm" c="dimmed">
                          {new Date(day.date).toLocaleDateString('ru-RU')}
                        </Text>
                        <Group gap="sm">
                          <Text size="xs" c="green">
                            {formatNumber(day.income)}
                          </Text>
                          <Text size="xs" c="red">
                            −{formatNumber(day.expense)}
                          </Text>
                        </Group>
                      </Group>
                    ))}
                  {analytics.daily_data.length === 0 && (
                    <Text c="dimmed" ta="center">
                      Нет данных
                    </Text>
                  )}
                </Stack>
              </Card>
            </>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
