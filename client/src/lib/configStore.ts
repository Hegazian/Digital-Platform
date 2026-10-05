'use client';

import { create } from 'zustand';
import { useEffect } from 'react';
import { fetchApi } from './api';
import { errorMessage } from './apiTypes';
import { useAppStore } from './store';

export interface AppConfig {
  siteNameEn: string;
  siteNameAr: string;
  siteDescriptionEn: string | null;
  siteDescriptionAr: string | null;
  sloganEn?: string | null;
  sloganAr?: string | null;
  allowTeacherRegistration: boolean;
  enableCodePlaygrounds: boolean;
  enableCollaborativeBoards: boolean;
  primaryColor: string;
}

interface ConfigState {
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
}

/**
 * Public platform configuration (site name, slogan, feature flags).
 * Fetched once at app boot via <Providers>; every brand surface reads
 * from here instead of hardcoded strings.
 */
export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: false,
  error: null,
  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchApi('/config');
      if (res.success) {
        set({ config: res.data, isLoading: false });
      } else {
        set({ error: res.message, isLoading: false });
      }
    } catch (err: unknown) {
      set({ error: errorMessage(err), isLoading: false });
    }
  },
}));

/** Localized platform name with graceful fallback until config loads. */
export function useSiteName(): string {
  const { lang } = useAppStore();
  const config = useConfigStore((s) => s.config);
  if (!config) return lang === 'ar' ? 'إديوبلاتفورم' : 'EduPlatform';
  return (lang === 'ar' ? config.siteNameAr : config.siteNameEn) || 'EduPlatform';
}

/** Localized slogan; empty string when not configured. */
export function useSiteSlogan(): string {
  const { lang } = useAppStore();
  const config = useConfigStore((s) => s.config);
  if (!config) return '';
  return ((lang === 'ar' ? config.sloganAr : config.sloganEn) ?? '').trim();
}

/** Localized marketing description; empty string when not configured. */
export function useSiteDescription(): string {
  const lang = useAppStore((s) => s.lang);
  const config = useConfigStore((s) => s.config);
  if (!config) return '';
  return ((lang === 'ar' ? config.siteDescriptionAr : config.siteDescriptionEn) ?? '').trim();
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Bootstraps configuration once per app lifetime AND applies every
 * runtime-configurable surface:
 * - tab title        <- siteName*
 * - meta description <- siteDescription*
 * - theme-color + --brand-primary CSS variable <- primaryColor
 */
export function useConfigBootstrap() {
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const config = useConfigStore((s) => s.config);
  const lang = useAppStore((s) => s.lang);

  useEffect(() => {
    if (!config) fetchConfig().catch(() => undefined);
  }, [config, fetchConfig]);

  useEffect(() => {
    if (!config || typeof document === 'undefined') return;

    const name = (lang === 'ar' ? config.siteNameAr : config.siteNameEn) || 'EduPlatform';
    const description =
      ((lang === 'ar' ? config.siteDescriptionAr : config.siteDescriptionEn) ?? '').trim();

    document.title = name;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'theme-color', config.primaryColor || '#4f46e5');
    document.documentElement.style.setProperty(
      '--brand-primary',
      config.primaryColor || '#4f46e5'
    );
  }, [config, lang]);
}
