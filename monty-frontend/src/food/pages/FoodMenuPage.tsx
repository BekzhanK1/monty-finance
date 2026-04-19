import { Card, Container, Group, Stack, Text, useMantineColorScheme } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { PAGE_WITH_BOTTOM_NAV_PB } from '../../theme/dashboardChrome';

/** Placeholder: недельное меню — те же приёмы, что и блок «Цель» на главной (DashboardPage). */
export function FoodMenuPage() {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Container size="sm" p="md" pb={PAGE_WITH_BOTTOM_NAV_PB}>
      <Card
        shadow="lg"
        padding="lg"
        radius="xl"
        withBorder
        className="stagger-item hover-lift"
        style={{
          background:
            colorScheme === 'dark'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(236, 253, 245, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border:
            colorScheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(16, 185, 129, 0.2)',
        }}
      >
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconCalendarEvent size={24} style={{ color: '#10b981' }} />
            <Text fw={700} size="lg">
              План недели
            </Text>
          </Group>
        </Group>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Здесь будет календарь и привязка блюд к дням. Пока загляните в «Каталог», чтобы добавить
            категории и рецепты текстом.
          </Text>
        </Stack>
      </Card>
    </Container>
  );
}
