'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { errorMessage } from '../../../lib/apiTypes';
import Modal from '@/components/ui/Modal';

interface Subject {
  id: string;
  nameEn: string;
  nameAr?: string;
}

interface CourseEditModalProps {
  open: boolean;
  course: any | null;
  subjects: Subject[];
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * Edit-course dialog (details + pricing + subject rename).
 * Seeds its state from the selected course whenever it opens.
 */
export default function CourseEditModal({
  open,
  course,
  subjects,
  onClose,
  onUpdated,
}: CourseEditModalProps) {
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [priceEgp, setPriceEgp] = useState('150');
  const [priceUsd, setPriceUsd] = useState('10');
  const [isFree, setIsFree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && course) {
      setTitleEn(course.titleEn || '');
      setTitleAr(course.titleAr || '');
      setDescription(course.description || '');
      setSubjectName(course.subject?.nameEn || '');
      setPriceEgp(String(course.priceEgp || 150));
      setPriceUsd(String(course.priceUsd || 10));
      setIsFree(Boolean(course.isFree));
      setError('');
    }
  }, [open, course]);

  if (!open || !course) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetchApi(`/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titleEn,
          titleAr,
          description,
          ...(subjectName.trim() && subjectName !== course.subject?.nameEn
            ? { subjectName: subjectName.trim() }
            : {}),
          isFree,
          ...(isFree
            ? {}
            : {
                priceEgp: parseFloat(priceEgp) || 150,
                priceUsd: parseFloat(priceUsd) || 10,
              }),
        }),
      });

      onClose();
      onUpdated();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update course'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label="Edit Course"
      panelClassName="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4"
    >
      <>
        <h3 className="text-lg font-bold text-white">Edit Course & Pricing</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title (English)</label>
            <input
              type="text"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title (Arabic)</label>
            <input
              type="text"
              required
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="glass-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Subject <span className="text-slate-600">(rename to move the course)</span>
            </label>
            <input
              type="text"
              list="subject-suggestions-edit"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder={course.subject?.nameEn || 'Subject name'}
              className="glass-input w-full text-xs"
            />
            <datalist id="subject-suggestions-edit">
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input w-full text-xs"
            />
          </div>

          {/* Pricing */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Course Single Price (Unlocks All Lessons & Materials)</span>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </>
    </Modal>
  );
}
