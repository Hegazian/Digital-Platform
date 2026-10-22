'use client';

import React, { useState } from 'react';
import { X, Video as VideoIcon, FileText, HelpCircle } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { errorMessage } from '../../../lib/apiTypes';
import VideoUploader from '../../VideoUploader';
import Modal from '@/components/ui/Modal';

type QuizQuestionType = 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY';

interface QuizQuestion {
  questionText: string;
  type: QuizQuestionType;
  correctAnswer?: string;
  points: number;
  orderIndex: number;
  options: { optionText: string; isCorrect: boolean; orderIndex: number }[];
}

const initialQuestions: QuizQuestion[] = [
  {
    questionText: '',
    type: 'MCQ',
    points: 10,
    orderIndex: 1,
    options: [
      { optionText: '', isCorrect: true, orderIndex: 1 },
      { optionText: '', isCorrect: false, orderIndex: 2 },
    ],
  },
];

interface CreateLessonModalProps {
  /** Module OR section parent — exactly one should be provided. */
  moduleId?: string;
  sectionId?: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Lesson composer: core details + optional video / material / quiz
 * attachments. Fully self-contained; the parent only refreshes.
 */
export default function CreateLessonModal({
  moduleId,
  sectionId,
  open,
  onClose,
  onCreated,
}: CreateLessonModalProps) {
  const [lessonTitleEn, setLessonTitleEn] = useState('');
  const [lessonTitleAr, setLessonTitleAr] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonDuration, setLessonDuration] = useState('30');

  const [hasVideo, setHasVideo] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration] = useState('1800');

  const [hasMaterial, setHasMaterial] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');

  const [hasQuiz, setHasQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizPassScore, setQuizPassScore] = useState('70');
  const [quizTimeLimit, setQuizTimeLimit] = useState('');
  const [quizMaxAttempts, setQuizMaxAttempts] = useState('1');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(initialQuestions);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const addQuestion = () => {
    setQuizQuestions((prev) => [
      ...prev,
      {
        questionText: '',
        type: 'MCQ' as QuizQuestionType,
        points: 10,
        orderIndex: prev.length + 1,
        options: [
          { optionText: '', isCorrect: true, orderIndex: 1 },
          { optionText: '', isCorrect: false, orderIndex: 2 },
        ],
      },
    ]);
  };

  const addOptionToQuestion = (qIdx: number) => {
    setQuizQuestions((prev) => {
      const next = [...prev];
      next[qIdx].options.push({
        optionText: '',
        isCorrect: false,
        orderIndex: next[qIdx].options.length + 1,
      });
      return next;
    });
  };

  const resetForm = () => {
    setLessonTitleEn('');
    setLessonTitleAr('');
    setLessonContent('');
    setHasVideo(false);
    setVideoUrl('');
    setHasMaterial(false);
    setMaterialUrl('');
    setHasQuiz(false);
    setQuizTitle('');
    setQuizQuestions(initialQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleId && !sectionId) return;

    setLoading(true);
    setError('');

    try {
      const payload: any = {
        titleEn: lessonTitleEn,
        titleAr: lessonTitleAr || lessonTitleEn,
        content: lessonContent,
        estimatedDuration: parseInt(lessonDuration, 10) || 30,
      };

      if (hasVideo && videoUrl) {
        payload.video = {
          title: videoTitle || lessonTitleEn,
          videoUrl,
          duration: parseInt(videoDuration, 10) || 1800,
        };
      }

      if (hasMaterial && materialTitle && materialUrl) {
        payload.materials = [
          {
            title: materialTitle,
            fileUrl: materialUrl,
            fileType: 'pdf',
            fileSize: 1048576,
          },
        ];
      }

      if (hasQuiz && quizTitle) {
        const choiceTypes: QuizQuestionType[] = ['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'];
        payload.quiz = {
          title: quizTitle,
          passingScore: parseInt(quizPassScore, 10) || 70,
          timeLimit: parseInt(quizTimeLimit, 10) || undefined,
          maxAttempts: parseInt(quizMaxAttempts, 10) || 1,
          questions: quizQuestions
            .filter((q) => q.questionText.trim().length > 0)
            .map((q) => ({
              questionText: q.questionText,
              type: q.type,
              points: q.points,
              orderIndex: q.orderIndex,
              ...(choiceTypes.includes(q.type)
                ? { options: q.options.map((o) => ({ text: o.optionText, isCorrect: o.isCorrect })) }
                : {}),
              ...(q.type === 'SHORT_ANSWER' && q.correctAnswer ? { correctAnswer: q.correctAnswer } : {}),
            })),
        };
      }

      await fetchApi(
        sectionId
          ? `/courses/sections/${sectionId}/lessons`
          : `/courses/modules/${moduleId}/lessons`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      resetForm();
      onClose();
      onCreated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create lesson'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label="Create New Lesson"
      panelClassName="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-5 my-8"
    >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Create New Lesson</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Lesson Title (English)</label>
              <input
                type="text"
                required
                value={lessonTitleEn}
                onChange={(e) => setLessonTitleEn(e.target.value)}
                placeholder="e.g. Newton's First Law"
                className="glass-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Lesson Title (Arabic)</label>
              <input
                type="text"
                value={lessonTitleAr}
                onChange={(e) => setLessonTitleAr(e.target.value)}
                placeholder="مثال: قانون نيوتن الأول"
                dir="rtl"
                className="glass-input w-full text-xs"
              />
            </div>
          </div>

          <input
            type="text"
            hidden
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Estimated Duration (Minutes)</label>
            <input
              type="number"
              value={lessonDuration}
              onChange={(e) => setLessonDuration(e.target.value)}
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Lesson Notes / Overview</label>
            <textarea
              rows={2}
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              placeholder="Key concepts explained in this lesson..."
              className="glass-input w-full text-xs"
            />
          </div>

          {/* Optional Video Section */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVideo}
                onChange={(e) => setHasVideo(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <VideoIcon className="w-3.5 h-3.5 text-indigo-400" />
                Attach Video Lecture (Optional)
              </span>
            </label>

            {hasVideo && (
              <div className="space-y-3 pt-2">
                <VideoUploader onUploadComplete={(url: string) => setVideoUrl(url)} />
                <input
                  type="text"
                  placeholder="Or paste Direct Video URL (MP4 / HLS stream)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="glass-input w-full text-xs"
                />
              </div>
            )}
          </div>

          {/* Optional Material Section */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasMaterial}
                onChange={(e) => setHasMaterial(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Attach Study Document / PDF (Optional)
              </span>
            </label>

            {hasMaterial && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <input
                  type="text"
                  placeholder="Document Title (e.g. Summary PDF)"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  className="glass-input w-full text-xs"
                />
                <input
                  type="text"
                  placeholder="Document File URL"
                  value={materialUrl}
                  onChange={(e) => setMaterialUrl(e.target.value)}
                  className="glass-input w-full text-xs"
                />
              </div>
            )}
          </div>

          {/* Optional Quiz Builder Section */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasQuiz}
                onChange={(e) => setHasQuiz(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                Attach Interactive MCQ Quiz (Optional)
              </span>
            </label>

            {hasQuiz && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Quiz Title (e.g. Chapter 1 Checkpoint)"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="glass-input w-full text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Passing Score % (e.g. 70)"
                    value={quizPassScore}
                    onChange={(e) => setQuizPassScore(e.target.value)}
                    className="glass-input w-full text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Time Limit in minutes (blank = no limit)"
                    value={quizTimeLimit}
                    onChange={(e) => setQuizTimeLimit(e.target.value)}
                    className="glass-input w-full text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Max Attempts (e.g. 2)"
                    value={quizMaxAttempts}
                    onChange={(e) => setQuizMaxAttempts(e.target.value)}
                    className="glass-input w-full text-xs"
                  />
                </div>

                {/* Question List */}
                <div className="space-y-3">
                  {quizQuestions.map((q, qIdx) => {
                    const isChoice = q.type === 'MCQ' || q.type === 'TRUE_FALSE' || q.type === 'MULTIPLE_SELECT';
                    return (
                      <div key={qIdx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Question ${qIdx + 1} Text`}
                            value={q.questionText}
                            onChange={(e) => {
                              const next = [...quizQuestions];
                              next[qIdx].questionText = e.target.value;
                              setQuizQuestions(next);
                            }}
                            className="glass-input w-full text-xs font-semibold"
                          />
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const type = e.target.value as QuizQuestionType;
                              const next = [...quizQuestions];
                              next[qIdx].type = type;
                              if (type === 'TRUE_FALSE') {
                                next[qIdx].options = [
                                  { optionText: 'True', isCorrect: true, orderIndex: 1 },
                                  { optionText: 'False', isCorrect: false, orderIndex: 2 },
                                ];
                              } else if (isChoice && next[qIdx].options.length < 2) {
                                next[qIdx].options = [
                                  { optionText: '', isCorrect: true, orderIndex: 1 },
                                  { optionText: '', isCorrect: false, orderIndex: 2 },
                                ];
                              }
                              setQuizQuestions(next);
                            }}
                            className="glass-input text-xs shrink-0 w-36"
                          >
                            <option value="MCQ">Multiple Choice</option>
                            <option value="TRUE_FALSE">True / False</option>
                            <option value="MULTIPLE_SELECT">Multiple Select</option>
                            <option value="SHORT_ANSWER">Short Answer</option>
                            <option value="ESSAY">Essay</option>
                          </select>
                        </div>

                        {/* Choice options */}
                        {isChoice && (
                          <div className="pl-4 space-y-1.5">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <input
                                  type={q.type === 'MULTIPLE_SELECT' ? 'checkbox' : 'radio'}
                                  name={`correct-opt-${qIdx}`}
                                  checked={opt.isCorrect}
                                  onChange={() => {
                                    const next = [...quizQuestions];
                                    if (q.type === 'MULTIPLE_SELECT') {
                                      next[qIdx].options[oIdx].isCorrect = !next[qIdx].options[oIdx].isCorrect;
                                    } else {
                                      next[qIdx].options.forEach((o, i) => {
                                        o.isCorrect = i === oIdx;
                                      });
                                    }
                                    setQuizQuestions(next);
                                  }}
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <input
                                  type="text"
                                  placeholder={`Option ${oIdx + 1}`}
                                  disabled={q.type === 'TRUE_FALSE'}
                                  value={opt.optionText}
                                  onChange={(e) => {
                                    const next = [...quizQuestions];
                                    next[qIdx].options[oIdx].optionText = e.target.value;
                                    setQuizQuestions(next);
                                  }}
                                  className="glass-input flex-1 text-xs disabled:opacity-60"
                                />
                                {q.type !== 'TRUE_FALSE' && q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...quizQuestions];
                                      next[qIdx].options.splice(oIdx, 1);
                                      setQuizQuestions(next);
                                    }}
                                    className="text-[10px] text-slate-500 hover:text-red-400 font-bold"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                            {q.type !== 'TRUE_FALSE' && (
                              <button
                                type="button"
                                onClick={() => addOptionToQuestion(qIdx)}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                              >
                                + Add Option
                              </button>
                            )}
                          </div>
                        )}

                        {/* Short answer expected text */}
                        {q.type === 'SHORT_ANSWER' && (
                          <input
                            type="text"
                            placeholder="Expected answer (case-insensitive, e.g. paris)"
                            value={q.correctAnswer || ''}
                            onChange={(e) => {
                              const next = [...quizQuestions];
                              next[qIdx].correctAnswer = e.target.value;
                              setQuizQuestions(next);
                            }}
                            className="glass-input w-full text-xs ml-4"
                          />
                        )}

                        {/* Essay note */}
                        {q.type === 'ESSAY' && (
                          <p className="text-[10px] text-slate-500 ml-4 italic">
                            Essay answers are flagged for your manual review after submission.
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                  >
                    + Add Another Question
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="glass-button py-2 px-5 rounded-xl text-xs font-bold"
            >
              {loading ? 'Creating Lesson...' : 'Save Lesson & Content'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
