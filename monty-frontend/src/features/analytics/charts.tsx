import { useState } from 'react';
import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '../../ui';
import type { Overview, TrendPoint } from './types';
import { WEEKDAYS_SHORT, calendarWeeks, compactTick, heatLevel, heatThresholds, parseDay } from './helpers';

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const monthShort = new Intl.DateTimeFormat('ru-RU', { month: 'short' });

const axisTick = { fontSize: 11, fill: 'var(--monty-hint)' };

// ---------- shared bits ----------

export function LegendKey({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <Group gap={6} wrap="nowrap" component="span">
      <svg width="16" height="8" aria-hidden>
        <line x1="1" y1="4" x2="15" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray={dashed ? '3 3' : undefined} />
      </svg>
      <Text component="span" size="xs" style={{ color: 'var(--monty-subtitle)' }}>{label}</Text>
    </Group>
  );
}

export function SwatchKey({ color, label }: { color: string; label: string }) {
  return (
    <Group gap={6} wrap="nowrap" component="span">
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <Text component="span" size="xs" style={{ color: 'var(--monty-subtitle)' }}>{label}</Text>
    </Group>
  );
}

function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <Box p="xs" style={{ background: 'var(--monty-surface)', border: '1px solid var(--monty-separator)', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
      <Text size="xs" fw={600} mb={4}>{title}</Text>
      {rows.map(r => (
        <Group key={r.label} gap={8} justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            {r.color && <span style={{ width: 8, height: 8, borderRadius: 4, background: r.color }} />}
            <Text size="xs" style={{ color: 'var(--monty-subtitle)' }}>{r.label}</Text>
          </Group>
          <Text size="xs" fw={600} className="monty-tabular">{r.value}</Text>
        </Group>
      ))}
    </Box>
  );
}

// ---------- cumulative spend vs plan ----------

export function SpendChart({ data }: { data: Overview }) {
  const hasPace = data.budget_limit > 0;
  const hasForecast = data.forecast !== null;
  return (
    <Stack gap={8}>
      <Group gap="md">
        <LegendKey color="var(--viz-1)" label="Потрачено" />
        {hasForecast && <LegendKey color="var(--viz-1)" label="Прогноз" dashed />}
        {hasPace && <LegendKey color="var(--viz-muted)" label="Ровный темп бюджета" />}
      </Group>
      <Box h={200} aria-label="Накопленные расходы за период" role="img">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.cumulative} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={d => dayMonth.format(parseDay(d))}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: 'var(--viz-grid)' }}
              minTickGap={28}
            />
            <YAxis tickFormatter={compactTick} tick={axisTick} tickLine={false} axisLine={false} width={60} />
            <Tooltip
              cursor={{ stroke: 'var(--monty-hint)', strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as Overview['cumulative'][number];
                const rows = [
                  row.actual !== null ? { label: 'Потрачено', value: formatMoney(row.actual), color: 'var(--viz-1)' } : null,
                  row.actual === null && row.forecast !== null ? { label: 'Прогноз', value: formatMoney(row.forecast), color: 'var(--viz-1)' } : null,
                  row.pace !== null ? { label: 'По плану', value: formatMoney(row.pace), color: 'var(--viz-muted)' } : null,
                ].filter(Boolean) as { label: string; value: string; color?: string }[];
                return <TooltipCard title={dayMonth.format(parseDay(String(label)))} rows={rows} />;
              }}
            />
            {hasPace && <Line dataKey="pace" stroke="var(--viz-muted)" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
            <Area dataKey="actual" stroke="var(--viz-1)" strokeWidth={2} fill="var(--viz-1)" fillOpacity={0.1}
              dot={false} activeDot={{ r: 4, stroke: 'var(--monty-surface)', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
            {hasForecast && (
              <Line dataKey="forecast" stroke="var(--viz-1)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Stack>
  );
}

// ---------- 50/30/20 ----------

const GROUP_META = {
  BASE: { label: 'Необходимое', color: 'var(--viz-1)' },
  COMFORT: { label: 'Желания', color: 'var(--viz-2)' },
  SAVINGS: { label: 'Накопления', color: 'var(--viz-3)' },
} as const;

function StackedBar({ parts, label }: { parts: { key: string; share: number; color: string }[]; label: string }) {
  const total = parts.reduce((s, p) => s + p.share, 0);
  const rest = Math.max(0, 100 - total);
  return (
    <Group gap={10} wrap="nowrap">
      <Text size="xs" w={34} style={{ color: 'var(--monty-hint)' }}>{label}</Text>
      {/* 2px surface gaps separate the segments; the remainder is the unspent share of income. */}
      <Box style={{ flex: 1, display: 'flex', gap: 2, height: 14 }}>
        {parts.filter(p => p.share > 0).map((p, i, arr) => (
          <Box key={p.key} style={{
            width: `${p.share}%`, background: p.color, minWidth: 3,
            borderRadius: `${i === 0 ? 4 : 0}px ${i === arr.length - 1 && rest === 0 ? 4 : 0}px ${i === arr.length - 1 && rest === 0 ? 4 : 0}px ${i === 0 ? 4 : 0}px`,
          }} />
        ))}
        {rest > 0 && <Box style={{ flex: 1, background: 'var(--monty-surface-2)', borderRadius: '0 4px 4px 0' }} />}
      </Box>
    </Group>
  );
}

export function StructureChart({ structure }: { structure: Overview['structure'] }) {
  const actual = structure.groups.map(g => ({ key: g.group, share: g.share, color: GROUP_META[g.group].color }));
  const target = structure.groups.map(g => ({ key: g.group, share: g.target_share, color: GROUP_META[g.group].color }));
  return (
    <Stack gap={10}>
      <StackedBar parts={actual} label="Факт" />
      <StackedBar parts={target} label="Цель" />
      <Stack gap={6} mt={4}>
        {structure.groups.map(g => {
          return (
            <Group key={g.group} justify="space-between" wrap="nowrap">
              <SwatchKey color={GROUP_META[g.group].color} label={`${GROUP_META[g.group].label} · цель ${g.target_share}%`} />
              <Group gap={8} wrap="nowrap">
                <Text size="sm" fw={600}>{g.share}%</Text>
                <Text size="xs" w={56} ta="right" className="monty-tabular" style={{ color: 'var(--monty-hint)' }}>
                  {formatMoney(g.amount).replace(' ₸', '')}
                </Text>
              </Group>
            </Group>
          );
        })}
      </Stack>
    </Stack>
  );
}

// ---------- calendar heatmap ----------

export function CalendarHeatmap({ days }: { days: Overview['heatmap'] }) {
  const max = Math.max(0, ...days.map(d => d.expense));
  const thresholds = heatThresholds(days.filter(d => !d.future).map(d => d.expense));
  const [selected, setSelected] = useState<string | null>(null);
  const weeks = calendarWeeks(days);
  const picked = days.find(d => d.date === selected) ?? null;
  const step = (level: number) => (level === 0 ? 'var(--monty-surface-2)' : `var(--viz-seq-${level})`);

  return (
    <Stack gap={8}>
      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {WEEKDAYS_SHORT.map(w => <Text key={w} size="xs" ta="center" style={{ color: 'var(--monty-hint)' }}>{w}</Text>)}
      </Box>
      <Stack gap={4}>
        {weeks.map((week, wi) => (
          <Box key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {week.map((cell, ci) => cell === null ? <span key={ci} /> : (
              <UnstyledButton
                key={cell.date}
                onClick={() => setSelected(s => (s === cell.date ? null : cell.date))}
                aria-label={`${dayMonth.format(parseDay(cell.date))}: ${cell.future ? 'ещё не наступил' : formatMoney(cell.expense)}`}
                aria-pressed={selected === cell.date}
                style={{
                  aspectRatio: '1',
                  borderRadius: 6,
                  background: cell.future ? 'transparent' : step(heatLevel(cell.expense, thresholds)),
                  border: cell.future ? '1px dashed var(--monty-separator)' : undefined,
                  outline: selected === cell.date ? '2px solid var(--monty-text)' : undefined,
                  outlineOffset: 1,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Text fz={10} fw={500} style={{ color: !cell.future && heatLevel(cell.expense, thresholds) > 0 ? `var(--viz-seq-ink-${heatLevel(cell.expense, thresholds)})` : 'var(--monty-hint)' }}>
                  {parseDay(cell.date).getDate()}
                </Text>
              </UnstyledButton>
            ))}
          </Box>
        ))}
      </Stack>
      <Group justify="space-between" wrap="nowrap" mt={2}>
        <Text size="xs" style={{ color: 'var(--monty-subtitle)' }}>
          {picked ? `${dayMonth.format(parseDay(picked.date))}: ${picked.future ? 'ещё впереди' : formatMoney(picked.expense)}` : 'Нажмите на день'}
        </Text>
        <Group gap={3} wrap="nowrap" aria-label="Шкала: от дней без трат до самых дорогих дней">
          <Text size="xs" style={{ color: 'var(--monty-hint)' }}>0</Text>
          {[0, 1, 2, 3, 4, 5].map(l => <span key={l} style={{ width: 10, height: 10, borderRadius: 3, background: step(l) }} />)}
          <Text size="xs" style={{ color: 'var(--monty-hint)' }}>макс. {compactTick(max)}</Text>
        </Group>
      </Group>
    </Stack>
  );
}

// ---------- weekdays ----------

export function WeekdayBars({ weekdays }: { weekdays: Overview['weekdays'] }) {
  const max = Math.max(1, ...weekdays.map(w => w.average));
  const peak = weekdays.reduce((a, b) => (b.average > a.average ? b : a), weekdays[0]);
  return (
    <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignItems: 'end', height: 132 }}>
      {weekdays.map(w => {
        const isPeak = w.weekday === peak.weekday && w.average > 0;
        return (
          <Stack key={w.weekday} gap={4} align="center" justify="flex-end" h="100%" aria-label={`${WEEKDAYS_SHORT[w.weekday]}: в среднем ${formatMoney(w.average)}`}>
            <Text fz={10} fw={600} style={{ color: 'var(--monty-text)', visibility: isPeak ? 'visible' : 'hidden' }}>
              {compactTick(w.average)}
            </Text>
            <Box style={{
              width: '100%', maxWidth: 24, height: `${Math.max(2, (w.average / max) * 84)}px`,
              background: isPeak ? 'var(--viz-1)' : 'color-mix(in srgb, var(--viz-1) 45%, var(--monty-surface))',
              borderRadius: '4px 4px 0 0',
            }} />
            <Text fz={11} style={{ color: 'var(--monty-hint)' }}>{WEEKDAYS_SHORT[w.weekday]}</Text>
          </Stack>
        );
      })}
    </Box>
  );
}

// ---------- trends ----------

export function TrendsChart({ points }: { points: TrendPoint[] }) {
  const data = points.map(p => ({ ...p, label: monthShort.format(parseDay(p.end)).replace('.', '') }));
  return (
    <Stack gap={8}>
      <Group gap="md">
        <SwatchKey color="var(--viz-1)" label="Расходы" />
        <SwatchKey color="var(--viz-3)" label="Доходы" />
      </Group>
      <Box h={180} role="img" aria-label="Доходы и расходы по периодам">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--viz-grid)' }} />
            <YAxis tickFormatter={compactTick} tick={axisTick} tickLine={false} axisLine={false} width={60} />
            <Tooltip
              cursor={{ fill: 'var(--monty-surface-2)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as TrendPoint;
                return (
                  <TooltipCard
                    title={`${dayMonth.format(parseDay(p.start))} – ${dayMonth.format(parseDay(p.end))}${p.is_current ? ' (идёт)' : ''}`}
                    rows={[
                      { label: 'Расходы', value: formatMoney(p.expense), color: 'var(--viz-1)' },
                      { label: 'Доходы', value: formatMoney(p.income), color: 'var(--viz-3)' },
                      { label: 'Отложено', value: formatMoney(p.savings) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="expense" fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
            <Bar dataKey="income" fill="var(--viz-3)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Stack>
  );
}
