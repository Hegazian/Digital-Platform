'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useConfigBootstrap } from '@/lib/configStore';
import { SESSION_EXPIRED_EVENT } from '@/lib/api';

function ConfigBootstrapper({ children }: { children: React.ReactNode }) {
  useConfigBootstrap();
  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // When a session dies mid-flight, purge every user-scoped cache entry.
  // Query keys are not user-scoped, so stale entries from the previous
  // identity would otherwise be served to whoever logs in next.
  useEffect(() => {
    const onSessionExpired = () => queryClient.clear();
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigBootstrapper>{children}</ConfigBootstrapper>
    </QueryClientProvider>
  );
}
