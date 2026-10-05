'use client';

import React from 'react';
import Navbar from '../../../components/Navbar';
import StudentDashboard from '../../../components/StudentDashboard';
import { useAppStore } from '../../../lib/store';
import { useRequireRole } from '../../../lib/useRequireRole';
import { Loader2 } from 'lucide-react';

export default function StudentDashboardPage() {
  const { dir } = useAppStore();
  const { ready } = useRequireRole(['STUDENT', 'ADMIN']);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <StudentDashboard />
      </main>
    </div>
  );
}
