import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Container,
  Group,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconAlertTriangle, IconBulb, IconChevronLeft, IconChevronRight, IconCircleCheck } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { AmountText, CategoryIcon, EmptyState, ListRow, PageHeader, Section, formatMoney, groupTint, pluralRu } from '../../ui';
import { useOverview, useRecurring, useTrends, type Range } from './queries';
import { delta, parseDay, rangeLabel } from './helpers';
import { CalendarHeatmap, SpendChart, StructureChart, TrendsChart, WeekdayBars } from './charts';
import type { Insight, Overview } from './types';

type Mode = 'period' | 'd30' | 'd90';

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lastDays(n: number): Range {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (n - 1));
  return { start: isoDay(start), end: isoDay(end) };
}

export function AnalyticsPage() {
  const [mode, setMode] = useState<Mode>('period');
  // Salary periods: a stack of earlier periods the user stepped back through (empty = current).
  const [history, setHistory] = useState<Range[]>([]);
  const range: Range | null = mode === 'd30' ? lastDays(30) : mode === 'd90' ? lastDays(90) : history.at(-1) ?? null;
  const overview = useOverview(range);
  const data = overview.data;

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader title="Анализ" />

      <Stack gap="sm" mt="sm">
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={v => {
            haptic('selection');
            setMode(v as Mode);
            setHistory([]);
          }}
          data={[
            { value: 'period', label: 'Период' },
            { value: 'd30', label: '30 дней' },
            { value: 'd90', label: '90 дней' },
          ]}
        />
        <Group justify="space-between" wrap="nowrap">
          <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Предыдущий период"
            disabled={mode !== 'period' || !data}
            onClick={() => data && setHistory(h => [...h, { start: data.previous.start, end: data.previous.end }])}>
            <IconChevronLeft size={22} />
          </ActionIcon>
          <Stack gap={0} align="center">
            <Text fw={600}>{data ? rangeLabel(data.period.start, data.period.end) : '…'}</Text>
            {data?.period.is_current && (
              <Text size="xs" style={{ color: 'var(--monty-hint)' }}>
                день {data.period.days_elapsed} из {data.period.days_total}
              </Text>
            )}
          </Stack>
          <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Следующий период"
            disabled={mode !== 'period' || history.length === 0}
            onClick={() => setHistory(h => h.slice(0, -1))}>
            <IconChevronRight size={22} />
          </ActionIcon>
        </Group>
      </Stack>

      {overview.isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить аналитику" action={{ label: 'Повторить', onClick: () => void overview.refetch() }} />
      ) : !data ? (
        <Stack gap="md" mt="md">
          <Skeleton h={120} radius="lg" />
          <Skeleton h={240} radius="lg" />
        </Stack>
      ) : (
        <Box mt="md" style={{ opacity: overview.isPlaceholderData ? 0.55 : 1, transition: 'opacity 150ms' }}>
          <Content data={data} />
        </Box>
      )}
    </Container>
  );
}

function Content({ data }: { data: Overview }) {
  const navigate = useNavigate();
  const noData = data.totals.expense === 0 && data.totals.income === 0 && data.totals.savings === 0;
  if (noData) {
    return <EmptyState icon="📊" title="За этот период операций нет" description="Добавьте траты — и здесь появится разбор." />;
  }
  const expenseCats = data.categories.filter(c => c.type !== 'income');
  const maxCat = Math.max(1, ...expenseCats.map(c => c.amount));

  return (
    <Stack gap="lg">
      <KpiTiles data={data} />

      {data.insights.length > 0 && (
        <Stack gap={8}>{data.insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}</Stack>
      )}

      {data.forecast && (
        <Section title="Прогноз на период" padded>
          <Stack gap="md">
            <Group justify="space-between" align="flex-end" wrap="nowrap">
              <Stack gap={0}>
                <Text size="sm" style={{ color: 'var(--monty-hint)' }}>К концу периода</Text>
                <AmountText value={data.forecast.projected} fz={28} fw={700} />
              </Stack>
              {data.forecast.budget_limit > 0 && (
                <Stack gap={0} align="flex-end">
                  <Text size="sm" style={{ color: 'var(--monty-hint)' }}>Бюджет</Text>
                  <Text fw={600}>{formatMoney(data.forecast.budget_limit)}</Text>
                </Stack>
              )}
            </Group>
            {data.forecast.budget_limit > 0 && (
              <Text size="sm" style={{ color: data.forecast.over_by > 0 ? 'var(--monty-negative)' : 'var(--monty-subtitle)' }}>
                {data.forecast.spent >= data.forecast.budget_limit
                  ? `Бюджет уже исчерпан: потрачено ${formatMoney(data.forecast.spent)}. Прогноз перерасхода ≈ ${formatMoney(data.forecast.over_by)}.`
                  : data.forecast.over_by > 0
                  ? `Перерасход ≈ ${formatMoney(data.forecast.over_by)}. Чтобы уложиться, тратьте до ${formatMoney(data.forecast.safe_per_day ?? 0)} в день.`
                  : `Можно тратить до ${formatMoney(data.forecast.safe_per_day ?? 0)} в день ещё ${data.forecast.days_left} ${pluralRu(data.forecast.days_left, ['день', 'дня', 'дней'])}.`}
              </Text>
            )}
            <SpendChart data={data} />
          </Stack>
        </Section>
      )}

      {!data.forecast && (
        <Section title="Расходы нарастающим итогом" padded>
          <SpendChart data={data} />
        </Section>
      )}

      {data.structure.basis_amount > 0 && (
        <Section
          title="Правило 50/30/20"
          padded
          footer={data.structure.basis === 'income'
            ? 'Доля от дохода за период: необходимое (База), желания (Комфорт), накопления.'
            : 'Доходов за период нет — доли считаются от всех трат.'}
        >
          <StructureChart structure={data.structure} />
        </Section>
      )}

      <Section title="Категории" footer="Сравнение с прошлым периодом. Нажмите, чтобы открыть операции.">
        {expenseCats.map((c, i) => {
          const d = c.change_pct;
          const overLimit = c.limit !== null && c.amount > c.limit;
          return (
            <UnstyledButton key={c.category_id} className="monty-pressable" style={{ display: 'block', width: '100%' }}
              onClick={() => navigate(`/transactions?category_id=${c.category_id}`)}>
              <Group wrap="nowrap" gap={12} px={16} py={10} style={{ borderTop: i > 0 ? '0.5px solid var(--monty-separator)' : undefined }}>
                <CategoryIcon icon={c.icon} tint={groupTint(c.group)} />
                <Stack gap={5} style={{ flex: 1, minWidth: 0 }}>
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text fw={500} lineClamp={1}>{c.name}</Text>
                    <AmountText value={c.amount} fw={600} />
                  </Group>
                  <Box style={{ height: 4, borderRadius: 2, background: 'var(--monty-surface-2)' }}>
                    <Box style={{ width: `${(c.amount / maxCat) * 100}%`, height: '100%', borderRadius: 2, background: groupTint(c.group) }} />
                  </Box>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" style={{ color: overLimit ? 'var(--monty-negative)' : 'var(--monty-hint)' }}>
                      {c.limit !== null ? `${overLimit ? 'сверх лимита · ' : ''}лимит ${formatMoney(c.limit)}` : `${c.count} ${pluralRu(c.count, ['операция', 'операции', 'операций'])}`}
                    </Text>
                    {d !== null && (
                      // Spending up is bad; for savings it is the other way round.
                      <Text size="xs" fw={600} style={{ color: (d > 0) === (c.type === 'savings') ? 'var(--monty-income)' : 'var(--monty-negative)' }}>
                        {d > 0 ? '▲' : d < 0 ? '▼' : ''} {Math.abs(d)}%
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Group>
            </UnstyledButton>
          );
        })}
      </Section>

      <Section title="Календарь трат" padded>
        <CalendarHeatmap days={data.heatmap} />
      </Section>

      <Section title="По дням недели" padded footer="Средние траты за день, включая дни без трат.">
        <WeekdayBars weekdays={data.weekdays} />
      </Section>

      <TrendsSection />
      <RecurringSection />

      {data.top_expenses.length > 0 && (
        <Section title="Крупные траты">
          {data.top_expenses.map((t, i) => {
            const anomaly = data.anomalies.find(a => a.id === t.id);
            return (
              <ListRow
                key={t.id}
                divider={i > 0}
                leading={<CategoryIcon icon={t.category_icon} />}
                title={t.comment || t.category_name}
                subtitle={anomaly ? `${t.category_name} · обычно ~${formatMoney(anomaly.typical ?? 0)}` : `${t.category_name} · ${t.user_name}`}
                trailing={<AmountText value={t.amount} fw={600} />}
                trailingSub={new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(parseDay(t.date))}
              />
            );
          })}
        </Section>
      )}

      {data.by_user.length > 1 && (
        <Section title="Кто сколько потратил" padded>
          <Stack gap="sm">
            {data.by_user.map(u => {
              const share = data.totals.expense ? Math.round((u.expense * 100) / data.totals.expense) : 0;
              return (
                <Stack key={u.user_id} gap={4}>
                  <Group justify="space-between">
                    <Text fw={500}>{u.user_name}</Text>
                    <Text size="sm"><b>{formatMoney(u.expense)}</b> · {share}%</Text>
                  </Group>
                  <Progress value={share} size={6} radius="xl" color="var(--viz-1)" styles={{ root: { background: 'var(--monty-surface-2)' } }} />
                </Stack>
              );
            })}
          </Stack>
        </Section>
      )}
    </Stack>
  );
}

function KpiTiles({ data }: { data: Overview }) {
  const tiles = [
    { label: 'Расходы', value: data.totals.expense, prev: data.previous.expense, upIsGood: false },
    { label: 'Доходы', value: data.totals.income, prev: data.previous.income, upIsGood: true },
    { label: 'Отложено', value: data.totals.savings, prev: data.previous.savings, upIsGood: true },
  ];
  return (
    <SimpleGrid cols={2} spacing="sm">
      {tiles.map(t => {
        const d = delta(t.value, t.prev, t.upIsGood);
        return (
          <Stack key={t.label} gap={2} p="sm" style={{ background: 'var(--monty-surface)', borderRadius: 14 }}>
            <Text size="xs" style={{ color: 'var(--monty-hint)' }}>{t.label}</Text>
            <Text fz={20} fw={700} lh={1.2} style={{ whiteSpace: 'nowrap' }}>{formatMoney(t.value)}</Text>
            <Text size="xs" fw={500} style={{ color: d ? (d.good ? 'var(--monty-income)' : 'var(--monty-negative)') : 'var(--monty-hint)' }}>
              {d ? `${d.pct > 0 ? '▲' : d.pct < 0 ? '▼' : ''} ${Math.abs(d.pct)}% к прошлому` : 'нет данных для сравнения'}
            </Text>
          </Stack>
        );
      })}
      <Stack gap={2} p="sm" style={{ background: 'var(--monty-surface)', borderRadius: 14 }}>
        <Text size="xs" style={{ color: 'var(--monty-hint)' }}>Норма сбережений</Text>
        <Text fz={20} fw={700} lh={1.2}>{data.totals.savings_rate !== null ? `${data.totals.savings_rate}%` : '—'}</Text>
        <Text size="xs" fw={500} style={{ color: 'var(--monty-hint)' }}>
          {data.previous.savings_rate !== null ? `было ${data.previous.savings_rate}%` : 'доля дохода в накопления'}
        </Text>
      </Stack>
    </SimpleGrid>
  );
}

const TONE = {
  good: { icon: IconCircleCheck, color: 'var(--monty-income)' },
  warning: { icon: IconAlertTriangle, color: 'var(--monty-warning)' },
  info: { icon: IconBulb, color: 'var(--monty-accent)' },
} as const;

function InsightCard({ insight }: { insight: Insight }) {
  const tone = TONE[insight.tone];
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start" p="sm" style={{ background: 'var(--monty-surface)', borderRadius: 14 }}>
      <tone.icon size={20} style={{ color: tone.color, flexShrink: 0, marginTop: 2 }} aria-hidden />
      <Stack gap={0}>
        <Text fw={600} size="sm">{insight.title}</Text>
        <Text size="sm" style={{ color: 'var(--monty-subtitle)' }}>{insight.text}</Text>
      </Stack>
    </Group>
  );
}

function TrendsSection() {
  const { data } = useTrends(6);
  if (!data || data.every(p => p.expense === 0 && p.income === 0)) return null;
  const rates = data.filter(p => p.savings_rate !== null);
  return (
    <Section title="Динамика по периодам" padded
      footer={rates.length ? `Норма сбережений: ${rates.map(p => `${p.savings_rate}%`).join(' → ')}` : undefined}>
      <TrendsChart points={data} />
    </Section>
  );
}

const nextFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

function RecurringSection() {
  const { data } = useRecurring();
  if (!data || data.length === 0) return null;
  const monthly = data.reduce((s, r) => s + (r.cadence === 'weekly' ? r.amount * 4 : r.amount), 0);
  return (
    <Section title="Регулярные платежи" footer={`≈ ${formatMoney(monthly)} в месяц. Найдено по повторяющимся тратам за полгода.`}>
      {data.map((r, i) => (
        <ListRow
          key={`${r.category_id}-${r.label}`}
          divider={i > 0}
          leading={<CategoryIcon icon={r.category_icon} />}
          title={r.label}
          subtitle={`${r.cadence === 'weekly' ? 'каждую неделю' : 'каждый месяц'} · след. ${nextFmt.format(parseDay(r.next_date))}`}
          trailing={<AmountText value={r.amount} fw={600} />}
        />
      ))}
    </Section>
  );
}
