import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Container, Group, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import { IconRefresh, IconTrash } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { EmptyState, PageHeader, Section, useSnackbar } from '../../ui';
import { parseDay } from '../analytics/helpers';
import { errorDetail, journalApi } from './api';
import { MoodPicker } from './components/MoodPicker';
import { useJournalEntry, useJournalMutation } from './queries';

const dayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

export function JournalEntryPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const snack = useSnackbar();
  const { data: entry, isPending, isError, refetch } = useJournalEntry(id);
  // null = untouched: show the saved text; a string = the user's unsaved edit.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useJournalMutation((body: { content?: string; mood?: number }) => journalApi.update(id, body));
  const reanalyze = useJournalMutation(() => journalApi.reanalyze(id));
  const remove = useJournalMutation(() => journalApi.remove(id));

  const back = () => navigate(-1);
  const text = draft ?? entry?.content ?? '';
  const dirty = entry != null && draft != null && draft.trim() !== (entry.content ?? '');

  const run = async (fn: () => Promise<unknown>, done?: string): Promise<boolean> => {
    setError(null);
    try {
      await fn();
      haptic('success');
      if (done) snack(done);
      return true;
    } catch (e) {
      haptic('error');
      setError(errorDetail(e, 'Не удалось сохранить'));
      return false;
    }
  };

  if (isError) {
    return (
      <Container size="sm">
        <PageHeader title="Запись" onBack={back} />
        <EmptyState icon="🔍" title="Запись не найдена" action={{ label: 'Повторить', onClick: () => void refetch() }} />
      </Container>
    );
  }
  if (isPending) {
    return (
      <Container size="sm">
        <PageHeader title="Запись" onBack={back} />
        <Skeleton h={300} radius="lg" mt="md" />
      </Container>
    );
  }

  const title = dayFormat.format(parseDay(entry.entry_date));

  return (
    <Container size="sm" pb="xl">
      <PageHeader title={title.charAt(0).toUpperCase() + title.slice(1)} onBack={back} />
      <Stack gap="lg" mt="md">
        <Section title="Настроение" padded
          footer={entry.mood_source === 'ai' ? 'Оценил ИИ по тексту. Выберите своё, если не согласны.' : undefined}
        >
          <MoodPicker value={entry.mood} onChange={m => m != null && void run(() => update.mutateAsync({ mood: m }))} />
        </Section>

        <Section title="Запись" padded>
          <Stack gap="sm">
            <Textarea value={text} onChange={e => setDraft(e.currentTarget.value)} autosize minRows={5} size="md" radius="lg"
              placeholder="Добавьте пару строк…" aria-label="Текст записи" />
            {dirty && (
              <Button radius="lg" loading={update.isPending} onClick={async () => { if (await run(() => update.mutateAsync({ content: text }), 'Сохранено')) setDraft(null); }}>
                Сохранить текст
              </Button>
            )}
          </Stack>
        </Section>

        {entry.analysis_status === 'pending' && <Text size="sm" ta="center" style={{ color: 'var(--monty-hint)' }}>ИИ анализирует запись…</Text>}
        {entry.analysis_status === 'failed' && (
          <Alert color="yellow" variant="light" title="ИИ не смог разобрать запись">
            <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} loading={reanalyze.isPending}
              onClick={() => run(() => reanalyze.mutateAsync(undefined))}>
              Повторить
            </Button>
          </Alert>
        )}
        {entry.analysis_status === 'done' && (entry.summary || entry.tags.length > 0 || entry.emotions.length > 0) && (
          <Section title="ИИ заметил" padded>
            <Stack gap="sm">
              {entry.summary && <Text size="sm">{entry.summary}</Text>}
              {(entry.tags.length > 0 || entry.emotions.length > 0) && (
                <Group gap={6}>
                  {entry.tags.map(t => <Badge key={t} variant="light" radius="sm" tt="none">{t}</Badge>)}
                  {entry.emotions.map(t => <Badge key={t} variant="outline" radius="sm" tt="none" color="grape">{t}</Badge>)}
                </Group>
              )}
            </Stack>
          </Section>
        )}

        {error && <Alert color="red" variant="light">{error}</Alert>}

        <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} loading={remove.isPending}
          onClick={async () => {
            if (!window.confirm('Удалить запись? Это нельзя отменить.')) return;
            if (await run(() => remove.mutateAsync(undefined), 'Запись удалена')) {
              navigate('/journal/history', { replace: true });
            }
          }}
        >
          Удалить запись
        </Button>
      </Stack>
    </Container>
  );
}
