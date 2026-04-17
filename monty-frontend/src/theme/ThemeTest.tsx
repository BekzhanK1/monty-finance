// Test component to verify theme tokens are accessible
import { Box, Text, Stack, useMantineTheme } from '@mantine/core';
import { theme } from './index';

export function ThemeTest() {
  const mantineTheme = useMantineTheme();

  return (
    <Stack p="md" gap="md">
      <Box>
        <Text size="xl" fw={700}>Theme Configuration Test</Text>
        <Text size="sm" c="dimmed">Verifying custom theme tokens are accessible</Text>
      </Box>

      {/* Test Mantine theme integration */}
      <Box>
        <Text fw={600} mb="xs">Mantine Theme (via useMantineTheme)</Text>
        <Text size="sm">Font Family: {mantineTheme.fontFamily}</Text>
        <Text size="sm">Default Radius: {mantineTheme.defaultRadius}</Text>
        <Text size="sm">Spacing MD: {mantineTheme.spacing.md}</Text>
      </Box>

      {/* Test custom theme tokens */}
      <Box>
        <Text fw={600} mb="xs">Custom Theme Tokens (direct import)</Text>
        <Text size="sm" style={{ color: theme.colors.income.main }}>
          Income Color: {theme.colors.income.main}
        </Text>
        <Text size="sm" style={{ color: theme.colors.expense.main }}>
          Expense Color: {theme.colors.expense.main}
        </Text>
        <Text size="sm" style={{ color: theme.colors.savings.main }}>
          Savings Color: {theme.colors.savings.main}
        </Text>
      </Box>

      {/* Test typography */}
      <Box>
        <Text fw={600} mb="xs">Typography</Text>
        <Text size="xs">Extra Small (xs): {theme.typography.fontSize.xs}</Text>
        <Text size="sm">Small (sm): {theme.typography.fontSize.sm}</Text>
        <Text size="md">Medium (md): {theme.typography.fontSize.md}</Text>
        <Text size="lg">Large (lg): {theme.typography.fontSize.lg}</Text>
        <Text size="xl">Extra Large (xl): {theme.typography.fontSize.xl}</Text>
      </Box>

      {/* Test spacing */}
      <Box>
        <Text fw={600} mb="xs">Spacing</Text>
        <Box style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }}>
          <Box style={{ width: theme.spacing.xs, height: '20px', background: '#228be6' }} />
          <Text size="sm">xs: {theme.spacing.xs}</Text>
        </Box>
        <Box style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }}>
          <Box style={{ width: theme.spacing.sm, height: '20px', background: '#228be6' }} />
          <Text size="sm">sm: {theme.spacing.sm}</Text>
        </Box>
        <Box style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }}>
          <Box style={{ width: theme.spacing.md, height: '20px', background: '#228be6' }} />
          <Text size="sm">md: {theme.spacing.md}</Text>
        </Box>
      </Box>

      {/* Test shadows */}
      <Box>
        <Text fw={600} mb="xs">Shadows</Text>
        <Box style={{ padding: theme.spacing.md, boxShadow: theme.shadows.sm, borderRadius: theme.borderRadius.md, background: 'white' }}>
          <Text size="sm">Card with sm shadow</Text>
        </Box>
      </Box>

      {/* Test border radius */}
      <Box>
        <Text fw={600} mb="xs">Border Radius</Text>
        <Box style={{ display: 'flex', gap: theme.spacing.sm }}>
          <Box style={{ width: '40px', height: '40px', background: '#228be6', borderRadius: theme.borderRadius.sm }} />
          <Box style={{ width: '40px', height: '40px', background: '#228be6', borderRadius: theme.borderRadius.md }} />
          <Box style={{ width: '40px', height: '40px', background: '#228be6', borderRadius: theme.borderRadius.lg }} />
          <Box style={{ width: '40px', height: '40px', background: '#228be6', borderRadius: theme.borderRadius.xl }} />
        </Box>
      </Box>
    </Stack>
  );
}
