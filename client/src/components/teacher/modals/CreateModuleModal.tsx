'use client';

import React, { useState } from 'react';
import { fetchApi } from '../../../lib/api';
import { errorMessage } from '../../../lib/apiTypes';
import Modal from '@/components/ui/Modal';

interface CreateModuleModalProps {
  open: boolean;
  courseId: string;
  /** 'module' (rich unit) or 'section' (light unit) — endpoint switches accordingly. */
  kind?: 'module' | 'section';
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateModuleModal({
  open,
  courseId,
  kind = 'module',
  onClose,
  onCreated,
}: CreateModuleModalProps) {
  const isSection = kind === 'section';
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setLoading(true);
    setError('');

    try {
      await fetchApi(
        isSection ? `/courses/${courseId}/sections` : `/courses/${courseId}/modules`,
        {
          method: 'POST',
          body: JSON.stringify(
            isSection
              ? { titleEn, titleAr }
              : { titleEn, titleAr, description }
          ),
        }
      );

      setTitleEn('');
      setTitleAr('');
      setDescription('');
      onClose();
      onCreated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create module'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label="Add Module"
      panelClassName="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4"
    >
      <>
        <h3 className="text-lg font-bold text-white">Add Curriculum Chapter/Module</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Module Title (English)</label>
            <input
              type="text"
              required
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
              required
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال: الفصل الأول: مقدمة في الميكانيكا"
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {loading ? 'Adding...' : 'Add Module'}
            </button>
          </div>
        </form>
      </>
    </Modal>
  );
}
