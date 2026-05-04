import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

export function useTelegram() {
  const [initData, setInitData] = useState<string>('');
  const [user, setUser] = useState<{ id: number; first_name: string } | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      setInitData(tg.initData);
      setUser(tg.initDataUnsafe.user || null);
      setIsReady(true);
    } else {
      setIsReady(true);
    }
  }, []);

  const haptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') => {
    const feedback = window.Telegram?.WebApp?.HapticFeedback;
    if (!feedback) return;
    if (style === 'success' || style === 'error' || style === 'warning') {
      feedback.notificationOccurred?.(style);
    } else {
      feedback.impactOccurred(style);
    }
  };

  return { initData, user, isReady, haptic };
}
