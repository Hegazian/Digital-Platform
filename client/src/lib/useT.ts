'use client';

import { useCallback } from 'react';
import { useAppStore } from './store';

/**
 * Canonical translation helper: t('English text', 'النص العربي').
 *
 * Replaces both legacy patterns:
 * - the fixed dictionary `t('brand')` (still supported in store for old keys)
 * - scattered inline `lang === 'ar' ? ... : ...` ternaries
 */
export function useT() {
  const lang = useAppStore((s) => s.lang);
  return useCallback((en: string, ar: string) => (lang === 'ar' ? ar : en), [lang]);
}
