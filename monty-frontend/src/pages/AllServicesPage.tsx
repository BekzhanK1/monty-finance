import { useState } from 'react';
import {
  Container,
  Text,
  SimpleGrid,
  Paper,
  Stack,
  Group,
  Modal,
  ThemeIcon,
  useMantineTheme,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconHome,
  IconToolsKitchen2,
  IconHeart,
  IconPlane,
  IconChevronRight,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

type ServiceDef = {
  title: string;
  description: string;
  icon: typeof IconHome;
  comingSoon?: boolean;
  to?: string;
};

const services: ServiceDef[] = [
  { title: 'Finance', description: 'Бюджет и транзакции', to: '/', icon: IconHome },
  { title: 'Food', description: 'Меню и каталог блюд', to: '/food', icon: IconToolsKitchen2 },
  { title: 'Health', description: 'Wellness', icon: IconHeart, comingSoon: true },
  { title: 'Travel', description: 'Поездки', icon: IconPlane, comingSoon: true },
];

export function AllServicesPage() {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const [soonTitle, setSoonTitle] = useState<string | null>(null);

  const border =
    colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3];
  const bg = colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0];

  const tileStyle = {
    borderColor: border,
    background: bg,
    minHeight: 120,
    height: '100%' as const,
    display: 'block' as const,
    width: '100%' as const,
    textDecoration: 'none' as const,
    color: 'inherit' as const,
    cursor: 'pointer' as const,
  };

  return (
    <Container size="md" py="xl">
      <Text fw={700} size="xl" mb="lg">
        Все сервисы
      </Text>

      <SimpleGrid cols={{ base: 2, xs: 2, sm: 3, md: 4 }} spacing="md">
        {services.map((s) => {
          const Icon = s.icon;
          const body = (
            <Stack gap="sm" h="100%" justify="space-between">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <ThemeIcon size={44} radius="md" variant="light" color="grape">
                  <Icon size={24} stroke={1.5} />
                </ThemeIcon>
                <IconChevronRight size={18} color={theme.colors.gray[5]} />
              </Group>
              <div>
                <Text fw={600} size="sm" lineClamp={1}>
                  {s.title}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {s.comingSoon ? 'Скоро' : s.description}
                </Text>
              </div>
            </Stack>
          );

          if (s.comingSoon) {
            return (
              <Paper
                key={s.title}
                component="button"
                type="button"
                withBorder
                radius="md"
                p="md"
                style={tileStyle}
                onClick={() => setSoonTitle(s.title)}
              >
                {body}
              </Paper>
            );
          }

          return (
            <Paper
              key={s.title}
              component={Link}
              to={s.to!}
              withBorder
              radius="md"
              p="md"
              style={tileStyle}
            >
              {body}
            </Paper>
          );
        })}
      </SimpleGrid>

      <Modal
        opened={soonTitle !== null}
        onClose={() => setSoonTitle(null)}
        title={soonTitle ?? ''}
        centered
      >
        <Text c="dimmed" size="sm">
          Сервис в разработке. Следите за обновлениями в Monty.
        </Text>
      </Modal>
    </Container>
  );
}
