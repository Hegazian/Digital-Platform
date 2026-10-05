'use client';

import React from 'react';
import Navbar from '../../components/Navbar';
import AuthModal from '../../components/AuthModal';
import { useAppStore } from '../../lib/store';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const { dir } = useAppStore();
  const router = useRouter();

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12">
        <AuthModal onClose={() => router.push('/')} />
      </main>
    </div>
  );
}
