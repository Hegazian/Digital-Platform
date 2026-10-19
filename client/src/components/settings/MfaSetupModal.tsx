import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../lib/store';
import { X, ShieldCheck, Copy, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import Modal from '../ui/Modal';
import { fetchApi } from '../../lib/api';

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
  const { token } = useAppStore();
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
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
        ...(reauthBody ? { body: JSON.stringify(reauthBody) } : {}),
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
      setError('Please provide your current password and current 6-digit authenticator code.');
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
        setError(res.message || 'Incorrect password or authentication code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error during re-authentication.');
    } finally {
      setReauthLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
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
        setSuccess(true);
        onEnabled?.();
        onSuccess?.();
        setTimeout(() => onClose(), 2000);
      } else {
        setError(res.message || 'Invalid code. Please try again.');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setVerifying(false);
    }
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
      onClose={onClose}
      label="Two-Factor Authentication"
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
            {isAlreadyEnabled ? 'Re-enroll 2FA' : 'Enable 2FA'}
          </h2>
        </div>
        <button
          onClick={onClose}
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
            <h3 className="text-lg font-medium text-white mb-2">Two-Factor Enabled!</h3>
            <p className="text-sm text-slate-400">Your account is now protected with 2FA.</p>
          </div>
        ) : needsReauth ? (
          <form onSubmit={handleReauthSubmit} className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                2FA is currently active on your account. To reconfigure or reset it, please verify your current password and existing authenticator code.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-indigo-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current Authenticator Code
              </label>
              <input
                type="text"
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
              {reauthLoading ? 'Verifying Identity…' : 'Proceed to New QR Code'}
            </button>
          </form>
        ) : loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : setupData ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-300 font-medium">1. Scan the QR code</p>
              <p className="text-xs text-slate-400">
                Open your authenticator app (e.g. Google Authenticator, 1Password) and scan this code.
              </p>

              <div className="bg-white p-4 rounded-xl flex justify-center mt-3 shadow-inner">
                {/* QR is a per-session data URL; next/image adds nothing but cost here */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setupData.qrCode} alt="MFA QR Code" className="w-40 h-40 object-contain" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-300 font-medium">2. Or enter the secret key manually</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 break-all select-all">
                  {setupData.secret}
                </code>
                <button
                  onClick={copySecret}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy secret"
                  type="button"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-sm text-slate-300 font-medium">3. Verify the code</p>
              <form onSubmit={handleVerify} className="flex gap-2">
                <input
                  type="text"
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
                  {verifying ? 'Verifying...' : 'Verify'}
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
