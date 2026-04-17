// Main theme configuration that exports complete theme
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

// Border radius system
export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// Complete theme configuration
export const theme = {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
};

// Export individual modules for direct access
export { colors, typography, spacing, shadows };

// Export TypeScript types
export type * from './types';
