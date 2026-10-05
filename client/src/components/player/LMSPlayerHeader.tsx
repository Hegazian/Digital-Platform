'use client';

import React from 'react';
import { ArrowLeft, CheckCircle2, Award } from 'lucide-react';

interface LMSPlayerHeaderProps {
  courseTitle: string;
  subjectName?: string;
  completedLessonsCount: number;
  totalLessonsCount: number;
  onBackToCourses: () => void;
}

export default function LMSPlayerHeader({
  courseTitle,
  subjectName,
  completedLessonsCount,
  totalLessonsCount,
  onBackToCourses,
}: LMSPlayerHeaderProps) {
  const progressPercent = totalLessonsCount > 0
    ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
    : 0;

  return (
    <div className="glass-panel border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Back button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToCourses}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
          title="Back to Catalog"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline">Courses</span>
        </button>

        <div>
          <div className="flex items-center gap-2">
            {subjectName && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                {subjectName}
              </span>
            )}
            <h1 className="text-sm sm:text-base font-bold text-white line-clamp-1">
              {courseTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Right: Progress bar & Badges */}
      <div className="flex items-center gap-4 self-end sm:self-auto">
        <div className="text-right">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {completedLessonsCount}/{totalLessonsCount} Lessons ({progressPercent}%)
            </span>
          </div>
          <div className="w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {progressPercent === 100 && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
            <Award className="w-3.5 h-3.5" />
            <span>Course Complete</span>
          </span>
        )}
      </div>
    </div>
  );
}
