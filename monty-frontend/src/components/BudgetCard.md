# BudgetCard Component

A reusable card component for displaying budget category information with progress tracking, inline editing, and consistent styling using theme tokens.

## Features

- **Progress Bar with Color Coding**: Visual indicator with green (<50%), yellow (50-75%), red (>75%) based on budget usage
- **Inline Editing**: Edit budget limits directly within the card
- **Savings Category Support**: Special handling for savings categories (no limit display)
- **Consistent Styling**: Uses theme tokens for padding, border radius, shadows, and colors
- **Interactive**: Can be made clickable with onClick handler
- **Hover Effects**: Smooth transitions on hover when clickable
- **Responsive**: Works well on all screen sizes
- **Accessible**: Proper semantic HTML and ARIA labels

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `categoryId` | `number` | Yes | - | Unique identifier for the category |
| `categoryName` | `string` | Yes | - | Display name of the budget category |
| `categoryIcon` | `string` | Yes | - | Emoji icon representing the category |
| `spent` | `number` | Yes | - | Amount spent in this category |
| `limit` | `number` | Yes | - | Budget limit for this category (0 for savings) |
| `group` | `'BASE' \| 'COMFORT' \| 'SAVINGS'` | Yes | - | Budget group classification |
| `onEdit` | `(categoryId: number, newLimit: number) => void` | No | - | Callback when budget limit is edited |
| `onClick` | `() => void` | No | - | Optional click handler for the entire card |

## Budget Groups

- **BASE**: Essential expenses (rent, groceries, utilities)
- **COMFORT**: Discretionary spending (entertainment, dining out)
- **SAVINGS**: Savings categories (no limit, no progress bar)

## Progress Bar Color Coding

The progress bar color automatically changes based on budget usage:

- **Green** (`#2f9e44`): Less than 50% of budget used - Safe zone
- **Yellow** (`#fab005`): 50-75% of budget used - Warning zone
- **Red** (`#fa5252`): 75-100% of budget used - Danger zone
- **Dark Red** (`#c92a2a`): Over 100% of budget - Over budget

## Theme Tokens Used

The component uses the following theme tokens for consistent styling:

### Spacing
- `theme.spacing.md` (16px) - Card padding
- `theme.spacing.sm` (8px) - Internal spacing between groups
- `theme.spacing.xs` (4px) - Tight spacing within elements

### Typography
- `theme.typography.fontSize.xl` (20px) - Icon and spent amount
- `theme.typography.fontSize.md` (16px) - Category name
- `theme.typography.fontSize.sm` (14px) - Limit amount and buttons
- `theme.typography.fontSize.xs` (12px) - Percentage text
- `theme.typography.fontWeight.medium` (500) - Category name
- `theme.typography.fontWeight.bold` (700) - Spent amount
- `theme.typography.fontFamily.monospace` - Monetary amounts (for alignment)
- `theme.typography.lineHeight.tight` (1.2) - Icon and amounts
- `theme.typography.lineHeight.normal` (1.4) - Text elements

### Colors
- `theme.colors.expense.main` - Spent amount color
- `theme.colors.budgetStatus.safe` - Progress bar green (<50%)
- `theme.colors.budgetStatus.warning` - Progress bar yellow (50-75%)
- `theme.colors.budgetStatus.danger` - Progress bar red (>75%)
- `theme.colors.budgetStatus.over` - Progress bar dark red (>100%)
- `theme.colors.text.primary` - Category name
- `theme.colors.text.secondary` - Labels
- `theme.colors.text.tertiary` - Limit amount and percentage
- `theme.colors.background.primary` - Card background
- `theme.colors.background.tertiary` - Cancel button background
- `theme.colors.savings.main` - Save button background

### Shadows
- `theme.shadows.sm` - Default card shadow
- `theme.shadows.md` - Hover state shadow

### Border Radius
- `theme.borderRadius.md` (8px) - Card border radius
- `theme.borderRadius.sm` (4px) - Input and button border radius
- `theme.borderRadius.full` (9999px) - Progress bar border radius

## Usage Examples

### Basic Usage

```tsx
import { BudgetCard } from './components/BudgetCard';

function Dashboard() {
  return (
    <BudgetCard
      categoryId={1}
      categoryName="Food"
      categoryIcon="🍔"
      spent={30000}
      limit={50000}
      group="BASE"
    />
  );
}
```

### With Edit Functionality

```tsx
const handleEdit = (categoryId: number, newLimit: number) => {
  // Update budget limit in backend
  updateBudgetLimit(categoryId, newLimit);
};

<BudgetCard
  categoryId={1}
  categoryName="Food"
  categoryIcon="🍔"
  spent={30000}
  limit={50000}
  group="BASE"
  onEdit={handleEdit}
/>
```

### Clickable Card

```tsx
<BudgetCard
  categoryId={1}
  categoryName="Food"
  categoryIcon="🍔"
  spent={30000}
  limit={50000}
  group="BASE"
  onClick={() => navigate('/transactions?category=1')}
/>
```

### Savings Category

```tsx
<BudgetCard
  categoryId={6}
  categoryName="Emergency Fund"
  categoryIcon="🏦"
  spent={150000}
  limit={0}
  group="SAVINGS"
/>
```

### In a Grid Layout

```tsx
import { SimpleGrid } from '@mantine/core';
import { BudgetCard } from './components/BudgetCard';

function BudgetOverview() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      <BudgetCard
        categoryId={1}
        categoryName="Food"
        categoryIcon="🍔"
        spent={30000}
        limit={50000}
        group="BASE"
      />
      <BudgetCard
        categoryId={2}
        categoryName="Transport"
        categoryIcon="🚗"
        spent={20000}
        limit={40000}
        group="BASE"
      />
      <BudgetCard
        categoryId={3}
        categoryName="Entertainment"
        categoryIcon="🎬"
        spent={15000}
        limit={30000}
        group="COMFORT"
      />
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
- Category name: 16px, medium weight (500), primary text color
- Icon: 20px emoji
- Spent amount: 20px, bold weight (700), monospace font, expense color (red)
- Limit amount: 14px, monospace font, tertiary text color
- Percentage: 12px, tertiary text color

### Progress Bar
- Height: 8px (standard size)
- Border radius: Full (pill shape)
- Color: Dynamic based on usage percentage
- Caps at 100% visually even when over budget

### Edit Mode
- Input: Monospace font, bordered, focus state with blue border
- Save button: Blue background, white text, hover effect
- Cancel button: Gray background, hover effect
- Buttons: 14px text, medium weight

### Transitions
- Shadow transition: 200ms ease
- Transform transition: 200ms ease
- Button hover: 200ms ease

## Behavior

### Edit Mode
1. Click the edit icon (pencil) to enter edit mode
2. Input field appears with current limit value
3. Modify the value
4. Click "Сохранить" (Save) to apply changes
5. Click "Отмена" (Cancel) to discard changes
6. Edit mode is disabled for savings categories

### Click Handling
- When `onClick` is provided, the entire card becomes clickable
- Edit button click does not trigger card click (event propagation stopped)
- Edit mode prevents card click
- Hover effects only apply when card is clickable

### Savings Categories
- No limit amount displayed
- No progress bar shown
- No percentage text
- No edit button (even if `onEdit` is provided)
- Only spent amount is displayed

## Accessibility

- Edit button has proper `aria-label` with category name
- Input field has proper focus indicators
- Buttons have clear hover states
- Proper color contrast ratios for all text
- Keyboard navigation support when clickable
- Semantic HTML structure

## Requirements Satisfied

This component satisfies the following requirements from the UI Design Improvements spec:

- **1.2**: Emphasizes primary metrics (spent amount) using larger font sizes and weights
- **1.3**: Maintains consistent card padding and border radius
- **2.1**: Uses semantic colors for budget status
- **2.2**: Uses red color for expense-related data (spent amount)
- **2.4**: Uses color coding for budget status (green/yellow/red)
- **5.3**: Uses consistent card layouts with icon, name, amount, and progress bar
- **7.1**: Uses consistent progress bar height (8px standard)
- **7.2**: Uses rounded corners for progress bars

## Testing

The component includes comprehensive unit tests covering:
- Rendering of category name, icon, amounts
- Progress bar color coding based on usage percentage
- Savings category special handling
- Edit mode functionality (enter, save, cancel)
- Click event handling
- Theme token usage
- Styling consistency
- Over-budget scenarios

Run tests with:
```bash
npm test BudgetCard.test.tsx
```

## Notes

- Monetary amounts use monospace font for better alignment
- Progress bar is capped at 100% visually but percentage can exceed 100%
- Edit mode uses inline form elements for quick editing
- Component automatically handles hover effects when `onClick` is provided
- All styling uses theme tokens for consistency and easy maintenance
- The component is fully responsive and works on all screen sizes
- Russian text is used for edit buttons ("Сохранить", "Отмена")
- Number formatting uses Russian locale (ru-KZ) with thousand separators

