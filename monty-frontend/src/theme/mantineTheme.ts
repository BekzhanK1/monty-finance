import { createTheme } from '@mantine/core';

/** Stock Mantine components tuned to the Monty tokens (see tokens.css). */
export const mantineTheme = createTheme({
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  headings: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    fontWeight: '700',
  },
  primaryColor: 'violet',
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Card: {
      defaultProps: { radius: 'lg', padding: 'md', withBorder: false, shadow: 'none' },
      styles: { root: { backgroundColor: 'var(--monty-surface)' } },
    },
    Button: { defaultProps: { radius: 'md' } },
    Drawer: {
      styles: {
        content: { backgroundColor: 'var(--monty-surface)' },
        header: { backgroundColor: 'var(--monty-surface)' },
      },
    },
    Modal: { defaultProps: { radius: 'lg' } },
    TextInput: { defaultProps: { radius: 'md' } },
    NumberInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
    SegmentedControl: {
      defaultProps: { radius: 'md' },
      styles: {
        root: { background: 'var(--monty-segment-track)' },
        indicator: { background: 'var(--monty-segment-indicator)' },
      },
    },
  },
});
