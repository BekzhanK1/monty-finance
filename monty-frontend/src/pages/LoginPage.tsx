import { Button, Center, Stack, Text, Title, ThemeIcon } from '@mantine/core';
import { IconWallet } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login, isLoading, isReady, error } = useAuth();

  return (
    <Center h="100vh" p="md">
      <Stack align="center" gap="xl">
        <ThemeIcon size={80} radius="xl" variant="light" color="blue">
          <IconWallet size={40} />
        </ThemeIcon>
        
        <Title order={2} ta="center">Джимми</Title>
        <Text c="dimmed" ta="center" maw={280}>
          Приватный финансовый трекер для пары
        </Text>

        {error && (
          <Text c="red" size="sm" ta="center" maw={280}>
            {error}
          </Text>
        )}

        {!isReady ? (
          <Text c="dimmed" size="sm">Загрузка...</Text>
        ) : (
          <Button
            size="lg"
            onClick={login}
            loading={isLoading}
            fullWidth
            maw={280}
          >
            Войти через Telegram
          </Button>
        )}
      </Stack>
    </Center>
  );
}
