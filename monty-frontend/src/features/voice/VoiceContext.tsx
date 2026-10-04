import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { VoiceSheet } from './VoiceSheet';

interface OpenVoiceOptions {
  autoStart?: boolean;
  onSaved?: (count: number) => void;
}

const VoiceContext = createContext<((options?: OpenVoiceOptions) => void) | null>(null);

/** One voice sheet for the whole app; screens open it via `useVoiceInput()`. */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  // Mount lazily: the sheet fetches categories, which needs an authenticated user.
  const [mounted, setMounted] = useState(false);
  const [options, setOptions] = useState<OpenVoiceOptions>({});

  const open = useCallback((next: OpenVoiceOptions = {}) => {
    setOptions(next);
    setMounted(true);
    setOpened(true);
  }, []);

  const value = useMemo(() => open, [open]);

  return (
    <VoiceContext.Provider value={value}>
      {children}
      {mounted && (
        <VoiceSheet
          opened={opened}
          autoStart={options.autoStart}
          onSaved={options.onSaved}
          onClose={() => setOpened(false)}
        />
      )}
    </VoiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVoiceInput() {
  const open = useContext(VoiceContext);
  if (!open) throw new Error('useVoiceInput must be used inside <VoiceProvider>');
  return open;
}
