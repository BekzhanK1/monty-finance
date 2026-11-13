import { useNavigate } from 'react-router-dom';
import { Button, Container, Skeleton, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { EmptyState, ListRow, PageHeader, Section } from '../../ui';
import { parseDay } from '../analytics/helpers';
import { entryPreview, groupByDay, moodEmoji } from './mood';
import { useJournalEntries } from './queries';

const dayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
const PAGE = 50;

export function JournalHistoryPage() {
  const navigate = useNavigate();
  const [limit, setLimit] = useState(PAGE);
  const { data, isPending, isError, refetch, isFetching } = useJournalEntries({ limit });

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader title="История" subtitle={data ? `${data.total} записей` : undefined} onBack={() => navigate('/journal')} />

      {isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void refetch() }} />
      ) : isPending ? (
        <Stack gap="md" mt="md">
          <Skeleton h={120} radius="lg" />
          <Skeleton h={120} radius="lg" />
        </Stack>
      ) : data.entries.length === 0 ? (
        <EmptyState icon="📝" title="Записей пока нет" description="Первая запись начнёт серию" action={{ label: 'Написать', onClick: () => navigate('/journal') }} />
      ) : (
        <Stack gap="lg" mt="md">
          {groupByDay(data.entries).map(group => (
            <Section key={group.date} title={dayFormat.format(parseDay(group.date))}>
              {group.items.map((e, i) => (
                <ListRow
                  key={e.id}
                  divider={i > 0}
                  leading={<Text fz={28} lh={1} w={36} ta="center">{moodEmoji(e.mood)}</Text>}
                  title={entryPreview(e, 70)}
                  subtitle={e.tags.length ? e.tags.join(' · ') : undefined}
                  onClick={() => navigate(`/journal/entries/${e.id}`)}
                  chevron
                />
              ))}
            </Section>
          ))}
          {data.total > data.entries.length && (
            <Button variant="light" radius="lg" loading={isFetching} onClick={() => setLimit(l => l + PAGE)}>
              Показать ещё
            </Button>
          )}
        </Stack>
      )}
    </Container>
  );
}
