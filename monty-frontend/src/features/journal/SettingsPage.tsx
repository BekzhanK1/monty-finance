import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Group, SegmentedControl, Skeleton, Stack, Switch, Text, TextInput } from '@mantine/core';
import { haptic } from '../../lib/telegram';
import { EmptyState, PageHeader, Section, useSnackbar } from '../../ui';
import { errorDetail, journalApi } from './api';
import { useJournalMutation, useJournalSettings } from './queries';
import type { JournalSettings, MoodMode } from './types';

export function JournalSettingsPage() {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const { data, isPending, isError, refetch } = useJournalSettings();
  const save = useJournalMutation(journalApi.updateSettings);
  const [testing, setTesting] = useState(false);

  const update = async (patch: Partial<JournalSettings>) => {
    try {
      await save.mutateAsync(patch);
      haptic('success');
    } catch (e) {
      snack(errorDetail(e, 'Не удалось сохранить'));
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      await journalApi.testReminder();
      haptic('success');
      snack('Отправлено в Telegram');
    } catch (e) {
      snack(errorDetail(e, 'Не удалось отправить'), { duration: 6000 });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader title="Настройки" subtitle="Дневник" onBack={() => navigate('/journal')} />

      {isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void refetch() }} />
      ) : isPending ? (
        <Skeleton h={240} radius="lg" mt="md" />
      ) : (
        <Stack gap="lg" mt="md">
          <Section title="Настроение" padded
            footer={data.mood_mode === 'manual'
              ? 'Вы всегда сами отмечаете настроение. ИИ только добавляет темы и краткий итог.'
              : 'Если не выбрать настроение, ИИ оценит его по тексту. Свой выбор всегда важнее.'}
          >
            <SegmentedControl
              fullWidth
              radius="lg"
              value={data.mood_mode}
              onChange={v => update({ mood_mode: v as MoodMode })}
              data={[
                { value: 'manual', label: 'Выбираю сам' },
                { value: 'ai', label: 'Определяет ИИ' },
              ]}
            />
          </Section>

          <Section title="Напоминание" padded footer="Личное сообщение от бота, если за день ещё нет записи. Бот должен быть запущен (кнопка «Start»).">
            <Stack gap="md">
              <Switch label="Напоминать" checked={data.reminder_enabled} size="md"
                onChange={e => update({ reminder_enabled: e.currentTarget.checked })} />
              <Group gap="sm" wrap="nowrap" align="flex-end">
                <TextInput
                  label="Время (Алматы)"
                  type="time"
                  value={data.reminder_time}
                  onChange={e => /^\d{2}:\d{2}$/.test(e.target.value) && update({ reminder_time: e.target.value })}
                  disabled={!data.reminder_enabled}
                  size="md"
                  radius="lg"
                  style={{ flex: 1 }}
                />
                <Button variant="light" radius="lg" size="md" loading={testing} onClick={sendTest}>Тест</Button>
              </Group>
            </Stack>
          </Section>

          <Text size="xs" px={4} style={{ color: 'var(--monty-hint)' }}>
            🔒 Текст записей хранится зашифрованным и виден только вам. Партнёр видит лишь вашу серию и настроение.
          </Text>
        </Stack>
      )}
    </Container>
  );
}
