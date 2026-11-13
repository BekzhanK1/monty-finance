import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Container, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import { haptic } from '../../lib/telegram';
import { EmptyState, ListRow, PageHeader, Section, parseServerDate, useSnackbar } from '../../ui';
import { errorDetail, journalApi } from './api';
import { MoodPicker } from './components/MoodPicker';
import { StreakCard } from './components/StreakCard';
import { entryPreview, moodEmoji } from './mood';
import { useJournalEntries, useJournalMutation, useJournalOverview } from './queries';

const todayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

export function JournalTodayPage() {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const overview = useJournalOverview();
  const today = overview.data?.today;
  const todayEntries = useJournalEntries(today ? { date_from: today, date_to: today } : {});
  const [mood, setMood] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useJournalMutation(journalApi.create);

  const aiMode = overview.data?.mood_mode === 'ai';
  const canSave = mood != null || (aiMode && text.trim().length > 0);
  const subtitle = todayFormat.format(new Date());

  const save = async () => {
    setError(null);
    try {
      await create.mutateAsync({ content: text.trim() || undefined, mood: mood ?? undefined });
      haptic('success');
      setText('');
      setMood(null);
      snack(text.trim() ? 'Запись сохранена' : 'Настроение отмечено');
    } catch (e) {
      haptic('error');
      setError(errorDetail(e, 'Не удалось сохранить'));
    }
  };

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader title="Дневник" subtitle={subtitle.charAt(0).toUpperCase() + subtitle.slice(1)} onBack={() => navigate('/services')} />

      {overview.isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void overview.refetch() }} />
      ) : overview.isPending ? (
        <Stack gap="md" mt="md">
          <Skeleton h={120} radius="lg" />
          <Skeleton h={220} radius="lg" />
        </Stack>
      ) : (
        <Stack gap="lg" mt="md">
          <StreakCard me={overview.data.me} partners={overview.data.partners} today={overview.data.today} />

          <Section title={overview.data.today_entries ? 'Ещё одна запись' : 'Как прошёл день?'} padded
            footer={aiMode
              ? 'Можно не выбирать настроение — ИИ оценит его по тексту. Изменить режим — в «Настройках».'
              : 'Достаточно отметить настроение — серия засчитается. Текст увидите только вы.'}
          >
            <Stack gap="md">
              <MoodPicker value={mood} onChange={setMood} allowClear={aiMode} />
              <Textarea
                placeholder="Что было сегодня? Что чувствуете?"
                value={text}
                onChange={e => setText(e.currentTarget.value)}
                autosize
                minRows={4}
                maxRows={14}
                size="md"
                radius="lg"
                aria-label="Текст записи"
              />
              {error && <Alert color="red" variant="light">{error}</Alert>}
              <Button size="md" radius="lg" fullWidth disabled={!canSave} loading={create.isPending} onClick={save}>
                Сохранить
              </Button>
            </Stack>
          </Section>

          {todayEntries.data && todayEntries.data.entries.length > 0 && (
            <Section title="Сегодня">
              {todayEntries.data.entries.map((e, i) => (
                <ListRow
                  key={e.id}
                  divider={i > 0}
                  leading={<Text fz={28} lh={1} w={36} ta="center">{moodEmoji(e.mood)}</Text>}
                  title={entryPreview(e, 60)}
                  subtitle={e.analysis_status === 'pending' ? 'ИИ анализирует…' : e.tags.join(' · ') || undefined}
                  trailingSub={timeFormat.format(parseServerDate(e.created_at))}
                  onClick={() => navigate(`/journal/entries/${e.id}`)}
                  chevron
                />
              ))}
            </Section>
          )}
        </Stack>
      )}
    </Container>
  );
}
