'use client';

import React from 'react';
import { UserCheck, UserX, Clock, CheckCircle } from 'lucide-react';

interface PendingTeacher {
  id: string;
  email: string;
  name: string;
  teacherStatus: string;
  createdAt: string;
}

interface TeacherApprovalQueueProps {
  pendingTeachers: PendingTeacher[];
  actionLoading: string | null;
  onAction: (teacherId: string, status: 'APPROVED' | 'REJECTED') => void;
}

export default function TeacherApprovalQueue({
  pendingTeachers,
  actionLoading,
  onAction,
}: TeacherApprovalQueueProps) {
  if (pendingTeachers.length === 0) {
    return (
      <div className="glass-panel p-10 rounded-3xl border border-slate-800 text-center space-y-2">
        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
        <h3 className="text-base font-bold text-white">No Pending Teacher Applications</h3>
        <p className="text-xs text-slate-400">All educator accounts have been reviewed and verified.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden space-y-4">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Pending Educator Verifications</h3>
          <p className="text-xs text-slate-400 mt-0.5">Review teacher identity and grant curriculum publishing access</p>
        </div>
        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          {pendingTeachers.length} Awaiting Review
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-6">Educator</th>
              <th className="py-3 px-6">Email</th>
              <th className="py-3 px-6">Applied Date</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {pendingTeachers.map((t) => (
              <tr key={t.id} className="hover:bg-slate-900/40 transition">
                <td className="py-4 px-6 font-semibold text-white">{t.name}</td>
                <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">{t.email}</td>
                <td className="py-4 px-6 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <Clock className="w-3 h-3" />
                    PENDING
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onAction(t.id, 'APPROVED')}
                      disabled={actionLoading === t.id}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => onAction(t.id, 'REJECTED')}
                      disabled={actionLoading === t.id}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <UserX className="w-3.5 h-3.5" />
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
