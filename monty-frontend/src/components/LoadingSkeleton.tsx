import { Stack, Card, Box } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';

export function LoadingSkeleton() {
  const { colorScheme } = useMantineColorScheme();
  
  const skeletonBg = colorScheme === 'dark' 
    ? 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)'
    : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';

  return (
    <Stack gap="lg" className="animate-fade-in">
      {[1, 2, 3].map((i) => (
        <Card 
          key={i}
          shadow="md" 
          padding="lg" 
          radius="xl" 
          withBorder
          style={{
            background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box
            h={24}
            w="60%"
            mb="md"
            style={{
              background: skeletonBg,
              backgroundSize: '200% 100%',
              borderRadius: '8px',
            }}
            className="animate-shimmer"
          />
          <Box
            h={40}
            w="100%"
            mb="sm"
            style={{
              background: skeletonBg,
              backgroundSize: '200% 100%',
              borderRadius: '8px',
            }}
            className="animate-shimmer"
          />
          <Box
            h={16}
            w="40%"
            style={{
              background: skeletonBg,
              backgroundSize: '200% 100%',
              borderRadius: '8px',
            }}
            className="animate-shimmer"
          />
        </Card>
      ))}
    </Stack>
  );
}
