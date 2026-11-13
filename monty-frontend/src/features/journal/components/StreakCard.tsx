import { Box, Group, Stack, Text } from '@mantine/core';
import { frozenThisWeek, moodEmoji, streakLabel } from '../mood';
import type { PartnerStatus, Streak } from '../types';

function Person({ name, streak, mood }: { name: string; streak: Streak; mood?: number | null }) {
  const status = streak.today_done ? 'Сегодня ✓' : streak.current > 0 ? 'Сегодня ещё нет' : 'Пока без серии';
  return (
    <Stack gap={2} align="center" style={{ flex: 1, minWidth: 0 }}>
      <Text size="xs" fw={600} lineClamp={1} style={{ color: 'var(--monty-subtitle)' }}>{name}</Text>
      <Group gap={4} wrap="nowrap" align="baseline">
        <Text fz={30} fw={700} lh={1.1} className="monty-tabular" style={{ opacity: streak.current ? 1 : 0.4 }}>
          {streak.current}
        </Text>
        <Text fz={20} lh={1} aria-hidden style={{ filter: streak.today_done ? undefined : 'grayscale(1)', opacity: streak.today_done ? 1 : 0.5 }}>
          🔥
        </Text>
      </Group>
      <Text size="xs" style={{ color: streak.today_done ? 'var(--monty-income)' : 'var(--monty-hint)' }}>
        {status}
        {mood != null && ` · ${moodEmoji(mood)}`}
      </Text>
      <Text fz={10} style={{ color: 'var(--monty-hint)' }}>рекорд {streakLabel(streak.best)}</Text>
    </Stack>
  );
}

/** Me + partners side by side. Partners only ever expose streak and mood — never text. */
export function StreakCard({ me, partners, today }: { me: Streak; partners: PartnerStatus[]; today: string }) {
  return (
    <Box p="md" style={{ background: 'var(--monty-surface)', borderRadius: 'var(--monty-radius-card)' }}>
      <Group wrap="nowrap" gap="md" align="stretch">
        <Person name="Вы" streak={me} />
        {partners.map(p => (
          <Group key={p.user_id} wrap="nowrap" gap="md" style={{ flex: 1, minWidth: 0 }} align="stretch">
            <Box aria-hidden style={{ width: 1, background: 'var(--monty-separator)' }} />
            <Person
              name={p.first_name}
              streak={p.streak}
              mood={p.streak.today_done ? p.last_mood : undefined}
            />
          </Group>
        ))}
      </Group>
      {frozenThisWeek(me.frozen_days, today) && (
        <Text size="xs" ta="center" mt="sm" style={{ color: 'var(--monty-hint)' }}>
          ❄️ Пропуск на этой неделе закрыт заморозкой — следующий прервёт серию
        </Text>
      )}
    </Box>
  );
}
