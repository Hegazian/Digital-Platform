'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Copy,
  Users,
  RefreshCw,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';

export default function VoucherManager() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [resourceType, setResourceType] = useState<'SUBJECT' | 'COURSE'>('SUBJECT');
  const [resourceId, setResourceId] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [maxUses, setMaxUses] = useState('50');
  const [expiresAt, setExpiresAt] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [voucherRes, subjectRes, courseRes] = await Promise.all([
        fetchApi('/commerce/vouchers'),
        fetchApi('/subjects'),
        fetchApi('/courses?isPublished=true'),
      ]);

      setVouchers(Array.isArray(voucherRes.data) ? voucherRes.data : []);
      setSubjects(Array.isArray(subjectRes.data) ? subjectRes.data : []);
      const cList = courseRes.data?.courses || courseRes.data || [];
      setCourses(Array.isArray(cList) ? cList : []);

      if (subjectRes.data && subjectRes.data.length > 0 && !resourceId) {
        setResourceId(subjectRes.data[0].id);
      }
    } catch (err: unknown) {
      console.warn('Failed to load voucher data:', err);
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetchApi('/commerce/vouchers', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          resourceType,
          resourceId: resourceId || (resourceType === 'SUBJECT' ? subjects[0]?.id : courses[0]?.id),
          durationDays: parseInt(durationDays, 10) || 30,
          maxUses: parseInt(maxUses, 10) || 1,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });

      setMessage(`Promo code "${res.data.code}" generated successfully!`);
      setCode('');
      setShowCreateModal(false);
      await loadAll();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create promo code'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!confirm('Are you sure you want to deactivate this promo code?')) return;

    setActionId(voucherId);
    try {
      await fetchApi(`/commerce/vouchers/${voucherId}`, { method: 'DELETE' });
      setMessage('Promo code deactivated.');
      await loadAll();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to deactivate promo code'));
    } finally {
      setActionId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-400" />
            <span>Promo Codes & Vouchers</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create discount passes and full-access enrollment promo codes for school campaigns and scholarship students.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo Code</span>
          </button>
        </div>
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

      {/* Vouchers Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Promo Code</th>
                <th className="px-6 py-4">Target Resource</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Redemptions</th>
                <th className="px-6 py-4">Expiration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading promo codes...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No promo codes created yet. Click &quot;Create Promo Code&quot; to make your first campaign code.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const isDeactivated = !v.isActive;
                  const isExhausted = v.usedCount >= v.maxUses;
                  const isExpired = v.expiresAt && new Date(v.expiresAt) < new Date();

                  return (
                    <tr key={v.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{v.code}</span>
                          <button
                            onClick={() => copyToClipboard(v.code)}
                            className="p-1 text-slate-500 hover:text-indigo-400 transition"
                            title="Copy code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {copiedCode === v.code && (
                            <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 mr-2">
                          {v.resourceType}
                        </span>
                        <span className="text-slate-400 text-[11px]">{v.resourceId}</span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-300">
                        {v.durationDays} Days Pass
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-semibold text-white">{v.usedCount}</span>
                          <span className="text-slate-500">/ {v.maxUses}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'Never (Perpetual)'}
                      </td>

                      <td className="px-6 py-4">
                        {isDeactivated ? (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            Deactivated
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            Expired
                          </span>
                        ) : isExhausted ? (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Exhausted
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {!isDeactivated && (
                          <button
                            disabled={actionId === v.id}
                            onClick={() => handleDeleteVoucher(v.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-400" />
                <span>Create Promo Code</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Promo Code String *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME2026, PHYSICS50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Resource Target</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SUBJECT">Whole Subject</option>
                    <option value="COURSE">Single Course</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Select Item</label>
                  <select
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {resourceType === 'SUBJECT'
                      ? subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nameEn}
                          </option>
                        ))
                      : courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.titleEn}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Access Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {creating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Generate Code</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
