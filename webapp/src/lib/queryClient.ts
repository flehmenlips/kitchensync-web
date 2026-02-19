import { QueryClient } from '@tanstack/react-query';

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === 'AbortError' ||
    (error as any)?.name === 'AbortError' ||
    (error as any)?.message?.includes('aborted')
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // AbortErrors are transient (Supabase session refresh race) — always retry
        if (isAbortError(error)) return failureCount < 3;
        // Don't retry on 4xx errors (auth, permission, not found)
        const status = error?.status || error?.code;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex, error) => {
        // Longer backoff for AbortErrors to let the session stabilize
        if (isAbortError(error)) return Math.min(1000 * (attemptIndex + 1), 3000);
        return Math.min(1000 * 2 ** attemptIndex, 5000);
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60 * 1000,
    },
  },
});
