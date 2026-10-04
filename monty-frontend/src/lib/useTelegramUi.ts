import { useEffect, useRef, useState } from 'react';
import { getWebApp, supports } from './telegram';

/** Telegram's light/dark scheme, live; `undefined` outside Telegram (Mantine then follows the OS). */
export function useTelegramColorScheme(): 'light' | 'dark' | undefined {
  const [scheme, setScheme] = useState(() => getWebApp()?.colorScheme);
  useEffect(() => {
    const webApp = getWebApp();
    if (!webApp) return;
    const update = () => setScheme(webApp.colorScheme);
    webApp.onEvent('themeChanged', update);
    return () => webApp.offEvent('themeChanged', update);
  }, []);
  return scheme;
}

/**
 * Show Telegram's native back button while mounted; `null` hides it.
 * Returns whether the native button is in use, so screens can skip their own.
 */
export function useTelegramBackButton(onBack: (() => void) | null): boolean {
  const handlerRef = useRef(onBack);
  useEffect(() => {
    handlerRef.current = onBack;
  }, [onBack]);
  const enabled = onBack !== null;
  const available = getWebApp() !== null && supports('6.1');

  useEffect(() => {
    const webApp = getWebApp();
    if (!webApp || !supports('6.1') || !enabled) return;
    const click = () => handlerRef.current?.();
    webApp.BackButton.onClick(click);
    webApp.BackButton.show();
    return () => {
      webApp.BackButton.offClick(click);
      webApp.BackButton.hide();
    };
  }, [enabled]);

  return available && enabled;
}
