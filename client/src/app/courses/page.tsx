'use client';

import React, { Suspense } from 'react';
import Navbar from '../../components/Navbar';
import CourseCatalog from '../../components/CourseCatalog';
import { useAppStore } from '../../lib/store';

export default function CoursesPage() {
  const { dir, lang } = useAppStore();
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 relative">
        {/* Ambient background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-72 w-[46rem] max-w-full rounded-full bg-indigo-600/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-64 -left-24 h-56 w-56 rounded-full bg-emerald-600/10 blur-3xl"
        />

        {/* Page header */}
        <header className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-[11px] font-bold tracking-wide uppercase text-indigo-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {t('Thanaweya Amma · Scientific Math', 'ثانوية عامة · علمي رياضة')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">Course Catalog</span>
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
            {t(
              'Every course you need for the Scientific Math track — mapped to Engineering & Computer faculties admission.',
              'كل دورات علمي رياضة التي تحتاجها — موجهة للقبول بكليات الهندسة والحاسبات.'
            )}
          </p>
        </header>

        {/* Catalog body */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <Suspense
            fallback={
              <div className="flex justify-center py-20 text-slate-500">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500" />
              </div>
            }
          >
            <CourseCatalog />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
