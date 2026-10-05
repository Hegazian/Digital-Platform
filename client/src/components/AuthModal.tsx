'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useAppStore, dashboardPathFor } from '../lib/store';
import { useConfigStore } from '../lib/configStore';
import { fetchApi } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { X, Lock, Mail, User as UserIcon, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { setUser, lang } = useAppStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const allowTeacherRegistration = useConfigStore(
    (s) => s.config?.allowTeacherRegistration ?? true
  );
  if (!allowTeacherRegistration && role === 'TEACHER') {
    // Config disabled mid-session: fall back to the always-allowed role.
    setRole('STUDENT');
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [grades, setGrades] = useState<{ id: string; label: string }[]>([]);

  // Grade-year options for student registration (public endpoint).
  useEffect(() => {
    if (mode !== 'register') return;
    let cancelled = false;
    fetchApi('/academic/stages')
      .then((res) => {
        if (cancelled) return;
        const opts: { id: string; label: string }[] = [];
        for (const stage of res.data || []) {
          for (const g of stage.grades || []) {
            opts.push({
              id: g.id,
              label:
                lang === 'ar' ? g.nameAr : `${stage.nameEn} · ${g.nameEn}`.replace(/^Secondary · /, 'Grade '),
            });
          }
        }
        setGrades(opts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mode, lang]);

  // MFA Challenge state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionToken, setMfaSessionToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetchApi('/auth/mfa-login', {
        method: 'POST',
        body: JSON.stringify({ mfaSessionToken, mfaCode }),
      });

      localStorage.setItem('accessToken', res.data.tokens.accessToken);
      // Refresh token arrives as an httpOnly cookie - nothing stored here.
      setUser(res.data.user, res.data.tokens.accessToken);

      onClose();
      router.push(dashboardPathFor(res.data.user?.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA code verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await fetchApi('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            name,
            role,
            ...(role === 'STUDENT'
              ? { studentNumber: studentNumber.trim(), gradeId }
              : {}),
          }),
        });
        setSuccessMsg(
          role === 'TEACHER'
            ? 'Teacher registration submitted! Status: PENDING Admin review.'
            : 'Registration successful! Please log in.'
        );
        setStudentNumber('');
        setGradeId('');
        setTimeout(() => setMode('login'), 1500);
      } else {
        const res = await fetchApi('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        // If 2FA is required for this account
        if (res.data.mfaRequired) {
          setMfaRequired(true);
          setMfaSessionToken(res.data.mfaSessionToken);
          setLoading(false);
          return;
        }

        localStorage.setItem('accessToken', res.data.tokens.accessToken);
        // Refresh token arrives as an httpOnly cookie - nothing stored here.
        // Purge any cached data from a previous identity on this device.
        queryClient.clear();
        setUser(res.data.user, res.data.tokens.accessToken);

        onClose();
        router.push(dashboardPathFor(res.data.user?.role));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label={mode === 'register' ? 'Create account' : 'Sign in'}
      panelClassName="relative w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl"
    >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {mfaRequired ? 'Two-Factor Authentication' : mode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mfaRequired
              ? 'Enter the 6-digit authentication code from your authenticator app'
              : mode === 'login'
              ? 'Access your secondary school platform'
              : 'Thanaweya Amma · Scientific Math — students & teachers'}
          </p>
        </div>

        {/* Mode Tabs (Only when not in MFA Challenge) */}
        {!mfaRequired && (
          <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
                mode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
                mode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {mfaRequired ? (
          <form onSubmit={handleMfaSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Authenticator Code (TOTP)</label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="glass-input w-full text-center text-2xl tracking-[0.5em] font-mono py-3"
              />
            </div>

            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="glass-button w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Verify & Log In'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMfaRequired(false);
                setMfaCode('');
                setError('');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition"
            >
              Cancel and return to login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Select Account Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['STUDENT', 'TEACHER'] as const)
                      .filter((r) => r !== 'TEACHER' || allowTeacherRegistration)
                      .map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          role === r
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {r}
                      </button>
                      ))}
                  </div>
                  {!allowTeacherRegistration && (
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      Teacher registration is currently closed. Contact support to apply.
                    </p>
                  )}
                </div>

                {/* Name Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ahmed Ali"
                      className="glass-input w-full pl-10 text-sm"
                    />
                  </div>
                </div>

                {/* Student identity (students only) */}
                {role === 'STUDENT' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Student Number
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={32}
                        pattern="[A-Za-z0-9-]+"
                        title="Letters, digits and dashes only"
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: 20260456' : 'e.g. 20260456'}
                        dir={/^[0-9]*$/.test(studentNumber) ? 'ltr' : undefined}
                        className="glass-input w-full text-sm"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        {lang === 'ar'
                          ? 'رقم الطالب المدرسي أو رقم الجلوس — يُستخدم للتحقق من هويتك.'
                          : 'Your school student number or exam seat number.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Grade Year
                      </label>
                      <select
                        required
                        value={gradeId}
                        onChange={(e) => setGradeId(e.target.value)}
                        className="glass-input w-full text-sm"
                      >
                        <option value="">
                          {lang === 'ar' ? 'اختر الصف الدراسي…' : 'Select your grade year…'}
                        </option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="glass-input w-full pl-10 text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="glass-button w-full py-3.5 rounded-xl text-sm mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}
    </Modal>
  );
}
