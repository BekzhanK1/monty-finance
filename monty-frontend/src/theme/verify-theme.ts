// Verification script to test theme token accessibility
import { theme } from './index';

/**
 * Verifies that all theme tokens are accessible and properly typed
 * This script can be imported and run to validate theme configuration
 */
export function verifyThemeTokens(): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verify colors
  if (!theme.colors.income.main) errors.push('Missing income.main color');
  if (!theme.colors.expense.main) errors.push('Missing expense.main color');
  if (!theme.colors.savings.main) errors.push('Missing savings.main color');
  if (!theme.colors.budgetStatus.safe) errors.push('Missing budgetStatus.safe color');
  if (!theme.colors.background.primary) errors.push('Missing background.primary color');
  if (!theme.colors.text.primary) errors.push('Missing text.primary color');

  // Verify typography
  if (!theme.typography.fontFamily.body) errors.push('Missing fontFamily.body');
  if (!theme.typography.fontSize.md) errors.push('Missing fontSize.md');
  if (!theme.typography.fontWeight.normal) errors.push('Missing fontWeight.normal');
  if (!theme.typography.lineHeight.normal) errors.push('Missing lineHeight.normal');

  // Verify spacing
  if (!theme.spacing.xs) errors.push('Missing spacing.xs');
  if (!theme.spacing.md) errors.push('Missing spacing.md');
  if (!theme.spacing.xl) errors.push('Missing spacing.xl');

  // Verify shadows
  if (!theme.shadows.sm) errors.push('Missing shadows.sm');
  if (!theme.shadows.md) errors.push('Missing shadows.md');

  // Verify border radius
  if (!theme.borderRadius.sm) errors.push('Missing borderRadius.sm');
  if (!theme.borderRadius.md) errors.push('Missing borderRadius.md');

  return {
    success: errors.length === 0,
    errors,
  };
}

// Run verification and log results
if (import.meta.env.DEV) {
  const result = verifyThemeTokens();
  if (result.success) {
    console.log('✅ Theme tokens verified successfully');
    console.log('Available theme tokens:', {
      colors: Object.keys(theme.colors),
      typography: Object.keys(theme.typography),
      spacing: Object.keys(theme.spacing),
      shadows: Object.keys(theme.shadows),
      borderRadius: Object.keys(theme.borderRadius),
    });
  } else {
    console.error('❌ Theme verification failed:', result.errors);
  }
}
