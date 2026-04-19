import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  UnstyledButton,
  Tabs,
  useMantineTheme,
  useMantineColorScheme,
} from '@mantine/core';
import { IconBook2, IconCalendarEvent } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { useTelegram } from '../hooks/useTelegram';

const tabs = [
  { value: 'catalog', label: 'Каталог', path: '/food/catalog', icon: IconBook2 },
  { value: 'menu', label: 'Меню', path: '/food/menu', icon: IconCalendarEvent },
] as const;

export function FoodLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isSmall = useMediaQuery('(max-width: 47.99em)');

  const active = location.pathname === '/food/menu' ? 'menu' : 'catalog';

  const go = (path: string) => {
    haptic('light');
    navigate(path);
  };

  const bottomBar = (
    <Box
      hiddenFrom="sm"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background:
          colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${
          colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }`,
        padding: '8px 4px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 4,
        zIndex: 101,
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.value;
        return (
          <UnstyledButton
            key={t.value}
            onClick={() => go(t.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 4px',
              borderRadius: 12,
              color: isActive
                ? '#667eea'
                : colorScheme === 'dark'
                  ? theme.colors.gray[5]
                  : theme.colors.gray[6],
            }}
          >
            <t.icon size={22} />
            <Text size="xs" mt={4} fw={isActive ? 600 : 400}>
              {t.label}
            </Text>
          </UnstyledButton>
        );
      })}
    </Box>
  );

  return (
    <Box
      style={{
        minHeight: '100%',
        paddingBottom: isSmall ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : 0,
      }}
      className="food-layout-root"
    >
      <Tabs
        value={active}
        onChange={(v) => {
          const tab = tabs.find((t) => t.value === v);
          if (tab) go(tab.path);
        }}
        visibleFrom="sm"
        mb="md"
      >
        <Tabs.List grow>
          {tabs.map((t) => (
            <Tabs.Tab key={t.value} value={t.value} leftSection={<t.icon size={16} />}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Outlet />

      {bottomBar}
    </Box>
  );
}
