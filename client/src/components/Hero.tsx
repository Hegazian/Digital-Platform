'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '../lib/store';
import { useHomeContent } from '../lib/configStore';
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
  BookOpen,
} from 'lucide-react';

const TOPIC_PALETTES = [
  { icon: Cpu, color: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10' },
  { icon: Code2, color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  { icon: Sigma, color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' },
  { icon: Atom, color: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  { icon: BookOpen, color: 'text-violet-300 border-violet-500/30 bg-violet-500/10' },
  { icon: Award, color: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
];

const TRUST_ICONS = [
  { icon: ShieldCheck, color: 'text-indigo-400' },
  { icon: CheckCircle2, color: 'text-emerald-400' },
  { icon: Zap, color: 'text-amber-400' },
  { icon: Award, color: 'text-indigo-300' },
];

export default function Hero() {
  const { lang, user } = useAppStore();
  const homeContent = useHomeContent();
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  const topicBadges = homeContent.hero.topicBadges;
  const trustBadges = homeContent.hero.trustBadges;

  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Aspirational badge row */}
        {topicBadges.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {topicBadges.map((badge, idx) => {
              const palette = TOPIC_PALETTES[idx % TOPIC_PALETTES.length];
              const Icon = palette.icon;
              const label = lang === 'ar' ? badge.labelAr : badge.labelEn;
              const sub = lang === 'ar' ? badge.subAr || badge.subEn : badge.subEn || badge.subAr;

              return (
                <span
                  key={`${badge.labelEn}-${idx}`}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${palette.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  {sub && sub !== label && (
                    <span className="hidden md:inline text-[10px] font-semibold opacity-60">
                      {sub}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          {lang === 'ar' ? homeContent.hero.headingLine1Ar : homeContent.hero.headingLine1En}
          <span className="block text-gradient mt-2">
            {lang === 'ar' ? homeContent.hero.headingLine2Ar : homeContent.hero.headingLine2En}
          </span>
        </h1>

        {/* Configured slogan (admin-editable) or description */}
        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          {lang === 'ar' ? homeContent.hero.descriptionAr : homeContent.hero.descriptionEn}
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
                <span>
                  {lang === 'ar' ? homeContent.hero.primaryCtaAr : homeContent.hero.primaryCtaEn}
                </span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </Link>

              <Link
                href="/courses"
                className="px-8 py-4 rounded-2xl glass-card text-slate-200 text-base font-bold hover:bg-slate-800/60 flex items-center gap-3 border border-slate-700/60"
              >
                <Play className="w-5 h-5 text-indigo-400 fill-indigo-400" />
                <span>
                  {lang === 'ar' ? homeContent.hero.secondaryCtaAr : homeContent.hero.secondaryCtaEn}
                </span>
              </Link>
            </>
          )}
        </div>

        {/* Trust Badges */}
        {trustBadges.length > 0 && (
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {trustBadges.map((badge, i) => {
              const iconData = TRUST_ICONS[i % TRUST_ICONS.length];
              const Icon = iconData.icon;
              return (
                <div key={i} className="glass-card p-4 rounded-2xl flex items-center gap-3 text-left rtl:text-right">
                  <Icon className={`w-6 h-6 ${iconData.color} shrink-0`} />
                  <span className="text-xs font-semibold text-slate-300">
                    {lang === 'ar' ? badge.labelAr : badge.labelEn}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Tagline */}
        {(homeContent.hero.bottomTaglineEn || homeContent.hero.bottomTaglineAr) && (
          <p className="mt-10 inline-flex items-center gap-2 text-xs text-slate-500 border border-slate-800 rounded-full px-4 py-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {lang === 'ar' ? homeContent.hero.bottomTaglineAr : homeContent.hero.bottomTaglineEn}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
