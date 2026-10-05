import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { X, ShieldCheck, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { fetchApi } from '../../lib/api';

interface MfaSetupModalProps {
  onClose: () => void;
  /** Called ONLY after the server confirms a valid TOTP code. */
  onEnabled?: () => void;
}

export default function MfaSetupModal({ onClose, onEnabled }: MfaSetupModalProps) {
  const { token } = useAppStore();
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const res = await fetchApi('/mfa/setup', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.success) {
          setSetupData(res.data);
        } else {
          setError(res.message || 'Failed to initialize MFA setup');
        }
      } catch {
        setError('Network error during MFA setup');
      } finally {
        setLoading(false);
      }
    };
    fetchSetup();
  }, [token]);

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
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ token: otp })
      });

      if (res.success) {
        setSuccess(true);
        onEnabled?.();
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

  return (
    <Modal
      open
      onClose={onClose}
      label="Enable 2FA"
      closeOnBackdrop={false}
      panelClassName="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
    >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Enable 2FA</h2>
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
              <p className="text-sm text-slate-400">Your account is now more secure.</p>
            </div>
          ) : loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : setupData ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-300 font-medium">1. Scan the QR code</p>
                <p className="text-xs text-slate-400">Open your authenticator app (e.g. Google Authenticator) and scan this code.</p>
                
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
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-red-400 text-sm">
              {error || 'Failed to load MFA setup'}
            </div>
          )}
        </div>
    </Modal>
  );
}
