'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Globe, Mail, Shield, Palette, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';

interface PlatformConfig {
  siteNameEn: string;
  siteNameAr: string;
  siteDescriptionEn: string;
  siteDescriptionAr: string;
  sloganEn: string;
  sloganAr: string;
  hostDomain: string;
  supportEmail: string;
  currency: string;
  exchangeRateUsdToEgp?: number | string;
  requireCourseApproval: boolean;
  allowTeacherRegistration: boolean;
  enableCodePlaygrounds: boolean;
  enableCollaborativeBoards: boolean;
  primaryColor: string;
}

export default function PlatformSettings() {
  const [config, setConfig] = useState<PlatformConfig>({
    siteNameEn: 'EduPlatform',
    siteNameAr: 'منصة التعليم',
    siteDescriptionEn: 'Next-generation Egyptian secondary education platform',
    siteDescriptionAr: 'المنصة التعليمية المتقدمة لطلاب المرحلة الثانوية',
    sloganEn: '',
    sloganAr: '',
    hostDomain: 'localhost:3000',
    supportEmail: 'support@eduplatform.com',
    currency: 'EGP',
    exchangeRateUsdToEgp: 48,
    requireCourseApproval: true,
    allowTeacherRegistration: true,
    enableCodePlaygrounds: true,
    enableCollaborativeBoards: true,
    primaryColor: '#4f46e5',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/config');
      if (res.data) {
        setConfig((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err: unknown) {
      console.warn('Failed to load platform config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await fetchApi('/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });

      setMessage('Platform configuration and host domain settings saved successfully!');
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update platform settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>Platform & Domain Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure host domain endpoints, bilingual branding, administrative governance, and system-wide feature flags.
          </p>
        </div>
        <button
          type="button"
          onClick={loadConfig}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Loading platform parameters...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Domain & Host Environment */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Host Domain & Network Settings</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Host Domain / URL</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. localhost:3000 or learn.eduplatform.com"
                  value={config.hostDomain || ''}
                  onChange={(e) => setConfig({ ...config, hostDomain: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500">The primary frontend host address for student and educator access.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Support & Contact Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="support@eduplatform.com"
                    value={config.supportEmail || ''}
                    onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Official contact address for student receipts and inquiries.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Bilingual Branding */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Platform Branding & Identity</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Platform Name (English)</label>
                <input
                  type="text"
                  required
                  value={config.siteNameEn || ''}
                  onChange={(e) => setConfig({ ...config, siteNameEn: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Platform Name (Arabic)</label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={config.siteNameAr || ''}
                  onChange={(e) => setConfig({ ...config, siteNameAr: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Slogan (English)</label>
                <input
                  type="text"
                  placeholder="Where future engineers are built"
                  value={config.sloganEn || ''}
                  onChange={(e) => setConfig({ ...config, sloganEn: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Slogan (Arabic)</label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="حيث يُصنع مهندسو الغد"
                  value={config.sloganAr || ''}
                  onChange={(e) => setConfig({ ...config, sloganAr: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tagline (English)</label>
                <input
                  type="text"
                  value={config.siteDescriptionEn || ''}
                  onChange={(e) => setConfig({ ...config, siteDescriptionEn: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tagline (Arabic)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={config.siteDescriptionAr || ''}
                  onChange={(e) => setConfig({ ...config, siteDescriptionAr: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Default Currency</label>
                <select
                  value={config.currency || 'EGP'}
                  onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="EGP">EGP (Egyptian Pound)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="SAR">SAR (Saudi Riyal)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Exchange Rate — 1 USD = ? EGP
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={config.exchangeRateUsdToEgp ?? 48}
                  onChange={(e) => setConfig({ ...config, exchangeRateUsdToEgp: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  EGP is the pricing source of truth. Every USD price shown to
                  students is derived automatically from this rate, so both
                  currencies always represent the same money.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Primary Brand Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.primaryColor || '#4f46e5'}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-10 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{config.primaryColor || '#4f46e5'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Governance & Feature Toggles */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Administrative Governance & Feature Toggles</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={config.requireCourseApproval}
                  onChange={(e) => setConfig({ ...config, requireCourseApproval: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Require Course Review Approval</span>
                  <span className="text-[11px] text-slate-400">
                    Courses created by teachers must be inspected and approved by an admin before being published.
                  </span>
                </div>
              </label>

              <label className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={config.allowTeacherRegistration}
                  onChange={(e) => setConfig({ ...config, allowTeacherRegistration: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Allow Teacher Applications</span>
                  <span className="text-[11px] text-slate-400">
                    Allow new educators to submit teacher registration requests from the login modal.
                  </span>
                </div>
              </label>

              <label className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={config.enableCodePlaygrounds}
                  onChange={(e) => setConfig({ ...config, enableCodePlaygrounds: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Enable Interactive Code Runner</span>
                  <span className="text-[11px] text-slate-400">
                    Provide in-browser code editor and sandbox execution for programming lessons.
                  </span>
                </div>
              </label>

              <label className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={config.enableCollaborativeBoards}
                  onChange={(e) => setConfig({ ...config, enableCollaborativeBoards: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Enable Collaborative Whiteboards</span>
                  <span className="text-[11px] text-slate-400">
                    Activate real-time multiplayer drawing boards for interactive problem solving.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Platform Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
