'use client';

import React, { useState } from 'react';
import { X, FileText, HelpCircle, Trash2, Plus, Upload } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { errorMessage } from '../../../lib/apiTypes';
import Modal from '@/components/ui/Modal';

export interface EditableLessonMaterial {
  id: string;
  title?: string | null;
  fileUrl?: string | null;
}

export interface EditableQuizOption {
  optionText: string;
  isCorrect: boolean;
}

export interface EditableQuizQuestion {
  questionText: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY';
  points: number;
  correctAnswer?: string;
  options: EditableQuizOption[];
}

export interface EditableQuiz {
  id: string;
  titleEn?: string | null;
  passingScore?: number | null;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  questions?: any[];
}

export interface EditableLesson {
  id: string;
  titleEn?: string | null;
  titleAr?: string | null;
  content?: string | null;
  estimatedDuration?: number | null;
  materials?: EditableLessonMaterial[];
  quiz?: EditableQuiz | null;
  video?: { id?: string; videoUrl?: string | null; originalFileName?: string | null } | null;
}

interface EditableAssignmentRow {
  id: string;
  titleEn?: string | null;
  maxScore?: number | null;
  dueDate?: string | null;
  maxAttempts?: number | null;
}

type TabId = 'details' | 'attachments' | 'media';

interface EditLessonModalProps {
  open: boolean;
  lesson: EditableLesson | null;
  onClose: () => void;
  onUpdated: () => void;
}

const CHOICE_TYPES = ['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'];

const blankQuestion = (): EditableQuizQuestion => ({
  questionText: '',
  type: 'MCQ',
  points: 10,
  options: [
    { optionText: '', isCorrect: true },
    { optionText: '', isCorrect: false },
  ],
});

/** Maps a DB Question row back into builder state. */
function questionFromRow(row: any): EditableQuizQuestion {
  const rawOptions = Array.isArray(row?.options) ? row.options : [];
  return {
    questionText: row?.questionText || '',
    type: row?.type || 'MCQ',
    points: row?.points || 10,
    correctAnswer: row?.correctAnswer || undefined,
    options: rawOptions.map((o: any) => ({
      optionText: o.text ?? o.optionText ?? '',
      isCorrect: o.isCorrect === true,
    })),
  };
}

/**
 * Full lesson editor for the owning teacher:
 * - Details tab: bilingual titles, duration, notes.
 * - Docs & Quiz tab: upload/attach study documents and build or edit the
 *   attached quiz. Remount via key={lesson.id} so state matches the row.
 */
export default function EditLessonModal({ open, lesson, onClose, onUpdated }: EditLessonModalProps) {
  const [tab, setTab] = useState<TabId>('details');

  // --- Details state ---
  const [titleEn, setTitleEn] = useState(lesson?.titleEn || '');
  const [titleAr, setTitleAr] = useState(lesson?.titleAr || '');
  const [duration, setDuration] = useState(
    lesson?.estimatedDuration !== undefined && lesson?.estimatedDuration !== null
      ? String(lesson.estimatedDuration)
      : '30'
  );
  const [content, setContent] = useState(lesson?.content || '');

  // --- Docs state ---
  const [materials, setMaterials] = useState<EditableLessonMaterial[]>(lesson?.materials || []);
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // --- Quiz state ---
  const existingQuiz = lesson?.quiz || null;
  const [hasAttachedQuiz, setHasAttachedQuiz] = useState(!!existingQuiz);
  // The builder is OPT-IN: lessons can have documents only, or quizzes only.
  // It opens automatically for editing an already-attached quiz.
  const [showQuizBuilder, setShowQuizBuilder] = useState(!!existingQuiz);
  const [quizTitle, setQuizTitle] = useState(existingQuiz?.titleEn || '');
  const [quizPassScore, setQuizPassScore] = useState(String(existingQuiz?.passingScore ?? 70));
  const [quizTimeLimit, setQuizTimeLimit] = useState(
    existingQuiz?.timeLimit ? String(existingQuiz.timeLimit) : ''
  );
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(String(existingQuiz?.maxAttempts ?? 1));
  const [questions, setQuestions] = useState<EditableQuizQuestion[]>(
    existingQuiz?.questions?.length
      ? existingQuiz.questions.map(questionFromRow)
      : [blankQuestion()]
  );
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizMessage, setQuizMessage] = useState('');

  // --- Video & Assignments state (media tab) ---
  const [video, setVideo] = useState(lesson?.video || null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  const [assignments, setAssignments] = useState<EditableAssignmentRow[]>([]);
  const [assignmentEdits, setAssignmentEdits] = useState<Record<string, { titleEn: string; maxScore: string; dueDate: string; maxAttempts: string }>>({});
  const [newAssignment, setNewAssignment] = useState({ titleEn: '', maxScore: '100', dueDate: '', maxAttempts: '1' });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open || !lesson) return null;

  // ---------- Assignments ----------
  const loadAssignments = async () => {
    try {
      const res = await fetchApi(`/assignments/lesson/${lesson.id}`);
      const rows: EditableAssignmentRow[] = Array.isArray(res.data) ? res.data : [];
      setAssignments(rows);
      setAssignmentEdits(
        Object.fromEntries(
          rows.map((a) => [
            a.id,
            {
              titleEn: a.titleEn || '',
              maxScore: String(a.maxScore ?? 100),
              dueDate: a.dueDate ? String(a.dueDate).slice(0, 16) : '',
              maxAttempts: String(a.maxAttempts ?? 1),
            },
          ])
        )
      );
    } catch {
      // Lesson may simply have no assignments yet.
      setAssignments([]);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.titleEn.trim()) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/assignments/lesson/${lesson.id}`, {
        method: 'POST',
        body: JSON.stringify({
          titleEn: newAssignment.titleEn.trim(),
          maxScore: parseInt(newAssignment.maxScore, 10) || 100,
          maxAttempts: parseInt(newAssignment.maxAttempts, 10) || 1,
          ...(newAssignment.dueDate ? { dueDate: new Date(newAssignment.dueDate).toISOString() } : {}),
        }),
      });
      setNewAssignment({ titleEn: '', maxScore: '100', dueDate: '', maxAttempts: '1' });
      await loadAssignments();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create assignment'));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAssignment = async (id: string) => {
    const edit = assignmentEdits[id];
    if (!edit?.titleEn.trim()) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titleEn: edit.titleEn.trim(),
          maxScore: parseInt(edit.maxScore, 10) || 100,
          maxAttempts: parseInt(edit.maxAttempts, 10) || 1,
          ...(edit.dueDate ? { dueDate: new Date(edit.dueDate).toISOString() } : { dueDate: null }),
        }),
      });
      await loadAssignments();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update assignment'));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Delete this assignment and its submissions?')) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/assignments/${id}`, { method: 'DELETE' });
      await loadAssignments();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete assignment'));
    } finally {
      setBusy(false);
    }
  };

  // ---------- Video ----------
  const handleAttachVideo = async () => {
    if (!newVideoUrl.trim()) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/courses/lessons/${lesson.id}/video`, {
        method: 'POST',
        body: JSON.stringify({
          videoUrl: newVideoUrl.trim(),
          title: newVideoTitle.trim() || titleEn.trim() || 'lesson-video.mp4',
        }),
      });
      setVideo({
        videoUrl: newVideoUrl.trim(),
        originalFileName: newVideoTitle.trim() || titleEn.trim() || 'lesson-video.mp4',
      });
      setNewVideoUrl('');
      setNewVideoTitle('');
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to attach video'));
    } finally {
      setBusy(false);
    }
  };

  const handleDetachVideo = async () => {
    if (!window.confirm('Remove the attached video from this lesson?')) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/courses/lessons/${lesson.id}/video`, { method: 'DELETE' });
      setVideo(null);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to remove video'));
    } finally {
      setBusy(false);
    }
  };

  // ---------- Details ----------
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setBusy(true);
    setError('');

    try {
      await fetchApi(`/courses/lessons/${lesson.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titleEn: titleEn.trim(),
          ...(titleAr.trim() ? { titleAr: titleAr.trim() } : {}),
          content,
          estimatedDuration: parseInt(duration, 10) || 0,
        }),
      });

      onClose();
      onUpdated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update lesson'));
    } finally {
      setBusy(false);
    }
  };

  // ---------- Documents ----------
  const refreshMaterials = async () => {
    try {
      const res = await fetchApi(`/materials/lesson/${lesson.id}`);
      if (Array.isArray(res.data)) setMaterials(res.data);
    } catch {
      // Keep local list; parent refresh will reconcile anyway.
    }
  };

  const handleUploadDocFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after an upload
    if (!file) return;

    setUploadingDoc(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('lessonId', lesson.id);
      fd.append('title', docTitle.trim() || file.name);
      await fetchApi('/materials/upload', { method: 'POST', body: fd });
      setDocTitle('');
      await refreshMaterials();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to upload document'));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleAttachDocUrl = async () => {
    if (!docTitle.trim() || !docUrl.trim()) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/courses/lessons/${lesson.id}/material`, {
        method: 'POST',
        body: JSON.stringify({ title: docTitle.trim(), fileUrl: docUrl.trim(), fileType: 'pdf' }),
      });
      setDocTitle('');
      setDocUrl('');
      await refreshMaterials();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to attach document'));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDoc = async (materialId: string) => {
    if (!window.confirm('Remove this document from the lesson?')) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/materials/${materialId}`, { method: 'DELETE' });
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to remove document'));
    } finally {
      setBusy(false);
    }
  };

  // ---------- Quiz ----------
  const addQuestion = () =>
    setQuestions((prev) => [
      ...prev,
      {
        questionText: '',
        type: 'MCQ',
        points: 10,
        options: [
          { optionText: '', isCorrect: true },
          { optionText: '', isCorrect: false },
        ],
      },
    ]);

  const updateQuestion = (qIdx: number, patch: Partial<EditableQuizQuestion>) =>
    setQuestions((prev) => prev.map((q, i) => (i === qIdx ? { ...q, ...patch } : q)));

  const removeQuestion = (qIdx: number) =>
    setQuestions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== qIdx) : prev));

  const resetQuizForm = () => {
    setQuizTitle('');
    setQuizPassScore('70');
    setQuizTimeLimit('');
    setQuizMaxAttempts('1');
    setQuestions([blankQuestion()]);
  };

  const handleCollapseQuizBuilder = () => {
    setShowQuizBuilder(false);
    setQuizMessage('');
    setError('');
    resetQuizForm();
  };

  const handleDetachQuiz = async () => {
    if (!window.confirm('Remove the quiz from this lesson? Students will no longer see it.')) return;

    setSavingQuiz(true);
    setError('');
    setQuizMessage('');
    try {
      await fetchApi(`/courses/lessons/${lesson.id}/quiz`, { method: 'DELETE' });
      setHasAttachedQuiz(false);
      setShowQuizBuilder(false);
      resetQuizForm();
      onUpdated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to remove quiz'));
    } finally {
      setSavingQuiz(false);
    }
  };

  const buildQuestionsPayload = () =>
    questions
      .filter((q) => q.questionText.trim().length > 0)
      .map((q, i) => ({
        questionText: q.questionText.trim(),
        type: q.type,
        points: q.points,
        orderIndex: i + 1,
        ...(CHOICE_TYPES.includes(q.type)
          ? { options: q.options.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect })) }
          : {}),
        ...(q.type === 'SHORT_ANSWER' && q.correctAnswer ? { correctAnswer: q.correctAnswer } : {}),
      }));

  const handleSaveQuiz = async () => {
    const payloadQuestions = buildQuestionsPayload();
    if (payloadQuestions.length === 0) {
      setError('Add at least one question with text before saving.');
      return;
    }

    setSavingQuiz(true);
    setError('');
    setQuizMessage('');

    try {
      if (hasAttachedQuiz && existingQuiz) {
        // Wholesale replace of the quiz definition + questions.
        await fetchApi(`/quizzes/${existingQuiz.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            titleEn: quizTitle.trim(),
            titleAr: quizTitle.trim(),
            passingScore: parseInt(quizPassScore, 10) || 50,
            timeLimit: parseInt(quizTimeLimit, 10) || null,
            maxAttempts: parseInt(quizMaxAttempts, 10) || 1,
            questions: payloadQuestions,
          }),
        });
        setQuizMessage('Quiz updated successfully!');
      } else {
        await fetchApi(`/courses/lessons/${lesson.id}/quiz`, {
          method: 'POST',
          body: JSON.stringify({
            title: quizTitle.trim(),
            passingScore: parseInt(quizPassScore, 10) || 70,
            timeLimit: parseInt(quizTimeLimit, 10) || undefined,
            maxAttempts: parseInt(quizMaxAttempts, 10) || 1,
            questions: payloadQuestions,
          }),
        });
        setHasAttachedQuiz(true);
        setQuizMessage('Quiz attached successfully!');
      }
      onUpdated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to save quiz'));
    } finally {
      setSavingQuiz(false);
    }
  };

  const inputCls = 'glass-input w-full text-xs';

  return (
    <Modal
      open
      onClose={onClose}
      label="Edit Lesson"
      panelClassName="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4 my-8"
    >
      <>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Edit Lesson</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            ['details', 'Details'],
            ['attachments', 'Docs & Quiz'],
            ['media', 'Video & Assignments'],
          ] as [TabId, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                if (id === 'media') loadAssignments();
              }}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                tab === id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Lesson Title (English)</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g. Newton's First Law"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Lesson Title (Arabic)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  placeholder="مثال: قانون نيوتن الأول"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Estimated Duration (Minutes)</label>
              <input
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Lesson Notes / Overview</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Key concepts explained in this lesson..."
                className={inputCls}
              />
            </div>

            {error && (
              <p role="alert" className="text-xs text-rose-400">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="glass-button py-2 px-5 rounded-xl text-xs font-bold"
              >
                {busy ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {tab === 'attachments' && (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {/* ---- Documents ---- */}
            <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" /> Study Documents
              </h4>

              {(materials.length || 0) > 0 && (
                <ul className="space-y-1.5">
                  {materials.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800"
                    >
                      <span className="text-xs text-slate-200 truncate">{m.title || m.fileUrl}</span>
                      <button
                        onClick={() => handleDeleteDoc(m.id)}
                        disabled={busy}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                        title="Remove document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Document Title (used for URL attach)"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="text"
                  placeholder="Or paste a direct file URL"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="py-1.5 px-3 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> {uploadingDoc ? 'Uploading...' : 'Upload File'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,image/*,audio/*"
                    onChange={handleUploadDocFile}
                    disabled={uploadingDoc}
                  />
                </label>
                <span className="text-[10px] text-slate-500">pdf, office docs, text, images, audio — up to 50MB</span>
                <button
                  type="button"
                  onClick={handleAttachDocUrl}
                  disabled={busy || !docTitle.trim() || !docUrl.trim()}
                  className="ml-auto py-1.5 px-3 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-bold hover:bg-indigo-600/40 disabled:opacity-40 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Attach by URL
                </button>
              </div>
            </section>

            {/* ---- Quiz (fully optional: attach, edit, or none) ---- */}
            <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  Lesson Quiz{' '}
                  <span className="text-[10px] font-medium text-slate-500">
                    (optional — {hasAttachedQuiz ? 'attached' : 'none'})
                  </span>
                </h4>
                {!hasAttachedQuiz && !showQuizBuilder && (
                  <button
                    type="button"
                    onClick={() => setShowQuizBuilder(true)}
                    className="py-1.5 px-3 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs font-bold hover:bg-emerald-600/40 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Quiz
                  </button>
                )}
              </div>

              {!hasAttachedQuiz && !showQuizBuilder ? (
                <p className="text-[11px] text-slate-500 italic">
                  No quiz attached. This lesson can have documents only, a quiz only, both — or neither.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                      {hasAttachedQuiz ? 'Editing attached quiz' : 'New quiz'}
                    </span>
                    {hasAttachedQuiz ? (
                      <button
                        type="button"
                        onClick={handleDetachQuiz}
                        disabled={savingQuiz}
                        className="text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg font-bold transition disabled:opacity-40 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Quiz
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCollapseQuizBuilder}
                        className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Quiz Title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className={`${inputCls} sm:col-span-2`}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Pass %"
                  value={quizPassScore}
                  onChange={(e) => setQuizPassScore(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Max Attempts"
                  value={quizMaxAttempts}
                  onChange={(e) => setQuizMaxAttempts(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Time limit minutes (blank = none)"
                  value={quizTimeLimit}
                  onChange={(e) => setQuizTimeLimit(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {questions.map((q, qIdx) => {
                  const isChoice = CHOICE_TYPES.includes(q.type);
                  return (
                    <div key={qIdx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Question ${qIdx + 1} Text`}
                          value={q.questionText}
                          onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
                          className={`${inputCls} font-semibold`}
                        />
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const type = e.target.value as EditableQuizQuestion['type'];
                            if (type === 'TRUE_FALSE') {
                              updateQuestion(qIdx, {
                                type,
                                options: [
                                  { optionText: 'True', isCorrect: true },
                                  { optionText: 'False', isCorrect: false },
                                ],
                              });
                            } else {
                              updateQuestion(qIdx, { type });
                            }
                          }}
                          className="glass-input text-xs shrink-0 w-36"
                        >
                          <option value="MCQ">Multiple Choice</option>
                          <option value="TRUE_FALSE">True / False</option>
                          <option value="MULTIPLE_SELECT">Multiple Select</option>
                          <option value="SHORT_ANSWER">Short Answer</option>
                          <option value="ESSAY">Essay</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          disabled={questions.length <= 1}
                          className="p-1 rounded text-slate-500 hover:text-red-400 disabled:opacity-30"
                          title="Remove question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pl-1">
                        <label className="text-[10px] text-slate-500">Points</label>
                        <input
                          type="number"
                          min={1}
                          value={q.points}
                          onChange={(e) => updateQuestion(qIdx, { points: parseInt(e.target.value, 10) || 1 })}
                          className="glass-input w-16 text-xs"
                        />
                      </div>

                      {isChoice && (
                        <div className="pl-4 space-y-1.5">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                type={q.type === 'MULTIPLE_SELECT' ? 'checkbox' : 'radio'}
                                name={`edit-correct-opt-${qIdx}`}
                                checked={opt.isCorrect}
                                onChange={() =>
                                  updateQuestion(qIdx, {
                                    options: q.options.map((o, i) => ({
                                      ...o,
                                      isCorrect:
                                        q.type === 'MULTIPLE_SELECT' ? i === oIdx ? !o.isCorrect : o.isCorrect : i === oIdx,
                                    })),
                                  })
                                }
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <input
                                type="text"
                                placeholder={`Option ${oIdx + 1}`}
                                disabled={q.type === 'TRUE_FALSE'}
                                value={opt.optionText}
                                onChange={(e) =>
                                  updateQuestion(qIdx, {
                                    options: q.options.map((o, i) =>
                                      i === oIdx ? { ...o, optionText: e.target.value } : o
                                    ),
                                  })
                                }
                                className="glass-input flex-1 text-xs disabled:opacity-60"
                              />
                              {q.type !== 'TRUE_FALSE' && q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuestion(qIdx, { options: q.options.filter((_, i) => i !== oIdx) })
                                  }
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
                              onClick={() =>
                                updateQuestion(qIdx, {
                                  options: [...q.options, { optionText: '', isCorrect: false }],
                                })
                              }
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                            >
                              + Add Option
                            </button>
                          )}
                        </div>
                      )}

                      {q.type === 'SHORT_ANSWER' && (
                        <input
                          type="text"
                          placeholder="Expected answer (case-insensitive)"
                          value={q.correctAnswer || ''}
                          onChange={(e) => updateQuestion(qIdx, { correctAnswer: e.target.value })}
                          className={`${inputCls} ml-4`}
                        />
                      )}

                      {q.type === 'ESSAY' && (
                        <p className="text-[10px] text-slate-500 ml-4 italic">
                          Essay answers are flagged for manual review after submission.
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

              {quizMessage && (
                <p className="text-xs text-emerald-400">{quizMessage}</p>
              )}
              {error && tab === 'attachments' && (
                <p role="alert" className="text-xs text-rose-400">{error}</p>
              )}

                  <div className="flex justify-end gap-2 pt-1">
                    {!hasAttachedQuiz && (
                      <button
                        type="button"
                        onClick={handleCollapseQuizBuilder}
                        className="py-2 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveQuiz}
                      disabled={savingQuiz}
                      className="glass-button py-2 px-5 rounded-xl text-xs font-bold"
                    >
                      {savingQuiz ? 'Saving...' : hasAttachedQuiz ? 'Update Quiz' : 'Attach Quiz to Lesson'}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {tab === 'media' && (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {/* ---- Video ---- */}
            <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                ▶ Video Lecture
              </h4>

              {video?.videoUrl ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-200 truncate">
                    {video.originalFileName || video.videoUrl}
                  </span>
                  <button
                    onClick={handleDetachVideo}
                    disabled={busy}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                    title="Remove video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No video attached (optional).</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Video title (optional)"
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="text"
                  placeholder="Direct video URL or uploaded path (/uploads/...)"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={handleAttachVideo}
                disabled={busy || !newVideoUrl.trim()}
                className="py-1.5 px-3 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-bold hover:bg-indigo-600/40 disabled:opacity-40 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Attach / Replace Video
              </button>
            </section>

            {/* ---- Assignments ---- */}
            <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white">📝 Assignments</h4>

              {assignments.length === 0 && (
                <p className="text-[11px] text-slate-500 italic">No assignments for this lesson yet.</p>
              )}

              {assignments.map((a) => {
                const edit = assignmentEdits[a.id];
                if (!edit) return null;
                return (
                  <div key={a.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <input
                      type="text"
                      value={edit.titleEn}
                      onChange={(e) =>
                        setAssignmentEdits((prev) => ({
                          ...prev,
                          [a.id]: { ...prev[a.id], titleEn: e.target.value },
                        }))
                      }
                      placeholder="Assignment title"
                      className={inputCls}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        min={1}
                        value={edit.maxScore}
                        onChange={(e) =>
                          setAssignmentEdits((prev) => ({
                            ...prev,
                            [a.id]: { ...prev[a.id], maxScore: e.target.value },
                          }))
                        }
                        placeholder="Max score"
                        className={inputCls}
                      />
                      <input
                        type="datetime-local"
                        value={edit.dueDate}
                        onChange={(e) =>
                          setAssignmentEdits((prev) => ({
                            ...prev,
                            [a.id]: { ...prev[a.id], dueDate: e.target.value },
                          }))
                        }
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min={1}
                        value={edit.maxAttempts}
                        onChange={(e) =>
                          setAssignmentEdits((prev) => ({
                            ...prev,
                            [a.id]: { ...prev[a.id], maxAttempts: e.target.value },
                          }))
                        }
                        placeholder="Attempts"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(a.id)}
                        disabled={busy}
                        className="text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg font-bold transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAssignment(a.id)}
                        disabled={busy}
                        className="py-1 px-3 rounded-lg bg-emerald-600/20 text-emerald-300 text-[10px] font-bold hover:bg-emerald-600/40 disabled:opacity-40"
                      >
                        Save Assignment
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* New assignment */}
              <div className="p-3 rounded-xl border border-dashed border-slate-700 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">New assignment</p>
                <input
                  type="text"
                  placeholder="Assignment title"
                  value={newAssignment.titleEn}
                  onChange={(e) => setNewAssignment({ ...newAssignment, titleEn: e.target.value })}
                  className={inputCls}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={newAssignment.maxScore}
                    onChange={(e) => setNewAssignment({ ...newAssignment, maxScore: e.target.value })}
                    placeholder="Max score"
                    className={inputCls}
                  />
                  <input
                    type="datetime-local"
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="number"
                    min={1}
                    value={newAssignment.maxAttempts}
                    onChange={(e) => setNewAssignment({ ...newAssignment, maxAttempts: e.target.value })}
                    placeholder="Attempts"
                    className={inputCls}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateAssignment}
                    disabled={busy || !newAssignment.titleEn.trim()}
                    className="py-1.5 px-3 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-bold hover:bg-indigo-600/40 disabled:opacity-40 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Assignment
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </>
    </Modal>
  );
}
