import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, ColorSchemeScript, localStorageColorSchemeManager } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import './index.css';
import './styles/animations.css';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { queryClient } from './lib/queryClient';
import { VoiceProvider } from './features/voice/VoiceContext';

const colorSchemeKey = 'mantine-color-scheme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorSchemeScript defaultColorScheme="light" localStorageKey={colorSchemeKey} />
    <MantineProvider
      defaultColorScheme="light"
      colorSchemeManager={localStorageColorSchemeManager({ key: colorSchemeKey })}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <VoiceProvider>
              <App />
            </VoiceProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
