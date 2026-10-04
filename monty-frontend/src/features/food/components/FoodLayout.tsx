import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconBasket, IconBook2, IconCalendarWeek, IconFridge, IconSun, type Icon } from '@tabler/icons-react';
import { haptic } from '../../../lib/telegram';
import { useFoodBootstrap } from '../queries';
import { WarehouseProvider } from '../WarehouseContext';

const TABS: { path: string; label: string; icon: Icon }[] = [
  { path: '/food', label: 'Сегодня', icon: IconSun },
  { path: '/food/menu', label: 'Меню', icon: IconCalendarWeek },
  { path: '/food/shopping', label: 'Покупки', icon: IconBasket },
  { path: '/food/pantry', label: 'Запасы', icon: IconFridge },
  { path: '/food/recipes', label: 'Рецепты', icon: IconBook2 },
];

function isActive(path: string, pathname: string) {
  return path === '/food' ? pathname === '/food' : pathname.startsWith(path);
}

/** Food has its own bottom tabs; the Finance tab bar is hidden under /food. */
export function FoodLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Seeds default meal categories/units for a new household before any screen needs them.
  useFoodBootstrap();
  const hideTabs = /^\/food\/(recipes\/(new|\d+)|transfers)/.test(pathname);

  return (
    <WarehouseProvider>
      <Outlet />
      {!hideTabs && (
        <Box
          component="nav"
          aria-label="Разделы кухни"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 150,
            height: 'calc(var(--monty-tabbar-h) + var(--monty-safe-bottom))',
            paddingBottom: 'var(--monty-safe-bottom)',
            display: 'grid',
            gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
            background: 'color-mix(in srgb, var(--monty-surface) 88%, transparent)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            borderTop: '0.5px solid var(--monty-separator)',
          }}
        >
          {TABS.map(tab => {
            const active = isActive(tab.path, pathname);
            return (
              <UnstyledButton
                key={tab.path}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (!active) haptic('selection');
                  navigate(tab.path);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  color: active ? 'var(--monty-accent)' : 'var(--monty-hint)',
                }}
              >
                <tab.icon size={24} stroke={active ? 2.2 : 1.8} />
                <Text fz={10} fw={active ? 600 : 500} lh={1.2}>{tab.label}</Text>
              </UnstyledButton>
            );
          })}
        </Box>
      )}
    </WarehouseProvider>
  );
}
