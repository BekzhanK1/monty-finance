import { useEffect } from 'react';
import { Button, Center, Stack, Text, Title, ThemeIcon } from '@mantine/core';
import { IconWallet } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingScreen } from '../components/LoadingScreen';

const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isReady, error, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <Center h="100dvh" p="md" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}>
      <Stack align="center" gap="xl">
        <ThemeIcon size={80} radius="xl" variant="light" color="blue">
          <IconWallet size={40} />
        </ThemeIcon>
        
        <Title order={2} ta="center">Монти</Title>
        <Text c="dimmed" ta="center" maw={280}>
          Приватный финансовый трекер для пары
        </Text>

        {error && (
          <Text c="red" size="sm" ta="center" maw={280}>
            {error}
          </Text>
        )}

        <Button
          size="lg"
          onClick={login}
          loading={isLoading}
          fullWidth
          maw={280}
        >
          {DEV_BYPASS_AUTH ? 'Войти (dev, user #1)' : 'Войти через Telegram'}
        </Button>
      </Stack>
    </Center>
  );
}
