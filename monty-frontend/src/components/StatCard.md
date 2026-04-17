# StatCard Component

A reusable card component for displaying financial statistics with consistent styling using theme tokens.

## Features

- **Color Variants**: Supports income (green), expense (red), savings (blue), and neutral colors
- **Consistent Styling**: Uses theme tokens for padding, border radius, shadows, and colors
- **Optional Elements**: Supports subtitle and icon
- **Interactive**: Can be made clickable with onClick handler
- **Hover Effects**: Smooth transitions on hover when clickable
- **Responsive**: Works well on all screen sizes
- **Accessible**: Proper semantic HTML and ARIA support

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | The label text displayed at the top of the card |
| `value` | `string \| number` | Yes | - | The main value to display (typically a monetary amount) |
| `color` | `'income' \| 'expense' \| 'savings' \| 'neutral'` | No | `'neutral'` | Color variant for the value |
| `subtitle` | `string` | No | - | Optional subtitle text displayed below the value |
| `icon` | `React.ReactNode` | No | - | Optional icon displayed in the top-right corner |
| `onClick` | `() => void` | No | - | Optional click handler (makes the card interactive) |

## Color Variants

- **income**: Green color (`#2f9e44`) - Use for income-related statistics
- **expense**: Red color (`#fa5252`) - Use for expense-related statistics
- **savings**: Blue color (`#228be6`) - Use for savings-related statistics
- **neutral**: Default text color (`#212529`) - Use for general statistics

## Theme Tokens Used

The component uses the following theme tokens for consistent styling:

### Spacing
- `theme.spacing.md` (16px) - Card padding
- `theme.spacing.xs` (4px) - Internal spacing between elements

### Typography
- `theme.typography.fontSize.sm` (14px) - Label text
- `theme.typography.fontSize['2xl']` (24px) - Value text
- `theme.typography.fontSize.xs` (12px) - Subtitle text
- `theme.typography.fontWeight.medium` (500) - Label weight
- `theme.typography.fontWeight.bold` (700) - Value weight
- `theme.typography.fontFamily.monospace` - Value font (for alignment)
- `theme.typography.lineHeight.tight` (1.2) - Value line height
- `theme.typography.lineHeight.normal` (1.4) - Label/subtitle line height

### Colors
- `theme.colors.income.main` - Income color
- `theme.colors.expense.main` - Expense color
- `theme.colors.savings.main` - Savings color
- `theme.colors.text.primary` - Neutral text color
- `theme.colors.text.secondary` - Label text color
- `theme.colors.text.tertiary` - Subtitle text color
- `theme.colors.background.primary` - Card background

### Shadows
- `theme.shadows.sm` - Default card shadow
- `theme.shadows.md` - Hover state shadow

### Border Radius
- `theme.borderRadius.md` (8px) - Card border radius

## Usage Examples

### Basic Usage

```tsx
import { StatCard } from './components/StatCard';

function Dashboard() {
  return (
    <StatCard 
      label="Income" 
      value="50,000 ₸" 
      color="income" 
    />
  );
}
```

### With Subtitle

```tsx
<StatCard 
  label="Monthly Income" 
  value="50,000 ₸" 
  color="income"
  subtitle="This month"
/>
```

### With Icon

```tsx
import { IconTrendingUp } from '@tabler/icons-react';

<StatCard 
  label="Income" 
  value="50,000 ₸" 
  color="income"
  icon={<IconTrendingUp size={24} />}
/>
```

### Clickable Card

```tsx
<StatCard 
  label="View Details" 
  value="50,000 ₸" 
  color="income"
  subtitle="Click to see more"
  onClick={() => navigate('/income-details')}
/>
```

### In a Grid Layout

```tsx
import { SimpleGrid } from '@mantine/core';
import { StatCard } from './components/StatCard';

function Dashboard() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
      <StatCard label="Income" value="50,000 ₸" color="income" />
      <StatCard label="Expense" value="30,000 ₸" color="expense" />
      <StatCard label="Savings" value="20,000 ₸" color="savings" />
      <StatCard label="Balance" value="40,000 ₸" color="neutral" />
    </SimpleGrid>
  );
}
```

## Styling Details

### Card Styling
- Background: White (`#ffffff`)
- Padding: 16px
- Border radius: 8px
- Shadow: Small shadow with smooth transition on hover
- Hover effect: Elevated shadow and slight upward translation (when clickable)

### Typography
- Label: 14px, medium weight (500), secondary text color
- Value: 24px, bold weight (700), monospace font, color based on variant
- Subtitle: 12px, normal weight (400), tertiary text color

### Transitions
- Shadow transition: 200ms ease
- Transform transition: 200ms ease

## Accessibility

- Uses semantic HTML structure
- Wraps in `UnstyledButton` when clickable for proper keyboard navigation
- Proper color contrast ratios for all text
- Icon colors match the value color for consistency
- Hover states provide clear visual feedback

## Requirements Satisfied

This component satisfies the following requirements from the UI Design Improvements spec:

- **1.2**: Emphasizes primary metrics using larger font sizes and weights
- **1.3**: Maintains consistent card padding and border radius
- **2.1**: Uses green color for income-related data
- **2.2**: Uses red color for expense-related data
- **2.3**: Uses blue color for savings-related data
- **5.1**: Uses consistent shadow depths
- **5.2**: Uses consistent border radius
- **5.3**: Uses consistent card layouts

## Testing

The component includes comprehensive unit tests covering:
- Rendering of label, value, subtitle, and icon
- Color variant application
- Click event handling
- Conditional button rendering
- Theme token usage
- Styling consistency

Run tests with:
```bash
npm test StatCard.test.tsx
```

## Notes

- The value uses a monospace font for better alignment when displaying monetary amounts
- The component automatically handles hover effects when `onClick` is provided
- All styling uses theme tokens for consistency and easy maintenance
- The component is fully responsive and works on all screen sizes
