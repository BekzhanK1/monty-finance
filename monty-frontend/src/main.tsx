import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, ColorSchemeScript, localStorageColorSchemeManager } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import '@mantine/core/styles.css';
import App from './App';
import { AuthProvider } from './hooks/useAuth';

const colorSchemeKey = 'mantine-color-scheme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorSchemeScript defaultColorScheme="light" localStorageKey={colorSchemeKey} />
    <MantineProvider
      defaultColorScheme="light"
      colorSchemeManager={localStorageColorSchemeManager({ key: colorSchemeKey })}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
