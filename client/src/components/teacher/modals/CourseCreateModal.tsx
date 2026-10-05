'use client';

import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { errorMessage } from '../../../lib/apiTypes';
import Modal from '@/components/ui/Modal';

interface Subject {
  id: string;
  nameEn: string;
  nameAr?: string;
}

interface CourseCreateModalProps {
  open: boolean;
  subjects: Subject[];
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Create-course dialog. Owns its form state and submission;
 * parent only reacts via onCreated() to refresh the catalog.
 */
export default function CourseCreateModal({
  open,
  subjects,
  onClose,
  onCreated,
}: CourseCreateModalProps) {
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [priceEgp, setPriceEgp] = useState('150');
  const [priceUsd, setPriceUsd] = useState('10');
  const [isFree, setIsFree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetchApi('/courses', {
        method: 'POST',
        body: JSON.stringify({
          titleEn,
          titleAr,
          description: courseDesc,
          subjectName: subjectName.trim(),
          ...(isFree
            ? { isFree: true }
            : {
                priceEgp: parseFloat(priceEgp) || 150,
                priceUsd: parseFloat(priceUsd) || 10,
              }),
        }),
      });

      setTitleEn('');
      setSubjectName('');
      setTitleAr('');
      setCourseDesc('');
      setPriceEgp('150');
      setPriceUsd('10');
      setIsFree(false);
      onClose();
      onCreated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create course'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label="Create New Course"
      panelClassName="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4"
    >
      <>
        <h3 className="text-lg font-bold text-white">Create New Course</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title (English)</label>
            <input
              type="text"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Advanced Chemistry"
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title (Arabic)</label>
            <input
              type="text"
              required
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال: الكيمياء المتقدمة"
              dir="rtl"
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Subject <span className="text-slate-600">(type a new one — it will be created)</span>
            </label>
            <input
              type="text"
              required
              list="subject-suggestions-create"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Advanced Chemistry"
              className="glass-input w-full text-xs"
            />
            <datalist id="subject-suggestions-create">
              {subjects.map((s) => (
                <option key={s.id} value={s.nameEn} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              rows={3}
              required
              value={courseDesc}
              onChange={(e) => setCourseDesc(e.target.value)}
              placeholder="Course curriculum and overview..."
              className="glass-input w-full text-xs"
            />
          </div>

          {/* Single Course Pricing */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Single Course Price (Unlocks All Lessons & Materials)</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-[11px] text-slate-300 font-semibold">
                Make this course free
                <span className="block text-[10px] text-slate-500 font-normal">
                  Students can enroll without checkout; price inputs are ignored.
                </span>
              </span>
            </label>
            <div className={`grid grid-cols-2 gap-3 ${isFree ? 'opacity-40 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Price (EGP)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={priceEgp}
                  onChange={(e) => setPriceEgp(e.target.value)}
                  disabled={isFree}
                  className="glass-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Price (USD $)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  disabled={isFree}
                  className="glass-input w-full text-xs"
                />
              </div>
            </div>
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
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </>
    </Modal>
  );
}
