'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Layers,
  Send,
  Video as VideoIcon,
  FileText,
  HelpCircle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronUp,
  ChevronDown,
  BookOpen,
  DollarSign,
  Edit3,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { errorMessage } from '../../lib/apiTypes';
import VideoUploader from '../VideoUploader';
import TiptapEditor from '../editor/TiptapEditor';
import CourseCreateModal from './modals/CourseCreateModal';
import CourseEditModal from './modals/CourseEditModal';
import CreateModuleModal from './modals/CreateModuleModal';
import CreateLessonModal from './modals/CreateLessonModal';
import EditModuleModal, { EditableModule } from './modals/EditModuleModal';
import EditLessonModal, { EditableLesson } from './modals/EditLessonModal';
import EditSectionModal, { EditableSection } from './modals/EditSectionModal';

interface Subject {
  id: string;
  nameEn: string;
  nameAr: string;
}


interface CourseManagerProps {
  courses: any[];
  subjects: Subject[];
  onRefreshCourses: () => void;
  lang: string;
}

export default function CourseManager({
  courses,
  subjects,
  onRefreshCourses,
  lang,
}: CourseManagerProps) {
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  // Inline edit targets (FR-TEACHER-005/006): the row being edited opens the
  // matching modal; key={id} at render time keeps form state in sync.
  const [editingModule, setEditingModule] = useState<EditableModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<EditableLesson | null>(null);
  const [editingSection, setEditingSection] = useState<EditableSection | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');

  // Keep selectedCourseId in sync with courses array
  useEffect(() => {
    if (courses.length > 0) {
      const exists = courses.some((c) => c.id === selectedCourseId);
      if (!exists) {
        setSelectedCourseId(courses[0].id);
      }
    } else {
      setSelectedCourseId('');
    }
  }, [courses, selectedCourseId]);

  // Course Form (Creation)

  // Course Form (Editing)
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);

  // Module Builder Form

  // Lesson Builder Form

  // Optional Video Sub-form

  // Block Form
  const [blockType, setBlockType] = useState('VIDEO');
  const [blockMediaId, setBlockMediaId] = useState('');
  const [blockText, setBlockText] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module and all its lessons?')) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetchApi(`/courses/modules/${moduleId}`, { method: 'DELETE' });
      setMessage('Module deleted successfully!');
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete module'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetchApi(`/courses/lessons/${lessonId}`, { method: 'DELETE' });
      setMessage('Lesson deleted successfully!');
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete lesson'));
    } finally {
      setLoading(false);
    }
  };

  // --- Reorder & Edit (FR-TEACHER-005/006) ---
  // Full editing lives in EditModuleModal / EditLessonModal; these openers
  // replace the old single-field browser prompt() rename.
  const openEditModule = (mod: any) => {
    setEditingModule({
      id: mod.id,
      titleEn: mod.titleEn,
      titleAr: mod.titleAr,
      description: mod.description,
    });
  };

  const openEditLesson = (les: any) => {
    setEditingLesson({
      id: les.id,
      titleEn: les.titleEn,
      titleAr: les.titleAr,
      content: les.content,
      estimatedDuration: les.estimatedDuration,
      materials: les.materials || [],
      quiz: les.quiz || null,
      video: les.video || null,
    });
  };

  const handleReorderModule = async (index: number, direction: -1 | 1) => {
    if (!selectedCourse?.modules?.length) return;
    const modules = [...selectedCourse.modules];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= modules.length) return;

    [modules[index], modules[targetIdx]] = [modules[targetIdx], modules[index]];
    setLoading(true);
    setError('');
    try {
      await fetchApi(`/courses/${selectedCourse.id}/modules/reorder`, {
        method: 'POST',
        body: JSON.stringify({
          modules: modules.map((m: any, i: number) => ({ id: m.id, sortOrder: i })),
        }),
      });
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to reorder modules'));
    } finally {
      setLoading(false);
    }
  };

  const handleReorderLesson = async (moduleLessons: any[], index: number, direction: -1 | 1) => {
    const lessons = [...moduleLessons];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= lessons.length) return;

    [lessons[index], lessons[targetIdx]] = [lessons[targetIdx], lessons[index]];
    setLoading(true);
    setError('');
    try {
      await fetchApi('/courses/lessons/reorder', {
        method: 'POST',
        body: JSON.stringify({
          lessons: lessons.map((l: any, i: number) => ({ id: l.id, orderIndex: i })),
        }),
      });
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to reorder lessons'));
    } finally {
      setLoading(false);
    }
  };

  // --- Section management (sections are the lighter curriculum unit) ---
  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its lessons?')) return;

    setLoading(true);
    setError('');
    try {
      await fetchApi(`/courses/sections/${sectionId}`, { method: 'DELETE' });
      setMessage('Section deleted successfully!');
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete section'));
    } finally {
      setLoading(false);
    }
  };

  const handleReorderSection = async (index: number, direction: -1 | 1) => {
    if (!selectedCourse?.sections?.length) return;
    const sections = [...selectedCourse.sections];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    [sections[index], sections[targetIdx]] = [sections[targetIdx], sections[index]];
    setLoading(true);
    setError('');
    try {
      await fetchApi(`/courses/${selectedCourse.id}/sections/reorder`, {
        method: 'POST',
        body: JSON.stringify({
          sections: sections.map((s: any, i: number) => ({ id: s.id, orderIndex: i + 1 })),
        }),
      });
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to reorder sections'));
    } finally {
      setLoading(false);
    }
  };

  // --- Lesson attachment removals (video / blocks are optional) ---
  const handleDetachVideo = async (lessonId: string) => {
    if (!confirm('Remove the attached video from this lesson?')) return;

    setLoading(true);
    setError('');
    try {
      await fetchApi(`/courses/lessons/${lessonId}/video`, { method: 'DELETE' });
      setMessage('Video removed from lesson.');
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to remove video'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Delete this content block? Its whiteboard/playground data is removed too.')) return;

    setLoading(true);
    setError('');
    try {
      await fetchApi(`/courses/blocks/${blockId}`, { method: 'DELETE' });
      setMessage('Block deleted.');
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete block'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddLessonBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetchApi(`/courses/lessons/${selectedLessonId}/blocks`, {
        method: 'POST',
        body: JSON.stringify({
          blockType,
          configuration: {
            mediaId: blockMediaId,
            content: blockType === 'TEXT' ? blockText : undefined,
          },
        }),
      });

      setMessage('Lesson content block added successfully!');
      setShowAddBlockModal(false);
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to add lesson block'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course and all its modules/lessons?')) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetchApi(`/courses/${courseId}`, { method: 'DELETE' });
      setMessage('Course deleted successfully!');
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete course'));
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveCourse = async (courseId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من أرشفة هذه الدورة المنشورة؟' : 'Are you sure you want to archive this published course?')) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetchApi(`/courses/${courseId}/archive`, { method: 'PATCH' });
      setMessage(lang === 'ar' ? 'تمت أرشفة الدورة بنجاح!' : 'Course archived successfully!');
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to archive course'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async (courseId: string) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetchApi(`/courses/${courseId}/submit`, { method: 'POST' });
      setMessage('Course submitted for Admin Review!');
      onRefreshCourses();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to submit course for review'));
    } finally {
      setLoading(false);
    }
  };

  // Quiz Form Helpers
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  // Curriculum units are EITHER modules (rich) OR sections (light) — never both.
  const unitsAreSections = !(selectedCourse?.modules && selectedCourse.modules.length > 0);
  const curriculumUnits = unitsAreSections
    ? selectedCourse?.sections || []
    : selectedCourse?.modules || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Curriculum & Resource Studio</h2>
          <p className="text-sm text-slate-400">
            Structure course modules and attach Video Lectures, PDF Materials, and MCQ Quizzes
          </p>
        </div>
        <button
          onClick={() => setShowCreateCourseModal(true)}
          className="glass-button py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Course</span>
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Courses Created Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Create your first course to begin adding modules, videos, materials, and quizzes.
          </p>
          <button
            onClick={() => setShowCreateCourseModal(true)}
            className="glass-button py-2.5 px-5 rounded-xl text-sm font-semibold"
          >
            Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Course Selector Cards */}
          <div className="space-y-3">
            {courses.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={`p-5 rounded-2xl border transition cursor-pointer ${
                  selectedCourseId === c.id
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg ring-1 ring-indigo-500/20'
                    : 'glass-panel border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-white text-base">
                    {lang === 'ar' ? c.titleAr || c.titleEn : c.titleEn}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      c.status === 'PUBLISHED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : c.status === 'UNDER_REVIEW'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {c.status || 'DRAFT'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{c.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                  <span>{c.subject?.nameEn || 'General'}</span>
                  <span>{(c.modules?.length || c.sections?.length || 0)} Modules</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Module & Lesson Tree */}
          {selectedCourse && (
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {lang === 'ar' ? selectedCourse.titleAr || selectedCourse.titleEn : selectedCourse.titleEn}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Chapters & Lessons</span>
                    <span>•</span>
                    {selectedCourse.isFree ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Free Course — open enrollment</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Single Course Fee: {selectedCourse.priceEgp || 150} EGP (${selectedCourse.priceUsd || 10})</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEditCourseModal(true)}
                    className="py-2 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Course</span>
                  </button>

                  <button
                    onClick={() => setShowCreateModuleModal(true)}
                    className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{unitsAreSections ? 'Add Section' : 'Add Module'}</span>
                  </button>

                  {selectedCourse.status === 'PUBLISHED' ? (
                    <button
                      onClick={() => handleArchiveCourse(selectedCourse.id)}
                      disabled={loading}
                      className="py-2 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <span>{lang === 'ar' ? 'أرشفة الدورة' : 'Archive Course'}</span>
                    </button>
                  ) : (
                    <>
                      {selectedCourse.status !== 'UNDER_REVIEW' && (
                        <button
                          onClick={() => handleSubmitForReview(selectedCourse.id)}
                          disabled={loading}
                          className="glass-button py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteCourse(selectedCourse.id)}
                        disabled={loading}
                        className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Rejection Alert Banner */}
              {selectedCourse.status === 'REJECTED' && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-200">
                      {lang === 'ar' ? 'تم رفض نشر هذه الدورة' : 'Course Publication Rejected'}
                    </h4>
                    <p className="text-xs text-rose-300/90 mt-1">
                      {selectedCourse.rejectionReason ||
                        (lang === 'ar'
                          ? 'يرجى مراجعة محتوى الدورة والتأكد من إضافة جميع الوحدات والدروس المطلوبة قبل إعادة الإرسال.'
                          : 'Please review course materials and ensure all modules and lessons meet quality guidelines before resubmitting.')}
                    </p>
                  </div>
                </div>
              )}

              {/* Modules & Lessons List */}
              {curriculumUnits.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-white">No Modules Added Yet</p>
                  <p className="text-xs text-slate-400">Click &quot;Add Module&quot; above to add your first chapter.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {curriculumUnits.map((mod: any, idx: number) => (
                    <div key={mod.id || idx} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/20">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-white text-sm">
                            {lang === 'ar' ? mod.titleAr || mod.titleEn : mod.titleEn}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => (unitsAreSections ? handleReorderSection(idx, -1) : handleReorderModule(idx, -1))}
                            disabled={idx === 0 || loading}
                            className="p-1 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition disabled:opacity-30"
                            title={unitsAreSections ? 'Move section up' : 'Move module up'}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => (unitsAreSections ? handleReorderSection(idx, 1) : handleReorderModule(idx, 1))}
                            disabled={idx === curriculumUnits.length - 1 || loading}
                            className="p-1 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition disabled:opacity-30"
                            title={unitsAreSections ? 'Move section down' : 'Move module down'}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => (unitsAreSections
                              ? setEditingSection({
                                  id: mod.id,
                                  titleEn: mod.titleEn,
                                  titleAr: mod.titleAr,
                                  isFreePreview: !!mod.isFreePreview,
                                })
                              : openEditModule(mod))}
                            className="p-1 rounded-lg text-slate-500 hover:text-white transition"
                            title={unitsAreSections ? 'Edit Section' : 'Edit Module'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {unitsAreSections && mod.isFreePreview && (
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase">
                              Free Preview
                            </span>
                          )}
                          <button
                            onClick={() => {
                              if (unitsAreSections) {
                                setSelectedSectionId(mod.id);
                              } else {
                                setSelectedModuleId(mod.id);
                              }
                              setShowCreateLessonModal(true);
                            }}
                            className="py-1 px-2.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Lesson</span>
                          </button>
                          <button
                            onClick={() => (unitsAreSections ? handleDeleteSection(mod.id) : handleDeleteModule(mod.id))}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title={unitsAreSections ? 'Delete Section' : 'Delete Module'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Lessons in this Module */}
                      <div className="pl-6 space-y-2">
                        {(mod.lessons || []).length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">No lessons in this module. Add one above.</p>
                        ) : (
                          (mod.lessons || []).map((les: any, lIdx: number) => (
                            <div
                              key={les.id || lIdx}
                              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-mono text-[11px]">{idx + 1}.{lIdx + 1}</span>
                                  <span className="font-semibold text-white">
                                    {lang === 'ar' ? les.titleAr || les.titleEn : les.titleEn}
                                  </span>
                                  {les.estimatedDuration && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {les.estimatedDuration}m
                                    </span>
                                  )}
                                </div>

                                {/* Resource Badges */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {les.video && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-600/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                                      <VideoIcon className="w-3 h-3" /> Video Stream
                                      <button
                                        onClick={() => handleDetachVideo(les.id)}
                                        disabled={loading}
                                        className="text-indigo-400 hover:text-red-400 ml-0.5"
                                        title="Remove video from lesson"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  )}
                                  {(les.materials || []).map((m: any, mIdx: number) => (
                                    <span key={mIdx} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                                      <FileText className="w-3 h-3" /> {m.title || 'PDF Document'}
                                    </span>
                                  ))}
                                  {les.quiz && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                      <HelpCircle className="w-3 h-3" /> Quiz ({les.quiz.questions?.length || 1} Qs)
                                    </span>
                                  )}
                                  {(les.blocks || []).map((b: any) => (
                                    <span key={b.id} className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                      Block: {b.blockType}
                                      <button
                                        onClick={() => handleDeleteBlock(b.id)}
                                        disabled={loading}
                                        className="text-slate-500 hover:text-red-400"
                                        title="Delete block (removes its whiteboard/playground data)"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                  onClick={() => handleReorderLesson(mod.lessons, lIdx, -1)}
                                  disabled={lIdx === 0 || loading}
                                  className="p-1 rounded text-slate-500 hover:text-indigo-300 transition disabled:opacity-30"
                                  title="Move lesson up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReorderLesson(mod.lessons, lIdx, 1)}
                                  disabled={lIdx === (mod.lessons || []).length - 1 || loading}
                                  className="p-1 rounded text-slate-500 hover:text-indigo-300 transition disabled:opacity-30"
                                  title="Move lesson down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openEditLesson(les)}
                                  className="p-1 rounded text-slate-500 hover:text-white transition"
                                  title="Edit Lesson"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedLessonId(les.id);
                                    setShowAddBlockModal(true);
                                  }}
                                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                                >
                                  + Block
                                </button>
                                <button
                                  onClick={() => handleDeleteLesson(les.id)}
                                  className="p-1 rounded text-slate-500 hover:text-red-400 transition"
                                  title="Delete Lesson"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <CourseCreateModal
        open={showCreateCourseModal}
        subjects={subjects}
        onClose={() => setShowCreateCourseModal(false)}
        onCreated={() => {
          setMessage('Course created successfully!');
          onRefreshCourses();
        }}
      />

      <CourseEditModal
        open={showEditCourseModal}
        course={selectedCourse}
        subjects={subjects}
        onClose={() => setShowEditCourseModal(false)}
        onUpdated={onRefreshCourses}
      />

      <CreateModuleModal
        open={showCreateModuleModal}
        courseId={selectedCourseId}
        kind={unitsAreSections ? 'section' : 'module'}
        onClose={() => setShowCreateModuleModal(false)}
        onCreated={onRefreshCourses}
      />

      <CreateLessonModal
        key={selectedModuleId || selectedSectionId || 'new-lesson'}
        open={showCreateLessonModal}
        moduleId={unitsAreSections ? undefined : selectedModuleId}
        sectionId={unitsAreSections ? selectedSectionId : undefined}
        onClose={() => setShowCreateLessonModal(false)}
        onCreated={onRefreshCourses}
      />

      {editingSection && (
        <EditSectionModal
          key={editingSection.id}
          open
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onUpdated={() => {
            setEditingSection(null);
            setMessage('Section updated successfully!');
            onRefreshCourses();
          }}
        />
      )}

      {/* Edit Module / Lesson — key forces fresh form state per target row */}
      {editingModule && (
        <EditModuleModal
          key={editingModule.id}
          open
          module={editingModule}
          onClose={() => setEditingModule(null)}
          onUpdated={() => {
            setEditingModule(null);
            setMessage('Module updated successfully!');
            onRefreshCourses();
          }}
        />
      )}

      {editingLesson && (
        <EditLessonModal
          key={editingLesson.id}
          open
          lesson={editingLesson}
          onClose={() => setEditingLesson(null)}
          onUpdated={() => {
            setEditingLesson(null);
            setMessage('Lesson updated successfully!');
            onRefreshCourses();
          }}
        />
      )}

      {/* Modal: Add Interactive Block */}
      {showAddBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Attach Interactive Content Block</h3>
            <form onSubmit={handleAddLessonBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Block Type</label>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                  className="glass-input w-full text-xs"
                >
                  <option value="VIDEO">Video Stream</option>
                  <option value="TEXT">Rich Text Notes</option>
                  <option value="DOCUMENT">PDF Document</option>
                  <option value="BOARD">Whiteboard</option>
                </select>
              </div>

              {blockType === 'VIDEO' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Upload Video</label>
                  <VideoUploader onUploadComplete={(videoId: string) => setBlockMediaId(videoId)} />
                </div>
              )}

              {blockType === 'TEXT' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rich Text Content</label>
                  <TiptapEditor content={blockText} onChange={setBlockText} />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBlockModal(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button py-2 px-5 rounded-xl text-xs font-bold"
                >
                  {loading ? 'Saving...' : 'Save Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
