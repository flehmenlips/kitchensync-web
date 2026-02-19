import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (auth, permission, not found)
        const status = error?.status || error?.code;
        if (status === 401 || status === 403 || status === 404) return false;
        // Retry up to 2 times on other errors
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't keep errored queries in cache for long
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
