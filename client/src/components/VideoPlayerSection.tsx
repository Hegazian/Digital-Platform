'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../lib/store';
import {
  FileText,
  AlertCircle,
  Code,
  Pencil,
  Video as VideoIcon,
  MessageSquare,
  HelpCircle,
  CheckCircle,
  BookOpen,
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import { errorMessage } from '../lib/apiTypes';
import CodePlaygroundBlock from './editor/CodePlaygroundBlock';
import CollaborativeBoardBlock from './editor/CollaborativeBoardBlock';
import DiscussionForum from './discussions/DiscussionForum';
import AITutorDrawer from './ai/AITutorDrawer';
import LMSPlayerHeader from './player/LMSPlayerHeader';
import CurriculumSidebar, { CurriculumLesson, CurriculumModule } from './player/CurriculumSidebar';
import PDFDocumentViewer from './player/PDFDocumentViewer';
import InteractiveQuizRunner from './player/InteractiveQuizRunner';
import AssignmentRunner from './player/AssignmentRunner';
import AttemptHistory from './player/AttemptHistory';
import CheckoutModal from './commerce/CheckoutModal';

export default function VideoPlayerSection() {
  const { user, selectedCourseId, lang, setSelectedCourse } = useAppStore();
  const router = useRouter();
  const t = (key: string, fallback?: string) => {
    const translations: Record<string, string> = {
      courseUnavailable: lang === 'ar' ? 'الدورة غير متاحة' : 'Course unavailable',
      browseCourses: lang === 'ar' ? 'تصفح الدورات' : 'Browse courses',
      allLessons: lang === 'ar' ? 'كل الدروس المرئية' : 'All video lessons',
      quizzesAssignments: lang === 'ar' ? 'اختبارات وواجبات' : 'Quizzes & assignments',
      qaDiscussions: lang === 'ar' ? 'نقاشات وأسئلة' : 'Q&A discussions',
      teacherSupport: lang === 'ar' ? 'متابعة المعلم' : 'Teacher support',
      enrolling: lang === 'ar' ? 'جارٍ التسجيل…' : 'Enrolling…',
      loginToEnroll: lang === 'ar' ? 'سجّل الدخول للتسجيل' : 'Log in to Enroll',
      enrollFree: lang === 'ar' ? 'سجّل الآن — وصول فوري مجاني' : 'Enroll Now — Free Instant Access',
      unlock: lang === 'ar' ? 'افتح الدورة' : 'Unlock Course',
      openEnrollmentNote:
        lang === 'ar'
          ? 'تسجيل مفتوح — تشمل جميع الدروس والاختبارات والواجبات.'
          : 'Open enrollment — all lessons, quizzes, and assignments included.',
      paidNote:
        lang === 'ar'
          ? 'دفع آمن عبر فودافون كاش أو انستاباي. يفتح الوصول بعد تأكيد الدفع.'
          : 'Secure checkout via Vodafone Cash or InstaPay. Access unlocks after payment verification.',
    };
    return translations[key] ?? fallback ?? key;
  };
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [activeLesson, setActiveLesson] = useState<CurriculumLesson | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [hasAccess, setHasAccess] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'video' | 'materials' | 'quiz' | 'assignments' | 'playground' | 'board' | 'discussions'
  >('video');

  // Video Player Controls
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Access policy (TC-STUDENT-032/033): admins, the owning teacher, and
   * students holding an entitlement (purchase/subscription/voucher/grant)
   * may watch. The entitlement decision comes from the server
   * (single source of truth); client heuristics are fallbacks only.
   */
  const computeAccess = useCallback(async (courseData: any): Promise<boolean> => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (courseData.teacherId && courseData.teacherId === user.id) return true;
    try {
      const res = await fetchApi(`/commerce/entitlements/check-course/${courseData.id}`);
      if (typeof res.data?.hasAccess === 'boolean') return res.data.hasAccess;
    } catch {
      // fall through to legacy heuristic
    }
    try {
      const summary = await fetchApi('/progress/summary');
      return (summary.data?.courses || []).some((c: any) => c.id === courseData.id);
    } catch {
      return false;
    }
  }, [user]);

  // Fetch Course & Curriculum Tree
  const loadCourseData = useCallback(async () => {
    if (!selectedCourseId) return;
    setError(null);

    try {
      const res = await fetchApi(`/courses/${selectedCourseId}`);
      const courseData = res.data || res;
      setCourse(courseData);

      // Extract modules & lessons
      const extractedModules: CurriculumModule[] = [];

      if (courseData.modules && courseData.modules.length > 0) {
        courseData.modules.forEach((mod: any) => {
          extractedModules.push({
            id: mod.id,
            titleEn: mod.titleEn,
            titleAr: mod.titleAr,
            lessons: (mod.lessons || []).map((l: any) => ({
              id: l.id,
              titleEn: l.titleEn,
              titleAr: l.titleAr,
              duration: l.estimatedDuration || 15,
              isFreePreview: l.isFreePreview || false,
              videoId: l.videoId,
              video: l.video,
              materials: l.materials || [],
              quiz: l.quiz,
              blocks: l.blocks || [],
            })),
          });
        });
      } else if (courseData.sections && courseData.sections.length > 0) {
        courseData.sections.forEach((sec: any) => {
          extractedModules.push({
            id: sec.id,
            titleEn: sec.titleEn,
            titleAr: sec.titleAr,
            lessons: (sec.lessons || []).map((l: any) => ({
              id: l.id,
              titleEn: l.titleEn,
              titleAr: l.titleAr,
              duration: 15,
              isFreePreview: sec.isFreePreview,
              videoId: l.videoId,
              video: l.video,
              materials: l.materials || [],
              quiz: l.quiz,
              blocks: l.blocks || [],
            })),
          });
        });
      }

      setModules(extractedModules);

      // Access + prior-progress hydration
      const allowed = await computeAccess(courseData);
      setHasAccess(allowed);
      setAccessChecked(true);

      if (allowed && user) {
        try {
          const prog = await fetchApi(`/progress/course/${courseData.id}`);
          setCompletedLessonIds(new Set(prog.data?.completedLessonIds || []));
        } catch {
          // Progress hydration is best-effort
        }
      }

      // Select first lesson by default
      if (allowed && extractedModules.length > 0 && extractedModules[0].lessons.length > 0) {
        const firstLesson = extractedModules[0].lessons[0];
        setActiveLesson(firstLesson);
        loadLessonVideo(firstLesson);
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load course curriculum'));
    }
  }, [selectedCourseId, user, computeAccess]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Load video for active lesson
  const loadLessonVideo = async (lesson: CurriculumLesson) => {
    setError(null);
    setVideoUrl(null);

    // Absolute http(s) URLs (e.g. Supabase public assets) are playable as-is.
    if (lesson.video?.videoUrl && /^https?:\/\//i.test(lesson.video.videoUrl)) {
      setVideoUrl(lesson.video.videoUrl);
      return;
    }

    if (lesson.videoId) {
      try {
        // Secure flow: server checks entitlement and returns either a signed
        // cloud URL or a short-lived token-gated stream URL for local files.
        // Raw '/uploads/...' paths are NEVER playable from the client origin.
        const res = await fetchApi(`/videos/${lesson.videoId}/playback-url`);
        if (res.data?.playbackUrl) {
          setVideoUrl(res.data.playbackUrl);
          return;
        }
      } catch {
        // fall through to empty state below
      }
      setVideoUrl(null);
      // No demo fallback: lessons without a playable video show an empty state.
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    // Paid courses go through checkout; only free courses self-enroll.
    if (!course?.isFree && Number(course?.priceEgp ?? 0) > 0) {
      setShowCheckout(true);
      return;
    }

    setEnrolling(true);
    setError(null);
    try {
      await fetchApi(`/courses/${selectedCourseId}/enroll`, { method: 'POST' });
      setHasAccess(true);
      setMessage('Enrolled successfully — start learning below!');
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to enroll'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleSelectLesson = (lesson: CurriculumLesson) => {
    setActiveLesson(lesson);
    loadLessonVideo(lesson);
    // Switch to video tab by default on lesson change
    setActiveTab('video');
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleLessonCompleted = async () => {
    if (!activeLesson) return;
    setCompletedLessonIds((prev) => {
      const next = new Set(prev);
      next.add(activeLesson.id);
      return next;
    });

    // Persist completion (TC-STUDENT-060) — best-effort, non-blocking.
    try {
      await fetchApi(`/progress/${activeLesson.id}/complete`, { method: 'POST' });
    } catch {
      // Local state already reflects completion; server sync retried on error paths
    }
  };

  const totalLessonsCount = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedCount = completedLessonIds.size;

  const currentTitle = lang === 'ar'
    ? course?.titleAr || course?.titleEn || 'الدورة التعليمية'
    : course?.titleEn || 'Comprehensive Curriculum';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col animate-fadeIn">
      {/* Load failure: stale deep-link, deleted course, or network error */}
      {error && !course ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full glass-panel rounded-3xl border border-slate-800 p-10 text-center space-y-5">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">{t('courseUnavailable', 'Course unavailable')}</h2>
            <p className="text-sm text-slate-400">{error}</p>
            <button
              onClick={() => {
                setSelectedCourse(null);
                router.push('/courses');
              }}
              className="glass-button py-3 px-6 rounded-2xl text-sm font-bold"
            >
              {t('browseCourses', 'Browse courses')}
            </button>
          </div>
        </div>
      ) :
      /* Paywall: non-entitled users see enrollment CTA instead of content (TC-STUDENT-023) */
      accessChecked && !hasAccess ? (
        <div className="flex-1 flex items-center justify-center p-6 relative">
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-64 w-[36rem] max-w-full rounded-full bg-indigo-600/15 blur-3xl"
          />
          <div className="relative max-w-lg w-full rounded-3xl p-px bg-gradient-to-br from-indigo-500/60 via-slate-800 to-emerald-500/40 shadow-2xl shadow-indigo-950/50">
            <div className="rounded-3xl bg-slate-950/95 backdrop-blur-xl p-8 sm:p-10 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-white">{currentTitle}</h2>
                {course?.description && (
                  <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">{course.description}</p>
                )}
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                {course?.isFree ? (
                  <span className="text-sm font-extrabold text-emerald-400">100% Free</span>
                ) : (
                  <>
                    <span className="text-base font-extrabold text-white">{course?.priceEgp ?? 150} EGP</span>
                    {Number(course?.priceUsd ?? 10) > 0 && (
                      <span className="text-xs text-slate-500">· ${course?.priceUsd ?? 10}</span>
                    )}
                  </>
                )}
              </div>

              {/* What's included */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-start mx-auto w-fit">
                {[
                  [t('allLessons', 'All video lessons'), true],
                  [t('quizzesAssignments', 'Quizzes & assignments'), true],
                  [t('qaDiscussions', 'Q&A discussions'), true],
                  [t('teacherSupport', 'Teacher support'), course?.isFree],
                ].map(([label, included]) => (
                  <li key={label as string} className={`flex items-center gap-1.5 text-xs ${included ? 'text-slate-300' : 'text-slate-600'}`}>
                    <span
                      className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        included ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      ✓
                    </span>
                    {label}
                  </li>
                ))}
              </ul>

              {message && (
                <p role="status" className="text-xs text-emerald-400">{message}</p>
              )}

              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition active:scale-[0.99]"
              >
                {enrolling
                  ? t('enrolling', 'Enrolling…')
                  : !user
                  ? t('loginToEnroll', 'Log in to Enroll')
                  : course?.isFree || Number(course?.priceEgp ?? 0) <= 0
                  ? t('enrollFree', 'Enroll Now — Free Instant Access')
                  : `${t('unlock', 'Unlock Course')} — ${course?.priceEgp ?? 150} EGP`}
              </button>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {course?.isFree
                  ? t(
                      'openEnrollmentNote',
                      'Open enrollment — all lessons, quizzes, and assignments included.'
                    )
                  : t(
                      'paidNote',
                      'Secure checkout via Vodafone Cash or InstaPay. Access unlocks after payment verification.'
                    )}
              </p>
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* Top Header */}
      <LMSPlayerHeader
        courseTitle={currentTitle}
        subjectName={course?.subject?.nameEn}
        completedLessonsCount={completedCount}
        totalLessonsCount={totalLessonsCount}
        onBackToCourses={() => setSelectedCourse(null)}
      />

      {/* Main LMS Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Player & Active Modality Studio */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Multi-Resource Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
            {[
              { id: 'video', label: 'Video Lecture', icon: VideoIcon },
              {
                id: 'materials',
                label: `PDF Materials (${activeLesson?.materials?.length || 0})`,
                icon: FileText,
              },
              {
                id: 'quiz',
                label: activeLesson?.quiz ? 'Checkpoint Quiz' : 'Quiz',
                icon: HelpCircle,
              },
              { id: 'assignments', label: 'Assignments', icon: FileText },
              { id: 'playground', label: 'Code Playground', icon: Code },
              { id: 'board', label: 'Whiteboard', icon: Pencil },
              { id: 'discussions', label: 'Q&A Discussions', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab View */}
          {activeTab === 'video' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Video Player Container */}
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
                {videoUrl ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                    onEnded={handleLessonCompleted}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                    <div className="w-16 h-16 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center">
                      <VideoIcon className="w-7 h-7 text-slate-600" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-semibold text-slate-400">No video stream loaded</p>
                      <p className="text-[11px] text-slate-600">Select a lesson from the curriculum to begin</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Player Quick Controls & Speed Switcher */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {lang === 'ar'
                        ? activeLesson?.titleAr || activeLesson?.titleEn
                        : activeLesson?.titleEn || 'Selected Lesson'}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Duration: {activeLesson?.duration || 15} minutes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Playback Rate Selector */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold font-mono transition ${
                          playbackRate === rate
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {/* Mark as Complete Button */}
                  <button
                    onClick={handleLessonCompleted}
                    className={`py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activeLesson && completedLessonIds.has(activeLesson.id)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'glass-button'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {activeLesson && completedLessonIds.has(activeLesson.id)
                        ? 'Completed'
                        : 'Mark Complete'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <PDFDocumentViewer materials={activeLesson?.materials || []} />
          )}

          {activeTab === 'quiz' && activeLesson?.quiz && (
            <div className="space-y-4">
              <InteractiveQuizRunner
                quiz={activeLesson.quiz}
                lessonId={activeLesson.id}
                onQuizPassed={handleLessonCompleted}
              />
              <AttemptHistory quizId={activeLesson.quiz.id} />
            </div>
          )}

          {activeTab === 'assignments' && activeLesson && (
            <AssignmentRunner lessonId={activeLesson.id} />
          )}

          {activeTab === 'playground' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <CodePlaygroundBlock />
            </div>
          )}

          {activeTab === 'board' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <CollaborativeBoardBlock />
            </div>
          )}

          {activeTab === 'discussions' && selectedCourseId && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <DiscussionForum courseId={selectedCourseId} lessonId={activeLesson?.id} />
            </div>
          )}
        </div>

        {/* Right Column: Interactive Curriculum Drawer */}
        <div className="w-full lg:w-80 shrink-0">
          <CurriculumSidebar
            modules={modules}
            activeLessonId={activeLesson?.id || ''}
            completedLessonIds={completedLessonIds}
            hasAccess={hasAccess}
            onSelectLesson={handleSelectLesson}
          />
        </div>
      </div>

      {/* Embedded Gemini AI Tutor Floating Drawer */}
      <AITutorDrawer />
      </>
      )}

      {/* Paid-course checkout flow */}
      {showCheckout && course && (
        <CheckoutModal
          course={{
            id: course.id,
            titleEn: course.titleEn,
            titleAr: course.titleAr,
            priceEgp: course.priceEgp,
            priceUsd: course.priceUsd,
          }}
          onClose={() => setShowCheckout(false)}
          onAccessGranted={async () => {
            setShowCheckout(false);
            setHasAccess(true);
            setMessage('Payment verified — start learning below!');
            if (user) {
              try {
                const prog = await fetchApi(`/progress/course/${course.id}`);
                setCompletedLessonIds(new Set(prog.data?.completedLessonIds || []));
              } catch {}
              const first = modules[0]?.lessons[0];
              if (first && !activeLesson) {
                setActiveLesson(first);
                loadLessonVideo(first);
              }
            }
          }}
        />
      )}
    </div>
  );
}
