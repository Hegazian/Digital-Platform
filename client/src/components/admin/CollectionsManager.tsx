'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';
import {
  Library,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Check,
} from 'lucide-react';

interface CollectionRow {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  description?: string | null;
  isPublished: boolean;
  courses: { course: { id: string; titleEn: string } }[];
}

interface CatalogCourse {
  id: string;
  titleEn: string;
  subject?: { nameEn?: string };
}

const emptyForm = {
  titleEn: '',
  titleAr: '',
  slug: '',
  description: '',
  isPublished: true,
};

/**
 * Admin management for curated collections (career-style bundles):
 * CRUD + atomic membership editor backed by PUT /collections/:id/courses.
 */
export default function CollectionsManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [courseFilter, setCourseFilter] = useState('');
  const [feedback, setFeedback] = useState('');

  const collectionsQuery = useQuery({
    queryKey: ['collections', 'admin'],
    queryFn: () => fetchApi('/collections?includeUnpublished=true'),
  });
  const collections: CollectionRow[] = collectionsQuery.data?.data ?? [];

  const catalogQuery = useQuery({
    queryKey: ['collections', 'catalog-courses'],
    queryFn: () => fetchApi('/courses?limit=200'),
  });
  const allCourses: CatalogCourse[] = useMemo(
    () => catalogQuery.data?.data?.courses ?? [],
    [catalogQuery.data]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['collections'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        titleEn: form.titleEn,
        titleAr: form.titleAr,
        slug: form.slug,
        description: form.description || undefined,
        isPublished: form.isPublished,
      };
      if (editingId) {
        await fetchApi(`/collections/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await fetchApi('/collections', { method: 'POST', body: JSON.stringify(body) });
      }
    },
    onSuccess: async () => {
      let list = collectionsQuery.data?.data ?? [];
      if (!editingId) {
        // find the freshly created one by slug to attach courses
        await queryClient.invalidateQueries({ queryKey: ['collections'] });
        const fresh = await fetchApi('/collections?includeUnpublished=true');
        list = fresh.data ?? [];
      }
      const target = editingId
        ? editingId
        : list.find((c: CollectionRow) => c.slug === form.slug)?.id;

      if (target) {
        await fetchApi(`/collections/${target}/courses`, {
          method: 'PUT',
          body: JSON.stringify({ courseIds: Array.from(selectedCourseIds) }),
        });
      }
      setFeedback(editingId ? 'Collection updated' : 'Collection created');
      closeEditor();
      invalidate();
    },
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setFeedback('Collection deleted');
      invalidate();
    },
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      fetchApi(`/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished }),
      }),
    onSuccess: invalidate,
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setSelectedCourseIds(new Set());
    setFeedback('');
  };

  const openEdit = (c: CollectionRow) => {
    setEditingId(c.id);
    setForm({
      titleEn: c.titleEn,
      titleAr: c.titleAr,
      slug: c.slug,
      description: c.description ?? '',
      isPublished: c.isPublished,
    });
    setSelectedCourseIds(new Set(c.courses.map((cc) => cc.course.id)));
    setFeedback('');
  };

  const closeEditor = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setSelectedCourseIds(new Set());
  };

  const slugFromTitle = (title: string) =>
    title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const filteredCourses = allCourses.filter((c) =>
    c.titleEn.toLowerCase().includes(courseFilter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-400" />
            Curated Collections
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Career-style bundles shown on the student dashboard. Order inside a collection follows
            your selection order.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New Collection
        </button>
      </div>

      {feedback && <p role="status" className="text-xs text-emerald-400">{feedback}</p>}

      {/* Editor */}
      {(form.titleEn || editingId) && (
        <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.titleEn}
              onChange={(e) => {
                const titleEn = e.target.value;
                setForm((f) => ({
                  ...f,
                  titleEn,
                  slug: !editingId && !f.slug ? slugFromTitle(titleEn) : f.slug,
                }));
              }}
              placeholder="Title (English)"
              required
              className="glass-input text-xs"
            />
            <input
              value={form.titleAr}
              onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
              placeholder="العنوان"
              dir="rtl"
              className="glass-input text-xs"
            />
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="slug (kebab-case)"
              disabled={!!editingId}
              required
              className="glass-input text-xs font-mono disabled:opacity-50"
            />
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="w-4 h-4 accent-emerald-500"
              />
              Published (visible to students)
            </label>
          </div>

          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description shown on the dashboard card"
            className="glass-input w-full text-xs"
          />

          {/* Course membership */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Courses ({selectedCourseIds.size} selected)
              </span>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  placeholder="Filter courses…"
                  className="glass-input w-full pl-8 text-[11px]"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/60">
              {filteredCourses.map((course) => {
                const checked = selectedCourseIds.has(course.id);
                return (
                  <label
                    key={course.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-900/70"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(selectedCourseIds);
                        if (checked) next.delete(course.id);
                        else next.add(course.id);
                        setSelectedCourseIds(next);
                      }}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    <span className="flex-1 truncate text-slate-300">{course.titleEn}</span>
                    <span className="text-[10px] text-slate-500">{course.subject?.nameEn}</span>
                  </label>
                );
              })}
              {filteredCourses.length === 0 && (
                <p className="px-3 py-3 text-[11px] text-slate-500">No courses match.</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.titleEn.trim() || !form.slug.trim()}
              className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {editingId ? 'Save Changes' : 'Create Collection'}
            </button>
            <button
              onClick={closeEditor}
              className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {collectionsQuery.isLoading ? (
        <div className="flex justify-center py-10 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : collections.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl text-center space-y-2">
          <Library className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-white">No collections yet</p>
          <p className="text-xs text-slate-500">Create your first curated bundle above.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {collections.map((c) => (
            <div key={c.id} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{c.titleEn}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{c.slug}</p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    c.isPublished
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600/40'
                  }`}
                >
                  {c.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {c.isPublished ? 'Live' : 'Hidden'}
                </span>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2">{c.description || '—'}</p>
              <p className="text-[11px] text-slate-500">{c.courses.length} courses</p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => openEdit(c)}
                  className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => togglePublish.mutate({ id: c.id, isPublished: !c.isPublished })}
                  aria-label={c.isPublished ? `Unpublish ${c.titleEn}` : `Publish ${c.titleEn}`}
                  className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white"
                >
                  {c.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  aria-label={`Delete ${c.titleEn}`}
                  className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:bg-rose-600/80 hover:text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
