'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../../lib/api';
import { errorMessage } from '../../lib/apiTypes';
import { useAppStore } from '../../lib/store';
import { FileText, Send, CheckCircle2, Clock, AlertTriangle, Award, Upload } from 'lucide-react';

interface AssignmentRunnerProps {
  lessonId: string;
}

export default function AssignmentRunner({ lessonId }: AssignmentRunnerProps) {
  const { lang } = useAppStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submissionTexts, setSubmissionTexts] = useState<{ [key: string]: string }>({});
  const [uploadedFiles, setUploadedFiles] = useState<{
    [key: string]: { fileUrl: string; fileName: string; sizeBytes: number } | null;
  }>({});
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/assignments/lesson/${lessonId}`);
      if (res.success && res.data) {
        setAssignments(res.data);
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load assignments'));
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleFileSelect = async (assignmentId: string, file: File | null) => {
    if (!file) return;
    setUploadingFor(assignmentId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetchApi('/assignments/uploads', { method: 'POST', body: fd });
      setUploadedFiles((prev) => ({
        ...prev,
        [assignmentId]: {
          fileUrl: res.data.fileUrl,
          fileName: res.data.fileName,
          sizeBytes: res.data.sizeBytes,
        },
      }));
      setSuccessMessage(lang === 'ar' ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed — allowed: pdf, docx, txt, jpg, png, webp (max 20MB)');
      setUploadedFiles((prev) => ({ ...prev, [assignmentId]: null }));
    } finally {
      setUploadingFor(null);
    }
  };

  const handleSubmit = async (assignmentId: string) => {
    const text = submissionTexts[assignmentId] || '';
    const uploaded = uploadedFiles[assignmentId];

    if (!text && !uploaded?.fileUrl) {
      setError(lang === 'ar' ? 'يرجى إدخال إجابة نصية أو إرفاق ملف' : 'Please provide a text answer or attach a file');
      return;
    }

    setSubmittingId(assignmentId);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: any = {};
      if (text) payload.submissionText = text;
      if (uploaded?.fileUrl) {
        payload.files = [
          { fileUrl: uploaded.fileUrl, fileName: uploaded.fileName, sizeBytes: uploaded.sizeBytes },
        ];
      }

      const res = await fetchApi(`/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccessMessage(
          res.data?.status === 'LATE'
            ? lang === 'ar'
              ? 'تم التسليم بعد الموعد النهائي (متأخر)'
              : 'Submitted after the deadline (marked LATE)'
            : lang === 'ar'
            ? 'تم تسليم الواجب بنجاح!'
            : 'Assignment submitted successfully!'
        );
        loadAssignments();
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to submit assignment'));
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p>{lang === 'ar' ? 'جاري تحميل الواجبات...' : 'Loading assignments...'}</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {lang === 'ar' ? 'لا توجد واجبات لهذا الدرس' : 'No assignments for this lesson'}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {lang === 'ar'
            ? 'تابع مشاهدة الفيديوهات وحل الاختبارات للتقدم في الدورة.'
            : 'Continue watching videos and taking quizzes to progress.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {assignments.map((assignment) => {
        const title = lang === 'ar' ? assignment.titleAr || assignment.titleEn : assignment.titleEn;
        const mySubmissions = assignment.submissions || [];
        const latestSubmission = mySubmissions.length > 0 ? mySubmissions[0] : null;
        const isGraded = latestSubmission && latestSubmission.status === 'GRADED';
        const hasPassedDue = assignment.dueDate && new Date() > new Date(assignment.dueDate);

        return (
          <div
            key={assignment.id}
            className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  {title}
                </h3>
                {assignment.description && (
                  <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{assignment.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-800">
                  {lang === 'ar' ? `الدرجة: ${assignment.maxScore}` : `Max Score: ${assignment.maxScore}`}
                </span>

                {assignment.dueDate && (
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border flex items-center gap-1 ${
                      hasPassedDue
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {assignment.instructions && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-4 text-sm text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white mb-1">
                  {lang === 'ar' ? 'التعليمات:' : 'Instructions:'}
                </p>
                <p className="whitespace-pre-line">{assignment.instructions}</p>
              </div>
            )}

            {/* Submission Status or Grade */}
            {latestSubmission ? (
              <div className="mt-4 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isGraded ? (
                      <Award className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    )}
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {isGraded
                        ? lang === 'ar'
                          ? `تم التصحيح: ${latestSubmission.score} / ${assignment.maxScore}`
                          : `Graded: ${latestSubmission.score} / ${assignment.maxScore}`
                        : latestSubmission.status === 'LATE'
                        ? lang === 'ar'
                          ? 'تم التسليم متأخراً (في انتظار التصحيح)'
                          : 'Submitted Late (Pending Review)'
                        : lang === 'ar'
                        ? 'تم التسليم (في انتظار التصحيح)'
                        : 'Submitted (Pending Review)'}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500">
                    {new Date(latestSubmission.submittedAt).toLocaleString()}
                  </span>
                </div>

                {latestSubmission.feedback && (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {lang === 'ar' ? 'ملاحظات المعلم: ' : 'Teacher Feedback: '}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{latestSubmission.feedback}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Submission Form */
              <div className="mt-4 space-y-3">
                <textarea
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows={4}
                  placeholder={
                    lang === 'ar'
                      ? 'اكتب إجابتك هنا بالتفصيل...'
                      : 'Type your detailed submission answer here...'
                  }
                  value={submissionTexts[assignment.id] || ''}
                  onChange={(e) =>
                    setSubmissionTexts({ ...submissionTexts, [assignment.id]: e.target.value })
                  }
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label
                    className={`flex-1 p-2.5 rounded-xl border border-dashed text-sm cursor-pointer transition flex items-center gap-2 ${
                      uploadedFiles[assignment.id]
                        ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-500 hover:border-indigo-500'
                    }`}
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {uploadingFor === assignment.id
                        ? 'Uploading…'
                        : uploadedFiles[assignment.id]
                        ? uploadedFiles[assignment.id]!.fileName
                        : lang === 'ar'
                        ? 'أرفق ملفاً (PDF، صورة، DOCX — حد أقصى 20MB)'
                        : 'Attach a file (PDF, image, DOCX — max 20MB)'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      disabled={uploadingFor === assignment.id}
                      onChange={(e) => handleFileSelect(assignment.id, e.target.files?.[0] || null)}
                    />
                  </label>

                  {(() => {
                    const lateBlocked =
                      hasPassedDue && assignment.allowLateSubmission === false;
                    return (
                      <>
                        {lateBlocked && (
                          <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'انتهى الموعد النهائي — التسليم مغلق' : 'Deadline passed — submissions closed'}
                          </span>
                        )}
                        <button
                          disabled={submittingId === assignment.id || lateBlocked}
                          onClick={() => handleSubmit(assignment.id)}
                          title={lateBlocked ? 'Submissions are closed for this assignment' : undefined}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 shadow-sm shrink-0"
                        >
                          <Send className="w-4 h-4" />
                          {submittingId === assignment.id
                            ? lang === 'ar'
                              ? 'جاري التسليم...'
                              : 'Submitting...'
                            : lang === 'ar'
                            ? 'تسليم الواجب'
                            : hasPassedDue && assignment.allowLateSubmission !== false
                            ? 'Submit (Late)'
                            : 'Submit Assignment'}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
