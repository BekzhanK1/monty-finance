import { useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Container,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  IconHome,
  IconToolsKitchen2,
  IconHeart,
  IconPlane,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { modalShellResponsive } from '../theme/dashboardChrome';

type ServiceDef = {
  title: string;
  icon: typeof IconHome;
  comingSoon?: boolean;
  to?: string;
};

const services: ServiceDef[] = [
  { title: 'Finance', to: '/', icon: IconHome },
  { title: 'Food', to: '/food', icon: IconToolsKitchen2 },
  { title: 'Health', icon: IconHeart, comingSoon: true },
  { title: 'Travel', icon: IconPlane, comingSoon: true },
];

function ServiceTile({
  service,
  onSoon,
}: {
  service: ServiceDef;
  onSoon: () => void;
}) {
  const Icon = service.icon;
  const body = (
    <Stack gap={8} align="center" py="sm">
      <ThemeIcon
        size={52}
        radius="xl"
        variant="light"
        color="grape"
        style={service.comingSoon ? { opacity: 0.45 } : undefined}
      >
        <Icon size={28} stroke={1.5} />
      </ThemeIcon>
      <Text fw={500} size="xs" ta="center" lineClamp={2} maw="100%">
        {service.title}
      </Text>
    </Stack>
  );

  const tileStyle = {
    width: '100%',
    color: 'inherit',
    textDecoration: 'none',
  } as const;

  if (service.comingSoon) {
    return (
      <UnstyledButton
        type="button"
        className="stagger-item transition-all"
        style={tileStyle}
        onClick={onSoon}
      >
        {body}
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton
      component={Link}
      to={service.to!}
      className="stagger-item transition-all"
      style={tileStyle}
    >
      {body}
    </UnstyledButton>
  );
}

export function AllServicesPage() {
  const isNarrow = useMediaQuery('(max-width: 36em)');
  const [soonTitle, setSoonTitle] = useState<string | null>(null);

  return (
    <Container size="sm" p="md" pb={100}>
      <Text fw={700} size="xl" mb="lg" className="animate-fade-in">
        Все сервисы
      </Text>

      <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="lg" verticalSpacing="xl">
        {services.map((s) => (
          <ServiceTile
            key={s.title}
            service={s}
            onSoon={() => setSoonTitle(s.title)}
          />
        ))}
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
