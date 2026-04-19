import { useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Card,
  Container,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import {
  IconHome,
  IconToolsKitchen2,
  IconHeart,
  IconPlane,
  IconChevronRight,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { glassSectionShell, modalShellResponsive } from '../theme/dashboardChrome';

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
  const isNarrow = useMediaQuery('(max-width: 36em)');
  const [soonTitle, setSoonTitle] = useState<string | null>(null);

  const tileBody = (s: ServiceDef) => {
    const Icon = s.icon;
    return (
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
  };

  return (
    <Container size="sm" p="md" pb={100}>
      <Text fw={700} size="xl" mb="lg" className="animate-fade-in">
        Все сервисы
      </Text>

      <SimpleGrid cols={{ base: 2, xs: 2, sm: 3, md: 4 }} spacing="md">
        {services.map((s) => {
          if (s.comingSoon) {
            return (
              <Card
                key={s.title}
                component="button"
                type="button"
                shadow="md"
                padding="lg"
                radius="xl"
                withBorder
                className="stagger-item hover-lift"
                style={{
                  ...glassSectionShell(colorScheme),
                  minHeight: 120,
                  height: '100%',
                  display: 'block',
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => setSoonTitle(s.title)}
              >
                {tileBody(s)}
              </Card>
            );
          }

          return (
            <Card
              key={s.title}
              component={Link}
              to={s.to!}
              shadow="md"
              padding="lg"
              radius="xl"
              withBorder
              className="stagger-item hover-lift"
              style={{
                ...glassSectionShell(colorScheme),
                minHeight: 120,
                height: '100%',
                display: 'block',
                width: '100%',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {tileBody(s)}
            </Card>
          );
        })}
      </SimpleGrid>

      <Modal
        opened={soonTitle !== null}
        onClose={() => setSoonTitle(null)}
        title={
          <Text fw={700} size="lg">
            {soonTitle ?? ''}
          </Text>
        }
        {...modalShellResponsive(!!isNarrow)}
      >
        <Text c="dimmed" size="sm">
          Сервис в разработке. Следите за обновлениями в Monty.
        </Text>
      </Modal>
    </Container>
  );
}
