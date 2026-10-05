'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw, CheckCircle, AlertCircle, Layers } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';

interface PricingTier {
  period: 'MONTHLY' | 'SIX_MONTHS' | 'YEARLY';
  priceEgp: number;
  priceUsd: number;
  isActive: boolean;
}

interface SubjectItem {
  id: string;
  nameEn: string;
  nameAr: string;
  description?: string;
  pricing: PricingTier[];
}

interface RawPricing {
  period: 'MONTHLY' | 'SIX_MONTHS' | 'YEARLY';
  priceEgp: number | string;
  priceUsd: number | string;
  isActive: boolean;
}

interface RawSubject {
  id: string;
  nameEn: string;
  nameAr: string;
  description?: string;
  pricing?: RawPricing[];
}

export default function CoursePricingManager() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/subjects');
      const data: RawSubject[] = res.data || [];

      // Normalize pricing structure for each subject
      const normalized = data.map((s: RawSubject) => {
        const defaultPeriods: Array<'MONTHLY' | 'SIX_MONTHS' | 'YEARLY'> = [
          'MONTHLY',
          'SIX_MONTHS',
          'YEARLY',
        ];
        const existingMap = new Map((s.pricing || []).map((p: RawPricing) => [p.period, p]));

        const pricing = defaultPeriods.map((period) => {
          const found = existingMap.get(period);
          return {
            period,
            priceEgp: found ? Number(found.priceEgp) : period === 'MONTHLY' ? 200 : period === 'SIX_MONTHS' ? 1000 : 1800,
            priceUsd: found ? Number(found.priceUsd) : period === 'MONTHLY' ? 10 : period === 'SIX_MONTHS' ? 50 : 90,
            isActive: found ? Boolean(found.isActive) : true,
          };
        });

        return {
          id: s.id,
          nameEn: s.nameEn,
          nameAr: s.nameAr,
          description: s.description,
          pricing,
        };
      });

      setSubjects(normalized);
    } catch (err: unknown) {
      console.warn('Failed to load subjects for pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handlePriceChange = (
    subjectId: string,
    period: 'MONTHLY' | 'SIX_MONTHS' | 'YEARLY',
    field: 'priceEgp' | 'priceUsd',
    value: number
  ) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== subjectId) return s;
        return {
          ...s,
          pricing: s.pricing.map((p) => {
            if (p.period !== period) return p;
            return { ...p, [field]: value };
          }),
        };
      })
    );
  };

  const handleSavePricing = async (subject: SubjectItem) => {
    setSavingId(subject.id);
    setMessage(null);
    setError(null);

    try {
      await fetchApi(`/subjects/${subject.id}/pricing`, {
        method: 'PUT',
        body: JSON.stringify({ pricing: subject.pricing }),
      });

      setMessage(`Pricing for "${subject.nameEn}" updated successfully!`);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update pricing'));
    } finally {
      setSavingId(null);
    }
  };

  const periodLabels = {
    MONTHLY: '1 Month Access',
    SIX_MONTHS: '6 Months (Term Pass)',
    YEARLY: 'Full Year (Annual Pass)',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Curriculum & Course Pricing Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure subscription costs, term pass rates, and international USD pricing for secondary school curriculums.
          </p>
        </div>
        <button
          onClick={loadSubjects}
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
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Loading pricing matrix...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-2">
          <Layers className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Subjects Found</h3>
          <p className="text-xs text-slate-400">Add subjects first to configure subscription prices.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subjects.map((subject) => {
            const isSaving = savingId === subject.id;

            return (
              <div
                key={subject.id}
                className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{subject.nameEn}</h3>
                      <p className="text-xs text-slate-400">{subject.nameAr}</p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300">
                      Secondary Stage
                    </span>
                  </div>

                  {subject.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{subject.description}</p>
                  )}

                  {/* Pricing Rows */}
                  <div className="space-y-3 pt-2">
                    {subject.pricing.map((p) => (
                      <div
                        key={p.period}
                        className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-200">{periodLabels[p.period]}</span>
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wider">
                            Billing Plan
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-emerald-400">EGP</span>
                            <input
                              type="number"
                              min="0"
                              value={p.priceEgp}
                              onChange={(e) =>
                                handlePriceChange(
                                  subject.id,
                                  p.period,
                                  'priceEgp',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-bold text-right focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-indigo-400">USD</span>
                            <input
                              type="number"
                              min="0"
                              value={p.priceUsd}
                              onChange={(e) =>
                                handlePriceChange(
                                  subject.id,
                                  p.period,
                                  'priceUsd',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-bold text-right focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                  <button
                    disabled={isSaving}
                    onClick={() => handleSavePricing(subject)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Pricing</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
