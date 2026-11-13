import { useState } from 'react';
import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../ui';
import { WEEKDAYS_SHORT, calendarWeeks, parseDay } from '../analytics/helpers';
import { formatMood, moodEmoji, moodOf } from './mood';
import type { JournalAnalytics } from './types';

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const axisTick = { fontSize: 11, fill: 'var(--monty-hint)' };

/** Mood 1..5 maps straight onto the 5-step sequential palette. */
const moodColor = (mood: number | null) => (mood == null ? 'var(--monty-surface-2)' : `var(--viz-seq-${moodOf(mood)!.value})`);
const moodInk = (mood: number | null) => (mood == null ? 'var(--monty-hint)' : `var(--viz-seq-ink-${moodOf(mood)!.value})`);

export function MoodTrendChart({ series }: { series: JournalAnalytics['series'] }) {
  const data = series.map(p => ({ ...p, label: dayMonth.format(parseDay(p.date)).replace('.', '') }));
  return (
    <Box h={180} role="img" aria-label="Настроение по дням">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--viz-grid)' }} minTickGap={24} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={v => moodEmoji(v)} tick={{ fontSize: 13 }} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            cursor={{ stroke: 'var(--monty-separator)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as JournalAnalytics['series'][number];
              return (
                <Box p="xs" style={{ background: 'var(--monty-surface)', border: '1px solid var(--monty-separator)', borderRadius: 10 }}>
                  <Text size="xs" fw={600}>{dayMonth.format(parseDay(p.date))}</Text>
                  <Text size="xs" style={{ color: 'var(--monty-subtitle)' }}>
                    {p.mood == null ? 'Нет оценки' : `${moodEmoji(p.mood)} ${formatMood(p.mood)}`}
                    {p.entries > 0 && ` · записей: ${p.entries}`}
                  </Text>
                </Box>
              );
            }}
          />
          {/* connectNulls: a day without mood is a gap in data, not a dip to zero */}
          <Line type="monotone" dataKey="mood" stroke="var(--viz-1)" strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function MoodCalendar({ series }: { series: JournalAnalytics['series'] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const weeks = calendarWeeks(series.map(s => ({ date: s.date, expense: 0, future: false })));
  const byDate = new Map(series.map(s => [s.date, s]));
  const picked = selected ? byDate.get(selected) : undefined;

  return (
    <Stack gap={8}>
      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {WEEKDAYS_SHORT.map(w => <Text key={w} size="xs" ta="center" style={{ color: 'var(--monty-hint)' }}>{w}</Text>)}
      </Box>
      <Stack gap={4}>
        {weeks.map((week, wi) => (
          <Box key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {week.map((cell, ci) => {
              if (cell === null) return <span key={ci} />;
              const day = byDate.get(cell.date)!;
              return (
                <UnstyledButton
                  key={cell.date}
                  onClick={() => setSelected(s => (s === cell.date ? null : cell.date))}
                  aria-label={`${dayMonth.format(parseDay(cell.date))}: ${day.mood == null ? (day.entries ? 'без оценки' : 'нет записи') : formatMood(day.mood)}`}
                  aria-pressed={selected === cell.date}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 6,
                    background: moodColor(day.mood),
                    border: day.entries === 0 ? '1px dashed var(--monty-separator)' : undefined,
                    outline: selected === cell.date ? '2px solid var(--monty-text)' : undefined,
                    outlineOffset: 1,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Text fz={10} fw={500} style={{ color: moodInk(day.mood) }}>{parseDay(cell.date).getDate()}</Text>
                </UnstyledButton>
              );
            })}
          </Box>
        ))}
      </Stack>
      <Group justify="space-between" wrap="nowrap" mt={2}>
        <Text size="xs" style={{ color: 'var(--monty-subtitle)' }}>
          {picked
            ? `${dayMonth.format(parseDay(picked.date))}: ${picked.mood == null ? (picked.entries ? 'без оценки' : 'нет записи') : `${moodEmoji(picked.mood)} ${formatMood(picked.mood)}`}`
            : 'Нажмите на день'}
        </Text>
        <Group gap={3} wrap="nowrap" aria-label="Шкала: от плохого настроения к отличному">
          <Text size="xs" aria-hidden>😞</Text>
          {[1, 2, 3, 4, 5].map(l => <span key={l} style={{ width: 10, height: 10, borderRadius: 3, background: `var(--viz-seq-${l})` }} />)}
          <Text size="xs" aria-hidden>😄</Text>
        </Group>
      </Group>
    </Stack>
  );
}

export function WeekdayMood({ weekday }: { weekday: JournalAnalytics['weekday'] }) {
  const known = weekday.filter(w => w.mood != null);
  const best = known.length ? known.reduce((a, b) => (b.mood! > a.mood! ? b : a)) : null;
  return (
    <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignItems: 'end', height: 132 }}>
      {weekday.map(w => {
        const isBest = best?.weekday === w.weekday;
        // Bars start at mood 1 so differences between 3 and 4 are visible.
        const h = w.mood == null ? 2 : Math.max(4, ((w.mood - 1) / 4) * 84);
        return (
          <Stack key={w.weekday} gap={4} align="center" justify="flex-end" h="100%"
            aria-label={`${WEEKDAYS_SHORT[w.weekday]}: ${w.mood == null ? 'нет данных' : formatMood(w.mood)}`}>
            <Text fz={10} fw={600} style={{ visibility: w.mood != null ? 'visible' : 'hidden' }}>{formatMood(w.mood)}</Text>
            <Box style={{
              width: '100%', maxWidth: 24, height: `${h}px`,
              background: isBest ? 'var(--viz-1)' : 'color-mix(in srgb, var(--viz-1) 45%, var(--monty-surface))',
              borderRadius: '4px 4px 0 0',
            }} />
            <Text fz={11} style={{ color: 'var(--monty-hint)' }}>{WEEKDAYS_SHORT[w.weekday]}</Text>
          </Stack>
        );
      })}
    </Box>
  );
}

export function SpendingByMood({ spending }: { spending: JournalAnalytics['spending'] }) {
  const rows = [
    { key: 'low', label: '😕 Плохие дни', bucket: spending.low_mood },
    { key: 'mid', label: '😐 Обычные', bucket: spending.mid_mood },
    { key: 'high', label: '🙂 Хорошие', bucket: spending.high_mood },
  ];
  const max = Math.max(1, ...rows.map(r => r.bucket.avg_spent ?? 0));
  return (
    <Stack gap={10}>
      {rows.map(r => (
        <Box key={r.key}>
          <Group justify="space-between" mb={4} wrap="nowrap">
            <Text size="sm">{r.label}</Text>
            <Text size="sm" fw={600} className="monty-tabular">
              {r.bucket.avg_spent == null ? '—' : formatMoney(r.bucket.avg_spent)}
              <Text component="span" size="xs" fw={400} style={{ color: 'var(--monty-hint)' }}> · {r.bucket.days} дн.</Text>
            </Text>
          </Group>
          <Box h={8} style={{ borderRadius: 4, background: 'var(--monty-surface-2)', overflow: 'hidden' }}>
            <Box h="100%" style={{ width: `${((r.bucket.avg_spent ?? 0) / max) * 100}%`, background: 'var(--viz-2)', borderRadius: 4 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
