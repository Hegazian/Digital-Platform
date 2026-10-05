'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';
import { FileText, Download, Lock, AlertCircle } from 'lucide-react';

/** Only allow safe URL protocols to prevent javascript: XSS injection. */
function sanitizeUrl(url: string): string {
  if (!url) return '#';
  try {
    const parsed = new URL(url, window.location.origin);
    if (['http:', 'https:'].includes(parsed.protocol)) return url;
    // Relative paths are safe
    if (url.startsWith('/')) return url;
    return '#';
  } catch {
    // If URL parsing fails, only allow relative paths
    return url.startsWith('/') ? url : '#';
  }
}

interface Material {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
  createdAt: string;
}

interface LessonMaterialListProps {
  lessonId: string;
}

export default function LessonMaterialList({ lessonId }: LessonMaterialListProps) {
  const { lang } = useAppStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setLocked(false);
      setError(null);
      const res = await fetchApi(`/materials/lesson/${lessonId}`);
      setMaterials(res.data);
    } catch (err: unknown) {
      if ((err as { statusCode?: number })?.statusCode === 403) {
        setLocked(true);
      } else {
        setError(errorMessage(err, 'Failed to load lesson materials'));
      }
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="glass-card p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
        <Lock className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="text-sm text-slate-300">
          {lang === 'ar' 
            ? 'الملخصات والمرفقات متاحة للمشتركين فقط. اشترك الآن في المادة لفتح المرفقات.'
            : 'Lesson materials are locked. Subscribe to this subject to download files.'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center gap-3 text-red-400 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-2">
        {lang === 'ar' ? 'لا توجد ملخصات أو ملفات مرفقة لهذا الدرس.' : 'No attached materials for this lesson.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        {lang === 'ar' ? 'ملفات وملخصات الدرس:' : 'Lesson Attachments:'}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {materials.map((item) => (
          <a
            key={item.id}
            href={sanitizeUrl(item.fileUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="font-semibold text-slate-200 text-sm truncate">{item.title}</p>
                <p className="text-[11px] text-slate-400">{formatSize(item.sizeBytes)}</p>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0 ms-2">
              <Download className="w-4 h-4" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
