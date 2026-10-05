'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import { LogoMark } from '../components/brand/Logo';
import { useAppStore } from '../lib/store';
import { useSiteName, useHomeContent } from '../lib/configStore';
import { fetchApi } from '../lib/api';
import {
  Heart,
  ArrowRight,
  GraduationCap,
  Route,
  Award,
  BookOpen,
  Briefcase,
  ChevronRight,
} from 'lucide-react';

interface SubjectChip {
  id: string;
  nameEn: string;
  nameAr: string;
}

const STEP_ICONS = [
  { icon: Route, color: 'from-indigo-500/20 to-violet-500/10 text-indigo-300 border-indigo-500/30' },
  { icon: GraduationCap, color: 'from-violet-500/20 to-fuchsia-500/10 text-violet-300 border-violet-500/30' },
  { icon: Award, color: 'from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/30' },
];

/**
 * Home = marketing landing with a CTA into the catalog.
 * Dashboards and the player live on their own routes
 * (/student/dashboard, /teacher/dashboard, /admin/dashboard, /courses/[id]).
 */
export default function Page() {
  const { dir, lang, user } = useAppStore();
  const siteName = useSiteName();
  const homeContent = useHomeContent();
  const tt = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  const [subjects, setSubjects] = useState<SubjectChip[]>([]);

  // Real platform subjects make the landing page feel alive and relevant.
  useEffect(() => {
    let cancelled = false;
    fetchApi('/subjects')
      .then((res) => {
        if (!cancelled) setSubjects((res.data ?? []).slice(0, 8));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const audienceTags =
    lang === 'ar'
      ? homeContent.footer.audienceTagsAr
      : homeContent.footer.audienceTagsEn;

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        <Hero />

        {/* ── Subjects strip (live platform data) ─────────────── */}
        {subjects.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-4">
            <div className="glass-panel rounded-3xl border border-slate-800 p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  {lang === 'ar' ? homeContent.subjectsSection.titleAr : homeContent.subjectsSection.titleEn}
                </h2>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
                >
                  {lang === 'ar' ? homeContent.subjectsSection.viewAllAr : homeContent.subjectsSection.viewAllEn}
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Link>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    href="/courses"
                    className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all"
                  >
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {lang === 'ar' ? s.nameAr : s.nameEn}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── How it works ─────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="inline-block text-[11px] font-extrabold tracking-widest uppercase text-emerald-400">
              {lang === 'ar' ? homeContent.howItWorks.tagAr : homeContent.howItWorks.tagEn}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {lang === 'ar' ? homeContent.howItWorks.titleAr : homeContent.howItWorks.titleEn}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {homeContent.howItWorks.steps.map((s, idx) => {
              const style = STEP_ICONS[idx % STEP_ICONS.length];
              const Icon = style.icon;
              const stepTitle = lang === 'ar' ? s.titleAr : s.titleEn;
              const stepBody = lang === 'ar' ? s.bodyAr : s.bodyEn;

              return (
                <div
                  key={`${s.step}-${idx}`}
                  className="relative glass-panel rounded-3xl p-7 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span className="absolute top-5 right-6 rtl:right-auto rtl:left-6 text-5xl font-black text-slate-800/80 select-none">
                    {s.step || String(idx + 1)}
                  </span>
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${style.color} border flex items-center justify-center mb-5`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{stepTitle}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{stepBody}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Teacher recruitment banner ───────────────────────── */}
        {(!user || user.role === 'STUDENT') && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-emerald-500/40">
              <div className="rounded-3xl bg-slate-950/95 px-8 py-10 sm:px-12 flex flex-wrap items-center justify-between gap-6">
                <div className="max-w-xl space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                    {lang === 'ar' ? homeContent.teacherBanner.titleAr : homeContent.teacherBanner.titleEn}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {lang === 'ar' ? homeContent.teacherBanner.bodyAr : homeContent.teacherBanner.bodyEn}
                  </p>
                </div>
                <Link
                  href="/register"
                  className="glass-button shrink-0 px-7 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>
                    {lang === 'ar' ? homeContent.teacherBanner.ctaAr : homeContent.teacherBanner.ctaEn}
                  </span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <LogoMark size={38} />
                <span className="font-extrabold tracking-tight text-white">{siteName}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                {lang === 'ar' ? homeContent.footer.brandDescriptionAr : homeContent.footer.brandDescriptionEn}
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                {tt('Platform', 'المنصة')}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: '/courses', label: tt('Course Catalog', 'كتالوج الدورات'), icon: BookOpen },
                  { href: '/student/dashboard', label: tt('Student Hub', 'لوحة الطالب'), icon: GraduationCap },
                  { href: '/register', label: tt('Become a Teacher', 'انضم كمعلم'), icon: Briefcase },
                ].map((l) => {
                  const Icon = l.icon;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-300 transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-600" />
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Audience note */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                {lang === 'ar' ? homeContent.footer.audienceTitleAr : homeContent.footer.audienceTitleEn}
              </h4>
              <div className="flex flex-wrap gap-2">
                {audienceTags.map((tag, tIdx) => (
                  <span
                    key={`${tag}-${tIdx}`}
                    className={`text-[11px] px-3 py-1.5 rounded-lg border font-semibold ${
                      tIdx === 0
                        ? 'font-bold bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-600 flex items-center gap-1">
              {tt('Designed with', 'صُمم بـ')}
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <span>
                {lang === 'ar' ? homeContent.footer.designedWithTextAr : homeContent.footer.designedWithTextEn}
              </span>
            </p>
            <p className="text-xs text-slate-600">© 2026 {siteName}. {tt('All rights reserved.', 'جميع الحقوق محفوظة.')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
