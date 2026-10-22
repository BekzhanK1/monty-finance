import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Group, Stack, Switch, Text, TextInput } from '@mantine/core';
import { settingsApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PageHeader, Section, useSnackbar } from '../ui';
import type { NotificationId, NotificationItem, NotificationSettings } from '../types';
import { pageStackPb } from '../theme/dashboardChrome';

const LABELS: Record<NotificationId, { icon: string; title: string; description: string }> = {
  morning: {
    icon: '🌅',
    title: 'Утренняя сводка',
    description: 'Сколько можно потратить сегодня, темп бюджета и совет на день',
  },
  evening: {
    icon: '🌙',
    title: 'Итоги дня',
    description: 'Траты за день против дневного лимита и лимит на завтра',
  },
  food: {
    icon: '🍳',
    title: 'Меню на завтра',
    description: 'Что запланировано в Food на следующий день',
  },
};

export function NotificationsSettingsPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const snack = useSnackbar();
  const [config, setConfig] = useState<NotificationSettings | null>(null);
  const [testing, setTesting] = useState<NotificationId | null>(null);

  useEffect(() => {
    settingsApi.getNotifications().then(setConfig).catch(e => {
      console.error(e);
      snack('Не удалось загрузить настройки уведомлений');
    });
  }, [snack]);

  const save = async (next: NotificationSettings) => {
    const previous = config;
    setConfig(next);
    try {
      setConfig(await settingsApi.updateNotifications(next));
      haptic('success');
    } catch (e) {
      console.error(e);
      setConfig(previous);
      snack('Не удалось сохранить');
    }
  };

  const updateItem = (id: NotificationId, patch: Partial<NotificationItem>) => {
    if (!config) return;
    save({ ...config, items: config.items.map(item => (item.id === id ? { ...item, ...patch } : item)) });
  };

  const sendTest = async (id: NotificationId) => {
    setTesting(id);
    try {
      await settingsApi.testNotification(id);
      haptic('success');
      snack('Отправлено в Telegram');
    } catch (e) {
      console.error(e);
      snack('Не удалось отправить', { duration: 5000 });
    } finally {
      setTesting(null);
    }
  };

  if (!config) {
    return (
      <Container size="sm" px="xs" pb={pageStackPb}>
        <LoadingSkeleton />
      </Container>
    );
  }

  return (
    <Container size="sm" pb={pageStackPb}>
      <Stack gap="lg">
        <PageHeader title="Уведомления" subtitle="Сообщения в Telegram по расписанию" onBack={() => navigate('/settings')} />

        {config.items.map(item => {
          const label = LABELS[item.id];
          return (
            <Section key={item.id} title={`${label.icon} ${label.title}`} footer={label.description} padded>
              <Stack gap="md">
                <Switch
                  label="Присылать"
                  checked={item.enabled}
                  onChange={e => updateItem(item.id, { enabled: e.currentTarget.checked })}
                  size="md"
                />
                <Group gap="sm" wrap="nowrap" align="flex-end">
                  <TextInput
                    label="Время (Алматы)"
                    type="time"
                    value={item.time}
                    // Save only a complete HH:MM; the native picker may report '' while editing.
                    onChange={e => /^\d{2}:\d{2}$/.test(e.target.value) && updateItem(item.id, { time: e.target.value })}
                    disabled={!item.enabled}
                    size="md"
                    radius="lg"
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="light"
                    radius="lg"
                    size="md"
                    loading={testing === item.id}
                    onClick={() => sendTest(item.id)}
                  >
                    Тест
                  </Button>
                </Group>
                {item.id === 'evening' && (
                  <Box>
                    <Switch
                      label="Комментарий ИИ"
                      description="Добавлять в конец сводки короткий комментарий от ИИ"
                      checked={config.evening_ai}
                      onChange={e => save({ ...config, evening_ai: e.currentTarget.checked })}
                      size="md"
                    />
                  </Box>
                )}
              </Stack>
            </Section>
          );
        })}

        <Text size="xs" px={4} style={{ color: 'var(--monty-hint)' }}>
          Сообщения приходят в общий чат. «Тест» отправляет сообщение сразу, не дожидаясь расписания.
        </Text>
      </Stack>
    </Container>
  );
}
