import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Box, Group, Text, UnstyledButton } from '@mantine/core';

interface SnackOptions {
  action?: { label: string; onClick: () => void };
  /** ms; default 3500 */
  duration?: number;
}

interface Snack extends SnackOptions {
  id: number;
  message: string;
}

const SnackbarContext = createContext<((message: string, options?: SnackOptions) => void) | null>(null);

/** One transient message at a time, above the tab bar. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const timer = useRef<number | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string, options: SnackOptions = {}) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    const id = ++nextId.current;
    setSnack({ id, message, ...options });
    timer.current = window.setTimeout(() => setSnack(s => (s?.id === id ? null : s)), options.duration ?? 3500);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {snack && (
        <Box
          key={snack.id}
          role="status"
          aria-live="polite"
          className="animate-slide-up"
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 'calc(var(--monty-tabbar-h) + var(--monty-safe-bottom) + 12px)',
            zIndex: 400,
            maxWidth: 520,
            margin: '0 auto',
            padding: '12px 16px',
            borderRadius: 14,
            background: 'color-mix(in srgb, var(--monty-text) 88%, var(--monty-bg))',
            color: 'var(--monty-bg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Text size="sm" fw={500} style={{ color: 'inherit' }}>{snack.message}</Text>
            {snack.action && (
              <UnstyledButton
                onClick={() => {
                  snack.action?.onClick();
                  setSnack(null);
                }}
                style={{ color: 'var(--monty-accent)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', filter: 'brightness(1.3)' }}
              >
                {snack.action.label}
              </UnstyledButton>
            )}
          </Group>
        </Box>
      )}
    </SnackbarContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbar() {
  const show = useContext(SnackbarContext);
  if (!show) throw new Error('useSnackbar must be used inside <SnackbarProvider>');
  return show;
}
