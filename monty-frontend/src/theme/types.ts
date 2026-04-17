// TypeScript types for custom theme tokens
import { theme } from './index';

// Export types for theme tokens
export type CustomTheme = typeof theme;

export type ThemeColors = typeof theme.colors;
export type ThemeTypography = typeof theme.typography;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeShadows = typeof theme.shadows;
export type ThemeBorderRadius = typeof theme.borderRadius;

// Helper types for accessing nested properties
export type IncomeColors = typeof theme.colors.income;
export type ExpenseColors = typeof theme.colors.expense;
export type SavingsColors = typeof theme.colors.savings;
export type BudgetStatusColors = typeof theme.colors.budgetStatus;
export type BackgroundColors = typeof theme.colors.background;
export type TextColors = typeof theme.colors.text;

export type FontFamily = typeof theme.typography.fontFamily;
export type FontSize = typeof theme.typography.fontSize;
export type FontWeight = typeof theme.typography.fontWeight;
export type LineHeight = typeof theme.typography.lineHeight;

// Utility type to get keys of theme sections
export type SpacingKey = keyof typeof theme.spacing;
export type ShadowKey = keyof typeof theme.shadows;
export type BorderRadiusKey = keyof typeof theme.borderRadius;
export type FontSizeKey = keyof typeof theme.typography.fontSize;
export type FontWeightKey = keyof typeof theme.typography.fontWeight;
