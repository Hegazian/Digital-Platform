'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { History, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

interface AttemptHistoryProps {
  quizId: string;
  refreshKey?: number;
}

/**
 * Student's own attempts for a quiz: score, pass/fail, duration, date.
 * Backed by GET /quizzes/:id/attempts (previously orphaned endpoint).
 */
export default function AttemptHistory({ quizId, refreshKey = 0 }: AttemptHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['quiz', 'attempts', quizId],
    queryFn: () => fetchApi(`/quizzes/${quizId}/attempts`),
    enabled: Boolean(quizId),
  });

  const attempts: any[] = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (attempts.length === 0) return null;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
      <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5 text-indigo-400" />
        Your Attempts
        <span className="text-slate-500 font-normal">({attempts.length})</span>
      </h4>
      <ul className="space-y-2" key={refreshKey}>
        {attempts.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold">
              {a.isPassed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Passed</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400">Failed</span>
                </>
              )}
            </span>
            <span className="text-xs font-bold text-white">{a.score}%</span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              {a.timeSpentSec ? `${Math.round(a.timeSpentSec / 60)}m` : '—'}
            </span>
            <span className="text-[11px] text-slate-500">
              {new Date(a.startedAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
