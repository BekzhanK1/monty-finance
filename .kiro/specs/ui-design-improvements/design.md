# Design Document: UI Design Improvements

## Overview

This design document outlines the technical approach for implementing comprehensive UI/UX improvements to the Monty financial tracker application. The improvements focus on establishing a consistent design system, enhancing visual hierarchy, improving responsive behavior, and creating a polished user experience across all pages.

### Goals

- Establish a comprehensive design system with tokens for colors, typography, spacing, shadows, and borders
- Implement consistent visual hierarchy across all pages
- Enhance responsive behavior for mobile-first experience
- Improve component consistency and reusability
- Create smooth animations and transitions
- Ensure accessibility compliance

### Non-Goals

- Changing the core functionality or business logic of the application
- Adding new features beyond UI/UX improvements
- Modifying the backend API or data models
- Changing the Mantine UI component library (we'll work within its capabilities)

## Architecture

### Design System Architecture

The design system will be implemented as a centralized theme configuration that extends Mantine's default theme. This approach provides:

1. **Single Source of Truth**: All design tokens defined in one place
2. **Type Safety**: TypeScript types for all design tokens
3. **Easy Maintenance**: Changes propagate automatically throughout the application
4. **Framework Integration**: Leverages Mantine's theming system

### Component Structure

```
src/
├── theme/
│   ├── index.ts              # Main theme configuration
│   ├── colors.ts             # Color palette and semantic colors
│   ├── typography.ts         # Font sizes, weights, line heights
│   ├── spacing.ts            # Spacing scale
│   ├── shadows.ts            # Shadow definitions
│   └── components.ts         # Component-specific overrides
├── components/
│   ├── Layout.tsx            # Enhanced with consistent styling
│   ├── BudgetCard.tsx        # Extracted reusable component
│   ├── TransactionCard.tsx   # Extracted reusable component
│   ├── StatCard.tsx          # Extracted reusable component
│   └── EmptyState.tsx        # Reusable empty state component
└── pages/
    └── [existing pages with improved styling]
```

## Components and Interfaces

### Theme Configuration

#### Color System

```typescript
// src/theme/colors.ts
export const colors = {
  // Semantic colors for financial data
  income: {
    light: '#e6f7ed',
    main: '#2f9e44',
    dark: '#1e6f30',
  },
  expense: {
    light: '#ffe6e6',
    main: '#fa5252',
    dark: '#c92a2a',
  },
  savings: {
    light: '#e6f4ff',
    main: '#228be6',
    dark: '#1864ab',
  },
  
  // Budget status colors
  budgetStatus: {
    safe: '#2f9e44',      // < 50% used
    warning: '#fab005',   // 50-75% used
    danger: '#fa5252',    // > 75% used
    over: '#c92a2a',      // Over budget
  },
  
  // UI colors
  background: {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    tertiary: '#e9ecef',
  },
  
  text: {
    primary: '#212529',
    secondary: '#495057',
    tertiary: '#868e96',
    disabled: '#adb5bd',
  },
};
```

#### Typography System

```typescript
// src/theme/typography.ts
export const typography = {
  fontFamily: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    monospace: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '48px',
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};
```

#### Spacing System

```typescript
// src/theme/spacing.ts
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};
```

#### Shadow System

```typescript
// src/theme/shadows.ts
export const shadows = {
  xs: '0 1px 3px rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
};
```

#### Border Radius System

```typescript
// src/theme/index.ts (borders section)
export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};
```

### Reusable Components

#### StatCard Component

```typescript
// src/components/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string | number;
  color?: 'income' | 'expense' | 'savings' | 'neutral';
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function StatCard({ label, value, color = 'neutral', subtitle, icon, onClick }: StatCardProps) {
  // Renders a consistent stat card with proper styling
}
```

#### BudgetCard Component

```typescript
// src/components/BudgetCard.tsx
interface BudgetCardProps {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  spent: number;
  limit: number;
  group: 'BASE' | 'COMFORT' | 'SAVINGS';
  onEdit?: (categoryId: number, newLimit: number) => void;
  onClick?: () => void;
}

export function BudgetCard({ categoryId, categoryName, categoryIcon, spent, limit, group, onEdit, onClick }: BudgetCardProps) {
  // Renders a consistent budget category card
}
```

#### TransactionCard Component

```typescript
// src/components/TransactionCard.tsx
interface TransactionCardProps {
  transaction: Transaction;
  category: Category;
  onClick?: () => void;
}

export function TransactionCard({ transaction, category, onClick }: TransactionCardProps) {
  // Renders a consistent transaction card
}
```

#### EmptyState Component

```typescript
// src/components/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  // Renders a consistent empty state
}
```

## Data Models

No new data models are required. This feature works with existing data structures:

- `Transaction`: Existing transaction model
- `Category`: Existing category model
- `Budget`: Existing budget model
- `Analytics`: Existing analytics model

## Error Handling

### Theme Loading Errors

- **Error**: Theme configuration fails to load
- **Handling**: Fall back to Mantine default theme
- **User Experience**: Application remains functional with default styling

### Component Rendering Errors

- **Error**: Component fails to render due to missing props or data
- **Handling**: Use React Error Boundaries to catch and display fallback UI
- **User Experience**: Show error message with option to refresh

### Responsive Layout Issues

- **Error**: Layout breaks on specific screen sizes
- **Handling**: Use CSS media queries with fallback layouts
- **User Experience**: Ensure minimum viable layout on all screen sizes

## Testing Strategy

### Why Property-Based Testing Does NOT Apply

This feature focuses on UI/UX improvements, including:
- Visual styling and design system implementation
- Layout and responsive behavior
- Component appearance and consistency
- Animation and transition effects

Property-based testing is **not appropriate** for this feature because:

1. **UI Rendering**: We're testing how components look and behave visually, not pure functions with universal properties
2. **Subjective Qualities**: Many requirements involve visual appeal, consistency, and user experience that cannot be expressed as mathematical properties
3. **Deterministic Behavior**: UI styling is deterministic - a component with specific props always renders the same way
4. **No Input Space**: There's no meaningful input space to generate random test cases for visual styling

### Appropriate Testing Approaches

#### 1. Visual Regression Testing

Use tools like Storybook + Chromatic or Percy for visual regression testing:

- **Snapshot Tests**: Capture visual snapshots of all components in various states
- **Comparison**: Automatically detect visual changes between versions
- **Coverage**: Test all pages, components, and responsive breakpoints

#### 2. Example-Based Unit Tests

Write focused unit tests for specific scenarios:

```typescript
describe('StatCard', () => {
  it('renders income color correctly', () => {
    render(<StatCard label="Income" value="1000" color="income" />);
    expect(screen.getByText('1000')).toHaveStyle({ color: colors.income.main });
  });
  
  it('renders expense color correctly', () => {
    render(<StatCard label="Expense" value="500" color="expense" />);
    expect(screen.getByText('500')).toHaveStyle({ color: colors.expense.main });
  });
  
  it('handles click events', () => {
    const onClick = jest.fn();
    render(<StatCard label="Test" value="100" onClick={onClick} />);
    fireEvent.click(screen.getByText('Test'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

#### 3. Responsive Layout Tests

Test responsive behavior at different breakpoints:

```typescript
describe('Dashboard responsive layout', () => {
  it('displays single column on mobile', () => {
    window.innerWidth = 375;
    render(<DashboardPage />);
    const grid = screen.getByTestId('stats-grid');
    expect(grid).toHaveStyle({ gridTemplateColumns: '1fr' });
  });
  
  it('displays two columns on tablet', () => {
    window.innerWidth = 768;
    render(<DashboardPage />);
    const grid = screen.getByTestId('stats-grid');
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
  });
});
```

#### 4. Accessibility Tests

Use tools like jest-axe to verify accessibility:

```typescript
describe('Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<DashboardPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('has proper ARIA labels on icon buttons', () => {
    render(<Layout />);
    expect(screen.getByLabelText('Add transaction')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });
});
```

#### 5. Integration Tests

Test complete user flows with styled components:

```typescript
describe('Transaction flow', () => {
  it('completes add transaction flow with proper styling', async () => {
    render(<App />);
    
    // Navigate to add transaction
    fireEvent.click(screen.getByLabelText('Add transaction'));
    
    // Verify page styling
    expect(screen.getByText('Добавить расход')).toHaveStyle({
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.bold,
    });
    
    // Complete transaction
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('0'));
    fireEvent.click(screen.getByText('0'));
    fireEvent.click(screen.getByText('🍔 Еда'));
    fireEvent.click(screen.getByText('Добавить'));
    
    // Verify success state
    await waitFor(() => {
      expect(screen.getByText('Главная')).toBeInTheDocument();
    });
  });
});
```

#### 6. Component Library Tests (Storybook)

Create stories for all components to enable:
- Visual testing in isolation
- Documentation of component variants
- Interactive testing of component states

```typescript
// StatCard.stories.tsx
export default {
  title: 'Components/StatCard',
  component: StatCard,
};

export const Income = () => (
  <StatCard label="Income" value="50,000 ₸" color="income" />
);

export const Expense = () => (
  <StatCard label="Expense" value="30,000 ₸" color="expense" />
);

export const WithSubtitle = () => (
  <StatCard 
    label="Balance" 
    value="20,000 ₸" 
    color="savings"
    subtitle="After expenses"
  />
);
```

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage for component logic
- **Visual Regression**: 100% coverage of all pages and major component variants
- **Accessibility**: 100% compliance with WCAG 2.1 Level AA
- **Responsive**: Test at minimum 3 breakpoints (mobile, tablet, desktop)

## Implementation Approach

### Phase 1: Design System Foundation (Requirements 1-3, 5)

**Objective**: Establish the design system infrastructure

**Tasks**:
1. Create theme configuration files (colors, typography, spacing, shadows)
2. Configure Mantine theme provider with custom theme
3. Create TypeScript types for design tokens
4. Document design system in Storybook

**Validation**:
- All design tokens are accessible via theme
- TypeScript provides autocomplete for design tokens
- Storybook displays all design tokens

### Phase 2: Component Extraction and Standardization (Requirements 1, 5, 6)

**Objective**: Extract reusable components with consistent styling

**Tasks**:
1. Create StatCard component
2. Create BudgetCard component
3. Create TransactionCard component
4. Create EmptyState component
5. Update all pages to use new components

**Validation**:
- All pages use extracted components
- Components accept consistent props
- Visual consistency across all pages

### Phase 3: Responsive Layout Improvements (Requirement 4, 8)

**Objective**: Enhance responsive behavior for mobile-first experience

**Tasks**:
1. Implement responsive grid system using Mantine Grid
2. Add responsive breakpoints to all pages
3. Ensure touch targets meet 44x44px minimum
4. Test on devices from 320px to 768px width
5. Fix bottom navigation overlap issues

**Validation**:
- No horizontal scrolling on any page
- All interactive elements meet touch target size
- Layout adapts smoothly at all breakpoints

### Phase 4: Visual Hierarchy and Typography (Requirements 1, 3)

**Objective**: Improve readability and visual hierarchy

**Tasks**:
1. Apply consistent heading sizes across all pages
2. Implement proper font weights for emphasis
3. Use monospace fonts for monetary amounts
4. Ensure minimum 12px font size
5. Apply consistent line heights

**Validation**:
- Headings follow size hierarchy (h1 > h2 > h3)
- Monetary amounts align properly
- Text is readable at all sizes

### Phase 5: Color System Implementation (Requirement 2)

**Objective**: Apply consistent semantic colors

**Tasks**:
1. Apply green color to all income-related data
2. Apply red color to all expense-related data
3. Apply blue color to all savings-related data
4. Implement budget status colors (green/yellow/red)
5. Ensure consistent background colors for cards

**Validation**:
- Income always displays in green
- Expenses always display in red
- Savings always display in blue
- Budget status colors match usage percentage

### Phase 6: Interactive Elements and Feedback (Requirement 6, 12)

**Objective**: Enhance user interaction feedback

**Tasks**:
1. Add hover states to all clickable elements
2. Implement loading states for all buttons
3. Add smooth transitions (200-300ms)
4. Ensure haptic feedback on all interactions
5. Implement consistent button sizes

**Validation**:
- Cursor changes to pointer on hover
- Buttons show loading state during actions
- Transitions are smooth and consistent
- Haptic feedback works on all interactions

### Phase 7: Data Visualization Improvements (Requirement 7)

**Objective**: Enhance charts and progress bars

**Tasks**:
1. Standardize progress bar heights (4px compact, 8px standard)
2. Add rounded corners to all progress bars
3. Apply consistent colors to charts
4. Ensure chart labels don't overlap
5. Format percentages consistently (0-1 decimal places)

**Validation**:
- Progress bars have consistent styling
- Charts use application color scheme
- Labels are readable and positioned correctly

### Phase 8: Forms and Input Design (Requirement 9)

**Objective**: Improve form usability

**Tasks**:
1. Standardize input field heights and padding
2. Add thousand separators to number inputs
3. Apply consistent label styles
4. Implement clear focus indicators
5. Style validation errors consistently

**Validation**:
- All inputs have consistent height
- Numbers format with thousand separators
- Focus indicators are visible
- Errors display in red below fields

### Phase 9: Loading and Empty States (Requirement 10)

**Objective**: Improve feedback for loading and empty states

**Tasks**:
1. Implement loading overlays for all pages
2. Create skeleton screens for data loading
3. Design empty state component
4. Add empty state messages to all lists
5. Style error messages consistently

**Validation**:
- Loading states display during data fetch
- Empty states show helpful messages
- Error messages are clear and actionable

### Phase 10: Accessibility Improvements (Requirement 11)

**Objective**: Ensure accessibility compliance

**Tasks**:
1. Verify color contrast ratios (minimum 4.5:1)
2. Add aria-labels to icon-only buttons
3. Ensure keyboard navigation works
4. Use semantic HTML elements
5. Test with screen readers

**Validation**:
- All text meets contrast requirements
- Icon buttons have aria-labels
- All interactive elements are keyboard accessible
- Screen readers can navigate the application

### Phase 11: Animation and Transitions (Requirement 12)

**Objective**: Add polish with smooth animations

**Tasks**:
1. Add page transition animations (200-300ms)
2. Implement hover transitions on interactive elements
3. Add loading animations
4. Respect prefers-reduced-motion setting
5. Ensure animations don't exceed 500ms

**Validation**:
- Page transitions are smooth
- Hover effects have smooth transitions
- Animations respect user preferences
- No animations feel sluggish

## File Structure and Organization

```
monty-frontend/
├── src/
│   ├── theme/
│   │   ├── index.ts              # Main theme export
│   │   ├── colors.ts             # Color definitions
│   │   ├── typography.ts         # Typography system
│   │   ├── spacing.ts            # Spacing scale
│   │   ├── shadows.ts            # Shadow definitions
│   │   └── components.ts         # Component overrides
│   ├── components/
│   │   ├── Layout.tsx            # Enhanced layout
│   │   ├── StatCard.tsx          # Stat display card
│   │   ├── BudgetCard.tsx        # Budget category card
│   │   ├── TransactionCard.tsx   # Transaction list item
│   │   ├── EmptyState.tsx        # Empty state component
│   │   └── LoadingOverlay.tsx    # Loading state component
│   ├── pages/
│   │   ├── DashboardPage.tsx     # Updated with new components
│   │   ├── TransactionsPage.tsx  # Updated with new components
│   │   ├── AddTransactionPage.tsx # Updated with new styling
│   │   ├── SettingsPage.tsx      # Updated with new styling
│   │   ├── AnalyticsPage.tsx     # Updated with new styling
│   │   └── LoginPage.tsx         # Updated with new styling
│   ├── main.tsx                  # Updated with theme provider
│   └── index.css                 # Global styles and CSS variables
└── .storybook/                   # Storybook configuration
    ├── main.ts
    ├── preview.ts
    └── theme.ts
```

## Migration Strategy

### Incremental Rollout

1. **Phase 1**: Implement design system without changing existing components
2. **Phase 2**: Update one page at a time, starting with Dashboard
3. **Phase 3**: Extract components as patterns emerge
4. **Phase 4**: Apply to remaining pages
5. **Phase 5**: Polish and refinement

### Backward Compatibility

- All changes are additive (no breaking changes to props)
- Existing components continue to work during migration
- Theme can be toggled on/off for testing

### Testing During Migration

- Visual regression tests run on every PR
- Manual testing checklist for each page
- Accessibility audit after each phase
- Performance monitoring (no degradation allowed)

## Performance Considerations

### Bundle Size

- Design system adds minimal overhead (~5KB gzipped)
- Component extraction may slightly increase bundle size
- Use code splitting to load components on demand

### Runtime Performance

- CSS-in-JS has minimal performance impact with Mantine
- Animations use CSS transforms (GPU accelerated)
- Avoid unnecessary re-renders with React.memo

### Loading Performance

- Theme loads synchronously (required for initial render)
- Components lazy load where appropriate
- Images and icons optimized for web

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile Safari: iOS 13+
- Chrome Mobile: Android 8+

## Accessibility Compliance

### WCAG 2.1 Level AA Requirements

- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Indicators**: Visible focus indicators on all interactive elements
- **Touch Targets**: Minimum 44x44 pixels for all touch targets

### Testing Tools

- axe DevTools for automated accessibility testing
- NVDA/JAWS for screen reader testing
- Keyboard-only navigation testing
- Color contrast analyzer

## Future Enhancements

### Dark Mode

- Implement dark color scheme
- Add theme toggle in settings
- Persist user preference
- Ensure all components support both themes

### Advanced Animations

- Page transition animations
- Micro-interactions on data changes
- Skeleton loading states
- Gesture-based interactions

### Design System Documentation

- Interactive component playground
- Design guidelines and best practices
- Code examples and usage patterns
- Accessibility guidelines

## Conclusion

This design provides a comprehensive approach to improving the UI/UX of the Monty financial tracker. By establishing a solid design system foundation and implementing changes incrementally, we can achieve a polished, consistent, and accessible user experience while maintaining the existing functionality and performance of the application.
