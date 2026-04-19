import type { CSSProperties } from 'react';
import type { MantineColorScheme } from '@mantine/core';

/** Match [`DashboardPage`](../pages/DashboardPage.tsx): glass cards, violet hero, spacing. */
export const PAGE_WITH_BOTTOM_NAV_PB = 100;

function isDarkScheme(colorScheme: MantineColorScheme): boolean {
  if (colorScheme === 'dark') return true;
  if (colorScheme === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function heroVioletShell(colorScheme: MantineColorScheme): CSSProperties {
  const dark = isDarkScheme(colorScheme);
  return {
    background:
      dark
        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
    backdropFilter: 'blur(10px)',
    border:
      dark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
  };
}

export function glassSectionShell(colorScheme: MantineColorScheme): CSSProperties {
  const dark = isDarkScheme(colorScheme);
  return {
    background: dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
  };
}

/** Inner rows (same idea as `BudgetCard` non-savings). */
export function insetRowShell(colorScheme: MantineColorScheme): CSSProperties {
  const dark = isDarkScheme(colorScheme);
  return {
    background: dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)',
  };
}

export const gradientButton = {
  size: 'lg' as const,
  radius: 'xl' as const,
  variant: 'gradient' as const,
  gradient: { from: 'blue', to: 'violet', deg: 135 },
};

export const modalShell = {
  centered: true as const,
  radius: 'xl' as const,
  size: 'md' as const,
};
