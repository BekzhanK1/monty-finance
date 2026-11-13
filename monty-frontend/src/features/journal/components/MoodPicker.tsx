import { Box, Text, UnstyledButton } from '@mantine/core';
import { haptic } from '../../../lib/telegram';
import { MOODS } from '../mood';

interface MoodPickerProps {
  value: number | null;
  onChange: (mood: number | null) => void;
  /** Tapping the selected mood again clears it (AI mode: "let the AI decide"). */
  allowClear?: boolean;
}

export function MoodPicker({ value, onChange, allowClear = false }: MoodPickerProps) {
  const picked = MOODS.find(m => m.value === value);
  return (
    <Box>
      <Box role="radiogroup" aria-label="Настроение" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {MOODS.map(m => {
          const active = m.value === value;
          return (
            <UnstyledButton
              key={m.value}
              role="radio"
              aria-checked={active}
              aria-label={m.label}
              className="monty-pressable"
              onClick={() => {
                haptic('selection');
                onChange(active && allowClear ? null : m.value);
              }}
              style={{
                display: 'grid',
                placeItems: 'center',
                height: 56,
                borderRadius: 14,
                fontSize: 30,
                background: active ? 'var(--monty-accent-soft)' : 'var(--monty-surface-2)',
                outline: active ? '2px solid var(--monty-accent)' : undefined,
                outlineOffset: -2,
                filter: value != null && !active ? 'grayscale(0.7)' : undefined,
                opacity: value != null && !active ? 0.6 : 1,
              }}
            >
              {m.emoji}
            </UnstyledButton>
          );
        })}
      </Box>
      <Text size="xs" ta="center" mt={6} style={{ color: 'var(--monty-hint)' }}>
        {picked ? picked.label : allowClear ? 'Не выбрано — настроение определит ИИ' : 'Как вы себя чувствуете?'}
      </Text>
    </Box>
  );
}
