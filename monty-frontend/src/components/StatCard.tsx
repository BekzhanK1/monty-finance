import { Card, Text, Group, Stack, UnstyledButton } from '@mantine/core';
import { theme } from '../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: 'income' | 'expense' | 'savings' | 'neutral';
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

/**
 * StatCard component for displaying financial statistics
 * Supports color variants: income (green), expense (red), savings (blue), neutral
 * Uses consistent styling with theme tokens
 */
export function StatCard({ 
  label, 
  value, 
  color = 'neutral', 
  subtitle, 
  icon, 
  onClick 
}: StatCardProps) {
  // Determine color based on variant
  const getColor = () => {
    switch (color) {
      case 'income':
        return theme.colors.income.main;
      case 'expense':
        return theme.colors.expense.main;
      case 'savings':
        return theme.colors.savings.main;
      case 'neutral':
      default:
        return theme.colors.text.primary;
    }
  };

  const cardContent = (
    <Card
      shadow="sm"
      padding={theme.spacing.md}
      radius={theme.borderRadius.md}
      style={{
        boxShadow: theme.shadows.sm,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        backgroundColor: theme.colors.background.primary,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = theme.shadows.md;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = theme.shadows.sm;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <Stack gap={theme.spacing.xs}>
        {/* Label and Icon */}
        <Group justify="space-between" align="center">
          <Text
            size={theme.typography.fontSize.sm}
            style={{
              color: theme.colors.text.secondary,
              fontWeight: theme.typography.fontWeight.medium,
              lineHeight: theme.typography.lineHeight.normal,
            }}
          >
            {label}
          </Text>
          {icon && (
            <div style={{ color: getColor() }}>
              {icon}
            </div>
          )}
        </Group>

        {/* Value */}
        <Text
          style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: getColor(),
            fontFamily: theme.typography.fontFamily.monospace,
            lineHeight: theme.typography.lineHeight.tight,
          }}
        >
          {value}
        </Text>

        {/* Subtitle */}
        {subtitle && (
          <Text
            size={theme.typography.fontSize.xs}
            style={{
              color: theme.colors.text.tertiary,
              lineHeight: theme.typography.lineHeight.normal,
            }}
          >
            {subtitle}
          </Text>
        )}
      </Stack>
    </Card>
  );

  // Wrap in UnstyledButton if onClick is provided
  if (onClick) {
    return (
      <UnstyledButton onClick={onClick} style={{ width: '100%' }}>
        {cardContent}
      </UnstyledButton>
    );
  }

  return cardContent;
}
