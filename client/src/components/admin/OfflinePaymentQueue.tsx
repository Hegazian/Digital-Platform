'use client';

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface PendingSubscription {
  id: string;
  period: string;
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
  user: { name: string; email: string };
  subject: { nameEn: string; nameAr: string };
}

interface OfflinePaymentQueueProps {
  pendingSubscriptions: PendingSubscription[];
  actionLoading: string | null;
  onAction: (subId: string, action: 'approve' | 'reject') => void;
}

export default function OfflinePaymentQueue({
  pendingSubscriptions,
  actionLoading,
  onAction,
}: OfflinePaymentQueueProps) {
  if (pendingSubscriptions.length === 0) {
    return (
      <div className="glass-panel p-10 rounded-3xl border border-slate-800 text-center space-y-2">
        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
        <h3 className="text-base font-bold text-white">No Pending Offline Payments</h3>
        <p className="text-xs text-slate-400">All Vodafone Cash & InstaPay receipts have been verified.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden space-y-4">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Manual Offline Payment Verification</h3>
          <p className="text-xs text-slate-400 mt-0.5">Verify Vodafone Cash & InstaPay transaction receipts</p>
        </div>
        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          {pendingSubscriptions.length} Receipts Pending
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-6">Student</th>
              <th className="py-3 px-6">Subject</th>
              <th className="py-3 px-6">Method & Tx Ref</th>
              <th className="py-3 px-6">Period</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {pendingSubscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-900/40 transition">
                <td className="py-4 px-6">
                  <p className="font-semibold text-white">{sub.user?.name || 'Student'}</p>
                  <p className="text-[11px] text-slate-500">{sub.user?.email}</p>
                </td>
                <td className="py-4 px-6 font-medium text-white">{sub.subject?.nameEn || 'Subject'}</td>
                <td className="py-4 px-6">
                  <span className="font-mono text-indigo-300 text-[11px] block">{sub.transactionId || 'N/A'}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{sub.paymentMethod}</span>
                </td>
                <td className="py-4 px-6 text-slate-400 uppercase font-semibold text-[11px]">{sub.period}</td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onAction(sub.id, 'approve')}
                      disabled={actionLoading === sub.id}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => onAction(sub.id, 'reject')}
                      disabled={actionLoading === sub.id}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
