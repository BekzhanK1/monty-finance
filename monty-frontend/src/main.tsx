import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import './theme/tokens.css';
import './index.css';
import './styles/animations.css';
import App from './App';
import { AppProviders } from './AppProviders';
import { initTelegram } from './lib/telegram';

initTelegram();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
