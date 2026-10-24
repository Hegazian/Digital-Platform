import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../lib/store';
import { X, ShieldCheck, Copy, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import Modal from '../ui/Modal';
import { fetchApi } from '../../lib/api';
import { useT } from '../../lib/useT';

interface MfaSetupModalProps {
  isOpen?: boolean;
  onClose: () => void;
  /** Called ONLY after the server confirms a valid TOTP code. */
  onEnabled?: () => void;
  onSuccess?: () => void;
  isAlreadyEnabled?: boolean;
}

export default function MfaSetupModal({
  isOpen = true,
  onClose,
  onEnabled,
  onSuccess,
  isAlreadyEnabled = false,
}: MfaSetupModalProps) {
  const { token, dir } = useAppStore();
  const t = useT();
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(isAlreadyEnabled);
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentToken, setCurrentToken] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSetup = useCallback(async (reauthBody?: { currentPassword?: string; currentToken?: string }) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi('/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reauthBody || {}),
      });

      if (res.success && res.data) {
        setSetupData(res.data);
        setNeedsReauth(false);
      } else if (res.message && res.message.toLowerCase().includes('already enabled')) {
        setNeedsReauth(true);
      } else {
        setError(res.message || 'Failed to initialize MFA setup');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error during MFA setup');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;
    if (isAlreadyEnabled) {
      setNeedsReauth(true);
      setLoading(false);
    } else {
      fetchSetup();
    }
  }, [isOpen, isAlreadyEnabled, fetchSetup]);

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !currentToken || currentToken.length !== 6) {
      setError(t('Please provide your current password and current 6-digit authenticator code.', 'أدخل كلمة المرور الحالية ورمز المصادقة الحالي المكوّن من ٦ أرقام.'));
      return;
    }

    setReauthLoading(true);
    setError('');

    try {
      const res = await fetchApi('/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, currentToken }),
      });

      if (res.success && res.data) {
        setSetupData(res.data);
        setNeedsReauth(false);
      } else {
      setError(res.message || t('Incorrect password or authentication code.', 'كلمة المرور أو رمز المصادقة غير صحيح.'));
      }
    } catch (err: any) {
      setError(err?.message || t('Verification error during re-authentication.', 'حدث خطأ أثناء التحقق من الهوية.'));
    } finally {
      setReauthLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError(t('Please enter a valid 6-digit code', 'أدخل رمزاً صحيحاً مكوّناً من ٦ أرقام.'));
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const res = await fetchApi('/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: otp }),
      });

      if (res.success) {
        setRecoveryCodes(Array.isArray(res.data?.recoveryCodes) ? res.data.recoveryCodes : []);
        setSuccess(true);
        onEnabled?.();
        onSuccess?.();
      } else {
      setError(res.message || t('Invalid code. Please try again.', 'الرمز غير صحيح. حاول مرة أخرى.'));
      }
    } catch {
      setError(t('Verification failed', 'فشل التحقق.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = async () => {
    if (setupData && !success) {
      try { await fetchApi('/mfa/cancel-setup', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({}) }); }
      catch { /* The server-side 10-minute enrollment expiry remains the recovery bound. */ }
    }
    onClose();
  };

  const copySecret = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;
  return (
    <Modal
      open
      onClose={handleClose}
      label={t('Two-Factor Authentication', 'المصادقة الثنائية')}
      closeOnBackdrop={false}
      panelClassName="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-white tracking-tight">
            {isAlreadyEnabled ? t('Re-enroll 2FA', 'إعادة إعداد المصادقة الثنائية') : t('Enable 2FA', 'تفعيل المصادقة الثنائية')}
          </h2>
        </div>
        <button
          onClick={handleClose}
          aria-label={t('Close', 'إغلاق')}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{t('Two-Factor Enabled!', 'تم تفعيل المصادقة الثنائية!')}</h3>
            <p className="text-sm text-slate-400">{t('Your account is now protected with 2FA.', 'أصبح حسابك محمياً بالمصادقة الثنائية.')}</p>
            {recoveryCodes.length > 0 && (
              <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                <p className="text-sm font-semibold text-amber-200">{dir === 'rtl' ? 'احفظ رموز الاسترداد الآن؛ ستظهر مرة واحدة فقط.' : 'Save these recovery codes now. They are shown only once.'}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs text-white" dir="ltr">
                  {recoveryCodes.map((code) => <code key={code} className="rounded bg-slate-950 p-2">{code}</code>)}
                </div>
              </div>
            )}
            <button type="button" onClick={handleClose} className="mt-5 rounded-lg bg-slate-800 px-4 py-2">{dir === 'rtl' ? 'تم الحفظ' : 'Done'}</button>
          </div>
        ) : needsReauth ? (
          <form onSubmit={handleReauthSubmit} className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                {t('2FA is currently active on your account. To reconfigure it, verify your current password and existing authenticator code.', 'المصادقة الثنائية مفعّلة في حسابك. لإعادة إعدادها، تحقّق من كلمة المرور الحالية ورمز المصادقة الحالي.')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('Current Password', 'كلمة المرور الحالية')}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                aria-label={t('Current Password', 'كلمة المرور الحالية')}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('Enter current password', 'أدخل كلمة المرور الحالية')}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-indigo-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('Current Authenticator Code', 'رمز المصادقة الحالي')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={t('Current Authenticator Code', 'رمز المصادقة الحالي')}
                required
                maxLength={6}
                value={currentToken}
                onChange={(e) => setCurrentToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono tracking-widest text-center text-base focus:border-indigo-500 outline-none transition"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={reauthLoading || !currentPassword || currentToken.length !== 6}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
            >
              {reauthLoading ? t('Verifying identity…', 'جارٍ التحقق من الهوية…') : t('Proceed to new QR code', 'المتابعة إلى رمز QR جديد')}
            </button>
          </form>
        ) : loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : setupData ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-300 font-medium">{t('1. Scan the QR code', '١. امسح رمز QR')}</p>
              <p className="text-xs text-slate-400">
                {t('Open your authenticator app (for example Google Authenticator or 1Password) and scan this code.', 'افتح تطبيق المصادقة، مثل Google Authenticator أو 1Password، وامسح هذا الرمز.')}
              </p>

              <div className="bg-white p-4 rounded-xl flex justify-center mt-3 shadow-inner">
                {/* QR is a per-session data URL; next/image adds nothing but cost here */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setupData.qrCode} alt={t('Authenticator setup QR code', 'رمز QR لإعداد تطبيق المصادقة')} className="w-40 h-40 object-contain" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-300 font-medium">{t('2. Or enter the secret key manually', '٢. أو أدخل المفتاح السري يدوياً')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 break-all select-all">
                  {setupData.secret}
                </code>
                <button
                  onClick={copySecret}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy secret"
                  aria-label={t('Copy secret', 'نسخ المفتاح السري')}
                  type="button"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-sm text-slate-300 font-medium">{t('3. Verify the code', '٣. تحقّق من الرمز')}</p>
              <form onSubmit={handleVerify} className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={t('Authenticator code', 'رمز المصادقة')}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-center text-lg tracking-widest font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  maxLength={6}
                />
                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                >
                  {verifying ? t('Verifying…', 'جارٍ التحقق…') : t('Verify', 'تحقّق')}
                </button>
              </form>
              {error && (
                <div className="flex items-center gap-2 mt-2 text-rose-400 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-rose-400 text-sm">
            {error || 'Failed to load MFA setup'}
          </div>
        )}
      </div>
    </Modal>
  );
}
