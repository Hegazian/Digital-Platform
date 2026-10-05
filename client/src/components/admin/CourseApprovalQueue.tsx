'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  Video,
  FileText,
  HelpCircle,
  Layers,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Trash2,
  Edit3,
  Search,
  DollarSign,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';

interface SubjectOption {
  id: string;
  nameEn: string;
  nameAr?: string;
}

interface LessonItem {
  id?: string;
  titleEn?: string;
  titleAr?: string;
  content?: string | null;
  video?: unknown;
  videoId?: string | null;
  materials?: unknown[];
  quiz?: unknown;
  quizId?: string | null;
}

interface UnitItem {
  id?: string;
  titleEn?: string;
  titleAr?: string;
  nameEn?: string;
  nameAr?: string;
  lessons?: LessonItem[];
}

interface CourseItem {
  id: string;
  titleEn: string;
  titleAr: string;
  description: string;
  status: string;
  isPublished: boolean;
  isFree?: boolean;
  rejectionReason?: string | null;
  priceEgp?: number | null;
  priceUsd?: number | null;
  subjectId?: string;
  subject?: { id: string; nameEn?: string; nameAr?: string };
  teacher?: { id: string; name: string; email: string };
  modules?: UnitItem[];
  sections?: UnitItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface CourseApprovalQueueProps {
  onCourseReviewed?: () => void;
}

export default function CourseApprovalQueue({ onCourseReviewed }: CourseApprovalQueueProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rejection reason modal state
  const [rejectingCourse, setRejectingCourse] = useState<CourseItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Course Modal State
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editTitleAr, setEditTitleAr] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editPriceEgp, setEditPriceEgp] = useState('150');
  const [editPriceUsd, setEditPriceUsd] = useState('10');
  const [editStatus, setEditStatus] = useState('DRAFT');
  const [editIsPublished, setEditIsPublished] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, subjectsRes] = await Promise.all([
        fetchApi('/courses?limit=200'),
        fetchApi('/subjects'),
      ]);

      const courseList = coursesRes.data?.courses || coursesRes.data || [];
      setCourses(Array.isArray(courseList) ? courseList : []);

      const subList = subjectsRes.data || [];
      setSubjects(Array.isArray(subList) ? subList : []);
    } catch (err: unknown) {
      console.warn('Failed to load courses or subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewDecision = async (courseId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    setActionLoading(courseId);
    setMessage(null);
    setError(null);

    try {
      await fetchApi(`/courses/${courseId}/review`, {
        method: 'POST',
        body: JSON.stringify(
          decision === 'REJECTED'
            ? { decision, rejectionReason: reason?.trim() || undefined }
            : { decision }
        ),
      });

      setMessage(
        decision === 'APPROVED'
          ? 'Course approved and published successfully!'
          : 'Course marked as rejected.'
      );
      setRejectingCourse(null);
      setRejectionReason('');

      await loadData();
      if (onCourseReviewed) onCourseReviewed();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to submit review decision'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${courseTitle}" and all its chapters/lessons?`)) {
      return;
    }

    setActionLoading(courseId);
    setMessage(null);
    setError(null);

    try {
      await fetchApi(`/courses/${courseId}`, {
        method: 'DELETE',
      });

      setMessage(`Course "${courseTitle}" was deleted successfully!`);
      await loadData();
      if (onCourseReviewed) onCourseReviewed();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete course'));
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (course: CourseItem) => {
    setEditingCourse(course);
    setEditTitleEn(course.titleEn || '');
    setEditTitleAr(course.titleAr || '');
    setEditDesc(course.description || '');
    setEditSubjectId(course.subjectId || course.subject?.id || '');
    setEditPriceEgp(String(course.priceEgp || 150));
    setEditPriceUsd(String(course.priceUsd || 10));
    setEditStatus(course.status || 'DRAFT');
    setEditIsPublished(Boolean(course.isPublished));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    setSavingEdit(true);
    setMessage(null);
    setError(null);

    try {
      await fetchApi(`/courses/${editingCourse.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titleEn: editTitleEn,
          titleAr: editTitleAr,
          description: editDesc,
          subjectId: editSubjectId,
          priceEgp: parseFloat(editPriceEgp) || 150,
          priceUsd: parseFloat(editPriceUsd) || 10,
          status: editStatus,
          isPublished: editIsPublished || editStatus === 'PUBLISHED',
        }),
      });

      setMessage(`Course "${editTitleEn}" updated successfully!`);
      setEditingCourse(null);
      await loadData();
      if (onCourseReviewed) onCourseReviewed();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update course'));
    } finally {
      setSavingEdit(false);
    }
  };

  const pendingCount = courses.filter((c) => c.status === 'UNDER_REVIEW').length;
  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED' || c.isPublished).length;
  const draftCount = courses.filter((c) => c.status === 'DRAFT' || (!c.isPublished && c.status !== 'UNDER_REVIEW')).length;

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    if (activeTab === 'PENDING' && c.status !== 'UNDER_REVIEW') return false;
    if (activeTab === 'PUBLISHED' && c.status !== 'PUBLISHED' && !c.isPublished) return false;
    if (activeTab === 'DRAFT' && c.status !== 'DRAFT') return false;

    if (subjectFilter !== 'ALL' && c.subjectId !== subjectFilter && c.subject?.id !== subjectFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (c.titleEn || '').toLowerCase().includes(q) || (c.titleAr || '').toLowerCase().includes(q);
      const matchTeacher = (c.teacher?.name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchTeacher) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Info & Main Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Course Governance & Management Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage all platform courses, review teacher curriculums, adjust flat single-course pricing (all lessons included), or delete courses.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0 gap-1">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Courses ({courses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'PENDING' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review Queue</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('PUBLISHED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'PUBLISHED' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Published ({publishedCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('DRAFT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'DRAFT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Drafts ({draftCount})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Filter (When in ALL tab) */}
          {activeTab === 'ALL' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="DRAFT">Draft</option>
              <option value="REJECTED">Rejected</option>
            </select>
          )}

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.nameEn}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Loading courses...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-400/60 mx-auto" />
          <h3 className="text-base font-bold text-white">No Courses Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeTab === 'PENDING'
              ? 'There are currently no courses pending administrator approval.'
              : 'No courses matching your selected search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const isExpanded = expandedCourseId === course.id;
            const modules = course.modules || [];
            const sections = course.sections || [];
            const allUnits = modules.length > 0 ? modules : sections;
            const isActing = actionLoading === course.id;

            return (
              <div
                key={course.id}
                className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition"
              >
                {/* Main Row */}
                <div className="p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    {/* Status & Subject Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                          course.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : course.status === 'UNDER_REVIEW'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : course.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {course.status === 'UNDER_REVIEW' && <Clock className="w-3 h-3" />}
                        {course.status === 'PUBLISHED' && <CheckCircle className="w-3 h-3" />}
                        {course.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        <span>{course.status || 'DRAFT'}</span>
                      </span>

                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {course.subject?.nameEn || 'Curriculum'}
                      </span>

                      {/* Single Course Price Badge */}
                      {course.isFree ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>Free Course • Open Enrollment</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>Course Price: {course.priceEgp || 150} EGP (${course.priceUsd || 10} USD) • Unlocks All Lessons</span>
                        </span>
                      )}
                    </div>

                    {/* Titles */}
                    <h3 className="text-lg font-bold text-white">
                      {course.titleEn}
                      {course.titleAr && (
                        <span className="text-slate-400 text-sm font-normal mr-2"> ({course.titleAr})</span>
                      )}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {course.description || 'No description provided.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-slate-300">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Teacher: {course.teacher?.name || 'Educator'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>{allUnits.length} Chapters / Modules</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                    {/* Inspect Button */}
                    <button
                      onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide Details' : 'Inspect'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Edit Button (Admin Power) */}
                    <button
                      onClick={() => openEditModal(course)}
                      className="px-3 py-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Button (Admin Power) */}
                    <button
                      disabled={isActing}
                      onClick={() => handleDeleteCourse(course.id, course.titleEn)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition disabled:opacity-50"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Approve / Reject Controls for Review Queue */}
                    {course.status === 'UNDER_REVIEW' && (
                      <>
                        <button
                          disabled={isActing}
                          onClick={() => {
                            setRejectingCourse(course);
                            setRejectionReason('');
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>

                        <button
                          disabled={isActing}
                          onClick={() => handleReviewDecision(course.id, 'APPROVED')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
                        >
                          {isActing ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          <span>Approve & Publish</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Inspection Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-6 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Curriculum Breakdown ({allUnits.length} Chapters)</span>
                    </h4>

                    {allUnits.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No modules or sections found in this course.</p>
                    ) : (
                      <div className="space-y-4">
                        {allUnits.map((unit: UnitItem, uIdx: number) => {
                          const lessons = unit.lessons || [];

                          return (
                            <div
                              key={unit.id || uIdx}
                              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-bold text-white">
                                  Chapter {uIdx + 1}: {unit.titleEn || unit.nameEn}
                                </h5>
                                <span className="text-[11px] text-slate-400">
                                  {lessons.length} Lesson{lessons.length !== 1 ? 's' : ''}
                                </span>
                              </div>

                              {lessons.length === 0 ? (
                                <p className="text-xs text-slate-500 italic pl-3">No lessons in this module.</p>
                              ) : (
                                <div className="space-y-2 pl-3">
                                  {lessons.map((lesson: LessonItem, lIdx: number) => {
                                    const hasVid = Boolean(lesson.video || lesson.videoId);
                                    const hasMat = Boolean(lesson.materials && lesson.materials.length > 0);
                                    const hasQz = Boolean(lesson.quiz || lesson.quizId);

                                    return (
                                      <div
                                        key={lesson.id || lIdx}
                                        className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                                      >
                                        <div className="space-y-1">
                                          <span className="font-semibold text-slate-200">
                                            {lIdx + 1}. {lesson.titleEn}
                                          </span>
                                          {lesson.content && (
                                            <p className="text-[11px] text-slate-400 line-clamp-1">{lesson.content}</p>
                                          )}
                                        </div>

                                        {/* Activity Badges */}
                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                          {hasVid && (
                                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold flex items-center gap-1">
                                              <Video className="w-3 h-3" />
                                              <span>Video Lecture</span>
                                            </span>
                                          )}
                                          {hasMat && (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                                              <FileText className="w-3 h-3" />
                                              <span>PDF / {lesson.materials?.length || 1} File</span>
                                            </span>
                                          )}
                                          {hasQz && (
                                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold flex items-center gap-1">
                                              <HelpCircle className="w-3 h-3" />
                                              <span>Quiz</span>
                                            </span>
                                          )}
                                          {!hasVid && !hasMat && !hasQz && (
                                            <span className="text-[10px] text-slate-500">Text only</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-xl w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <span>Admin Edit: Course & Pricing</span>
              </h3>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Title En & Ar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Course Title (English)</label>
                  <input
                    type="text"
                    required
                    value={editTitleEn}
                    onChange={(e) => setEditTitleEn(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Course Title (Arabic)</label>
                  <input
                    type="text"
                    value={editTitleAr}
                    onChange={(e) => setEditTitleAr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Subject & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Curriculum Subject</label>
                  <select
                    value={editSubjectId}
                    onChange={(e) => setEditSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.nameEn} ({sub.nameAr})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Publication Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => {
                      setEditStatus(e.target.value);
                      if (e.target.value === 'PUBLISHED') setEditIsPublished(true);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="PUBLISHED">Published (Live)</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Single Course Price (Unlocks everything inside) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Single Course Price (Unlocks All Lessons & Materials)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Students pay this single flat fee to gain unrestricted access to all chapters, video lectures, PDFs, and quizzes in this course.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Price in EGP</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={editPriceEgp}
                      onChange={(e) => setEditPriceEgp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Price in USD ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editPriceUsd}
                      onChange={(e) => setEditPriceUsd(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-800 p-8">
            <h3 className="text-lg font-bold mb-2">Reject Course</h3>
            <p className="text-sm text-slate-400 mb-4">
              Provide a reason for rejecting{' '}
              <span className="text-slate-200 font-semibold">{rejectingCourse.titleEn}</span>. It will be
              shown to the teacher.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="e.g. Quiz questions are incomplete, please add at least 5 questions per module…"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-rose-500 outline-none text-sm resize-none"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setRejectingCourse(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading === rejectingCourse.id}
                onClick={() => handleReviewDecision(rejectingCourse.id, 'REJECTED', rejectionReason)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
              >
                {actionLoading === rejectingCourse.id ? 'Rejecting…' : 'Reject Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
