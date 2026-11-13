import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Box, Container, Group, SegmentedControl, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { EmptyState, ListRow, PageHeader, Section } from '../../ui';
import { MoodCalendar, MoodTrendChart, SpendingByMood, WeekdayMood } from './charts';
import { formatMood, moodEmoji, spendingInsight } from './mood';
import { useJournalAnalytics } from './queries';

const PERIODS = [
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
  { value: '365', label: 'Год' },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box p="sm" style={{ background: 'var(--monty-surface)', borderRadius: 'var(--monty-radius-card)' }}>
      <Text size="xs" style={{ color: 'var(--monty-hint)' }}>{label}</Text>
      <Text fz={22} fw={700} className="monty-tabular">{value}</Text>
    </Box>
  );
}

export function JournalAnalyticsPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const { data, isPending, isError, refetch } = useJournalAnalytics(days);
  const insight = data ? spendingInsight(data.spending.low_mood, data.spending.high_mood) : null;

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader title="Анализ" subtitle="Дневник" onBack={() => navigate('/journal')} />
      <SegmentedControl fullWidth radius="lg" mt="sm" value={String(days)} onChange={v => setDays(Number(v))} data={PERIODS} />

      {isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void refetch() }} />
      ) : isPending ? (
        <Stack gap="md" mt="md">
          <Skeleton h={80} radius="lg" />
          <Skeleton h={200} radius="lg" />
        </Stack>
      ) : data.entries_count === 0 ? (
        <EmptyState icon="📈" title="Пока нечего показать" description="Графики появятся после первых записей" />
      ) : (
        <Stack gap="lg" mt="md">
          <SimpleGrid cols={3} spacing="sm">
            <Stat label="Среднее" value={`${moodEmoji(data.average_mood)} ${formatMood(data.average_mood)}`} />
            <Stat label="Дней с записью" value={`${data.days_written}/${data.days}`} />
            <Stat label="Записей" value={String(data.entries_count)} />
          </SimpleGrid>

          <Section title="Настроение по дням" padded>
            <MoodTrendChart series={data.series} />
          </Section>

          {days <= 90 && (
            <Section title="Календарь" padded>
              <MoodCalendar series={data.series} />
            </Section>
          )}

          <Section title="По дням недели" padded footer="Среднее настроение; выделен лучший день.">
            <WeekdayMood weekday={data.weekday} />
          </Section>

          {data.tags.length > 0 && (
            <Section title="Темы" footer="Сколько раз тема встречалась и какое настроение было рядом с ней.">
              {data.tags.map((t, i) => (
                <ListRow key={t.tag} divider={i > 0} title={t.tag} subtitle={`${t.count} раз`}
                  trailing={<Text fw={600}>{moodEmoji(t.avg_mood)} {formatMood(t.avg_mood)}</Text>} />
              ))}
            </Section>
          )}

          {data.emotions.length > 0 && (
            <Section title="Эмоции" padded>
              <Group gap={6}>
                {data.emotions.map(e => (
                  <Badge key={e.emotion} variant="light" color="grape" radius="sm" tt="none" size="lg">
                    {e.emotion} · {e.count}
                  </Badge>
                ))}
              </Group>
            </Section>
          )}

          <Section title="Настроение и траты" padded
            footer={insight ?? 'Средние расходы семьи в дни с разным настроением. Нужно хотя бы по 2 дня с плохим и хорошим настроением.'}>
            <SpendingByMood spending={data.spending} />
          </Section>
        </Stack>
      )}
    </Container>
  );
}
