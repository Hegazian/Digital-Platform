'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import {
  Timer,
  PlayCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  FileQuestion,
  AlertTriangle,
} from 'lucide-react';

interface SnapshotQuestion {
  id: string;
  textEn: string;
  textAr: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
  points: number;
  options: string[];
}

type Phase = 'catalog' | 'inProgress' | 'result';

/**
 * Student exam experience: pick an assessment -> server snapshots randomized
 * questions with a hard deadline -> countdown -> submit -> instant grade.
 */
export default function AssessmentRunner() {
  const queryClient = useQueryClient();
  const lang = useAppStore((s) => s.lang);
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  const [phase, setPhase] = useState<Phase>('catalog');
  const [attempt, setAttempt] = useState<{
    id: string;
    expiresAt: string;
    questionsSnapshot: SnapshotQuestion[];
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; isPassed: boolean; expired?: boolean } | null>(null);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState('');

  const catalogQuery = useQuery({
    queryKey: ['assessment', 'list'],
    queryFn: () => fetchApi('/assessment/assessments'),
  });
  const assessments: any[] = catalogQuery.data?.data ?? [];

  // Server-authoritative countdown
  const [remainingSec, setRemainingSec] = useState(0);

  // Latest answers mirrored into a ref so the countdown's auto-submit reads
  // the student's current work, not the empty state captured at start.
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const submittingRef = useRef(false);
  const submitRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (phase !== 'inProgress' || !attempt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSec(left);
      if (left === 0) {
        clearInterval(interval);
        submitRef.current();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, attempt]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v && v.trim()).length,
    [answers]
  );

  const startAttempt = async (assessmentId: string) => {
    setError('');
    setStartingId(assessmentId);
    try {
      const res = await fetchApi(`/assessment/assessments/${assessmentId}/start`, { method: 'POST' });
      setAttempt({
        id: res.data.id,
        expiresAt: res.data.expiresAt,
        questionsSnapshot: res.data.questionsSnapshot ?? [],
      });
      setAnswers({});
      setResult(null);
      setPhase('inProgress');
    } catch (e: any) {
      setError(e.message || t('Could not start the exam', 'تعذر بدء الامتحان'));
    } finally {
      setStartingId('');
    }
  };

  const handleSubmit = async (autoSubmitOnExpiry = false) => {
    if (!attempt || phase !== 'inProgress') return;
    // Re-entry guard: expiry ticks and double clicks must not submit twice.
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const currentAnswers = answersRef.current;
      const payload = {
        answers: Object.entries(currentAnswers)
          .filter(([, v]) => v && v.trim())
          .map(([questionId, answer]) => ({ questionId, answer })),
      };
      if (payload.answers.length === 0 && !autoSubmitOnExpiry) {
        setError(t('Answer at least one question first', 'أجب عن سؤال واحد على الأقل'));
        return;
      }
      const res = await fetchApi(`/assessment/attempts/${attempt.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const expired = res.data?.status === 'EXPIRED' || !!res.data?.expired;
      setResult({
        score: Math.round(res.data.score ?? res.data.attempt?.score ?? 0),
        isPassed: !!res.data.isPassed,
        expired,
      });
      setPhase('result');
      queryClient.invalidateQueries({ queryKey: ['assessment'] });
    } catch (e: any) {
      setError(e.message || t('Submission failed', 'فشل الإرسال'));
    } finally {
      submittingRef.current = false;
    }
  };

  submitRef.current = () => { void handleSubmit(true); };

  const fmtTime = (sec: number) =>
    `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  // ── Catalog ──
  if (phase === 'catalog') {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileQuestion className="w-4 h-4 text-indigo-400" />
          {t('Timed Assessments', 'الامتحانات المحددة زمنياً')}
        </h3>
        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
        {catalogQuery.isLoading ? (
          <div className="flex justify-center py-6 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="glass-panel p-6 rounded-2xl text-center">
            <p className="text-xs text-slate-400">{t('No assessments published yet.', 'لا توجد امتحانات منشورة بعد.')}</p>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {assessments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {lang === 'ar' ? a.titleAr : a.titleEn}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {a.durationMinutes} {t('min', 'د')} · {t('pass', 'نجاح')} {a.passingScore}% ·{' '}
                    {a.totalQuestions} {t('questions', 'أسئلة')}
                  </p>
                </div>
                <button
                  onClick={() => startAttempt(a.id)}
                  disabled={startingId === a.id}
                  className="shrink-0 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {startingId === a.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlayCircle className="w-3.5 h-3.5" />
                  )}
                  {t('Start', 'ابدأ')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── In progress ──
  if (phase === 'inProgress' && attempt) {
    const lowTime = remainingSec <= 60;
    return (
      <div className="space-y-4">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3">
          <span className="text-xs text-slate-400">
            {answeredCount}/{attempt.questionsSnapshot.length} {t('answered', 'مجاب')}
          </span>
          <span
            role="timer"
            aria-live="off"
            className={`text-sm font-mono font-bold flex items-center gap-1.5 ${
              lowTime ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
            }`}
          >
            <Timer className="w-4 h-4" />
            {fmtTime(remainingSec)}
          </span>
        </div>

        {remainingSec === 0 && (
          <p role="alert" className="text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('Time is up — submitting…', 'انتهى الوقت - جاري الإرسال…')}
          </p>
        )}

        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

        <ol className="space-y-4">
          {attempt.questionsSnapshot.map((q, idx) => {
            const title = lang === 'ar' ? q.textAr || q.textEn : q.textEn;
            return (
              <li key={q.id} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-sm font-semibold text-white">
                  <span className="text-slate-500 mr-1.5">{idx + 1}.</span>
                  {title}
                  <span className="ml-2 text-[10px] text-slate-500 font-normal">({q.points}pt)</span>
                </p>

                {q.type === 'MCQ' && (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {(q.options ?? []).map((opt) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer text-xs transition ${
                          answers[q.id] === opt
                            ? 'border-indigo-500 bg-indigo-600/20 text-white'
                            : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                          className="w-4 h-4 accent-indigo-500"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'TRUE_FALSE' && (
                  <div className="flex gap-2">
                    {['True', 'False'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: v })}
                        aria-pressed={answers[q.id] === v}
                        className={`py-2 px-5 rounded-xl text-xs font-bold border ${
                          answers[q.id] === v
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {v === 'True' ? t('True', 'صح') : t('False', 'خطأ')}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'ESSAY' && (
                  <textarea
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    rows={3}
                    placeholder={t('Write your answer…', 'اكتب إجابتك…')}
                    className="glass-input w-full text-xs"
                  />
                )}
              </li>
            );
          })}
        </ol>

        <button
          onClick={() => handleSubmit(false)}
          disabled={remainingSec === 0}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/20"
        >
          {t('Submit Exam', 'إرسال الامتحان')}
        </button>      </div>
    );
  }

  // ── Result ──
  return (
    <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-4">
      {result?.expired ? (
        <>
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <p className="text-lg font-bold text-white">{t('Exam session expired', 'انتهت مدة الامتحان')}</p>
        </>
      ) : (
        <>
          {result?.isPassed ? (
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          ) : (
            <XCircle className="w-12 h-12 text-rose-400 mx-auto" />
          )}
          <p className="text-lg font-bold text-white">
            {result?.isPassed ? t('Passed!', 'ناجح!') : t('Not passed', 'لم تجتز')}
          </p>
          <p className="text-3xl font-extrabold text-white">{result?.score}%</p>
        </>
      )}
      <button
        onClick={() => {
          setPhase('catalog');
          setAttempt(null);
          setResult(null);
        }}
        className="glass-button py-2.5 px-6 rounded-2xl text-xs font-bold"
      >
        {t('Back to Assessments', 'العودة للامتحانات')}
      </button>
    </div>
  );
}
