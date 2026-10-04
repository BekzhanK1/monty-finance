import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  UnstyledButton,
  Tabs,
} from '@mantine/core';
import {
  IconBook2,
  IconCalendarEvent,
  IconFridge,
  IconNotebook,
  IconShoppingCart,
} from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { useTelegram } from '../hooks/useTelegram';

const tabs = [
  { value: 'catalog', label: 'Каталог', path: '/food/catalog', icon: IconBook2 },
  { value: 'menu', label: 'Меню', path: '/food/menu', icon: IconCalendarEvent },
  { value: 'guide', label: 'Гид', path: '/food/guide', icon: IconNotebook },
  { value: 'shopping', label: 'Список', path: '/food/shopping', icon: IconShoppingCart },
  { value: 'pantry', label: 'Склад', path: '/food/pantry', icon: IconFridge },
] as const;

function tabFromPath(pathname: string): (typeof tabs)[number]['value'] {
  if (pathname.includes('/food/menu')) return 'menu';
  if (pathname.includes('/food/guide')) return 'guide';
  if (pathname.includes('/food/shopping')) return 'shopping';
  if (pathname.includes('/food/pantry')) return 'pantry';
  return 'catalog';
}

export function FoodLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();
  const isSmall = useMediaQuery('(max-width: 47.99em)');

  const active = tabFromPath(location.pathname);

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
        background: 'color-mix(in srgb, var(--monty-surface) 88%, transparent)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '0.5px solid var(--monty-separator)',
        padding: '6px 2px',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 2,
        zIndex: 101,
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.value;
        return (
          <UnstyledButton
            key={t.value}
            onClick={() => go(t.path)}
            className="transition-all"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 2px',
              minHeight: 48,
              borderRadius: 10,
              color: isActive ? 'var(--monty-accent)' : 'var(--monty-hint)',
              minWidth: 0,
              position: 'relative',
              transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '28px',
                  height: '3px',
                  borderRadius: '0 0 3px 3px',
                  background: 'var(--monty-accent)',
                }}
              />
            )}
            <t.icon size={20} style={{ marginTop: isActive ? '3px' : '0' }} />
            <Text
              size="xs"
              mt={2}
              fw={isActive ? 600 : 400}
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                fontSize: '10px',
                lineHeight: 1.15,
              }}
            >
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
        paddingBottom: isSmall ? 'calc(88px + env(safe-area-inset-bottom, 0px))' : 0,
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
        color="violet"
        radius="xl"
        variant="pills"
      >
        <Tabs.List grow style={{ flexWrap: 'wrap', gap: 6 }}>
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
