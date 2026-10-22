'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../lib/store';
import { fetchApi } from '../lib/api';
import { errorMessage } from '../lib/apiTypes';
import {
  BookOpen,
  PlayCircle,
  Clock,
  Video,
  Tag,
  Target,
  ArrowRight,
  Compass,
} from 'lucide-react';
import CareerPickerModal from './onboarding/CareerPickerModal';
import VoucherRedeemModal from './VoucherRedeemModal';
import { useQuery } from '@tanstack/react-query';

/** Only allow safe URL protocols to prevent javascript: XSS injection. */
function sanitizeUrl(url: string): string {
  if (!url) return '#';
  try {
    const parsed = new URL(url, window.location.origin);
    if (['http:', 'https:'].includes(parsed.protocol)) return url;
    if (url.startsWith('/')) return url;
    return '#';
  } catch {
    return url.startsWith('/') ? url : '#';
  }
}

interface CourseProgress {
  id: string;
  titleEn: string;
  titleAr: string;
  subject: string;
  subjectId?: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  lastLesson: string;
}

interface ProgressSummary {
  totalWatchTimeSec: number;
  avgQuizScore: number;
  courses: CourseProgress[];
}

/**
 * Student Hub — deliberately minimal: continue learning, live sessions when
 * they exist, and the student's career-track pulse. Everything else lives in
 * the course player where it belongs.
 */
export default function StudentDashboard() {
  const { user, setSelectedCourse, lang, careerTrackSlug } = useAppStore();
  const router = useRouter();
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showCareerPicker, setShowCareerPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Onboarding: ask for a dream career once per session until chosen
  useEffect(() => {
    if (user?.role === 'STUDENT' && !careerTrackSlug) {
      if (!sessionStorage.getItem('careerPromptDismissed')) {
        setShowCareerPicker(true);
      }
    }
  }, [user?.role, careerTrackSlug]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetchApi('/progress/summary');
        if (cancelled) return;
        setSummary(res.data);

        // Live sessions for the first enrolled course's subject (if any)
        if (res.data?.courses?.length > 0) {
          const subjectId = res.data.courses[0].subjectId;
          if (subjectId) {
            try {
              const liveRes = await fetchApi(`/live/sessions/subject/${subjectId}`);
              if (!cancelled && liveRes.success) {
                setLiveSessions(liveRes.data);
              }
            } catch {
              // Non-critical
            }
          }
        }
      } catch (err: unknown) {
        if (!cancelled) setError(errorMessage(err, 'Failed to load your progress'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatWatchTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const courses = summary?.courses ?? [];
  const firstName = (user?.name || 'Student').split(' ')[0];

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t(`Welcome back, ${firstName}`, `أهلاً بعودتك، ${firstName}`)}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {careerTrackSlug
              ? t(
                  `Training for your future — ${careerTrackSlug} track`,
                  `تتدرب لمستقبلك — مسار ${careerTrackSlug}`
                )
              : t('Pick up where you left off.', 'أكمل من حيث توقفت.')}
          </p>
          {careerTrackSlug && (
            <div className="flex items-center gap-2 mt-2">
              <Link
                href={`/courses?track=${careerTrackSlug}`}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition inline-flex items-center gap-1"
              >
                <Compass className="w-3 h-3" />
                {t('Browse track courses', 'دورات المسار')}
              </Link>
              <button
                onClick={() => setShowCareerPicker(true)}
                className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2"
              >
                {t('change', 'تغيير')}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVoucherModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/25 text-xs font-bold flex items-center gap-2 transition"
            title={t('Redeem a promo code', 'استخدم كود خصم')}
          >
            <Tag className="w-4 h-4 text-indigo-400" />
            <span>{t('Promo Code', 'كود خصم')}</span>
          </button>
        </div>
      </div>

      {/* ── Stat strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: t('Enrolled Courses', 'دوراتي'),
            value: loading ? '—' : String(courses.length),
            color: 'text-indigo-400',
          },
          {
            label: t('Avg Quiz Score', 'متوسط الاختبارات'),
            value: summary ? `${summary.avgQuizScore}%` : '—',
            color: 'text-emerald-400',
          },
          {
            label: t('Watch Time', 'وقت المشاهدة'),
            value: summary ? formatWatchTime(summary.totalWatchTimeSec) : '—',
            color: 'text-violet-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-2xl p-4 border border-slate-800">
            <span className={`block text-2xl font-extrabold ${stat.color}`}>{stat.value}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Career track pulse (compact, only when set) ────────── */}
      {careerTrackSlug && <TrackPulse onOpenCourse={(id) => {
        setSelectedCourse(id);
        router.push(`/courses/${id}`);
      }} />}

      {/* ── Continue Learning ──────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            {t('Continue Learning', 'أكمل التعلم')}
          </h2>
          <span className="h-px flex-1 bg-slate-800" />
          <Link
            href="/courses"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
          >
            {t('Browse all', 'تصفح الكل')}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 border border-slate-800 animate-pulse space-y-3">
                <div className="h-5 w-24 bg-slate-800 rounded-md" />
                <div className="h-4 w-2/3 bg-slate-800/80 rounded-md" />
                <div className="h-2.5 w-full bg-slate-800/70 rounded-full" />
                <div className="h-3 w-1/2 bg-slate-800/60 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/70 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-slate-300 text-sm font-semibold">
              {t('You are not enrolled in any courses yet.', 'لم تسجل في أي دورة بعد.')}
            </p>
            <Link
              href="/courses"
              className="glass-button inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
            >
              {t('Find your first course', 'ابحث عن دورتك الأولى')}
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        )}

        {!loading && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <div
                key={c.id}
                className="group glass-panel rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
                onClick={() => {
                  setSelectedCourse(c.id);
                  router.push(`/courses/${c.id}`);
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-[10px] font-bold uppercase tracking-wide">
                      {c.subject}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {c.completedLessons}/{c.totalLessons}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {lang === 'ar' ? c.titleAr : c.titleEn}
                  </h3>

                  {/* Progress */}
                  <div className="mt-3 mb-1 flex items-center gap-2">
                    <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 w-9 text-right">{c.progress}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate max-w-[65%]">
                    <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="truncate">{c.lastLesson || t('Not started', 'لم تبدأ بعد')}</span>
                  </span>
                  <span className="glass-button px-3.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1 shrink-0">
                    {t('Resume', 'متابعة')}
                    <PlayCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Live sessions (only when upcoming exist) ───────────── */}
      {liveSessions.length > 0 && (
        <section className="glass-card rounded-2xl p-5 border border-purple-500/25">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Video className="w-4 h-4 text-purple-400" />
            {t('Upcoming Live Sessions', 'حصص مباشرة قادمة')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveSessions.map((session) => (
              <div
                key={session.id}
                className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex justify-between items-center gap-3"
              >
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">
                    {lang === 'ar' ? session.titleAr : session.titleEn}
                  </h3>
                  <p className="text-[11px] text-purple-300/80 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(session.startTime).toLocaleString()} ({session.durationMinutes}{' '}
                    {t('mins', 'د')})
                  </p>
                </div>
                <a
                  href={sanitizeUrl(session.zoomJoinUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition"
                >
                  {t('Join', 'انضم')}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showCareerPicker && (
        <CareerPickerModal
          onClose={() => {
            sessionStorage.setItem('careerPromptDismissed', '1');
            setShowCareerPicker(false);
          }}
        />
      )}

      <VoucherRedeemModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        onSuccess={async () => {
          try {
            const res = await fetchApi('/progress/summary');
            setSummary(res.data);
          } catch {}
        }}
      />
    </div>
  );
}

/** Compact career-track progress pulled from the careers API. */
function TrackPulse({ onOpenCourse }: { onOpenCourse: (id: string) => void }) {
  const { lang, careerTrackSlug } = useAppStore();
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  const progressQuery = useQuery({
    queryKey: ['careers', 'my-progress', careerTrackSlug],
    queryFn: () => fetchApi('/careers/mine/progress'),
    enabled: Boolean(careerTrackSlug),
    staleTime: 60_000,
  });
  const tp = progressQuery.data?.data;
  if (!tp?.track) return null;

  return (
    <section className="glass-panel rounded-2xl p-5 border border-indigo-500/20 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-400" />
          {lang === 'ar' ? `مسار ${tp.track.nameAr}` : `${tp.track.nameEn} Track`}
        </h2>
        <span className="text-[11px] text-slate-500">
          {tp.completedCourses}/{tp.totalCourses} {t('courses completed', 'دورة مكتملة')}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>{t('Lessons completed', 'الدروس المكتملة')}</span>
          <span className="font-mono">
            {tp.completedLessons}/{tp.totalLessons}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
            style={{
              width:
                tp.totalLessons > 0
                  ? `${Math.round((tp.completedLessons / tp.totalLessons) * 100)}%`
                  : '0%',
            }}
          />
        </div>
      </div>

      {tp.nextCourse && (
        <button
          onClick={() => onOpenCourse(tp.nextCourse.id)}
          className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-200 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-2 transition"
        >
          {t('Up next:', 'التالي:')}
          <span className="truncate max-w-[220px]">
            {lang === 'ar' ? tp.nextCourse.titleAr || tp.nextCourse.titleEn : tp.nextCourse.titleEn}
          </span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      )}
    </section>
  );
}
