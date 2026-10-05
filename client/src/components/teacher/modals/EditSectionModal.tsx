'use client';

import React, { useState } from 'react';
import { fetchApi } from '../../../lib/api';
import { errorMessage } from '../../../lib/apiTypes';
import Modal from '@/components/ui/Modal';

export interface EditableSection {
  id: string;
  titleEn?: string | null;
  titleAr?: string | null;
  isFreePreview?: boolean;
}

interface EditSectionModalProps {
  open: boolean;
  section: EditableSection | null;
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * Edit a curriculum section: bilingual titles and the free-preview flag
 * (sections are the lighter curriculum unit used by some courses).
 * Remount via key={section.id}.
 */
export default function EditSectionModal({ open, section, onClose, onUpdated }: EditSectionModalProps) {
  const [titleEn, setTitleEn] = useState(section?.titleEn || '');
  const [titleAr, setTitleAr] = useState(section?.titleAr || '');
  const [isFreePreview, setIsFreePreview] = useState(!!section?.isFreePreview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open || !section) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      await fetchApi(`/courses/sections/${section.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titleEn: titleEn.trim(),
          ...(titleAr.trim() ? { titleAr: titleAr.trim() } : {}),
          isFreePreview,
        }),
      });

      onClose();
      onUpdated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update section'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label="Edit Section"
      panelClassName="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4"
    >
      <>
        <h3 className="text-lg font-bold text-white">Edit Section</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Section Title (English)</label>
            <input
              type="text"
              required
              minLength={2}
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Chapter 1: Introduction"
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Section Title (Arabic)</label>
            <input
              type="text"
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال: الفصل الأول: مقدمة"
              className="glass-input w-full text-xs"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFreePreview}
              onChange={(e) => setIsFreePreview(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-semibold text-white">
              Free preview (visible to non-enrolled students)
            </span>
          </label>

          {error && (
            <p role="alert" className="text-xs text-rose-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </>
    </Modal>
  );
}
