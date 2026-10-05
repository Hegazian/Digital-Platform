'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, dashboardPathFor } from '@/lib/store';

/**
 * Route-level role guard with a stable loading state.
 *
 * Returns `ready` only once the persisted session has hydrated and the role
 * check has settled, so pages render a spinner instead of flashing blank
 * content before redirecting.
 */
export function useRequireRole(
  allowedRoles: string[]
): { ready: boolean } {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  // zustand/persist hydrates asynchronously on the client
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return () => unsub();
  }, []);

  const allowed = !!user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!allowed) {
      // Wrong role, not unauthenticated: land users on their own dashboard
      // instead of dumping them back on the marketing page.
      router.replace(dashboardPathFor(user.role));
    }
  }, [hydrated, user, allowed, router]);

  return { ready: hydrated && allowed };
}
