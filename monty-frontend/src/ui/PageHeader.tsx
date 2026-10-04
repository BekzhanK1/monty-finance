import { ActionIcon, Group, Stack, Text, Title } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTelegramBackButton } from '../lib/useTelegramUi';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  /** Back navigation: Telegram's native button inside Telegram, an in-page chevron elsewhere. */
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, right, onBack }: PageHeaderProps) {
  const nativeBack = useTelegramBackButton(onBack ?? null);
  return (
    <Group justify="space-between" align="flex-end" wrap="nowrap" pt="md" pb={4} gap="xs">
      <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
        {onBack && !nativeBack && (
          <ActionIcon variant="subtle" size="lg" radius="xl" onClick={onBack} aria-label="Назад" ml={-8}>
            <IconChevronLeft size={26} />
          </ActionIcon>
        )}
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Title order={1} fz={28} lh={1.15} lineClamp={1}>{title}</Title>
          {subtitle && <Text size="sm" style={{ color: 'var(--monty-hint)' }}>{subtitle}</Text>}
        </Stack>
      </Group>
      {right}
    </Group>
  );
}
