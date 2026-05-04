import { Center, Stack, Text, ThemeIcon, Box, Loader } from '@mantine/core';
import { IconWallet } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

const LoadingDots = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <Text component="span">{dots}</Text>;
};

export function LoadingScreen() {
  return (
    <Center h="100vh" p="md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Stack align="center" gap="xl">
        <Box
          style={{
            animation: 'pulse 2s ease-in-out infinite',
            position: 'relative',
          }}
        >
          <ThemeIcon 
            size={100} 
            radius="xl" 
            variant="white" 
            color="violet"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <IconWallet size={50} />
          </ThemeIcon>
        </Box>
        
        <Stack align="center" gap="sm">
          <Text 
            size="xl" 
            fw={700} 
            c="white"
            style={{
              letterSpacing: '0.5px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            }}
          >
            Монти
          </Text>
          <Text 
            c="rgba(255, 255, 255, 0.9)" 
            ta="center" 
            size="sm"
            maw={280}
            style={{
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
            }}
          >
            Приватный финансовый трекер для пары
          </Text>
        </Stack>

        <Box mt="xl">
          <Loader color="white" size="md" type="dots" />
        </Box>

        <Text 
          c="rgba(255, 255, 255, 0.7)" 
          size="sm"
          style={{
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          }}
        >
          Загрузка<LoadingDots />
        </Text>
      </Stack>
    </Center>
  );
}
