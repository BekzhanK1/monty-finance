import { Container, Stack, Text, UnstyledButton, Group } from '@mantine/core';
import { IconChevronRight, IconHome, IconToolsKitchen2 } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useMantineColorScheme, useMantineTheme } from '@mantine/core';

const services = [
  { title: 'Finance', description: 'Бюджет и транзакции', to: '/', icon: IconHome },
  { title: 'Food', description: 'Сервис питания', to: '/food', icon: IconToolsKitchen2 },
] as const;

export function AllServicesPage() {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();

  return (
    <Container size="sm" py="xl">
      <Text fw={700} size="xl" mb="md">
        Все сервисы
      </Text>
      <Stack gap="sm">
        {services.map((s) => (
          <UnstyledButton
            key={s.to}
            component={Link}
            to={s.to}
            style={{
              display: 'block',
              padding: '16px',
              borderRadius: theme.radius.md,
              border: `1px solid ${
                colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
              }`,
              background:
                colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="md" wrap="nowrap">
                <s.icon size={24} stroke={1.5} />
                <div>
                  <Text fw={600}>{s.title}</Text>
                  <Text size="sm" c="dimmed">
                    {s.description}
                  </Text>
                </div>
              </Group>
              <IconChevronRight size={20} color={theme.colors.gray[5]} />
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Container>
  );
}
