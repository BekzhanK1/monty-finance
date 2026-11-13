import { Center, Loader, Stack, Text } from '@mantine/core';
import { Monty } from '../brand/monty';

export function LoadingScreen() {
  return (
    <Center h="100dvh" p="md" style={{ background: 'linear-gradient(135deg, #8a8af5 0%, #5b5bd6 45%, #3730a3 100%)' }}>
      <Stack align="center" gap="md">
        <Monty mood="idle" size={160} label="Monty загружается" />
        <Text size="xl" fw={700} c="white">Monty</Text>
        <Loader color="white" size="md" type="dots" />
      </Stack>
    </Center>
  );
}
