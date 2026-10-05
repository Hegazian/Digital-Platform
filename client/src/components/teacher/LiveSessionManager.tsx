'use client';

import React, { useState } from 'react';
import { Video, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { errorMessage } from '../../lib/apiTypes';

interface Subject {
  id: string;
  nameEn: string;
  nameAr: string;
}

interface LiveSessionManagerProps {
  subjects: Subject[];
  lang: string;
}

export default function LiveSessionManager({ subjects, lang }: LiveSessionManagerProps) {
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [zoomTitleEn, setZoomTitleEn] = useState('');
  const [zoomTitleAr, setZoomTitleAr] = useState('');
  const [zoomStartTime, setZoomStartTime] = useState('');
  const [zoomDuration, setZoomDuration] = useState('60');
  const [zoomStartUrl, setZoomStartUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCreateZoomSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetchApi('/live/sessions', {
        method: 'POST',
        body: JSON.stringify({
          subjectId: subjectId || subjects[0]?.id,
          titleEn: zoomTitleEn,
          titleAr: zoomTitleAr,
          startTime: new Date(zoomStartTime).toISOString(),
          durationMinutes: parseInt(zoomDuration, 10),
          zoomStartUrl: zoomStartUrl || 'https://zoom.us/s/mock-start-url',
        }),
      });

      setMessage('Live session scheduled successfully!');
      setZoomTitleEn('');
      setZoomTitleAr('');
      setZoomStartTime('');
      setZoomStartUrl('');
      setShowZoomModal(false);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to schedule live session'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Live Zoom Sessions</h2>
          <p className="text-sm text-slate-400">Schedule interactive online lectures with automatic student invites</p>
        </div>
        <button
          onClick={() => setShowZoomModal(true)}
          className="glass-button py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Live Class</span>
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

      {/* Info Card */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Video className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Integrated Zoom Video Lectures</h3>
            <p className="text-xs text-slate-400 max-w-lg mt-1">
              Sessions are automatically verified via EntitlementResolver so only authorized enrolled students can join.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowZoomModal(true)}
          className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shrink-0"
        >
          Schedule Now
        </button>
      </div>

      {/* Schedule Modal */}
      {showZoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Schedule Live Zoom Class</h3>
            <form onSubmit={handleCreateZoomSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="glass-input w-full text-xs"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {lang === 'ar' ? s.nameAr || s.nameEn : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Session Title (English)</label>
                <input
                  type="text"
                  required
                  value={zoomTitleEn}
                  onChange={(e) => setZoomTitleEn(e.target.value)}
                  placeholder="e.g. Physics Q&A Live Review"
                  className="glass-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Session Title (Arabic)</label>
                <input
                  type="text"
                  required
                  value={zoomTitleAr}
                  onChange={(e) => setZoomTitleAr(e.target.value)}
                  placeholder="مثال: مراجعة الفيزياء المباشرة"
                  className="glass-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={zoomStartTime}
                    onChange={(e) => setZoomStartTime(e.target.value)}
                    className="glass-input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={zoomDuration}
                    onChange={(e) => setZoomDuration(e.target.value)}
                    className="glass-input w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Zoom Host Start URL (Optional)</label>
                <input
                  type="url"
                  value={zoomStartUrl}
                  onChange={(e) => setZoomStartUrl(e.target.value)}
                  placeholder="https://zoom.us/s/..."
                  className="glass-input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowZoomModal(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button py-2 px-5 rounded-xl text-xs font-bold"
                >
                  {loading ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
