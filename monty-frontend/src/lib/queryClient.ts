import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Telegram WebView fires focus events on every app switch; refetch only on mount/invalidate.
      refetchOnWindowFocus: false,
    },
  },
});
