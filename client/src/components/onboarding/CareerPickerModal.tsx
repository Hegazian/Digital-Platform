'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import Modal from '@/components/ui/Modal';
import { useT } from '@/lib/useT';
import {
  Cpu,
  Stethoscope,
  Code2,
  FlaskConical,
  Star,
  Loader2,
  ArrowRight,
  X,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  cpu: Cpu,
  stethoscope: Stethoscope,
  code: Code2,
  flask: FlaskConical,
  star: Star,
};

interface CareerPickerModalProps {
  onClose: () => void;
}

/**
 * "Choose your future" onboarding: student picks an aspirational track.
 * The choice is persisted server-side and locally, then used to
 * prioritize the catalog and frame the dashboard.
 */
export default function CareerPickerModal({ onClose }: CareerPickerModalProps) {
  const { lang, careerTrackSlug, setCareerTrack } = useAppStore();
  const t = useT();
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['careers', 'tracks'],
    queryFn: () => fetchApi('/careers'),
    staleTime: 5 * 60_000,
  });
  const tracks: any[] = data?.data ?? [];

  const choose = async (slug: string) => {
    setSavingSlug(slug);
    try {
      await fetchApi('/careers/mine', {
        method: 'PUT',
        body: JSON.stringify({ slug }),
      });
      setCareerTrack(slug);
    } catch {
      // Local-only fallback so the UX still personalizes this device
      setCareerTrack(slug);
    } finally {
      setSavingSlug(null);
      onClose();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label={t('Choose your target faculty', 'اختر كليتك المستهدفة')}
      panelClassName="w-full max-w-2xl glass-panel rounded-3xl border border-slate-800 p-8 space-y-6"
    >
      <div className="space-y-6">
        <button
          onClick={onClose}
          aria-label={t('Skip for now', 'تخطي الآن')}
          className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white">{t('Choose your target faculty', 'اختر كليتك المستهدفة')}</h2>
          <p className="text-sm text-slate-400">
            {t(
              'Pick the faculty you are aiming for — we will put its Scientific Math courses first.',
              'اختر الكلية التي تستهدفها — وسنقدم لك دورات علمي رياضة أولاً.'
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tracks.map((track) => {
              const Icon = ICONS[track.iconKey] ?? Star;
              const active = careerTrackSlug === track.slug;
              return (
                <button
                  key={track.id}
                  onClick={() => choose(track.slug)}
                  disabled={savingSlug !== null}
                  aria-pressed={active}
                  className={`group p-5 rounded-2xl border text-left space-y-2 transition-all disabled:opacity-60 ${
                    active
                      ? 'border-indigo-500 bg-indigo-600/15'
                      : 'border-slate-800 bg-slate-900/50 hover:border-indigo-500/50 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-7 h-7 ${active ? 'text-indigo-300' : 'text-slate-400 group-hover:text-indigo-300'}`} />
                  <p className="text-sm font-bold text-white">
                    {lang === 'ar' ? track.nameAr : track.nameEn}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    {track._count?.subjects ?? track.subjects?.length ?? 0}{' '}
                    {t('subjects included', 'مادة')}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 font-semibold"
        >
          {t('Decide later — I’ll browse everything', 'لاحقاً — سأتصفح كل الدورات')}
        </button>
      </div>
    </Modal>
  );
}
