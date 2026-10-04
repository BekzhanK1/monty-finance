import { Button, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Stack align="center" gap={6} py={32} px={24}>
      {icon && <Text fz={40} lh={1} mb={4}>{icon}</Text>}
      <Text fw={600} ta="center">{title}</Text>
      {description && <Text size="sm" ta="center" style={{ color: 'var(--monty-hint)' }}>{description}</Text>}
      {action && (
        <Button mt="xs" variant="light" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Stack>
  );
}
