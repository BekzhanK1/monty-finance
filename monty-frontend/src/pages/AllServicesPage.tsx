import { useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  List,
  Modal,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconHome,
  IconToolsKitchen2,
  IconHeart,
  IconPlane,
  IconSparkles,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import {
  gradientButton,
  heroVioletShell,
  modalShellResponsive,
  pageStackPb,
} from '../theme/dashboardChrome';

type ServiceDef = {
  title: string;
  icon: typeof IconHome;
  comingSoon?: boolean;
  to?: string;
  soonTeaser?: string[];
  soonBlurb?: string;
};

const services: ServiceDef[] = [
  { title: 'Finance', to: '/', icon: IconHome },
  { title: 'Food', to: '/food', icon: IconToolsKitchen2 },
  {
    title: 'Health',
    icon: IconHeart,
    comingSoon: true,
    soonBlurb: 'Следите за сном, активностью и привычками — всё в одном месте.',
    soonTeaser: ['Дневник самочувствия', 'Цели и streak', 'Умные напоминания'],
  },
  {
    title: 'Travel',
    icon: IconPlane,
    comingSoon: true,
    soonBlurb: 'Планируйте поездки, бюджет и чек-листы без хаоса в заметках.',
    soonTeaser: ['Маршруты и даты', 'Бюджет на поездку', 'Сборы в дорогу'],
  },
];

const ICON_CIRCLE = 76;
const ICON_STROKE = 36;

function ServiceTile({
  service,
  onSoon,
}: {
  service: ServiceDef;
  onSoon: () => void;
}) {
  const Icon = service.icon;
  const body = (
    <Stack gap={10} align="center" py="sm">
      <ThemeIcon
        size={ICON_CIRCLE}
        radius="xl"
        variant="light"
        color="grape"
        style={service.comingSoon ? { opacity: 0.5 } : undefined}
      >
        <Icon size={ICON_STROKE} stroke={1.5} />
      </ThemeIcon>
      <Text fw={500} size="sm" ta="center" lineClamp={2} maw="100%">
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

function ComingSoonModal({
  service,
  opened,
  onClose,
  isNarrow,
}: {
  service: ServiceDef | null;
  opened: boolean;
  onClose: () => void;
  isNarrow: boolean;
}) {
  const { colorScheme } = useMantineColorScheme();
  if (!service) return null;

  const Icon = service.icon;
  const teasers = service.soonTeaser ?? ['Новые возможности', 'Удобный интерфейс', 'Синхронизация с Monty'];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton
      padding={0}
      title={null}
      {...modalShellResponsive(isNarrow)}
    >
      <Box className="animate-scale-in">
        <Box
          py="xl"
          px="lg"
          style={{
            ...heroVioletShell(colorScheme),
            borderRadius: isNarrow ? 0 : 'var(--mantine-radius-xl) var(--mantine-radius-xl) 0 0',
            textAlign: 'center',
          }}
        >
          <Stack align="center" gap="md">
            <Box style={{ position: 'relative', display: 'inline-block' }}>
              <Box
                className="animate-pulse"
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, rgba(102, 126, 234, 0.35) 0%, rgba(118, 75, 162, 0.35) 100%)',
                }}
              />
              <ThemeIcon
                size={96}
                radius="xl"
                variant="gradient"
                gradient={{ from: 'grape', to: 'violet', deg: 135 }}
                className="animate-bounce"
                style={{ position: 'relative' }}
              >
                <Icon size={48} stroke={1.5} />
              </ThemeIcon>
              <Badge
                size="sm"
                variant="gradient"
                gradient={{ from: 'grape', to: 'pink', deg: 90 }}
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -8,
                  boxShadow: '0 4px 12px rgba(118, 75, 162, 0.4)',
                }}
              >
                Скоро
              </Badge>
            </Box>

            <Stack gap={4} align="center">
              <Group gap={6} justify="center" wrap="nowrap">
                <IconSparkles size={18} style={{ opacity: 0.8 }} />
                <Text fw={700} size="xl">
                  {service.title}
                </Text>
              </Group>
              <Text size="sm" c="dimmed" maw={320} mx="auto">
                {service.soonBlurb ?? 'Сервис уже в работе — скоро появится в Monty.'}
              </Text>
            </Stack>
          </Stack>
        </Box>

        <Stack gap="lg" p="lg" pb="xl">
          <Box>
            <Group justify="space-between" mb={6}>
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" lts={0.6}>
                Прогресс
              </Text>
              <Text size="xs" fw={600} c="grape">
                В разработке
              </Text>
            </Group>
            <Progress
              value={38}
              size="md"
              radius="xl"
              color="grape"
              animated
              styles={{ root: { background: 'rgba(118, 75, 162, 0.12)' } }}
            />
          </Box>

          <Box>
            <Text size="sm" fw={600} mb="xs">
              Что будет внутри
            </Text>
            <List
              spacing="xs"
              size="sm"
              icon={
                <ThemeIcon color="grape" size={20} radius="xl" variant="light">
                  <IconSparkles size={12} />
                </ThemeIcon>
              }
            >
              {teasers.map((item) => (
                <List.Item key={item}>
                  <Text size="sm">{item}</Text>
                </List.Item>
              ))}
            </List>
          </Box>

          <Button {...gradientButton} fullWidth onClick={onClose}>
            Понятно, жду
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}

export function AllServicesPage() {
  const isNarrow = useMediaQuery('(max-width: 36em)');
  const [soonService, setSoonService] = useState<ServiceDef | null>(null);

  return (
    <Container size="sm" px="xs" pb={pageStackPb}>
      <Text fw={700} size="xl" mb="lg" className="animate-fade-in">
        Все сервисы
      </Text>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" verticalSpacing="lg">
        {services.map((s) => (
          <ServiceTile
            key={s.title}
            service={s}
            onSoon={() => setSoonService(s)}
          />
        ))}
      </SimpleGrid>

      <ComingSoonModal
        service={soonService}
        opened={soonService !== null}
        onClose={() => setSoonService(null)}
        isNarrow={!!isNarrow}
      />
    </Container>
  );
}
