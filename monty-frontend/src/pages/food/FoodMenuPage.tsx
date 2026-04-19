import { Container, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';

/** Placeholder: недельное меню и планирование — следующий этап. */
export function FoodMenuPage() {
  return (
    <Container size="sm" py="md">
      <Stack align="center" gap="md" py="xl">
        <ThemeIcon size={64} radius="md" variant="light" color="grape">
          <IconCalendarEvent size={36} />
        </ThemeIcon>
        <Text ta="center" fw={600} size="lg">
          План недели
        </Text>
        <Text ta="center" c="dimmed" maw={320}>
          Здесь будет календарь и привязка блюд к дням. Пока загляните в «Каталог», чтобы
          добавить категории и рецепты текстом.
        </Text>
      </Stack>
    </Container>
  );
}
