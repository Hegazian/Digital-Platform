'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { errorMessage } from '@/lib/apiTypes';
import { Plus, GraduationCap, Calendar, BookOpen, CheckCircle2, AlertTriangle, Layers, Trash2 } from 'lucide-react';

interface AcademicItem {
  id: string;
  nameEn?: string;
  nameAr?: string;
  name?: string;
  code?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  grades?: AcademicItem[];
  _count?: { courses?: number };
}

export default function AcademicStructureManager() {
  const { lang } = useAppStore();
  const [stages, setStages] = useState<AcademicItem[]>([]);
  const [years, setYears] = useState<AcademicItem[]>([]);
  const [subjects, setSubjects] = useState<AcademicItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showStageModal, setShowStageModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // Stage form
  const [stageNameEn, setStageNameEn] = useState('');
  const [stageNameAr, setStageNameAr] = useState('');
  const [stageCode, setStageCode] = useState('');

  // Grade form
  const [gradeStageId, setGradeStageId] = useState('');
  const [gradeNameEn, setGradeNameEn] = useState('');
  const [gradeNameAr, setGradeNameAr] = useState('');
  const [gradeCode, setGradeCode] = useState('');

  // Year form
  const [yearName, setYearName] = useState('');
  const [yearStartDate, setYearStartDate] = useState('2026-09-01');
  const [yearEndDate, setYearEndDate] = useState('2027-06-30');

  // Subject form
  const [subjectNameEn, setSubjectNameEn] = useState('');
  const [subjectNameAr, setSubjectNameAr] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setError(null);
    try {
      const [stagesRes, yearsRes, subjectsRes] = await Promise.all([
        fetchApi('/academic/stages'),
        fetchApi('/academic/years'),
        fetchApi('/subjects'),
      ]);
      if (stagesRes.success) setStages(stagesRes.data || []);
      if (yearsRes.success) setYears(yearsRes.data || []);
      if (subjectsRes.success) setSubjects(subjectsRes.data || []);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load academic structure'));
    }
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetchApi('/academic/stages', {
        method: 'POST',
        body: JSON.stringify({
          nameEn: stageNameEn,
          nameAr: stageNameAr || stageNameEn,
          code: stageCode.toUpperCase(),
        }),
      });
      if (res.success) {
        setSuccess(lang === 'ar' ? 'تم إنشاء المرحلة التعليمية بنجاح' : 'Educational stage created successfully');
        setShowStageModal(false);
        setStageNameEn('');
        setStageNameAr('');
        setStageCode('');
        loadData();
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create stage'));
    }
  };

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeStageId) return;
    setError(null);
    try {
      const res = await fetchApi('/academic/grades', {
        method: 'POST',
        body: JSON.stringify({
          stageId: gradeStageId,
          nameEn: gradeNameEn,
          nameAr: gradeNameAr || gradeNameEn,
          code: gradeCode.toUpperCase(),
        }),
      });
      if (res.success) {
        setSuccess(lang === 'ar' ? 'تم إنشاء الصف الدراسي بنجاح' : 'Grade created successfully');
        setShowGradeModal(false);
        setGradeNameEn('');
        setGradeNameAr('');
        setGradeCode('');
        loadData();
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create grade'));
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetchApi('/academic/years', {
        method: 'POST',
        body: JSON.stringify({
          name: yearName,
          startDate: yearStartDate,
          endDate: yearEndDate,
          isActive: true,
        }),
      });
      if (res.success) {
        setSuccess(lang === 'ar' ? 'تم إنشاء العام الأكاديمي بنجاح' : 'Academic year created successfully');
        setShowYearModal(false);
        setYearName('');
        loadData();
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create academic year'));
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetchApi('/subjects', {
        method: 'POST',
        body: JSON.stringify({
          nameEn: subjectNameEn,
          nameAr: subjectNameAr || subjectNameEn,
        }),
      });
      if (res.success) {
        setSuccess(lang === 'ar' ? 'تم إنشاء المادة بنجاح' : 'Subject created successfully');
        setShowSubjectModal(false);
        setSubjectNameEn('');
        setSubjectNameAr('');
        loadData();
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create subject'));
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!confirm(lang === 'ar'
      ? `هل أنت متأكد من حذف مادة "${subjectName}"؟`
      : `Delete subject "${subjectName}"? Deletion is blocked while courses are attached to it.`)) {
      return;
    }
    setError(null);
    try {
      await fetchApi(`/subjects/${subjectId}`, { method: 'DELETE' });
      setSuccess(lang === 'ar' ? 'تم حذف المادة' : 'Subject deleted');
      loadData();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete subject'));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-panel rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <span>{lang === 'ar' ? 'إدارة الهيكل الأكاديمي' : 'Academic Structure Management'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'إدارة المراحل التعليمية، والصفوف الدراسية، والأعوام الأكاديمية.'
              : 'Manage educational stages, grades, and academic school years.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStageModal(true)}
            className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إضافة مرحلة' : 'Add Stage'}</span>
          </button>

          <button
            onClick={() => setShowGradeModal(true)}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إضافة صف' : 'Add Grade'}</span>
          </button>

          <button
            onClick={() => setShowYearModal(true)}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'عام أكاديمي' : 'Academic Year'}</span>
          </button>

          <button
            onClick={() => setShowSubjectModal(true)}
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إضافة مادة' : 'Add Subject'}</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Stages & Grades on Left, Academic Years on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stages and Grades */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>{lang === 'ar' ? 'المراحل والصفوف الدراسية' : 'Stages & Grades'}</span>
          </h3>

          {stages.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400 text-xs">
              {lang === 'ar' ? 'لا توجد مراحل مسجلة بعد' : 'No educational stages registered yet.'}
            </div>
          ) : (
            stages.map((stage) => (
              <div
                key={stage.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold border border-indigo-500/20">
                      {stage.code}
                    </span>
                    <h4 className="font-bold text-white text-sm">
                      {lang === 'ar' ? stage.nameAr || stage.nameEn : stage.nameEn}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500">
                    {(stage.grades || []).length} {lang === 'ar' ? 'صفوف' : 'Grades'}
                  </span>
                </div>

                {/* Grade Pills */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/60">
                  {(stage.grades || []).map((grade: AcademicItem) => (
                    <span
                      key={grade.id}
                      className="px-3 py-1 rounded-xl bg-slate-900/80 text-slate-300 text-xs border border-slate-700/80 flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3 h-3 text-indigo-400" />
                      <span>{lang === 'ar' ? grade.nameAr || grade.nameEn : grade.nameEn}</span>
                      <span className="text-[10px] font-mono text-slate-500">({grade.code})</span>
                    </span>
                  ))}
                  {(!stage.grades || stage.grades.length === 0) && (
                    <p className="text-[11px] text-slate-500 italic">
                      {lang === 'ar' ? 'لا توجد صفوف مضافة لهذه المرحلة' : 'No grades added to this stage yet'}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Academic Years */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? 'السنوات الدراسية' : 'Academic Years'}</span>
          </h3>

          <div className="space-y-3">
            {years.map((y) => (
              <div
                key={y.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">{y.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(y.startDate ?? '').toLocaleDateString()} - {new Date(y.endDate ?? '').toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    y.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {y.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'ar' ? 'المواد الدراسية' : 'Subjects'}</span>
          <span className="text-[10px] font-normal normal-case text-slate-500">
            ({subjects.length})
          </span>
        </h3>

        {subjects.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400 text-xs">
            {lang === 'ar' ? 'لا توجد مواد مسجلة بعد' : 'No subjects registered yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-sm truncate">
                    {lang === 'ar' ? (s.nameAr || s.nameEn || '') : (s.nameEn || '')}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">{s.nameAr || '—'}</p>
                </div>
                <button
                  onClick={() => handleDeleteSubject(s.id, lang === 'ar' ? (s.nameAr || s.nameEn || '') : (s.nameEn || ''))}
                  disabled={(s._count?.courses ?? 0) > 0}
                  title={
                    (s._count?.courses ?? 0) > 0
                      ? `${s._count?.courses ?? 0} course(s) attached — deletion blocked`
                      : 'Delete subject'
                  }
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Stage */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateStage}
            className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 bg-slate-900"
          >
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'إضافة مرحلة تعليمية جديدة' : 'Add Educational Stage'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name (English)</label>
              <input
                type="text"
                required
                value={stageNameEn}
                onChange={(e) => setStageNameEn(e.target.value)}
                placeholder="e.g. Secondary Education"
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name (Arabic)</label>
              <input
                type="text"
                value={stageNameAr}
                onChange={(e) => setStageNameAr(e.target.value)}
                placeholder="مثال: التعليم الثانوي"
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Code</label>
              <input
                type="text"
                required
                value={stageCode}
                onChange={(e) => setStageCode(e.target.value)}
                placeholder="e.g. SEC"
                className="glass-input w-full text-xs font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStageModal(false)}
                className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
              >
                Create Stage
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Grade */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateGrade}
            className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 bg-slate-900"
          >
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'إضافة صف دراسي جديد' : 'Add Grade'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Stage</label>
              <select
                required
                value={gradeStageId}
                onChange={(e) => setGradeStageId(e.target.value)}
                className="glass-input w-full text-xs"
              >
                <option value="">-- Choose Stage --</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameEn} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name (English)</label>
              <input
                type="text"
                required
                value={gradeNameEn}
                onChange={(e) => setGradeNameEn(e.target.value)}
                placeholder="e.g. 1st Secondary"
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name (Arabic)</label>
              <input
                type="text"
                value={gradeNameAr}
                onChange={(e) => setGradeNameAr(e.target.value)}
                placeholder="مثال: الصف الأول الثانوي"
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Code</label>
              <input
                type="text"
                required
                value={gradeCode}
                onChange={(e) => setGradeCode(e.target.value)}
                placeholder="e.g. SEC_1"
                className="glass-input w-full text-xs font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
              >
                Create Grade
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Year */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateYear}
            className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 bg-slate-900"
          >
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'إضافة عام أكاديمي جديد' : 'Add Academic Year'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name / Label</label>
              <input
                type="text"
                required
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
                placeholder="e.g. 2026/2027"
                className="glass-input w-full text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={yearStartDate}
                  onChange={(e) => setYearStartDate(e.target.value)}
                  className="glass-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={yearEndDate}
                  onChange={(e) => setYearEndDate(e.target.value)}
                  className="glass-input w-full text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowYearModal(false)}
                className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
              >
                Create Academic Year
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Subject */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateSubject}
            className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 bg-slate-900"
          >
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'إضافة مادة جديدة' : 'Add Subject'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name (English)</label>
              <input
                type="text"
                required
                value={subjectNameEn}
                onChange={(e) => setSubjectNameEn(e.target.value)}
                placeholder="e.g. Biology"
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name (Arabic)</label>
              <input
                type="text"
                value={subjectNameAr}
                onChange={(e) => setSubjectNameAr(e.target.value)}
                placeholder="مثال: أحياء"
                className="glass-input w-full text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md"
              >
                Create Subject
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
