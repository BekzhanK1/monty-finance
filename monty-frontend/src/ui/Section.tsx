import { Box, Group, Text, UnstyledButton } from '@mantine/core';
import type { CSSProperties, ReactNode } from 'react';

interface SectionProps {
  title?: ReactNode;
  action?: { label: string; onClick: () => void };
  footer?: ReactNode;
  /** Render children without the surface card (for custom layouts). */
  bare?: boolean;
  padded?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}

/** iOS/Telegram-style grouped section: small header, rounded surface, optional footer note. */
export function Section({ title, action, footer, bare = false, padded = false, children, style }: SectionProps) {
  return (
    <Box component="section" style={style}>
      {(title || action) && (
        <Group justify="space-between" px={4} mb={6} wrap="nowrap">
          {title ? (
            <Text size="xs" fw={600} tt="uppercase" style={{ color: 'var(--monty-section-header)', letterSpacing: 0.4 }}>
              {title}
            </Text>
          ) : <span />}
          {action && (
            <UnstyledButton onClick={action.onClick} style={{ color: 'var(--monty-link)', fontSize: 14, fontWeight: 500 }}>
              {action.label}
            </UnstyledButton>
          )}
        </Group>
      )}
      {bare ? children : (
        <Box
          style={{
            background: 'var(--monty-surface)',
            borderRadius: 'var(--monty-radius-card)',
            overflow: 'hidden',
            padding: padded ? 16 : undefined,
          }}
        >
          {children}
        </Box>
      )}
      {footer && (
        <Text size="xs" px={4} mt={6} style={{ color: 'var(--monty-hint)' }}>
          {footer}
        </Text>
      )}
    </Box>
  );
}
