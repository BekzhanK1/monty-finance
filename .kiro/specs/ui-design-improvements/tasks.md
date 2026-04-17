# Implementation Plan: UI Design Improvements

## Overview

This implementation plan breaks down the UI/UX improvements for the Monty financial tracker into actionable coding tasks. The approach follows 11 phases that establish a design system foundation, extract reusable components, and systematically improve visual hierarchy, responsiveness, and user experience across all pages.

## Tasks

- [ ] 1. Design System Foundation
  - [x] 1.1 Create theme configuration structure
    - Create `src/theme/` directory
    - Create `src/theme/colors.ts` with semantic color definitions (income, expense, savings, budget status, UI colors)
    - Create `src/theme/typography.ts` with font families, sizes, weights, and line heights
    - Create `src/theme/spacing.ts` with spacing scale (xs to 3xl)
    - Create `src/theme/shadows.ts` with shadow definitions (xs to xl)
    - Create `src/theme/index.ts` that exports complete theme configuration including border radius system
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.4_

  - [x] 1.2 Configure Mantine theme provider
    - Update `src/main.tsx` to wrap application with MantineProvider using custom theme
    - Configure theme to extend Mantine's default theme with custom tokens
    - Add TypeScript types for theme tokens
    - Test that theme tokens are accessible throughout the application
    - _Requirements: 1.1, 1.3, 2.6, 3.1_

  - [ ]* 1.3 Create Storybook configuration for design system documentation
    - Install Storybook dependencies
    - Configure Storybook with Mantine theme
    - Create stories for color palette, typography scale, spacing system, and shadows
    - Document design token usage patterns
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1_

- [ ] 2. Component Extraction and Standardization
  - [x] 2.1 Create StatCard component
    - Create `src/components/StatCard.tsx` with props: label, value, color, subtitle, icon, onClick
    - Implement consistent styling using theme tokens
    - Support color variants: income (green), expense (red), savings (blue), neutral
    - Apply consistent card padding, border radius, and shadow
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 5.1, 5.2, 5.3_

  - [x] 2.2 Create BudgetCard component
    - Create `src/components/BudgetCard.tsx` with props: categoryId, categoryName, categoryIcon, spent, limit, group, onEdit, onClick
    - Implement progress bar with color coding (green < 50%, yellow 50-75%, red > 75%)
    - Support inline editing of budget limits
    - Handle savings categories (no limit display)
    - Apply consistent card styling and spacing
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 5.3, 7.1, 7.2_

  - [ ] 2.3 Create TransactionCard component
    - Create `src/components/TransactionCard.tsx` with props: transaction, category, onClick
    - Display category icon, name, date, amount, and optional comment
    - Apply semantic colors based on transaction type (income/expense/savings)
    - Implement consistent badge styling for amounts
    - Add edit and delete action buttons
    - _Requirements: 1.2, 1.5, 2.1, 2.2, 2.3, 5.4, 6.1_

  - [ ] 2.4 Create EmptyState component
    - Create `src/components/EmptyState.tsx` with props: icon, title, description, action
    - Center content vertically and horizontally
    - Use dimmed text color for empty state messages
    - Support optional action button
    - _Requirements: 5.5, 10.3, 10.4_

  - [ ]* 2.5 Write unit tests for extracted components
    - Test StatCard renders correctly with different color variants
    - Test BudgetCard calculates progress percentage correctly
    - Test TransactionCard displays transaction data correctly
    - Test EmptyState renders with and without action button
    - _Requirements: 2.1, 2.2, 2.3, 5.3_

- [ ] 3. Checkpoint - Verify component extraction
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Responsive Layout Improvements
  - [ ] 4.1 Implement responsive grid system for Dashboard
    - Update `DashboardPage.tsx` to use Mantine Grid with responsive breakpoints
    - Configure SimpleGrid to display 3 columns on desktop, 2 on tablet, 1 on mobile (< 400px)
    - Ensure stat cards adapt to single column layout on small screens
    - Test layout on screens from 320px to 768px width
    - _Requirements: 4.1, 4.2, 8.4_

  - [ ] 4.2 Implement responsive layout for Transactions page
    - Update `TransactionsPage.tsx` to prevent horizontal scrolling
    - Ensure transaction cards stack properly on mobile
    - Make search input and filters responsive
    - Adjust day navigation controls for mobile
    - _Requirements: 4.1, 4.4, 8.4_

  - [ ] 4.3 Implement responsive layout for Analytics page
    - Update `AnalyticsPage.tsx` to make charts responsive to container width
    - Configure ResponsiveContainer for all Recharts components
    - Ensure stat cards and budget limit cards adapt to mobile
    - Test chart readability on small screens
    - _Requirements: 4.1, 4.5, 8.4_

  - [ ] 4.4 Implement responsive layout for Settings page
    - Update `SettingsPage.tsx` to stack form fields on mobile
    - Ensure category cards display properly on small screens
    - Make modal forms responsive
    - _Requirements: 4.1, 4.4, 8.4_

  - [ ] 4.5 Implement responsive layout for Add Transaction page
    - Update `AddTransactionPage.tsx` to optimize numpad for mobile
    - Ensure category buttons wrap properly on small screens
    - Adjust button sizes for touch targets (minimum 44x44px)
    - _Requirements: 4.1, 4.3, 8.4_

  - [ ] 4.6 Fix bottom navigation overlap issues
    - Update `Layout.tsx` to ensure consistent bottom navigation height
    - Add proper padding-bottom to page containers (100px) to prevent content overlap
    - Position FAB above bottom navigation (bottom: 80px)
    - Test on various screen sizes
    - _Requirements: 8.1, 8.5_

  - [ ]* 4.7 Write responsive layout tests
    - Test Dashboard displays single column on mobile (< 400px)
    - Test Analytics charts are responsive
    - Test bottom navigation doesn't overlap content
    - Test touch targets meet 44x44px minimum
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Checkpoint - Verify responsive layouts
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Visual Hierarchy and Typography
  - [ ] 6.1 Apply consistent heading sizes across all pages
    - Update Dashboard to use consistent heading hierarchy (fw=700, size="lg" for main title)
    - Update Transactions page headings
    - Update Analytics page headings
    - Update Settings page headings
    - Update Add Transaction page headings (Title order={3})
    - _Requirements: 1.1, 3.1_

  - [ ] 6.2 Implement proper font weights for emphasis
    - Apply fw={400} for body text, fw={500} for emphasis, fw={600-700} for headings
    - Update all Text components to use consistent font weights
    - Ensure monetary amounts use fw={600} or fw={700}
    - _Requirements: 1.2, 3.1_

  - [ ] 6.3 Use monospace fonts for monetary amounts
    - Update formatNumber function to use monospace or tabular figures
    - Apply fontFamily: 'monospace' to all monetary amount displays
    - Ensure proper alignment of numbers in tables and lists
    - _Requirements: 3.3_

  - [ ] 6.4 Apply consistent line heights
    - Set lineHeight={1.4} for body text
    - Set lineHeight={1.2} for headings
    - Update all Text components with appropriate line heights
    - _Requirements: 3.4_

  - [ ]* 6.5 Write typography tests
    - Test headings use correct font sizes and weights
    - Test monetary amounts use monospace font
    - Test line heights are applied correctly
    - _Requirements: 1.1, 3.1, 3.3, 3.4_

- [ ] 7. Color System Implementation
  - [ ] 7.1 Apply semantic colors to Dashboard
    - Update income displays to use green color (c="green")
    - Update expense displays to use red color (c="red")
    - Update savings displays to use blue color (c="blue" or c="teal")
    - Apply budget status colors to progress bars (green/yellow/red based on percentage)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 7.2 Apply semantic colors to Transactions page
    - Update transaction badges to use semantic colors (green for income, red for expense, blue for savings)
    - Ensure category icons and names use consistent styling
    - Apply semantic colors to summary cards (income, expense, savings, balance)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 7.3 Apply semantic colors to Analytics page
    - Update all income data to display in green
    - Update all expense data to display in red/orange
    - Update all savings data to display in blue
    - Apply budget status colors to limit progress bars
    - Ensure chart colors match application color scheme
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.3_

  - [ ] 7.4 Apply semantic colors to Settings page
    - Update budget summary to use semantic colors
    - Apply consistent colors to category groups (BASE, COMFORT, SAVINGS, INCOME)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 7.5 Ensure consistent background colors for cards
    - Apply consistent card background (white or light gray)
    - Use withBorder prop consistently across all Card components
    - Apply consistent shadow depths (shadow="sm" for cards, shadow="xs" for nested cards)
    - _Requirements: 2.5, 5.1_

  - [ ]* 7.6 Write color system tests
    - Test income displays in green across all pages
    - Test expenses display in red across all pages
    - Test savings display in blue across all pages
    - Test budget status colors match usage percentage
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 8. Checkpoint - Verify color consistency
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Interactive Elements and Feedback
  - [ ] 9.1 Add hover states to all clickable elements
    - Ensure cursor changes to pointer on hover for all clickable cards
    - Add style={{ cursor: 'pointer' }} to clickable Card components
    - Add hover effects to buttons (already handled by Mantine)
    - _Requirements: 6.1_

  - [ ] 9.2 Implement loading states for all buttons
    - Add loading prop to all action buttons (Save, Delete, Export, Add)
    - Disable buttons during loading states
    - Show loading indicators (already handled by Mantine Button component)
    - _Requirements: 6.5_

  - [ ] 9.3 Add smooth transitions to interactive elements
    - Add transition: 'all 0.2s' to custom styled elements (category buttons, cards)
    - Ensure hover color transitions are smooth (200-300ms)
    - Apply consistent easing functions
    - _Requirements: 6.2, 12.1, 12.2, 12.3_

  - [ ] 9.4 Ensure consistent button sizes
    - Use size="xs" for secondary actions
    - Use size="sm" for tertiary actions
    - Use size="md" for primary actions (default)
    - Use size="lg" for prominent actions (Add Transaction, Submit)
    - Use size="xl" for numpad buttons
    - _Requirements: 6.3_

  - [ ]* 9.5 Write interaction tests
    - Test cursor changes to pointer on hover
    - Test buttons show loading state during actions
    - Test transitions are smooth
    - Test button sizes are consistent
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 10. Data Visualization Improvements
  - [ ] 10.1 Standardize progress bar styling
    - Apply size="sm" (8px) to standard progress bars
    - Apply size={4} to compact progress bars in budget cards
    - Add radius="xl" to all progress bars for rounded corners
    - _Requirements: 7.1, 7.2_

  - [ ] 10.2 Apply consistent colors to charts
    - Update Recharts Bar components to use theme colors (orange for expenses, green for income)
    - Ensure CartesianGrid uses theme border color
    - Apply consistent colors to all chart elements
    - _Requirements: 7.3_

  - [ ] 10.3 Ensure chart labels are readable
    - Configure XAxis with appropriate tick fontSize (9px for dense data)
    - Set interval for XAxis to prevent label overlap
    - Configure Tooltip with proper formatting
    - Adjust chart margins to prevent label cutoff
    - _Requirements: 7.4_

  - [ ] 10.4 Format percentages consistently
    - Use toFixed(0) for whole percentages in badges and summaries
    - Use toFixed(1) for precise percentages in goal progress
    - Ensure consistent decimal precision across all pages
    - _Requirements: 7.5_

  - [ ]* 10.5 Write data visualization tests
    - Test progress bars have consistent styling
    - Test charts use application color scheme
    - Test chart labels don't overlap
    - Test percentages format consistently
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 11. Forms and Input Design
  - [ ] 11.1 Standardize input field styling
    - Ensure consistent input heights across all forms
    - Apply consistent padding to TextInput, NumberInput, Select components
    - Use consistent label styles (size="sm", fw={500})
    - _Requirements: 9.1, 9.3_

  - [ ] 11.2 Format number inputs with thousand separators
    - Add thousandSeparator=" " to all NumberInput components
    - Add suffix=" ₸" to monetary inputs
    - Ensure formatNumber function uses Intl.NumberFormat with 'ru-RU' locale
    - _Requirements: 9.2_

  - [ ] 11.3 Implement clear focus indicators
    - Verify Mantine default focus indicators are visible
    - Test keyboard navigation through all forms
    - Ensure focus indicators meet accessibility standards
    - _Requirements: 9.4, 11.3_

  - [ ] 11.4 Style validation errors consistently
    - Ensure error messages display in red color below fields
    - Add error prop to form fields when validation fails
    - Display clear error messages
    - _Requirements: 9.5_

  - [ ]* 11.5 Write form input tests
    - Test input fields have consistent styling
    - Test number inputs format with thousand separators
    - Test focus indicators are visible
    - Test validation errors display correctly
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 12. Checkpoint - Verify forms and inputs
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Loading and Empty States
  - [ ] 13.1 Implement loading overlays for all pages
    - Verify LoadingOverlay component is used on all pages during data fetch
    - Ensure consistent loading overlay styling (visible prop based on loading state)
    - Add loading states to all async operations
    - _Requirements: 10.1, 10.2_

  - [ ] 13.2 Add empty state messages to all lists
    - Use EmptyState component for transaction lists when empty
    - Add empty state to Analytics page when no data available
    - Add empty state to Settings page category lists when empty
    - Use dimmed text color (c="dimmed") for empty state messages
    - _Requirements: 10.3, 10.4_

  - [ ] 13.3 Style error messages consistently
    - Display error messages in red color (c="red")
    - Add clear error explanations (e.g., delete category error in Settings)
    - Ensure error messages are visible and actionable
    - _Requirements: 10.5_

  - [ ]* 13.4 Write loading and empty state tests
    - Test loading overlays display during data fetch
    - Test empty states show appropriate messages
    - Test error messages display in red with clear text
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 14. Accessibility Improvements
  - [ ] 14.1 Verify color contrast ratios
    - Use browser DevTools or axe DevTools to check contrast ratios
    - Ensure all text meets minimum 4.5:1 contrast ratio
    - Ensure large text meets minimum 3:1 contrast ratio
    - Fix any contrast issues by adjusting colors
    - _Requirements: 11.1_

  - [ ] 14.2 Add aria-labels to icon-only buttons
    - Add aria-label to FAB (Add transaction button)
    - Add aria-label to day navigation buttons (Previous day, Next day)
    - Add aria-label to edit and delete action icons
    - Ensure all icon-only buttons have descriptive labels
    - _Requirements: 11.2_

  - [ ] 14.3 Ensure keyboard navigation works
    - Test tab navigation through all interactive elements
    - Verify focus order is logical
    - Ensure all buttons and inputs are keyboard accessible
    - Test form submission with Enter key
    - _Requirements: 11.3_

  - [ ] 14.4 Use semantic HTML elements
    - Verify proper use of heading hierarchy (h1, h2, h3)
    - Use semantic elements (nav, main, section, article) where appropriate
    - Ensure form elements use proper labels
    - _Requirements: 11.4_

  - [ ] 14.5 Ensure focus indicators are visible
    - Test focus indicators on all interactive elements
    - Verify focus indicators meet visibility standards
    - Ensure focus indicators work with keyboard navigation
    - _Requirements: 11.5_

  - [ ]* 14.6 Write accessibility tests
    - Run axe DevTools on all pages to check for violations
    - Test with keyboard-only navigation
    - Verify aria-labels are present on icon buttons
    - Test color contrast ratios
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 15. Animation and Transitions
  - [ ] 15.1 Add page transition animations
    - Configure React Router with smooth transitions (200-300ms duration)
    - Use consistent easing functions for all transitions
    - Test transitions between all pages
    - _Requirements: 12.1, 12.2_

  - [ ] 15.2 Implement hover transitions on interactive elements
    - Add smooth color transitions to buttons (already handled by Mantine)
    - Add smooth transitions to custom styled elements (category buttons)
    - Ensure transitions use consistent duration (200-300ms)
    - _Requirements: 12.3_

  - [ ] 15.3 Respect prefers-reduced-motion setting
    - Add CSS media query to disable decorative animations when prefers-reduced-motion is set
    - Test with reduced motion preference enabled
    - Ensure critical animations (loading indicators) still work
    - _Requirements: 12.5_

  - [ ] 15.4 Ensure animations don't exceed 500ms
    - Audit all animations and transitions
    - Reduce any animations longer than 500ms
    - Ensure animations feel responsive and not sluggish
    - _Requirements: 12.4_

  - [ ]* 15.5 Write animation tests
    - Test page transitions are smooth
    - Test hover effects have smooth transitions
    - Test animations respect user preferences
    - Test no animations exceed 500ms
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 16. Final Integration and Polish
  - [ ] 16.1 Update all pages to use extracted components
    - Replace inline stat displays with StatCard component on Dashboard
    - Replace inline budget cards with BudgetCard component on Dashboard
    - Replace inline transaction items with TransactionCard component on Transactions page
    - Use EmptyState component for all empty lists
    - _Requirements: 1.2, 5.3, 5.5_

  - [ ] 16.2 Apply consistent spacing throughout application
    - Use theme spacing tokens (xs, sm, md, lg, xl) consistently
    - Ensure consistent gap between Stack and Group components
    - Apply consistent padding to Container components (p="md", pb={100})
    - _Requirements: 1.4, 8.4_

  - [ ] 16.3 Apply consistent border radius throughout application
    - Use radius="md" for cards (8px)
    - Use radius="lg" for buttons (12px)
    - Use radius="xl" for progress bars and circular elements
    - _Requirements: 1.3, 5.2_

  - [ ] 16.4 Ensure consistent shadow usage
    - Use shadow="sm" for standard cards
    - Use shadow="xs" for nested or subtle cards
    - Use shadow="md" for elevated elements (modals, dropdowns)
    - _Requirements: 5.1_

  - [ ]* 16.5 Write integration tests
    - Test complete user flow from Dashboard to Add Transaction
    - Test navigation between all pages
    - Test responsive behavior across all pages
    - Test accessibility across all pages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 8.1, 11.1_

- [ ] 17. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The implementation uses TypeScript and React with Mantine UI components
- All styling leverages Mantine's theming system for consistency
- Focus on mobile-first responsive design (320px to 768px)
- Maintain existing functionality while improving UI/UX
