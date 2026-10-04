import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  trailingSub?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  /** Draw the hairline separator above this row (all rows but the first in a section). */
  divider?: boolean;
}

export function ListRow({ leading, title, subtitle, trailing, trailingSub, onClick, chevron = false, divider = false }: ListRowProps) {
  const content = (
    <Group wrap="nowrap" gap={12} px={16} py={10} mih={52} style={{ position: 'relative' }}>
      {divider && (
        <Box
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            left: leading ? 64 : 16,
            height: 1,
            transform: 'scaleY(0.5)',
            background: 'var(--monty-separator)',
          }}
        />
      )}
      {leading}
      <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
        <Text size="md" fw={500} lineClamp={1}>{title}</Text>
        {subtitle && <Text size="xs" lineClamp={1} style={{ color: 'var(--monty-hint)' }}>{subtitle}</Text>}
      </Stack>
      {(trailing || trailingSub) && (
        <Stack gap={1} align="flex-end" style={{ flexShrink: 0 }}>
          {trailing}
          {trailingSub && <Text size="xs" style={{ color: 'var(--monty-hint)' }}>{trailingSub}</Text>}
        </Stack>
      )}
      {chevron && <IconChevronRight size={18} style={{ color: 'var(--monty-hint)', flexShrink: 0 }} />}
    </Group>
  );

  if (!onClick) return content;
  return (
    <UnstyledButton onClick={onClick} className="monty-pressable" style={{ display: 'block', width: '100%' }}>
      {content}
    </UnstyledButton>
  );
}
