import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  ScrollArea,
  Text,
  UnstyledButton,
  Stack,
  ActionIcon,
  useMantineTheme,
  Box,
} from '@mantine/core';
import {
  IconHome,
  IconChartBar,
  IconSettings,
  IconPlus,
  IconList,
  IconSun,
  IconMoon,
  IconApps,
} from '@tabler/icons-react';
import { useTelegram } from '../hooks/useTelegram';
import { useMantineColorScheme } from '@mantine/core';

const navItems = [
  { icon: IconHome, label: 'Главная', path: '/' },
  { icon: IconList, label: 'История', path: '/transactions' },
  { icon: IconChartBar, label: 'Аналитика', path: '/analytics' },
  { icon: IconApps, label: 'Все сервисы', path: '/services' },
  { icon: IconSettings, label: 'Настройки', path: '/settings' },
];

export function Layout() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();
  const theme = useMantineTheme();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const index = navItems.findIndex(item => item.path === location.pathname);
    if (index !== -1) {
      // Track active index for potential future use
      console.debug('Active nav index:', index);
    }
  }, [location.pathname]);

  const handleNavClick = (path: string) => {
    haptic('light');
    navigate(path);
    setOpened(false);
  };

  const handleAddClick = () => {
    haptic('medium');
    navigate('/add');
  };

  const handleThemeToggle = () => {
    haptic('light');
    toggleColorScheme();
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          background: colorScheme === 'dark' 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Header
        style={{
          background: colorScheme === 'dark'
            ? 'rgba(26, 26, 46, 0.8)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        <Group h="100%" px="md" justify="space-between" className="animate-slide-down">
          <Group>
            <Burger
              opened={opened}
              onClick={() => {
                haptic('light');
                setOpened((o) => !o);
              }}
              hiddenFrom="sm"
              size="sm"
            />
            <Text 
              fw={700} 
              size="xl"
              className="gradient-text"
              style={{
                background: colorScheme === 'dark'
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Monty
            </Text>
          </Group>
          <Group gap="xs">
            <ActionIcon
              size="lg"
              radius="xl"
              variant="subtle"
              onClick={handleThemeToggle}
              aria-label={colorScheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              className="hover-scale"
            >
              {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>
            <ActionIcon
              size="lg"
              radius="xl"
              variant="gradient"
              gradient={{ from: 'blue', to: 'violet', deg: 135 }}
              onClick={handleAddClick}
              visibleFrom="sm"
              className="hover-scale"
            >
              <IconPlus size={20} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar 
        p="md"
        style={{
          background: colorScheme === 'dark'
            ? 'rgba(26, 26, 46, 0.8)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRight: `1px solid ${colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        <ScrollArea h="100%">
          <Stack gap="xs">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <UnstyledButton
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className="transition-all"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isActive 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'transparent',
                    color: isActive 
                      ? '#ffffff' 
                      : (colorScheme === 'dark' ? theme.colors.gray[4] : theme.colors.gray[7]),
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isActive ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
                  }}
                >
                  <Group>
                    <item.icon size={20} />
                    <Text size="sm" fw={isActive ? 600 : 400}>
                      {item.label}
                    </Text>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </AppShell.Main>

      {/* Enhanced Mobile Bottom Navigation */}
      <Box
        hiddenFrom="sm"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: colorScheme === 'dark' 
            ? 'rgba(26, 26, 46, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          padding: '8px 4px 8px 4px',
          display: 'grid',
          gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
          gap: '4px',
          zIndex: 100,
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.1)',
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <UnstyledButton
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className="transition-all"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 4px',
                borderRadius: '12px',
                color: isActive 
                  ? '#667eea' 
                  : (colorScheme === 'dark' ? theme.colors.gray[5] : theme.colors.gray[6]),
                minWidth: 0,
                position: 'relative',
                transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '32px',
                    height: '3px',
                    borderRadius: '0 0 3px 3px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                  className="animate-scale-in"
                />
              )}
              <item.icon size={22} style={{ marginTop: isActive ? '4px' : '0' }} />
              <Text 
                size="xs" 
                mt={2}
                fw={isActive ? 600 : 400}
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  fontSize: '11px',
                }}
              >
                {item.label}
              </Text>
            </UnstyledButton>
          );
        })}
      </Box>
    </AppShell>
  );
}
