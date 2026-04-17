import { Card, useMantineColorScheme } from '@mantine/core';
import type { CardProps } from '@mantine/core';
import type { ReactNode } from 'react';

interface EnhancedCardProps extends Omit<CardProps, 'children'> {
  children: ReactNode;
  gradient?: boolean;
  hover?: boolean;
  glass?: boolean;
}

export function EnhancedCard({ 
  children, 
  gradient = false, 
  hover = true,
  glass = true,
  ...props 
}: EnhancedCardProps) {
  const { colorScheme } = useMantineColorScheme();

  const getBackground = () => {
    if (gradient) {
      return colorScheme === 'dark'
        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)';
    }
    if (glass) {
      return colorScheme === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)';
    }
    return undefined;
  };

  return (
    <Card
      shadow="md"
      padding="lg"
      radius="xl"
      withBorder
      className={hover ? 'hover-lift' : ''}
      {...props}
      style={{
        background: getBackground(),
        backdropFilter: glass ? 'blur(10px)' : undefined,
        border: colorScheme === 'dark' 
          ? '1px solid rgba(255, 255, 255, 0.1)' 
          : '1px solid rgba(0, 0, 0, 0.05)',
        ...props.style,
      }}
    >
      {children}
    </Card>
  );
}
