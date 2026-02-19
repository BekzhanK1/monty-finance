import { useState } from 'react';
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
} from '@mantine/core';
import {
  IconHome,
  IconChartBar,
  IconSettings,
  IconPlus,
} from '@tabler/icons-react';
import { useTelegram } from '../hooks/useTelegram';

const navItems = [
  { icon: IconHome, label: 'Главная', path: '/' },
  { icon: IconChartBar, label: 'Аналитика', path: '/analytics' },
  { icon: IconSettings, label: 'Настройки', path: '/settings' },
];

export function Layout() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();
  const theme = useMantineTheme();

  const handleNavClick = (path: string) => {
    haptic('light');
    navigate(path);
    setOpened(false);
  };

  const handleAddClick = () => {
    haptic('medium');
    navigate('/add');
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
          backgroundColor: theme.colors.gray[0],
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              hiddenFrom="sm"
              size="sm"
            />
            <Text fw={700} size="lg">Monty</Text>
          </Group>
          <ActionIcon
            size="lg"
            radius="xl"
            variant="filled"
            color="blue"
            onClick={handleAddClick}
            visibleFrom="sm"
          >
            <IconPlus size={20} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <ScrollArea h="100%">
          <Stack gap="xs">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <UnstyledButton
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? theme.colors.blue[0] : 'transparent',
                    color: isActive ? theme.colors.blue[7] : theme.colors.gray[7],
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
        <Outlet />
      </AppShell.Main>

      {/* Mobile Bottom Navigation */}
      <Group
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTop: `1px solid ${theme.colors.gray[2]}`,
          padding: '8px 16px',
          justifyContent: 'space-around',
          zIndex: 100,
        }}
        hiddenFrom="sm"
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <UnstyledButton
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 16px',
                color: isActive ? theme.colors.blue[6] : theme.colors.gray[6],
              }}
            >
              <item.icon size={24} />
              <Text size="xs" mt={4}>{item.label}</Text>
            </UnstyledButton>
          );
        })}
      </Group>
    </AppShell>
  );
}
