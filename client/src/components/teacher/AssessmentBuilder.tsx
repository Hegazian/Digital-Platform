'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';
import {
  BookMarked,
  Plus,
  Trash2,
  FileQuestion,
  Timer,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface DraftQuestion {
  textEn: string;
  textAr: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

const emptyDraft: DraftQuestion = {
  textEn: '',
  textAr: '',
  questionType: 'MCQ',
  difficulty: 'MEDIUM',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: '',
  points: 10,
};

/**
 * Teacher authoring for the exam engine:
 * question pools -> items (MCQ / TRUE_FALSE / ESSAY) -> timed assessments.
 */
export default function AssessmentBuilder() {
  const queryClient = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [newPoolTitleEn, setNewPoolTitleEn] = useState('');
  const [newPoolTitleAr, setNewPoolTitleAr] = useState('');
  const [draft, setDraft] = useState<DraftQuestion>(emptyDraft);
  const [exam, setExam] = useState({ titleEn: '', titleAr: '', durationMinutes: 30, passingScore: 60, totalQuestions: 10 });
  const [feedback, setFeedback] = useState('');

  const poolsQuery = useQuery({
    queryKey: ['assessment', 'pools'],
    queryFn: () => fetchApi('/assessment/pools'),
  });
  const pools: any[] = poolsQuery.data?.data ?? [];
  const selectedPool = pools.find((p) => p.id === selectedPoolId) ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assessment'] });

  const createPool = useMutation({
    mutationFn: () =>
      fetchApi('/assessment/pools', {
        method: 'POST',
        body: JSON.stringify({ titleEn: newPoolTitleEn, titleAr: newPoolTitleAr }),
      }),
    onSuccess: () => {
      setNewPoolTitleEn('');
      setNewPoolTitleAr('');
      setFeedback('Pool created');
      invalidate();
    },
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const addQuestion = useMutation({
    mutationFn: (payload: object) =>
      fetchApi(`/assessment/pools/${selectedPoolId}/questions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setDraft(emptyDraft);
      setFeedback('Question added');
      invalidate();
    },
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const createExam = useMutation({
    mutationFn: (payload: object) =>
      fetchApi('/assessment/assessments', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      setExam((x) => ({ ...x, titleEn: '', titleAr: '' }));
      setFeedback('Assessment published — students can now take it');
      invalidate();
    },
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const submitDraft = () => {
    if (!selectedPoolId || !draft.textEn.trim()) return;
    const isTF = draft.questionType === 'TRUE_FALSE';
    const payload = {
      textEn: draft.textEn,
      textAr: draft.textAr || draft.textEn,
      questionType: draft.questionType,
      difficulty: draft.difficulty,
      points: draft.points,
      explanation: draft.explanation || undefined,
      optionsJson:
        draft.questionType === 'MCQ'
          ? draft.options.filter((o) => o.trim())
          : isTF
          ? ['True', 'False']
          : [],
      correctAnswerJson: draft.correctAnswer || undefined,
    };
    addQuestion.mutate(payload);
  };

  const busy = createPool.isPending || addQuestion.isPending || createExam.isPending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── Pools & Questions ── */}
      <div className="space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-indigo-400" /> Question Pools
          </h3>
          <div className="flex gap-2">
            <input
              value={newPoolTitleEn}
              onChange={(e) => setNewPoolTitleEn(e.target.value)}
              placeholder="New pool (EN title)"
              className="glass-input flex-1 text-xs"
            />
            <input
              value={newPoolTitleAr}
              onChange={(e) => setNewPoolTitleAr(e.target.value)}
              placeholder="عربي"
              dir="rtl"
              className="glass-input w-28 text-xs"
            />
            <button
              onClick={() => newPoolTitleEn.trim() && createPool.mutate()}
              disabled={busy || !newPoolTitleEn.trim()}
              aria-label="Create question pool"
              className="py-2 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <select
            value={selectedPoolId}
            onChange={(e) => setSelectedPoolId(e.target.value)}
            className="glass-input w-full text-xs"
            aria-label="Select question pool"
          >
            <option value="">— Select a pool —</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titleEn} ({p.questions?.length ?? 0} questions)
              </option>
            ))}
          </select>
        </div>

        {selectedPool && (
          <>
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">Add Question to “{selectedPool.titleEn}”</h4>

              <input
                value={draft.textEn}
                onChange={(e) => setDraft({ ...draft, textEn: e.target.value })}
                placeholder="Question (English)"
                className="glass-input w-full text-xs"
              />
              <input
                value={draft.textAr}
                onChange={(e) => setDraft({ ...draft, textAr: e.target.value })}
                placeholder="السؤال بالعربية (اختياري)"
                dir="rtl"
                className="glass-input w-full text-xs"
              />

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={draft.questionType}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      questionType: e.target.value as QuestionType,
                      correctAnswer: '',
                    })
                  }
                  className="glass-input text-xs"
                  aria-label="Question type"
                >
                  <option value="MCQ">Multiple choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="ESSAY">Essay</option>
                </select>
                <select
                  value={draft.difficulty}
                  onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })}
                  className="glass-input text-xs"
                  aria-label="Difficulty"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.points}
                  onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) || 10 })}
                  className="glass-input text-xs"
                  aria-label="Points"
                />
              </div>

              {draft.questionType === 'MCQ' && (
                <div className="space-y-1.5">
                  {draft.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={!!opt && draft.correctAnswer === opt}
                        onChange={() => setDraft({ ...draft, correctAnswer: opt })}
                        disabled={!opt.trim()}
                        aria-label={`Option ${i + 1} is correct`}
                        className="w-4 h-4 accent-emerald-500 shrink-0"
                      />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const options = [...draft.options];
                          const wasCorrect = draft.correctAnswer === opt;
                          options[i] = e.target.value;
                          setDraft({
                            ...draft,
                            options,
                            correctAnswer: wasCorrect ? e.target.value : draft.correctAnswer,
                          });
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="glass-input flex-1 text-xs"
                      />
                      {draft.options.length > 2 && (
                        <button
                          onClick={() =>
                            setDraft({
                              ...draft,
                              options: draft.options.filter((_, j) => j !== i),
                              correctAnswer: wasCorrectOption(draft, i) ? '' : draft.correctAnswer,
                            })
                          }
                          aria-label={`Remove option ${i + 1}`}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {draft.options.length < 6 && (
                    <button
                      onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      + Add option
                    </button>
                  )}
                  <p className="text-[10px] text-slate-500">Select the radio next to the correct option.</p>
                </div>
              )}

              {draft.questionType === 'TRUE_FALSE' && (
                <div className="flex gap-2">
                  {['True', 'False'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDraft({ ...draft, correctAnswer: v })}
                      aria-pressed={draft.correctAnswer === v}
                      className={`py-2 px-4 rounded-xl text-xs font-bold border ${
                        draft.correctAnswer === v
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {draft.questionType === 'ESSAY' && (
                <textarea
                  value={draft.correctAnswer}
                  onChange={(e) => setDraft({ ...draft, correctAnswer: e.target.value })}
                  placeholder="Model answer (for reviewers)"
                  rows={3}
                  className="glass-input w-full text-xs"
                />
              )}

              <input
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                placeholder="Explanation (optional)"
                className="glass-input w-full text-xs"
              />

              <button
                onClick={submitDraft}
                disabled={busy || !draft.textEn.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                Add Question
              </button>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 max-h-64 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileQuestion className="w-3.5 h-3.5" /> Pool Questions ({selectedPool.questions?.length ?? 0})
              </h4>
              {(selectedPool.questions ?? []).map((q: any) => (
                <div key={q.id} className="flex items-center justify-between gap-2 text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5">
                  <span className="truncate">{q.textEn}</span>
                  <span className="shrink-0 font-bold text-slate-500">
                    {q.questionType} · {q.points}pt · {q.difficulty}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Publish assessment ── */}
      <div className="space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-400" /> Publish Timed Assessment
          </h3>

          <select
            value={selectedPoolId}
            onChange={(e) => setSelectedPoolId(e.target.value)}
            className="glass-input w-full text-xs"
            aria-label="Assessment source pool"
          >
            <option value="">— Source pool —</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titleEn}
              </option>
            ))}
          </select>

          <input
            value={exam.titleEn}
            onChange={(e) => setExam({ ...exam, titleEn: e.target.value })}
            placeholder="Exam title (EN)"
            className="glass-input w-full text-xs"
          />
          <input
            value={exam.titleAr}
            onChange={(e) => setExam({ ...exam, titleAr: e.target.value })}
            placeholder="عنوان الامتحان"
            dir="rtl"
            className="glass-input w-full text-xs"
          />

          <div className="grid grid-cols-3 gap-2">
            <label className="text-[10px] text-slate-500 space-y-1 block">
              Minutes
              <input
                type="number"
                min={1}
                max={300}
                value={exam.durationMinutes}
                onChange={(e) => setExam({ ...exam, durationMinutes: Number(e.target.value) || 30 })}
                className="glass-input w-full text-xs"
              />
            </label>
            <label className="text-[10px] text-slate-500 space-y-1 block">
              Pass %
              <input
                type="number"
                min={0}
                max={100}
                value={exam.passingScore}
                onChange={(e) => setExam({ ...exam, passingScore: Number(e.target.value) || 60 })}
                className="glass-input w-full text-xs"
              />
            </label>
            <label className="text-[10px] text-slate-500 space-y-1 block">
              Questions
              <input
                type="number"
                min={1}
                max={100}
                value={exam.totalQuestions}
                onChange={(e) => setExam({ ...exam, totalQuestions: Number(e.target.value) || 10 })}
                className="glass-input w-full text-xs"
              />
            </label>
          </div>

          <button
            onClick={() =>
              selectedPoolId &&
              exam.titleEn.trim() &&
              createExam.mutate({ poolId: selectedPoolId, ...exam })
            }
            disabled={busy || !selectedPoolId || !exam.titleEn.trim()}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold"
          >
            Publish Assessment
          </button>
          <p className="text-[10px] text-slate-500">
            Each student gets a randomized selection of questions with an individual countdown.
          </p>
        </div>

        {feedback && (
          <p role="status" className="text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {feedback}
          </p>
        )}

        <PublishedExams onSelected={(id) => setSelectedPoolId(id)} />
      </div>
    </div>
  );
}

function wasCorrectOption(draft: DraftQuestion, removedIndex: number): boolean {
  return draft.correctAnswer === draft.options[removedIndex];
}

function PublishedExams({ onSelected }: { onSelected?: (poolId: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['assessment', 'list'],
    queryFn: () => fetchApi('/assessment/assessments'),
  });
  const exams: any[] = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-4 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
      <h4 className="text-xs font-bold text-slate-300">Published Assessments ({exams.length})</h4>
      {exams.length === 0 ? (
        <p className="text-[11px] text-slate-500">Nothing published yet.</p>
      ) : (
        exams.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelected?.(a.poolId)}
            className="w-full flex items-center justify-between text-[11px] border-b border-slate-800/60 pb-1.5 hover:text-white text-left group"
          >
            <span className="truncate text-slate-300 group-hover:text-indigo-300">{a.titleEn}</span>
            <span className="shrink-0 text-slate-500">
              {a.durationMinutes}min · pass {a.passingScore}% · {a.pool?.titleEn}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
