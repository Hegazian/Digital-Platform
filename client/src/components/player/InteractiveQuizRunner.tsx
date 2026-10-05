'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface QuizOption {
  id?: string;
  optionText?: string;
  text?: string;
  orderIndex: number;
}

interface QuizQuestion {
  id?: string;
  questionText: string;
  type?: 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY';
  points: number;
  options: QuizOption[];
}

interface QuizData {
  id: string;
  title?: string;
  titleEn?: string;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number | null;
  questions: QuizQuestion[];
}

interface InteractiveQuizRunnerProps {
  quiz: QuizData;
  lessonId: string;
  onQuizPassed?: () => void;
}

type Phase = 'loading' | 'ready' | 'running' | 'submitted' | 'error';

/**
 * Server-authoritative quiz runner (TC-STUDENT-040..045):
 * - Attempts are created/graded by the API; the browser never sees answer keys.
 * - Timed quizzes start an IN_PROGRESS attempt and auto-submit on expiry.
 * - Attempt limits are enforced server-side and surfaced here.
 */
export default function InteractiveQuizRunner({
  quiz,
  onQuizPassed,
}: InteractiveQuizRunnerProps) {
  const questions = quiz.questions || [];
  const maxAttempts = quiz.maxAttempts ?? 1;
  const passingScore = quiz.passingScore ?? 70;

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);

  // single-choice selection: questionId -> optionId
  const [singleAnswers, setSingleAnswers] = useState<Record<string, string>>({});
  // multi-choice selection: questionId -> Set<optionIds>
  const [multiAnswers, setMultiAnswers] = useState<Record<string, Set<string>>>({});
  // free text
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);
  const deadlineRef = useRef<number | null>(null);

  // Latest answer state mirrored into a ref every render, so the countdown
  // interval's auto-submit always reads the student's current answers
  // instead of the ones captured when the attempt started.
  const answersRef = useRef({ singleAnswers, multiAnswers, textAnswers });
  answersRef.current = { singleAnswers, multiAnswers, textAnswers };

  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<{
    score: number;
    isPassed: boolean;
    needsReview: boolean;
    earnedPoints: number;
    totalPoints: number;
  } | null>(null);

  const quizId = quiz.id;

  // Load attempt history to compute remaining attempts (TC-STUDENT-042)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchApi(`/quizzes/${quizId}/attempts`);
        const used = (res.data || []).filter((a: { status?: string }) => a.status !== 'IN_PROGRESS').length;
        if (!cancelled) {
          setAttemptsUsed(used);
          setPhase(used >= maxAttempts ? 'submitted' : 'ready');
        }
      } catch {
        if (!cancelled) setPhase('ready');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [quizId, maxAttempts]);

  // Countdown for timed attempts
  useEffect(() => {
    if (phase !== 'running' || timeLeftSec === null) return;
    const t = setInterval(() => {
      if (deadlineRef.current === null) return;
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setTimeLeftSec(left);
      if (left <= 0) {
        clearInterval(t);
        submitRef.current();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timeLeftSec]);

  const startAttempt = async () => {
    setPhase('loading');
    setErrorMsg('');
    try {
      await fetchApi(`/quizzes/${quizId}/attempts/start`, { method: 'POST' });
      if (quiz.timeLimit) {
        deadlineRef.current = Date.now() + quiz.timeLimit * 60_000;
        setTimeLeftSec(quiz.timeLimit * 60);
      }
      setPhase('running');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start the quiz');
      setPhase('error');
    }
  };

  const handleSubmit = async () => {
    // Re-entry guard: double clicks and timer ticks racing the in-flight
    // request must not submit the attempt twice.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setErrorMsg('');
    try {
      // Read answers through the ref, never from this render's closure.
      const { singleAnswers, multiAnswers, textAnswers } = answersRef.current;
      const answers = questions.map((q) => {
        const base: Record<string, unknown> = { questionId: q.id };
        if (q.type === 'MULTIPLE_SELECT') {
          base.selectedOptionIds = Array.from(multiAnswers[q.id!] || []);
        } else if (q.type === 'SHORT_ANSWER' || q.type === 'ESSAY') {
          base.textAnswer = textAnswers[q.id!] || '';
        } else {
          base.selectedOptionId = singleAnswers[q.id!];
        }
        return base;
      });

      const res = await fetchApi(`/quizzes/${quizId}/attempts`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });

      setResult(res.data);
      setAttemptsUsed((u) => u + 1);
      setPhase('submitted');
      if (res.data?.isPassed && onQuizPassed) onQuizPassed();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed');
      setPhase('error');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // The countdown interval captures whichever handleSubmit existed when the
  // attempt started; route it through a ref so it always invokes the latest.
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;

  if (!quiz || questions.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-3">
        <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-white">No Quiz Available</h3>
        <p className="text-xs text-slate-400">
          This lesson does not currently include a checkpoint quiz.
        </p>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const currentType = currentQ?.type || 'MCQ';
  const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);

  const answeredCount = questions.filter((q) => {
    if (q.type === 'MULTIPLE_SELECT') return (multiAnswers[q.id!]?.size || 0) > 0;
    if (q.type === 'SHORT_ANSWER' || q.type === 'ESSAY') return !!textAnswers[q.id!];
    return !!singleAnswers[q.id!];
  }).length;

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="glass-panel rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Interactive Checkpoint
          </span>
          <h2 className="text-lg font-bold text-white mt-1">{quiz.titleEn || quiz.title || 'Quiz'}</h2>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          {phase === 'running' && timeLeftSec !== null && (
            <span className={`font-mono font-bold flex items-center gap-1 ${timeLeftSec < 60 ? 'text-red-400' : 'text-indigo-400'}`}>
              <Clock className="w-3.5 h-3.5" /> {fmtTime(timeLeftSec)}
            </span>
          )}
          <span>
            Passing Threshold: <span className="text-emerald-400 font-bold">{passingScore}%</span>
          </span>
          <span>
            Attempts: <span className="text-white font-bold">{attemptsLeft}</span> / {maxAttempts}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
        </div>
      )}

      {/* Pre-start screen */}
      {phase === 'loading' && <p className="text-sm text-slate-400">Loading…</p>}

      {(phase === 'ready' || phase === 'error') && (
        <div className="text-center py-8 space-y-5">
          <HelpCircle className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">
            {questions.length} question{questions.length !== 1 ? 's' : ''} ·{' '}
            {quiz.timeLimit ? `${quiz.timeLimit} minute limit` : 'No time limit'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You have {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining. Your answers are
            graded securely on the server{quiz.timeLimit ? ', and the timer starts when you begin' : ''}.
          </p>
          <button
            onClick={startAttempt}
            disabled={attemptsLeft <= 0}
            className="py-3 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg transition"
          >
            {attemptsLeft > 0 ? 'Start Attempt' : 'No Attempts Remaining'}
          </button>
        </div>
      )}

      {/* Results View */}
      {phase === 'submitted' && result && (
        <div className="text-center py-8 space-y-5">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 shadow-xl"
            style={{
              borderColor: result.isPassed ? '#10B981' : result.needsReview ? '#F59E0B' : '#EF4444',
              backgroundColor: result.isPassed ? 'rgba(16,185,129,.1)' : result.needsReview ? 'rgba(245,158,11,.1)' : 'rgba(239,68,68,.1)',
            }}
          >
            {result.needsReview ? (
              <Clock className="w-8 h-8 text-amber-400" />
            ) : result.isPassed ? (
              <Award className="w-8 h-8 text-emerald-400" />
            ) : (
              <XCircle className="w-8 h-8 text-red-400" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">
              {result.needsReview
                ? 'Submitted — awaiting instructor review'
                : result.isPassed
                ? 'Congratulations! Quiz Passed'
                : 'Quiz Not Passed'}
            </h3>
            <p className="text-xs text-slate-400">
              Score <span className="font-bold text-white">{result.score}%</span>
              {' '}({result.earnedPoints}/{result.totalPoints} points)
            </p>
            {result.needsReview && (
              <p className="text-[11px] text-amber-400">
                Essay/short-answer questions are reviewed by your teacher before final grading.
              </p>
            )}
          </div>

          {attemptsLeft > 0 ? (
            <button
              onClick={() => {
                setResult(null);
                setSingleAnswers({});
                setMultiAnswers({});
                setTextAnswers({});
                setCurrentIdx(0);
                setPhase('ready');
              }}
              className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Quiz ({attemptsLeft} left)</span>
            </button>
          ) : (
            <p className="text-[11px] text-slate-500">All attempts used.</p>
          )}
        </div>
      )}

      {/* Question Runner */}
      {phase === 'running' && currentQ && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Question <span className="font-bold text-white">{currentIdx + 1}</span> of {questions.length}
              <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-500">
                ({answeredCount} answered)
              </span>
            </span>
            <span className="font-mono text-indigo-400 font-semibold">{currentQ.points || 10} Points</span>
          </div>

          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          <h3 className="text-base font-bold text-white leading-relaxed">{currentQ.questionText}</h3>

          {/* Choice-based questions */}
          {(currentType === 'MCQ' || currentType === 'TRUE_FALSE' || currentType === 'MULTIPLE_SELECT') && (
            <div className="space-y-2.5">
              {(currentQ.options || []).map((opt, optIdx) => {
                const optId = opt.id || String(optIdx);
                const isSelected =
                  currentType === 'MULTIPLE_SELECT'
                    ? multiAnswers[currentQ.id!]?.has(optId) || false
                    : singleAnswers[currentQ.id!] === optId;
                return (
                  <button
                    key={optIdx}
                    onClick={() => {
                      if (currentType === 'MULTIPLE_SELECT') {
                        setMultiAnswers((prev) => {
                          const set = new Set(prev[currentQ.id!] || []);
                          if (set.has(optId)) set.delete(optId);
                          else set.add(optId);
                          return { ...prev, [currentQ.id!]: set };
                        });
                      } else {
                        setSingleAnswers((prev) => ({ ...prev, [currentQ.id!]: optId }));
                      }
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center gap-3 text-xs ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/30'
                        : 'glass-panel border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span
                      className={`${
                        currentType === 'MULTIPLE_SELECT' ? 'rounded-md' : 'rounded-full'
                      } w-5 h-5 border flex items-center justify-center text-[10px] font-bold ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-600 text-white'
                          : 'border-slate-700 text-slate-500'
                      }`}
                    >
                      {isSelected ? '✓' : String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="font-medium flex-1">{opt.optionText || opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Free-text questions */}
          {(currentType === 'SHORT_ANSWER' || currentType === 'ESSAY') && (
            <textarea
              rows={currentType === 'ESSAY' ? 8 : 3}
              value={textAnswers[currentQ.id!] || ''}
              onChange={(e) => setTextAnswers((prev) => ({ ...prev, [currentQ.id!]: e.target.value }))}
              placeholder={
                currentType === 'ESSAY'
                  ? 'Write your essay answer here…'
                  : 'Type your answer…'
              }
              className="glass-input w-full text-sm resize-y"
            />
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 disabled:opacity-30 text-xs font-semibold flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="glass-button py-2 px-5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="py-2 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Submitting…' : 'Submit Final Answers'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
