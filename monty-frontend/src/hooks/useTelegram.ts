import { useState } from 'react';
import { getWebApp, haptic } from '../lib/telegram';

export function useTelegram() {
  const [webApp] = useState(getWebApp);
  return {
    initData: webApp?.initData ?? '',
    user: webApp?.initDataUnsafe.user ?? null,
    isTelegram: webApp !== null,
    haptic,
  };
}
