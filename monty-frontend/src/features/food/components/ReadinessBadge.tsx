import { Group, Text } from '@mantine/core';
import type { Readiness } from '../types';
import { READINESS } from '../format';

export function ReadinessBadge({ readiness, label }: { readiness: Readiness | null; label?: string }) {
  const color = readiness ? READINESS[readiness].color : 'var(--monty-hint)';
  return (
    <Group gap={5} wrap="nowrap" component="span">
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <Text component="span" size="xs" fw={500} style={{ color: readiness === 'ready' ? color : 'var(--monty-hint)' }}>
        {label ?? (readiness ? READINESS[readiness].label : 'Без состава')}
      </Text>
    </Group>
  );
}
