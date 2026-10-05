'use client';

import React, { useState } from 'react';
import { Megaphone, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { errorMessage } from '../../lib/apiTypes';

export default function AnnouncementManager() {
  const [showModal, setShowModal] = useState(false);
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [messageAr, setMessageAr] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetchApi('/teacher/announcements', {
        method: 'POST',
        body: JSON.stringify({
          titleEn,
          titleAr,
          messageEn,
          messageAr,
        }),
      });

      setMessage('Announcement broadcasted to enrolled students!');
      setTitleEn('');
      setTitleAr('');
      setMessageEn('');
      setMessageAr('');
      setShowModal(false);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to broadcast announcement'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Student Announcements</h2>
          <p className="text-sm text-slate-400">Broadcast important updates and exam reminders</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="glass-button py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Broadcast</span>
        </button>
      </div>

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

      <div className="glass-panel p-8 rounded-3xl border border-slate-800 flex items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <Megaphone className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Direct Student Notifications</h3>
          <p className="text-xs text-slate-400 mt-1">
            Broadcasts instantly appear on student dashboard feeds and trigger real-time notification alerts.
          </p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Broadcast Announcement</h3>
            <form onSubmit={handleBroadcast} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Title (English)</label>
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g. Midterm Exam Schedule"
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
                  placeholder="مثال: جدول اختبار نصف العام"
                  className="glass-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Message Body (English)</label>
                <textarea
                  rows={2}
                  required
                  value={messageEn}
                  onChange={(e) => setMessageEn(e.target.value)}
                  className="glass-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Message Body (Arabic)</label>
                <textarea
                  rows={2}
                  required
                  value={messageAr}
                  onChange={(e) => setMessageAr(e.target.value)}
                  className="glass-input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button py-2 px-5 rounded-xl text-xs font-bold"
                >
                  {loading ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
