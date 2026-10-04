import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { queryClient } from './lib/queryClient';
import { useTelegramColorScheme } from './lib/useTelegramUi';
import { VoiceProvider } from './features/voice/VoiceContext';
import { mantineTheme } from './theme/mantineTheme';
import { SnackbarProvider } from './ui/Snackbar';

// No in-app theme toggle any more: Telegram's scheme inside Telegram, the OS scheme elsewhere.
const colorSchemeManager = localStorageColorSchemeManager({ key: 'monty-color-scheme' });

export function AppProviders({ children }: { children: ReactNode }) {
  const telegramScheme = useTelegramColorScheme();
  return (
    <MantineProvider
      theme={mantineTheme}
      defaultColorScheme="auto"
      forceColorScheme={telegramScheme}
      colorSchemeManager={colorSchemeManager}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <SnackbarProvider>
              <VoiceProvider>
                {children}
              </VoiceProvider>
            </SnackbarProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}
