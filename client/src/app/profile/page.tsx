'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAppStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';
import { ShieldCheck } from 'lucide-react';
import MfaSetupModal from '../../components/settings/MfaSetupModal';

interface GradeOption {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  stageName: string;
}

export default function ProfilePage() {
  const { dir, user, setUser } = useAppStore();
  const token = useAppStore.getState().token;

  const [name, setName] = useState('');
  const [gradeId, setGradeId] = useState<string>('');
  const [studentNumber, setStudentNumber] = useState('');
  const [role, setRole] = useState<string>('');
  const [email, setEmail] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const [profileRes, stagesRes] = await Promise.all([
          fetchApi('/auth/profile'),
          fetchApi('/academic/stages'),
        ]);

        setName(profileRes.data.name || '');
        setEmail(profileRes.data.email || '');
        setGradeId(profileRes.data.gradeId || '');
        setStudentNumber(profileRes.data.studentNumber || '');
        setRole(profileRes.data.role || '');
        setMfaEnabled(Boolean(profileRes.data.mfaEnabled));

        const options: GradeOption[] = [];
        for (const stage of stagesRes.data || []) {
          for (const grade of stage.grades || []) {
            options.push({
              id: grade.id,
              nameEn: grade.nameEn,
              nameAr: grade.nameAr,
              stageName: stage.nameEn,
            });
          }
        }
        setGrades(options);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      await fetchApi('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          ...(name.trim() && { name: name.trim() }),
          gradeId: gradeId || null,
          ...(role === 'STUDENT'
            ? { studentNumber: studentNumber.trim() || null }
            : {}),
        }),
      });

      if (user) {
        setUser({ ...user, name: name.trim() }, useAppStore.getState().token);
      }
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex justify-center px-4 py-10">
        <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-800 p-8">
          <h1 className="text-2xl font-bold mb-1">My Profile</h1>
          <p className="text-sm text-slate-400 mb-6">Update your basic information</p>

          {loading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label htmlFor="profile-email" className="block text-xs font-semibold text-slate-400 mb-2">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-400 mb-2">
                  Full Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none text-sm"
                  placeholder="Your name"
                />
              </div>

              {role === 'STUDENT' && (
                <div>
                  <label htmlFor="profile-student-number" className="block text-xs font-semibold text-slate-400 mb-2">
                    Student Number
                  </label>
                  <input
                    id="profile-student-number"
                    type="text"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    maxLength={32}
                    pattern="[A-Za-z0-9-]*"
                    title="Letters, digits and dashes only"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none text-sm"
                    placeholder="School student number or exam seat number"
                  />
                </div>
              )}

              <div>
                <label htmlFor="profile-grade" className="block text-xs font-semibold text-slate-400 mb-2">
                  Grade
                </label>
                <select
                  id="profile-grade"
                  value={gradeId}
                  onChange={(e) => setGradeId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none text-sm"
                >
                  <option value="">— Not set —</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.stageName} · {dir === 'rtl' && g.nameAr ? g.nameAr : g.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p role="alert" className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold text-sm transition-all"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* Security & 2FA Section */}
          <div className="mt-8 pt-8 border-t border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {dir === 'rtl' ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication (2FA)'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dir === 'rtl'
                      ? 'حماية إضافية لحسابك باستخدام رموز المصادقة عبر تطبيق TOTP'
                      : 'Add an extra layer of security requiring a TOTP authenticator code.'}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        mfaEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${mfaEnabled ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {mfaEnabled
                        ? (dir === 'rtl' ? 'مفعلة' : '2FA Enabled')
                        : (dir === 'rtl' ? 'غير مفعلة' : '2FA Disabled')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMfaModal(true)}
                disabled={mfaEnabled}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition shrink-0"
              >
                {mfaEnabled
                  ? (dir === 'rtl' ? 'التحقق بخطوتين مفعّل' : '2FA enabled')
                  : (dir === 'rtl' ? 'تفعيل 2FA' : 'Configure 2FA')}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showMfaModal && (
        <MfaSetupModal
          isOpen={showMfaModal}
          onClose={() => setShowMfaModal(false)}
          onSuccess={() => {
            setMfaEnabled(true);
            if (user) {
              setUser({ ...user, mfaEnabled: true }, useAppStore.getState().token);
            }
          }}
          isAlreadyEnabled={mfaEnabled}
        />
      )}
    </div>
  );
}
