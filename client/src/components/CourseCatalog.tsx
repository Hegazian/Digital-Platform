'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../lib/store';
import { fetchApi } from '../lib/api';
import { errorMessage } from '../lib/apiTypes';
import {
  GraduationCap,
  BookOpen,
  AlertCircle,
  Target,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CatalogCourse {
  id: string;
  titleEn: string;
  titleAr: string;
  description?: string;
  subject?: { nameEn?: string; nameAr?: string };
  grade?: { nameEn?: string; nameAr?: string };
  teacher?: { name?: string };
  priceEgp?: number;
  priceUsd?: number;
  isFree?: boolean;
}

/** Deterministic cover gradient per subject so the grid feels varied but stable. */
const COVER_PALETTES = [
  'from-indigo-500/70 via-violet-600/60 to-slate-900',
  'from-emerald-500/70 via-teal-600/60 to-slate-900',
  'from-sky-500/70 via-blue-600/60 to-slate-900',
  'from-rose-500/70 via-pink-600/60 to-slate-900',
  'from-amber-500/70 via-orange-600/60 to-slate-900',
];

function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_PALETTES[hash % COVER_PALETTES.length];
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/**
 * Public course catalog - the single browsing surface for students/guests.
 * Replaces the old subscription-pricing section; prices shown per course.
 */
export default function CourseCatalog() {
  const router = useRouter();
  const { lang } = useAppStore();
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ isPublished: 'true', limit: '200' });
        const res = await fetchApi(`/courses?${params.toString()}`);
        if (cancelled) return;
        setCourses(res.data?.courses ?? []);
      } catch (e: any) {
        if (!cancelled) setError(errorMessage(e, 'Failed to load courses'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = (c: CatalogCourse) => (lang === 'ar' && c.titleAr ? c.titleAr : c.titleEn);

  // Career personalization: ?track=slug wins; otherwise the saved preference
  const searchParams = useSearchParams();
  const careerTrackSlug = useAppStore((s) => s.careerTrackSlug);
  const activeTrack = searchParams.get('track') || careerTrackSlug || '';

  const tracksQuery = useQuery({
    queryKey: ['careers', 'tracks'],
    queryFn: () => fetchApi('/career-tracks'),
    staleTime: 5 * 60_000,
    enabled: Boolean(activeTrack),
  });

  const trackSubjectIds = useMemo(() => {
    if (!activeTrack) return new Set<string>();
    const track = (tracksQuery.data?.data ?? []).find((t: any) => t.slug === activeTrack);
    const ids = new Set<string>(
      (track?.subjects ?? []).map((s: any) => s.subject?.id ?? s.subjectId)
    );
    ids.delete('');
    return ids;
  }, [activeTrack, tracksQuery.data]);

  const { priorityCourses, otherCourses } = useMemo(() => {
    if (trackSubjectIds.size === 0) return { priorityCourses: [], otherCourses: courses };
    return {
      priorityCourses: courses.filter((c) => {
        // Course payload carries subjectId via subject relation id
        return trackSubjectIds.has((c as any).subject?.id ?? '');
      }),
      otherCourses: courses.filter((c) => !trackSubjectIds.has((c as any).subject?.id ?? '')),
    };
  }, [courses, trackSubjectIds]);

  const trackMeta = (tracksQuery.data?.data ?? []).find((t: any) => t.slug === activeTrack);
  const trackLabel = trackMeta
    ? lang === 'ar'
      ? trackMeta.nameAr
      : trackMeta.nameEn
    : activeTrack;

  const renderCard = (course: CatalogCourse) => {
    const subjectLabel =
      (lang === 'ar' ? course.subject?.nameAr : course.subject?.nameEn) || t('General', 'عام');
    const teacherName = course.teacher?.name || '';
    const isFree = Boolean(course.isFree);

    return (
      <button
        key={course.id}
        onClick={() => router.push(`/courses/${course.id}`)}
        className="group text-left glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
        data-course-card
        aria-label={title(course)}
      >
        {/* Cover band */}
        <div className={`relative h-24 bg-gradient-to-br ${paletteFor(subjectLabel)} flex items-center justify-center overflow-hidden`}>
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
              backgroundSize: '14px 14px',
            }}
          />
          <BookOpen className="w-10 h-10 text-white/70 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
          <span className="absolute top-3 right-3">
            {isFree ? (
              <span className="text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/30">
                FREE
              </span>
            ) : (
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur text-emerald-300 border border-emerald-500/30">
                {course.priceEgp ?? 150} EGP
              </span>
            )}
          </span>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-white line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-indigo-300 transition-colors">
            {title(course)}
          </h3>

          {course.description && (
            <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2">
              {course.description}
            </p>
          )}

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
              <GraduationCap className="w-3 h-3" />
              {subjectLabel}
            </span>
            {(lang === 'ar' ? course.grade?.nameAr : course.grade?.nameEn) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                <Layers className="w-3 h-3" />
                {lang === 'ar' ? course.grade?.nameAr : course.grade?.nameEn}
              </span>
            )}
          </div>

          {/* Footer: teacher + CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-2 min-w-0">
              {teacherName ? (
                <span className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {initialsOf(teacherName)}
                </span>
              ) : (
                <GraduationCap className="w-4 h-4 shrink-0 text-slate-600" />
              )}
              <span className="truncate text-[11px] font-medium text-slate-400 max-w-[9rem]">
                {teacherName || t('Staff', 'هيئة التدريس')}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
              {t('View', 'عرض')}
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </span>
          </div>
        </div>
      </button>
    );
  };

  const renderSkeletonGrid = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-panel rounded-2xl overflow-hidden animate-pulse">
          <div className="h-24 bg-slate-800/60" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-slate-800/80 rounded-md" />
            <div className="h-3 w-full bg-slate-800/60 rounded-md" />
            <div className="h-3 w-2/3 bg-slate-800/60 rounded-md" />
            <div className="flex gap-2 pt-1">
              <div className="h-5 w-16 bg-slate-800/70 rounded-md" />
              <div className="h-5 w-12 bg-slate-800/70 rounded-md" />
            </div>
            <div className="h-px bg-slate-800/70 my-1" />
            <div className="h-3 w-1/2 bg-slate-800/60 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderSection = (label: React.ReactNode, items: CatalogCourse[], accent = false) => (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2
          className={`flex items-center gap-2 text-sm font-bold ${
            accent ? 'text-indigo-300' : 'text-slate-300'
          }`}
        >
          {accent ? <Sparkles className="w-4 h-4" /> : null}
          {label}
        </h2>
        <span className="h-px flex-1 bg-slate-800" />
        <span className="text-[11px] font-semibold text-slate-600">{items.length}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(renderCard)}
      </div>
    </section>
  );

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="text-sm text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      {loading ? (
        renderSkeletonGrid()
      ) : courses.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/70 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm font-bold text-white">{t('No courses found', 'لا توجد دورات')}</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {t(
              'No courses have been published yet — check back soon.',
              'لم يتم نشر أي دورات بعد — تابعنا قريباً.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {trackSubjectIds.size > 0 && priorityCourses.length > 0 &&
            renderSection(
              <>
                <Target className="w-4 h-4" />
                {t('For your future:', 'لمستقبلك:')} {trackLabel}
              </>,
              priorityCourses,
              true
            )}

          {otherCourses.length > 0 &&
            renderSection(
              priorityCourses.length > 0 ? t('More courses', 'دورات أخرى') : t('All courses', 'كل الدورات'),
              otherCourses
            )}
        </div>
      )}
    </div>
  );
}
