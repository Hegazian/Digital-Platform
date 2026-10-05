'use client';

import React, { useState } from 'react';
import { fetchApi } from '../../../lib/api';
import { errorMessage } from '../../../lib/apiTypes';
import Modal from '@/components/ui/Modal';

export interface EditableModule {
  id: string;
  titleEn?: string | null;
  titleAr?: string | null;
  description?: string | null;
}

interface EditModuleModalProps {
  open: boolean;
  module: EditableModule | null;
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * Edit an existing curriculum module (FR-TEACHER-005): bilingual titles and
 * description. Remount via key={module.id} so state always reflects the row
 * being edited.
 */
export default function EditModuleModal({ open, module, onClose, onUpdated }: EditModuleModalProps) {
  const [titleEn, setTitleEn] = useState(module?.titleEn || '');
  const [titleAr, setTitleAr] = useState(module?.titleAr || '');
  const [description, setDescription] = useState(module?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open || !module) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      // titleAr is optional server-side but must be non-empty when present.
      await fetchApi(`/courses/modules/${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titleEn: titleEn.trim(),
          ...(titleAr.trim() ? { titleAr: titleAr.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : { description: null }),
        }),
      });

      onClose();
      onUpdated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update module'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label="Edit Module"
      panelClassName="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4"
    >
      <>
        <h3 className="text-lg font-bold text-white">Edit Module</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Module Title (English)</label>
            <input
              type="text"
              required
              minLength={2}
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Chapter 1: Introduction to Mechanics"
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Module Title (Arabic)</label>
            <input
              type="text"
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال: الفصل الأول: مقدمة في الميكانيكا"
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this chapter cover?"
              className="glass-input w-full text-xs"
            />
          </div>

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
