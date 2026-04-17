# Theme Configuration

This directory contains the custom theme configuration for the Monty financial tracker application. The theme extends Mantine's default theme with custom design tokens for colors, typography, spacing, shadows, and border radius.

## Usage

### Accessing Theme Tokens

There are two ways to access theme tokens in your components:

#### 1. Direct Import (Recommended for Custom Tokens)

Use this approach to access custom semantic colors and design tokens:

```typescript
import { theme } from '@/theme';

function MyComponent() {
  return (
    <div style={{ color: theme.colors.income.main }}>
      Income: $1,000
    </div>
  );
}
```

#### 2. Mantine Theme Hook (For Mantine-Integrated Tokens)

Use this approach to access Mantine's theme system:

```typescript
import { useMantineTheme } from '@mantine/core';

function MyComponent() {
  const theme = useMantineTheme();
  
  return (
    <div style={{ 
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      boxShadow: theme.shadows.sm
    }}>
      Content
    </div>
  );
}
```

## Theme Structure

### Colors

#### Semantic Financial Colors

```typescript
theme.colors.income.main      // #2f9e44 - Green for income
theme.colors.expense.main     // #fa5252 - Red for expenses
theme.colors.savings.main     // #228be6 - Blue for savings
```

#### Budget Status Colors

```typescript
theme.colors.budgetStatus.safe     // #2f9e44 - < 50% used
theme.colors.budgetStatus.warning  // #fab005 - 50-75% used
theme.colors.budgetStatus.danger   // #fa5252 - > 75% used
theme.colors.budgetStatus.over     // #c92a2a - Over budget
```

#### UI Colors

```typescript
theme.colors.background.primary    // #ffffff - White
theme.colors.background.secondary  // #f8f9fa - Light gray
theme.colors.text.primary          // #212529 - Dark text
theme.colors.text.secondary        // #495057 - Medium text
```

### Typography

#### Font Families

```typescript
theme.typography.fontFamily.body       // System font stack
theme.typography.fontFamily.heading    // System font stack
theme.typography.fontFamily.monospace  // Monospace for numbers
```

#### Font Sizes

```typescript
theme.typography.fontSize.xs    // 12px
theme.typography.fontSize.sm    // 14px
theme.typography.fontSize.md    // 16px
theme.typography.fontSize.lg    // 18px
theme.typography.fontSize.xl    // 20px
theme.typography.fontSize['2xl'] // 24px
theme.typography.fontSize['3xl'] // 32px
```

#### Font Weights

```typescript
theme.typography.fontWeight.normal    // 400
theme.typography.fontWeight.medium    // 500
theme.typography.fontWeight.semibold  // 600
theme.typography.fontWeight.bold      // 700
```

#### Line Heights

```typescript
theme.typography.lineHeight.tight    // 1.2 - For headings
theme.typography.lineHeight.normal   // 1.4 - For body text
theme.typography.lineHeight.relaxed  // 1.6 - For long-form text
```

### Spacing

```typescript
theme.spacing.xs    // 4px
theme.spacing.sm    // 8px
theme.spacing.md    // 16px
theme.spacing.lg    // 24px
theme.spacing.xl    // 32px
theme.spacing['2xl'] // 48px
theme.spacing['3xl'] // 64px
```

### Shadows

```typescript
theme.shadows.xs  // Subtle shadow
theme.shadows.sm  // Small shadow for cards
theme.shadows.md  // Medium shadow for elevated elements
theme.shadows.lg  // Large shadow for modals
theme.shadows.xl  // Extra large shadow
```

### Border Radius

```typescript
theme.borderRadius.sm    // 4px
theme.borderRadius.md    // 8px - Default for cards
theme.borderRadius.lg    // 12px - For buttons
theme.borderRadius.xl    // 16px
theme.borderRadius.full  // 9999px - For circular elements
```

## Examples

### Stat Card with Semantic Colors

```typescript
import { theme } from '@/theme';
import { Card, Text } from '@mantine/core';

function StatCard({ type, value }: { type: 'income' | 'expense' | 'savings', value: number }) {
  const color = theme.colors[type].main;
  
  return (
    <Card shadow="sm" padding="md" radius="md">
      <Text size="sm" c="dimmed">
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Text>
      <Text size="xl" fw={700} style={{ color }}>
        ${value.toLocaleString()}
      </Text>
    </Card>
  );
}
```

### Budget Status Indicator

```typescript
import { theme } from '@/theme';
import { Progress, Text } from '@mantine/core';

function BudgetProgress({ spent, limit }: { spent: number, limit: number }) {
  const percentage = (spent / limit) * 100;
  
  let statusColor = theme.colors.budgetStatus.safe;
  if (percentage >= 75) statusColor = theme.colors.budgetStatus.danger;
  else if (percentage >= 50) statusColor = theme.colors.budgetStatus.warning;
  
  return (
    <div>
      <Progress value={percentage} color={statusColor} />
      <Text size="sm" style={{ color: statusColor }}>
        ${spent.toLocaleString()} / ${limit.toLocaleString()}
      </Text>
    </div>
  );
}
```

### Responsive Layout with Spacing

```typescript
import { theme } from '@/theme';
import { Stack, Box } from '@mantine/core';

function ResponsiveLayout() {
  return (
    <Stack gap={theme.spacing.lg}>
      <Box p={theme.spacing.md} style={{ 
        borderRadius: theme.borderRadius.md,
        boxShadow: theme.shadows.sm,
        background: theme.colors.background.primary
      }}>
        Content
      </Box>
    </Stack>
  );
}
```

## TypeScript Support

All theme tokens are fully typed. Import types from the theme module:

```typescript
import type { CustomTheme, ThemeColors, SpacingKey } from '@/theme';

// Use types for props
interface MyComponentProps {
  spacing?: SpacingKey;
  color?: keyof ThemeColors;
}
```

## Verification

The theme configuration includes automatic verification in development mode. Check the browser console for:

```
✅ Theme tokens verified successfully
```

If you see errors, check that all required theme tokens are properly defined.

## Integration with Mantine

The custom theme is integrated with Mantine's theme system in `src/main.tsx`. This means:

- Mantine components automatically use custom spacing, shadows, and typography
- Custom semantic colors are available via direct import
- All theme tokens are type-safe with TypeScript autocomplete

## Best Practices

1. **Use semantic colors**: Always use `theme.colors.income.main` instead of hardcoded colors
2. **Use spacing scale**: Use `theme.spacing.md` instead of arbitrary pixel values
3. **Use typography tokens**: Use `theme.typography.fontSize.lg` for consistent sizing
4. **Use Mantine components**: Leverage Mantine's built-in components that respect the theme
5. **Test responsiveness**: Ensure layouts work at all breakpoints (320px - 768px)

## Files

- `index.ts` - Main theme export and configuration
- `colors.ts` - Color palette and semantic colors
- `typography.ts` - Font sizes, weights, and line heights
- `spacing.ts` - Spacing scale
- `shadows.ts` - Shadow definitions
- `types.ts` - TypeScript type definitions
- `verify-theme.ts` - Theme verification script
- `ThemeTest.tsx` - Visual theme testing component
- `README.md` - This documentation file
