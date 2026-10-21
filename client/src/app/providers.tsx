'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useConfigBootstrap } from '@/lib/configStore';
import { SESSION_EXPIRED_EVENT } from '@/lib/api';
import { useAppStore } from '@/lib/store';

function ConfigBootstrapper({ children }: { children: React.ReactNode }) {
  useConfigBootstrap();
  const lang = useAppStore((state) => state.lang);
  useLayoutEffect(() => { void useAppStore.persist.rehydrate(); }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
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
