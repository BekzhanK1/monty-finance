import { Box, Button, Drawer, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { Monty } from '../../brand/monty';
import type { ServiceDef } from './catalog';

/** Bottom sheet for a service that isn't ready yet — Monty is still thinking about it. */
export function ComingSoonSheet({ service, onClose }: { service: ServiceDef | null; onClose: () => void }) {
  const teasers = service?.soonTeaser ?? [];
  return (
    <Drawer
      opened={service !== null}
      onClose={onClose}
      position="bottom"
      size="auto"
      radius="lg"
      withCloseButton={false}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}
    >
      {service && (
        <Stack gap="md" align="center" pt="xs">
          <Monty mood="thinking" size={132} label="Monty думает над новым сервисом" />
          <Stack gap={4} align="center">
            <Group gap={8}>
              <Text fw={700} fz={22}>{service.title}</Text>
              <Box px={8} py={2} style={{ borderRadius: 8, background: service.tint, color: '#fff', fontSize: 12, fontWeight: 600 }}>
                скоро
              </Box>
            </Group>
            <Text size="sm" ta="center" maw={320} style={{ color: 'var(--monty-hint)' }}>
              {service.soonBlurb ?? 'Сервис уже в работе — скоро появится в Monty.'}
            </Text>
          </Stack>
          {teasers.length > 0 && (
            <Stack gap={8} w="100%" p="md" style={{ borderRadius: 'var(--monty-radius-card)', background: 'var(--monty-surface-2)' }}>
              {teasers.map(item => (
                <Group key={item} gap="sm" wrap="nowrap">
                  <ThemeIcon size={22} radius="xl" style={{ background: `color-mix(in srgb, ${service.tint} 18%, transparent)`, color: service.tint }}>
                    <IconCheck size={14} stroke={2.6} />
                  </ThemeIcon>
                  <Text size="sm">{item}</Text>
                </Group>
              ))}
            </Stack>
          )}
          <Button size="md" fullWidth onClick={onClose}>Жду!</Button>
        </Stack>
      )}
    </Drawer>
  );
}
