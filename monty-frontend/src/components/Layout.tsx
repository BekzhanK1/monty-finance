import { useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Box, Button, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconChartPie,
  IconDots,
  IconHome,
  IconListDetails,
  IconMicrophone,
  IconPlus,
  type Icon,
} from '@tabler/icons-react';
import { haptic } from '../lib/telegram';
import { useVoiceInput } from '../features/voice/VoiceContext';

interface NavItem {
  icon: Icon;
  label: string;
  path: string;
  /** Other routes that keep this tab highlighted. */
  match?: string[];
}

const leftTabs: NavItem[] = [
  { icon: IconHome, label: 'Главная', path: '/' },
  { icon: IconListDetails, label: 'История', path: '/transactions' },
];
const rightTabs: NavItem[] = [
  { icon: IconChartPie, label: 'Анализ', path: '/analytics' },
  { icon: IconDots, label: 'Ещё', path: '/services', match: ['/settings'] },
];
const allTabs = [...leftTabs, ...rightTabs];

const LONG_PRESS_MS = 450;

function isActive(item: NavItem, pathname: string) {
  return pathname === item.path || (item.match ?? []).some(p => pathname.startsWith(p));
}

export function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const openVoice = useVoiceInput();
  // Food has its own bottom tabs.
  const showTabBar = !pathname.startsWith('/food');

  const go = (path: string) => {
    if (path !== pathname) haptic('selection');
    navigate(path);
  };

  return (
    <AppShell
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: true } }}
      padding={0}
      styles={{ main: { background: 'var(--monty-bg)', minHeight: '100dvh' } }}
    >
      <AppShell.Navbar p="md" style={{ background: 'var(--monty-surface)', borderRight: '1px solid var(--monty-separator)' }}>
        <Text fw={800} fz={22} px="sm" mb="lg" style={{ color: 'var(--monty-accent)' }}>Monty</Text>
        <Stack gap={4}>
          {allTabs.map(item => {
            const active = isActive(item, pathname);
            return (
              <UnstyledButton
                key={item.path}
                onClick={() => go(item.path)}
                className="monty-pressable"
                px="sm"
                py={10}
                style={{
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: active ? 'var(--monty-accent-soft)' : 'transparent',
                  color: active ? 'var(--monty-accent)' : 'var(--monty-text)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                <item.icon size={20} />
                {item.label}
              </UnstyledButton>
            );
          })}
        </Stack>
        <Stack gap="xs" mt="xl">
          <Button leftSection={<IconPlus size={18} />} onClick={() => navigate('/add')}>Добавить</Button>
          <Button variant="light" leftSection={<IconMicrophone size={18} />} onClick={() => openVoice()}>Голосом</Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      {showTabBar && <TabBar pathname={pathname} onNavigate={go} />}
    </AppShell>
  );
}

function TabBar({ pathname, onNavigate }: { pathname: string; onNavigate: (path: string) => void }) {
  return (
    <Box
      component="nav"
      hiddenFrom="sm"
      aria-label="Разделы"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 150,
        height: 'calc(var(--monty-tabbar-h) + var(--monty-safe-bottom))',
        paddingBottom: 'var(--monty-safe-bottom)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
        background: 'color-mix(in srgb, var(--monty-surface) 88%, transparent)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '0.5px solid var(--monty-separator)',
      }}
    >
      {leftTabs.map(item => (
        <TabButton key={item.path} item={item} active={isActive(item, pathname)} onClick={() => onNavigate(item.path)} />
      ))}
      <AddButton />
      {rightTabs.map(item => (
        <TabButton key={item.path} item={item} active={isActive(item, pathname)} onClick={() => onNavigate(item.path)} />
      ))}
    </Box>
  );
}

function TabButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        color: active ? 'var(--monty-accent)' : 'var(--monty-hint)',
      }}
    >
      <item.icon size={24} stroke={active ? 2.2 : 1.8} />
      <Text fz={10} fw={active ? 600 : 500} lh={1.2}>{item.label}</Text>
    </UnstyledButton>
  );
}

/** Tap → add form; hold → voice input (starts recording right away). */
function AddButton() {
  const navigate = useNavigate();
  const openVoice = useVoiceInput();
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <Box style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <UnstyledButton
        aria-label="Добавить операцию (удерживайте для голосового ввода)"
        className="monty-pressable"
        onPointerDown={() => {
          longPressed.current = false;
          clear();
          timer.current = window.setTimeout(() => {
            longPressed.current = true;
            haptic('heavy');
            openVoice({ autoStart: true });
          }, LONG_PRESS_MS);
        }}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
        onContextMenu={e => e.preventDefault()}
        onClick={() => {
          clear();
          if (longPressed.current) return;
          haptic('medium');
          navigate('/add');
        }}
        style={{
          width: 52,
          height: 40,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--monty-accent)',
          color: 'var(--monty-accent-text)',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <IconPlus size={26} stroke={2.4} />
      </UnstyledButton>
    </Box>
  );
}
