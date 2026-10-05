'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Globe,
  Mail,
  Shield,
  Palette,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Layout,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';
import {
  DEFAULT_HOME_CONTENT,
  HomeContentConfig,
  HomeTopicBadge,
  HomeTrustBadge,
  HomeStepItem,
  useConfigStore,
} from '@/lib/configStore';

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
  homeContent?: HomeContentConfig;
}

export default function PlatformSettings() {
  const [activeTab, setActiveTab] = useState<'general' | 'home' | 'governance'>('general');
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
    homeContent: DEFAULT_HOME_CONTENT,
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
        setConfig((prev) => ({
          ...prev,
          ...res.data,
          homeContent: res.data.homeContent ? {
            ...DEFAULT_HOME_CONTENT,
            ...res.data.homeContent,
            navbar: { ...DEFAULT_HOME_CONTENT.navbar, ...(res.data.homeContent.navbar || {}) },
            hero: { ...DEFAULT_HOME_CONTENT.hero, ...(res.data.homeContent.hero || {}) },
            subjectsSection: { ...DEFAULT_HOME_CONTENT.subjectsSection, ...(res.data.homeContent.subjectsSection || {}) },
            howItWorks: { ...DEFAULT_HOME_CONTENT.howItWorks, ...(res.data.homeContent.howItWorks || {}) },
            teacherBanner: { ...DEFAULT_HOME_CONTENT.teacherBanner, ...(res.data.homeContent.teacherBanner || {}) },
            footer: { ...DEFAULT_HOME_CONTENT.footer, ...(res.data.homeContent.footer || {}) },
          } : DEFAULT_HOME_CONTENT,
        }));
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

      // Update frontend global config store immediately
      await useConfigStore.getState().fetchConfig();

      setMessage('Platform configuration and home page content saved successfully!');
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update platform settings'));
    } finally {
      setSaving(false);
    }
  };

  const updateHomeContent = (updater: (prev: HomeContentConfig) => HomeContentConfig) => {
    setConfig((prev) => ({
      ...prev,
      homeContent: updater(prev.homeContent || DEFAULT_HOME_CONTENT),
    }));
  };

  const home = config.homeContent || DEFAULT_HOME_CONTENT;

  const updateNavbar = (fields: Partial<NonNullable<HomeContentConfig['navbar']>>) => {
    updateHomeContent((prev) => ({
      ...prev,
      navbar: { ...(prev.navbar || DEFAULT_HOME_CONTENT.navbar), ...fields },
    }));
  };

  const updateHero = (fields: Partial<NonNullable<HomeContentConfig['hero']>>) => {
    updateHomeContent((prev) => ({
      ...prev,
      hero: { ...(prev.hero || DEFAULT_HOME_CONTENT.hero), ...fields },
    }));
  };

  const updateSubjects = (fields: Partial<NonNullable<HomeContentConfig['subjectsSection']>>) => {
    updateHomeContent((prev) => ({
      ...prev,
      subjectsSection: { ...(prev.subjectsSection || DEFAULT_HOME_CONTENT.subjectsSection), ...fields },
    }));
  };

  const updateHowItWorks = (fields: Partial<NonNullable<HomeContentConfig['howItWorks']>>) => {
    updateHomeContent((prev) => ({
      ...prev,
      howItWorks: { ...(prev.howItWorks || DEFAULT_HOME_CONTENT.howItWorks), ...fields },
    }));
  };

  const updateTeacherBanner = (fields: Partial<NonNullable<HomeContentConfig['teacherBanner']>>) => {
    updateHomeContent((prev) => ({
      ...prev,
      teacherBanner: { ...(prev.teacherBanner || DEFAULT_HOME_CONTENT.teacherBanner), ...fields },
    }));
  };

  const updateFooter = (fields: Partial<NonNullable<HomeContentConfig['footer']>>) => {
    updateHomeContent((prev) => ({
      ...prev,
      footer: { ...(prev.footer || DEFAULT_HOME_CONTENT.footer), ...fields },
    }));
  };

  const addTopicBadge = () => {
    const list = [...(home.hero?.topicBadges || DEFAULT_HOME_CONTENT.hero.topicBadges)];
    list.push({ labelEn: 'New Subject', labelAr: 'موضوع جديد', subEn: 'Track', subAr: 'مسار' });
    updateHero({ topicBadges: list });
  };

  const removeTopicBadge = (index: number) => {
    const list = [...(home.hero?.topicBadges || DEFAULT_HOME_CONTENT.hero.topicBadges)];
    list.splice(index, 1);
    updateHero({ topicBadges: list });
  };

  const updateTopicBadge = (index: number, patch: Partial<HomeTopicBadge>) => {
    const list = [...(home.hero?.topicBadges || DEFAULT_HOME_CONTENT.hero.topicBadges)];
    list[index] = { ...list[index], ...patch };
    updateHero({ topicBadges: list });
  };

  const addTrustBadge = () => {
    const list = [...(home.hero?.trustBadges || DEFAULT_HOME_CONTENT.hero.trustBadges)];
    list.push({ labelEn: 'New Feature', labelAr: 'ميزة جديدة' });
    updateHero({ trustBadges: list });
  };

  const removeTrustBadge = (index: number) => {
    const list = [...(home.hero?.trustBadges || DEFAULT_HOME_CONTENT.hero.trustBadges)];
    list.splice(index, 1);
    updateHero({ trustBadges: list });
  };

  const updateTrustBadge = (index: number, patch: Partial<HomeTrustBadge>) => {
    const list = [...(home.hero?.trustBadges || DEFAULT_HOME_CONTENT.hero.trustBadges)];
    list[index] = { ...list[index], ...patch };
    updateHero({ trustBadges: list });
  };

  const updateStep = (index: number, patch: Partial<HomeStepItem>) => {
    const steps = [...(home.howItWorks?.steps || DEFAULT_HOME_CONTENT.howItWorks.steps)];
    steps[index] = { ...steps[index], ...patch };
    updateHowItWorks({ steps });
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
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>General & Identity</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                activeTab === 'home'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>Home Page Content</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('governance')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                activeTab === 'governance'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Governance & Features</span>
            </button>
          </div>

          {/* TAB 1: General & Identity */}
          {activeTab === 'general' && (
            <div className="space-y-6">
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
            </div>
          )}

          {/* TAB 2: Home Page Content */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Reset to defaults helper bar */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div>
                  <span className="text-xs font-bold text-indigo-300 block">Landing & Home Content Customization</span>
                  <span className="text-[11px] text-indigo-400/80">
                    Adapt all headlines, topic tags, value propositions and copy to any subject matter or domain.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateHomeContent(() => DEFAULT_HOME_CONTENT)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition flex items-center gap-1.5 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Reset to Defaults</span>
                </button>
              </div>

              {/* 1. Navbar Subtitle */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Top Navbar Brand Subtitle</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Subtitle (English)</label>
                    <input
                      type="text"
                      placeholder="e.g. Thanaweya Amma · Scientific Math"
                      value={home.navbar?.subtitleEn ?? ''}
                      onChange={(e) => updateNavbar({ subtitleEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Subtitle (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="e.g. ثانوية عامة · علمي رياضة"
                      value={home.navbar?.subtitleAr ?? ''}
                      onChange={(e) => updateNavbar({ subtitleAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Hero Headlines & CTAs */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Layout className="w-4 h-4 text-indigo-400" />
                  <span>Hero Section (Headings, CTAs & Tagline)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Heading Line 1 (English)</label>
                    <input
                      type="text"
                      value={home.hero?.headingLine1En ?? ''}
                      onChange={(e) => updateHero({ headingLine1En: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Heading Line 1 (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.hero?.headingLine1Ar ?? ''}
                      onChange={(e) => updateHero({ headingLine1Ar: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Heading Line 2 (English)</label>
                    <input
                      type="text"
                      value={home.hero?.headingLine2En ?? ''}
                      onChange={(e) => updateHero({ headingLine2En: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Heading Line 2 (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.hero?.headingLine2Ar ?? ''}
                      onChange={(e) => updateHero({ headingLine2Ar: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Hero Description (English)</label>
                    <textarea
                      rows={2}
                      value={home.hero?.descriptionEn ?? ''}
                      onChange={(e) => updateHero({ descriptionEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Hero Description (Arabic)</label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={home.hero?.descriptionAr ?? ''}
                      onChange={(e) => updateHero({ descriptionAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Primary CTA Label (English)</label>
                    <input
                      type="text"
                      value={home.hero?.primaryCtaEn ?? ''}
                      onChange={(e) => updateHero({ primaryCtaEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Primary CTA Label (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.hero?.primaryCtaAr ?? ''}
                      onChange={(e) => updateHero({ primaryCtaAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Secondary CTA Label (English)</label>
                    <input
                      type="text"
                      value={home.hero?.secondaryCtaEn ?? ''}
                      onChange={(e) => updateHero({ secondaryCtaEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Secondary CTA Label (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.hero?.secondaryCtaAr ?? ''}
                      onChange={(e) => updateHero({ secondaryCtaAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Bottom Tagline (English)</label>
                    <input
                      type="text"
                      value={home.hero?.bottomTaglineEn ?? ''}
                      onChange={(e) => updateHero({ bottomTaglineEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Bottom Tagline (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.hero?.bottomTaglineAr ?? ''}
                      onChange={(e) => updateHero({ bottomTaglineAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Hero Topic Badges (Target Faculties & Specializations) */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layout className="w-4 h-4 text-purple-400" />
                    <span>Hero Topic Badges (Disciplines / Faculties)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addTopicBadge}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Badge</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(home.hero?.topicBadges || DEFAULT_HOME_CONTENT.hero.topicBadges).map((b, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 block">Label (EN)</label>
                        <input
                          type="text"
                          value={b.labelEn}
                          onChange={(e) => updateTopicBadge(idx, { labelEn: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 block">Label (AR)</label>
                        <input
                          type="text"
                          dir="rtl"
                          value={b.labelAr}
                          onChange={(e) => updateTopicBadge(idx, { labelAr: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 block">Subtitle (EN / AR)</label>
                        <input
                          type="text"
                          placeholder="Short code / sub"
                          value={b.subEn || ''}
                          onChange={(e) => updateTopicBadge(idx, { subEn: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-end pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => removeTopicBadge(idx)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                          title="Remove Badge"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Hero Trust Badges */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Hero Trust Badges</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addTrustBadge}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Trust Point</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(home.hero?.trustBadges || DEFAULT_HOME_CONTENT.hero.trustBadges).map((b, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 block">Trust Point (EN)</label>
                        <input
                          type="text"
                          value={b.labelEn}
                          onChange={(e) => updateTrustBadge(idx, { labelEn: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="space-y-1 flex-1">
                          <label className="text-[10px] text-slate-400 block">Trust Point (AR)</label>
                          <input
                            type="text"
                            dir="rtl"
                            value={b.labelAr}
                            onChange={(e) => updateTrustBadge(idx, { labelAr: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTrustBadge(idx)}
                          className="mt-4 p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                          title="Remove Point"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Subjects Section Header */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Subjects Section Heading</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Title (English)</label>
                    <input
                      type="text"
                      value={home.subjectsSection?.titleEn ?? ''}
                      onChange={(e) => updateSubjects({ titleEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Title (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.subjectsSection?.titleAr ?? ''}
                      onChange={(e) => updateSubjects({ titleAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">View All Button (English)</label>
                    <input
                      type="text"
                      value={home.subjectsSection?.viewAllEn ?? ''}
                      onChange={(e) => updateSubjects({ viewAllEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">View All Button (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.subjectsSection?.viewAllAr ?? ''}
                      onChange={(e) => updateSubjects({ viewAllAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 6. "How It Works" Steps */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Layout className="w-4 h-4 text-amber-400" />
                  <span>How It Works Steps</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Section Tag (English)</label>
                    <input
                      type="text"
                      value={home.howItWorks?.tagEn ?? ''}
                      onChange={(e) => updateHowItWorks({ tagEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Section Tag (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.howItWorks?.tagAr ?? ''}
                      onChange={(e) => updateHowItWorks({ tagAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Section Title (English)</label>
                    <input
                      type="text"
                      value={home.howItWorks?.titleEn ?? ''}
                      onChange={(e) => updateHowItWorks({ titleEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Section Title (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.howItWorks?.titleAr ?? ''}
                      onChange={(e) => updateHowItWorks({ titleAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Steps List */}
                <div className="space-y-4 pt-2">
                  {(home.howItWorks?.steps || DEFAULT_HOME_CONTENT.howItWorks.steps).map((s, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-indigo-400">Step {s.step}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 block">Step Title (EN)</label>
                          <input
                            type="text"
                            value={s.titleEn}
                            onChange={(e) => updateStep(idx, { titleEn: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 block">Step Title (AR)</label>
                          <input
                            type="text"
                            dir="rtl"
                            value={s.titleAr}
                            onChange={(e) => updateStep(idx, { titleAr: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 block">Step Body (EN)</label>
                          <textarea
                            rows={2}
                            value={s.bodyEn}
                            onChange={(e) => updateStep(idx, { bodyEn: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 block">Step Body (AR)</label>
                          <textarea
                            rows={2}
                            dir="rtl"
                            value={s.bodyAr}
                            onChange={(e) => updateStep(idx, { bodyAr: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Teacher Recruitment Banner */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Teacher Recruitment Callout Banner</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Banner Title (English)</label>
                    <input
                      type="text"
                      value={home.teacherBanner?.titleEn ?? ''}
                      onChange={(e) => updateTeacherBanner({ titleEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Banner Title (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.teacherBanner?.titleAr ?? ''}
                      onChange={(e) => updateTeacherBanner({ titleAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Banner Body (English)</label>
                    <textarea
                      rows={2}
                      value={home.teacherBanner?.bodyEn ?? ''}
                      onChange={(e) => updateTeacherBanner({ bodyEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Banner Body (Arabic)</label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={home.teacherBanner?.bodyAr ?? ''}
                      onChange={(e) => updateTeacherBanner({ bodyAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">CTA Button (English)</label>
                    <input
                      type="text"
                      value={home.teacherBanner?.ctaEn ?? ''}
                      onChange={(e) => updateTeacherBanner({ ctaEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">CTA Button (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.teacherBanner?.ctaAr ?? ''}
                      onChange={(e) => updateTeacherBanner({ ctaAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 8. Footer Copy & Audience Tags */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Footer Brand Copy & Audience Tags</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Footer Brand Description (English)</label>
                    <textarea
                      rows={2}
                      value={home.footer?.brandDescriptionEn ?? ''}
                      onChange={(e) => updateFooter({ brandDescriptionEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Footer Brand Description (Arabic)</label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={home.footer?.brandDescriptionAr ?? ''}
                      onChange={(e) => updateFooter({ brandDescriptionAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Audience Title (English)</label>
                    <input
                      type="text"
                      value={home.footer?.audienceTitleEn ?? ''}
                      onChange={(e) => updateFooter({ audienceTitleEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Audience Title (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.footer?.audienceTitleAr ?? ''}
                      onChange={(e) => updateFooter({ audienceTitleAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Audience Tags (English, comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Scientific Math, Secondary 1, Secondary 2, Secondary 3"
                      value={(home.footer?.audienceTagsEn || DEFAULT_HOME_CONTENT.footer.audienceTagsEn).join(', ')}
                      onChange={(e) =>
                        updateFooter({
                          audienceTagsEn: e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Audience Tags (Arabic, comma-separated)</label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="علمي رياضة، الأول الثانوي، الثاني الثانوي، الثالث الثانوي"
                      value={(home.footer?.audienceTagsAr || DEFAULT_HOME_CONTENT.footer.audienceTagsAr).join('، ')}
                      onChange={(e) =>
                        updateFooter({
                          audienceTagsAr: e.target.value
                            .split(/[,،]/)
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">&quot;Designed with love for...&quot; (English)</label>
                    <input
                      type="text"
                      value={home.footer?.designedWithTextEn ?? ''}
                      onChange={(e) => updateFooter({ designedWithTextEn: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">&quot;Designed with love for...&quot; (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={home.footer?.designedWithTextAr ?? ''}
                      onChange={(e) => updateFooter({ designedWithTextAr: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Governance & Feature Toggles */}
          {activeTab === 'governance' && (
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
          )}

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
