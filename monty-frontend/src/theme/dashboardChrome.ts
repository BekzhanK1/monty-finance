import type { CSSProperties } from 'react';
import type { ModalProps } from '@mantine/core';

/** Shared page chrome on top of the design tokens in `tokens.css` (Telegram theme aware). */
/** Bottom tab bar + iPhone home indicator. Use as Container `pb`. */
export const PAGE_WITH_BOTTOM_NAV_PB = 'var(--monty-page-pb)';
export const pageStackPb = PAGE_WITH_BOTTOM_NAV_PB;

export const TAP_MIN = 44;


/** Hero card: accent-tinted surface. */
export function heroVioletShell(): CSSProperties {
  return {
    background: 'color-mix(in srgb, var(--monty-accent) 10%, var(--monty-surface))',
    border: 'none',
  };
}

/** Section card on the page background. */
export function glassSectionShell(): CSSProperties {
  return {
    background: 'var(--monty-surface)',
    border: 'none',
  };
}

/** Row inside a section card. */
export function insetRowShell(): CSSProperties {
  return {
    background: 'var(--monty-surface-2)',
    border: 'none',
  };
}

export const gradientButton = {
  size: 'lg' as const,
  radius: 'md' as const,
  variant: 'filled' as const,
};

export const modalShell = {
  centered: true as const,
  radius: 'xl' as const,
  size: 'md' as const,
};

/** Safe-area + scroll on small screens (Telegram Mini App, narrow phones). */
const modalSafeAreaStyles: ModalProps['styles'] = {
  header: {
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + var(--mantine-spacing-sm))',
  },
  body: {
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--mantine-spacing-md))',
  },
};

/** Default modals: fullscreen on narrow viewports so content is not clipped. */
export function modalShellResponsive(isNarrow: boolean): Partial<ModalProps> {
  if (!isNarrow) return modalShell;
  return {
    centered: false,
    fullScreen: true,
    size: '100%',
    radius: 0,
    padding: 'md',
    styles: modalSafeAreaStyles,
  };
}
