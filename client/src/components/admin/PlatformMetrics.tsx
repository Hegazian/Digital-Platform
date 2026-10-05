'use client';

import React from 'react';
import { Users, BookOpen, TrendingUp, ShieldCheck } from 'lucide-react';

interface PlatformStats {
  users: { total: number; activeUsers?: number; students: number; teachers: number; pendingTeachers: number; approvedTeachers: number; };
  content: { totalCourses: number; publishedCourses: number; totalSubjects: number; totalVideos: number; totalQuizzes: number; };
  subscriptions: { active: number; total: number; };
}

interface PlatformMetricsProps {
  stats: PlatformStats | null;
}

export default function PlatformMetrics({ stats }: PlatformMetricsProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats?.users.total ?? 0}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="text-indigo-400 font-bold">{stats?.users.students ?? 0} Students</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">{stats?.users.approvedTeachers ?? 0} Teachers</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
            <span className="text-sky-400 font-bold">{stats?.users.activeUsers ?? 0}</span> active users
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Published Courses</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats?.content.publishedCourses ?? 0}</div>
          <div className="text-[11px] text-slate-400">
            Out of {stats?.content.totalCourses ?? 0} total curriculum courses
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats?.subscriptions.active ?? 0}</div>
          <div className="text-[11px] text-slate-400">
            {stats?.subscriptions.total ?? 0} total historical subscriptions
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pending Teachers</span>
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{stats?.users.pendingTeachers ?? 0}</div>
          <div className="text-[11px] text-slate-400">Requires verification approval</div>
        </div>
      </div>

      {/* Content Breakdown Row */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-4">Educational Content Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs text-slate-400">Secondary Subjects</p>
            <p className="text-xl font-bold text-white mt-1">{stats?.content.totalSubjects ?? 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs text-slate-400">Video Lectures</p>
            <p className="text-xl font-bold text-indigo-400 mt-1">{stats?.content.totalVideos ?? 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs text-slate-400">Interactive Quizzes</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{stats?.content.totalQuizzes ?? 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs text-slate-400">Verified Educators</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{stats?.users.approvedTeachers ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
