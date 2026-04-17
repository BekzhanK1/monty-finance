// Example component demonstrating theme token usage
import { Card, Text, Stack, Group, useMantineTheme } from '@mantine/core';
import { theme } from '../theme';

/**
 * Example component showing how to use custom theme tokens
 * This demonstrates that theme tokens are accessible throughout the application
 */
export function ThemeExample() {
  const mantineTheme = useMantineTheme();

  return (
    <Stack gap="md">
      {/* Example 1: Using custom semantic colors */}
      <Card shadow="sm" padding="md" radius="md">
        <Text size="sm" c="dimmed" mb="xs">Financial Summary</Text>
        <Group justify="space-between">
          <Text style={{ color: theme.colors.income.main }} fw={600}>
            Income: ₸50,000
          </Text>
          <Text style={{ color: theme.colors.expense.main }} fw={600}>
            Expense: ₸30,000
          </Text>
          <Text style={{ color: theme.colors.savings.main }} fw={600}>
            Savings: ₸20,000
          </Text>
        </Group>
      </Card>

      {/* Example 2: Using Mantine theme tokens */}
      <Card 
        shadow="sm" 
        padding={mantineTheme.spacing.md} 
        radius={mantineTheme.radius.md}
        style={{ boxShadow: mantineTheme.shadows.sm }}
      >
        <Text size="sm" c="dimmed" mb="xs">Mantine Theme Integration</Text>
        <Text size="sm">
          Spacing: {mantineTheme.spacing.md} | 
          Radius: {mantineTheme.radius.md} | 
          Font: {mantineTheme.fontFamily}
        </Text>
      </Card>

      {/* Example 3: Budget status colors */}
      <Card shadow="sm" padding="md" radius="md">
        <Text size="sm" c="dimmed" mb="xs">Budget Status Colors</Text>
        <Stack gap="xs">
          <Group>
            <div style={{ 
              width: 20, 
              height: 20, 
              borderRadius: theme.borderRadius.sm,
              background: theme.colors.budgetStatus.safe 
            }} />
            <Text size="sm">Safe (under 50%)</Text>
          </Group>
          <Group>
            <div style={{ 
              width: 20, 
              height: 20, 
              borderRadius: theme.borderRadius.sm,
              background: theme.colors.budgetStatus.warning 
            }} />
            <Text size="sm">Warning (50-75%)</Text>
          </Group>
          <Group>
            <div style={{ 
              width: 20, 
              height: 20, 
              borderRadius: theme.borderRadius.sm,
              background: theme.colors.budgetStatus.danger 
            }} />
            <Text size="sm">Danger (over 75%)</Text>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
