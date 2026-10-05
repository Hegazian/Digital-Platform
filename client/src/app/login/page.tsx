'use client';

import React, { useEffect } from 'react';
import Navbar from '../../components/Navbar';
import AuthModal from '../../components/AuthModal';
import { useAppStore, dashboardPathFor } from '../../lib/store';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { dir, user } = useAppStore();
  const router = useRouter();

  // Already signed in? Skip the form entirely and land on the role dashboard.
  useEffect(() => {
    if (user) router.replace(dashboardPathFor(user.role));
  }, [user, router]);

  // After a successful login AuthModal itself navigates to the role
  // dashboard; closing without signing in returns to the landing page.
  const handleClose = () => {
    if (!useAppStore.getState().user) router.push('/');
  };

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12">
        {!user && <AuthModal onClose={handleClose} />}
      </main>
    </div>
  );
}
