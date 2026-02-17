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
    console.log('[useTelegram] window.Telegram exists:', !!window.Telegram);
    console.log('[useTelegram] window.Telegram.WebApp exists:', !!window.Telegram?.WebApp);
    
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      console.log('[useTelegram] initData length:', tg.initData.length);
      console.log('[useTelegram] initData (first 100 chars):', tg.initData.substring(0, 100));
      console.log('[useTelegram] initDataUnsafe.user:', tg.initDataUnsafe.user);
      
      setInitData(tg.initData);
      setUser(tg.initDataUnsafe.user || null);
      setIsReady(true);
    } else {
      console.warn('[useTelegram] Telegram WebApp not available!');
      setIsReady(true);
    }
  }, []);

  const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  };

  return { initData, user, isReady, haptic };
}
