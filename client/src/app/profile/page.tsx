'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAppStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';

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
        </div>
      </main>
    </div>
  );
}
