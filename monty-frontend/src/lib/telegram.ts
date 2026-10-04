/** Thin, optional wrapper over Telegram.WebApp — every call is a no-op outside Telegram. */

type EventType = 'themeChanged' | 'backButtonClicked' | 'mainButtonClicked' | 'viewportChanged';

interface TelegramBottomButton {
  text: string;
  isVisible: boolean;
  isActive: boolean;
  setParams: (params: { text?: string; is_active?: boolean; is_visible?: boolean; color?: string; text_color?: string }) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string };
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string | undefined>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  onEvent: (event: EventType, handler: () => void) => void;
  offEvent: (event: EventType, handler: () => void) => void;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: TelegramBottomButton;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged?: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

/** The WebApp object only when actually running inside Telegram (the script also loads in a browser). */
export function getWebApp(): TelegramWebApp | null {
  const webApp = window.Telegram?.WebApp;
  return webApp && webApp.initData ? webApp : null;
}

export function supports(version: string): boolean {
  const webApp = getWebApp();
  return !!webApp?.isVersionAtLeast?.(version);
}

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection';

export function haptic(style: HapticStyle = 'light') {
  const feedback = getWebApp()?.HapticFeedback;
  if (!feedback) return;
  if (style === 'selection') {
    feedback.selectionChanged?.();
  } else if (style === 'success' || style === 'error' || style === 'warning') {
    feedback.notificationOccurred?.(style);
  } else {
    feedback.impactOccurred(style);
  }
}

/** Call once at startup: tell Telegram we're ready and paint its chrome with our background. */
export function initTelegram() {
  const webApp = getWebApp();
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
  if (supports('7.7')) webApp.disableVerticalSwipes?.();
  if (supports('6.1')) {
    webApp.setHeaderColor?.('secondary_bg_color');
    webApp.setBackgroundColor?.('secondary_bg_color');
  }
  if (supports('7.10')) webApp.setBottomBarColor?.('secondary_bg_color');
}
