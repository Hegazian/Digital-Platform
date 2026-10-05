'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '../lib/store';
import { useSiteSlogan, useSiteDescription } from '../lib/configStore';
import {
  Sparkles,
  Play,
  ShieldCheck,
  Zap,
  Award,
  CheckCircle2,
  ArrowRight,
  Cpu,
  Code2,
  Sigma,
  Atom,
} from 'lucide-react';

// The platform serves one audience: Egyptian Thanaweya Amma — Scientific
// Math track, aiming for Engineering and Computer/Programming faculties.
const CAREER_PATHS = [
  { icon: Cpu, label: 'كلية الهندسة', sub: 'Engineering', color: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10' },
  { icon: Code2, label: 'حاسبات وذكاء اصطناعي', sub: 'Computer & AI', color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  { icon: Sigma, label: 'رياضيات', sub: 'Advanced Math', color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' },
  { icon: Atom, label: 'فيزياء', sub: 'Physics', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
];

export default function Hero() {
  const { lang, user } = useAppStore();
  const slogan = useSiteSlogan();
  const siteDescription = useSiteDescription();
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Aspirational badge row */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {CAREER_PATHS.map(({ icon: Icon, label, sub, color }) => (
            <span
              key={sub}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${color}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{sub}</span>
              <span className="hidden md:inline text-[10px] font-semibold opacity-60">{sub}</span>
            </span>
          ))}
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          {t(
            'Thanaweya Amma. Scientific Math.',
            'ثانوية عامة. علمي رياضة.'
          )}
          <span className="block text-gradient mt-2">
            {t("Tomorrow's Engineers & Developers.", 'مهندسو ومبرمجو الغد.')}
          </span>
        </h1>

        {/* Configured slogan (admin-editable) or curriculum fallback */}
        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          {slogan ||
            siteDescription ||
            t(
              'Master Math, Physics & Programming — your direct path to Engineering and Computer faculties.',
              'أتقن الرياضيات والفيزياء والبرمجة — طريقك المباشر لكليات الهندسة والحاسبات.'
            )}
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {user?.role === 'TEACHER' ? (
            <Link
              href="/teacher/dashboard"
              className="glass-button px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-3 shadow-xl glow-indigo"
            >
              <span>{t('Go to Teacher Workspace', 'مساحة عمل المعلم')}</span>
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
            </Link>
          ) : user?.role === 'ADMIN' ? (
            <Link
              href="/admin/dashboard"
              className="glass-button px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-3 shadow-xl glow-indigo"
            >
              <span>{t('Open Admin Control Center', 'مركز تحكم الإدارة')}</span>
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
            </Link>
          ) : (
            <>
              <Link
                href="/courses"
                className="glass-button px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-3 shadow-xl glow-indigo"
              >
                <span>{t('Start Learning', 'ابدأ التعلم')}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href="/courses"
                className="px-8 py-4 rounded-2xl glass-card text-slate-200 text-base font-bold hover:bg-slate-800/60 flex items-center gap-3 border border-slate-700/60"
              >
                <Play className="w-5 h-5 text-indigo-400 fill-indigo-400" />
                <span>{t('Explore Courses', 'استكشف الدورات')}</span>
              </Link>
            </>
          )}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { label: t('Secure Video Lessons', 'فيديو آمن'), icon: ShieldCheck, color: 'text-indigo-400' },
            { label: t('Scientific Math Curriculum', 'منهج علمي رياضة'), icon: CheckCircle2, color: 'text-emerald-400' },
            { label: t('Live Teacher Support', 'دعم مباشر'), icon: Zap, color: 'text-amber-400' },
            { label: t('Engineering & Programming Tracks', 'مسارات هندسة وبرمجة'), icon: Award, color: 'text-indigo-300' },
          ].map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="glass-card p-4 rounded-2xl flex items-center gap-3 text-left">
                <Icon className={`w-6 h-6 ${b.color} shrink-0`} />
                <span className="text-xs font-semibold text-slate-300">{b.label}</span>
              </div>
            );
          })}
        </div>

        <p className="mt-10 inline-flex items-center gap-2 text-xs text-slate-500 border border-slate-800 rounded-full px-4 py-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          {t(
            'Built for the Egyptian Thanaweya Amma — Scientific Math track (Secondary 1, 2 & 3)',
            'مصمم لطلاب الثانوية العامة — قسم علمي رياضة (الصفوف الثلاثة)'
          )}
        </p>
      </div>
    </section>
  );
}
