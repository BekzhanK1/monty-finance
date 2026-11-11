import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconChartLine, IconList, IconPencil, IconSettings, type Icon } from '@tabler/icons-react';
import { haptic } from '../../../lib/telegram';

const TABS: { path: string; label: string; icon: Icon }[] = [
  { path: '/journal', label: 'Сегодня', icon: IconPencil },
  { path: '/journal/history', label: 'История', icon: IconList },
  { path: '/journal/analytics', label: 'Анализ', icon: IconChartLine },
  { path: '/journal/settings', label: 'Настройки', icon: IconSettings },
];

function isActive(path: string, pathname: string) {
  return path === '/journal' ? pathname === '/journal' : pathname.startsWith(path);
}

/** Journal has its own bottom tabs (like Food); the Finance tab bar is hidden under /journal. */
export function JournalLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hideTabs = pathname.startsWith('/journal/entries/');

  return (
    <>
      <Suspense fallback={null}><Outlet /></Suspense>
      {!hideTabs && (
        <Box
          component="nav"
          aria-label="Разделы дневника"
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
    </>
  );
}
