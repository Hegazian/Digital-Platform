'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  FileText,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';

interface CourseLite {
  id: string;
  titleEn: string;
  titleAr?: string | null;
  modules?: Array<{ id: string; titleEn: string; lessons?: Array<{ id: string; titleEn: string; assignments?: any[] }> }>;
  sections?: Array<{ id: string; titleEn: string; lessons?: Array<{ id: string; titleEn: string }> }>;
}

interface Assignment {
  id: string;
  lessonId: string | null;
  titleEn: string;
  instructions?: string | null;
  maxScore: number;
  dueDate?: string | null;
  allowLateSubmission: boolean;
  maxAttempts: number;
}

interface Submission {
  id: string;
  studentId: string;
  status: string;
  score?: number | null;
  feedback?: string | null;
  submissionText?: string | null;
  submittedAt: string;
  student?: { name: string; email: string };
  files?: Array<{ fileName: string; fileUrl: string }>;
}

/**
 * Assignment Studio (FR-TEACHER-009/010):
 * - Build assignments per lesson (title, instructions, deadline, max score, late policy)
 * - Grading inbox: review submissions and grade with score + feedback
 */
export default function AssignmentStudio() {
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');

  // Builder form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [allowLate, setAllowLate] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState('1');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradingAssignmentId, setGradingAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { score: string; feedback: string }>>({});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const course = courses.find((c) => c.id === courseId);
  const lessons = [
    ...(course?.modules || []).flatMap((m) => (m.lessons || []).map((l) => ({ ...l, moduleName: m.titleEn }))),
    ...(course?.sections || []).flatMap((s) => (s.lessons || []).map((l) => ({ ...l, moduleName: s.titleEn }))),
  ];

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      if (courses.length === 0) {
        const mine = await fetchApi('/courses/teacher/my-courses');
        setCourses(mine.data || []);
        if (!courseId && mine.data?.[0]) setCourseId(mine.data[0].id);
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load courses'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAssignmentsForLesson = useCallback(async (lid: string) => {
    setAssignments([]);
    if (!lid) return;
    try {
      const res = await fetchApi(`/assignments/lesson/${lid}`);
      setAssignments(res.data || []);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load assignments for this lesson'));
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (lessonId) loadAssignmentsForLesson(lessonId);
    else setAssignments([]);
  }, [lessonId, loadAssignmentsForLesson]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setInstructions('');
    setDueDate('');
    setMaxScore('100');
    setAllowLate(true);
    setMaxAttempts('1');
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonId) return;
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const body: any = {
        titleEn: title,
        instructions,
        maxScore: parseFloat(maxScore) || 100,
        allowLateSubmission: allowLate,
        maxAttempts: parseInt(maxAttempts, 10) || 1,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      };

      if (editingId) {
        await fetchApi(`/assignments/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
        setMessage('Assignment updated successfully!');
      } else {
        await fetchApi(`/assignments/lesson/${lessonId}`, { method: 'POST', body: JSON.stringify(body) });
        setMessage('Assignment created successfully!');
      }

      resetForm();
      await loadAssignmentsForLesson(lessonId);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to save assignment'));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (a: Assignment) => {
    setEditingId(a.id);
    setTitle(a.titleEn);
    setInstructions(a.instructions || '');
    setDueDate(a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 10) : '');
    setMaxScore(String(a.maxScore ?? 100));
    setAllowLate(a.allowLateSubmission !== false);
    setMaxAttempts(String(a.maxAttempts ?? 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Delete this assignment? Existing submissions will be removed.')) return;
    setError('');
    try {
      await fetchApi(`/assignments/${id}`, { method: 'DELETE' });
      setMessage('Assignment deleted.');
      if (gradingAssignmentId === id) {
        setGradingAssignmentId('');
        setSubmissions([]);
      }
      await loadAssignmentsForLesson(lessonId);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete assignment'));
    }
  };

  const openGradingInbox = async (assignmentId: string) => {
    setGradingAssignmentId(assignmentId);
    setSubmissions([]);
    if (!assignmentId) return;
    try {
      const res = await fetchApi(`/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data || []);
      const drafts: Record<string, { score: string; feedback: string }> = {};
      for (const s of res.data || []) {
        drafts[s.id] = { score: s.score != null ? String(s.score) : '', feedback: s.feedback || '' };
      }
      setGradeDrafts(drafts);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load submissions'));
    }
  };

  const handleGrade = async (submissionId: string) => {
    const draft = gradeDrafts[submissionId];
    if (!draft || draft.score === '') return;
    setError('');
    try {
      await fetchApi(`/assignments/submissions/${submissionId}/grade`, {
        method: 'POST',
        body: JSON.stringify({ score: parseFloat(draft.score), feedback: draft.feedback || undefined }),
      });
      setMessage('Grade saved — the student can now see the result.');
      await openGradingInbox(gradingAssignmentId);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to save grade'));
    }
  };

  const inputCls = 'glass-input w-full text-xs';
  const labelCls = 'block text-[11px] font-semibold text-slate-400 mb-1';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Assignment Studio</h2>
        <p className="text-sm text-slate-400">Build assignments per lesson and grade student submissions</p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Scope selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5 glass-panel rounded-2xl border border-slate-800">
        <div>
          <label className={labelCls}>Course</label>
          <select
            value={courseId}
            onChange={(e) => { setCourseId(e.target.value); setLessonId(''); }}
            className={inputCls}
          >
            <option value="">— Select course —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.titleEn}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Lesson</label>
          <select
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            className={inputCls}
            disabled={!course}
          >
            <option value="">— Select lesson —</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>{l.moduleName} · {l.titleEn}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Builder */}
      {lessonId && (
        <form onSubmit={handleSaveAssignment} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {editingId ? <><Edit3 className="w-4 h-4 text-indigo-400" /> Edit Assignment</> : <><Plus className="w-4 h-4 text-indigo-400" /> New Assignment</>}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title *</label>
              <input required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 2 Problem Set" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deadline</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Instructions</label>
            <textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="What should students do? Include resources and expectations." className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Max Score *</label>
              <input required type="number" min="1" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Attempts</label>
              <input type="number" min="1" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Late Submissions</label>
              <select value={allowLate ? 'yes' : 'no'} onChange={(e) => setAllowLate(e.target.value === 'yes')} className={inputCls}>
                <option value="yes">Allowed (marked LATE)</option>
                <option value="no">Blocked after deadline</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                Cancel Edit
              </button>
            )}
            <button type="submit" disabled={loading} className="glass-button py-2 px-5 rounded-xl text-xs font-bold disabled:opacity-50">
              {editingId ? 'Save Changes' : 'Create Assignment'}
            </button>
          </div>
        </form>
      )}

      {/* Existing assignments on this lesson */}
      {lessonId && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" /> Assignments on this lesson ({assignments.length})
          </h3>
          {assignments.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 glass-panel rounded-xl border border-slate-800">No assignments yet. Create one above.</p>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">{a.titleEn}</p>
                  <div className="flex flex-wrap gap-x-3 text-[11px] text-slate-500 mt-0.5">
                    <span>Max {a.maxScore}</span>
                    {a.dueDate && (
                      <span className={`flex items-center gap-1 ${new Date(a.dueDate) < new Date() ? 'text-red-400' : ''}`}>
                        <Clock className="w-3 h-3" /> {new Date(a.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span>{a.allowLateSubmission ? 'Late allowed' : 'Late blocked'}</span>
                    <span>{a.maxAttempts} attempt(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={gradingAssignmentId === a.id ? a.id : ''}
                    onChange={(e) => openGradingInbox(e.target.value ? a.id : '')}
                    className="py-1.5 px-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold"
                    title="Open grading inbox"
                  >
                    <option value="">Open inbox…</option>
                    <option value={a.id}>Submissions</option>
                  </select>
                  <button onClick={() => startEdit(a)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition" title="Edit">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteAssignment(a.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Grading inbox */}
      {gradingAssignmentId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" /> Grading Inbox
            </h3>
            <button onClick={() => openGradingInbox(gradingAssignmentId)} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {submissions.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 glass-panel rounded-xl border border-slate-800">
              No submissions yet.
            </p>
          ) : (
            submissions.map((s) => (
              <div key={s.id} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-white text-sm">{s.student?.name || s.studentId}</p>
                    <p className="text-[11px] text-slate-500">
                      Submitted {new Date(s.submittedAt).toLocaleString()} ·{' '}
                      <span className={
                        s.status === 'GRADED' ? 'text-emerald-400' :
                        s.status === 'LATE' ? 'text-amber-400' : 'text-sky-400'
                      }>{s.status}</span>
                    </p>
                  </div>
                  {(s.files || []).map((f, i) => (
                    <a key={i} href={f.fileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-300 hover:underline">
                      {f.fileName}
                    </a>
                  ))}
                </div>

                {s.submissionText && (
                  <p className="text-xs text-slate-300 bg-slate-950/60 rounded-xl p-3 border border-slate-800 whitespace-pre-wrap line-clamp-6">
                    {s.submissionText}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-2 items-end">
                  <div>
                    <label className={labelCls}>Score / {assignments.find((a) => a.id === gradingAssignmentId)?.maxScore ?? 100}</label>
                    <input
                      type="number"
                      min="0"
                      value={gradeDrafts[s.id]?.score ?? ''}
                      onChange={(e) => setGradeDrafts((d) => ({ ...d, [s.id]: { ...d[s.id], score: e.target.value } }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Feedback</label>
                    <input
                      type="text"
                      value={gradeDrafts[s.id]?.feedback ?? ''}
                      onChange={(e) => setGradeDrafts((d) => ({ ...d, [s.id]: { ...d[s.id], feedback: e.target.value } }))}
                      placeholder="Visible to the student"
                      className={inputCls}
                    />
                  </div>
                  <button
                    onClick={() => handleGrade(s.id)}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                  >
                    Save Grade
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
