'use client';

import React, { useState } from 'react';
import { DollarSign, Users, Eye, X, Award, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface TeacherAnalyticsProps {
  students: any[];
  revenue: any;
}

export default function TeacherAnalytics({ students, revenue }: TeacherAnalyticsProps) {
  const [selectedStudentProgress, setSelectedStudentProgress] = useState<any>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const handleViewStudentProgress = async (student: any) => {
    setLoadingProgress(true);
    setShowStudentModal(true);

    try {
      const res = await fetchApi(`/teacher/students/${student.id}/progress`);
      if (res.success) {
        setSelectedStudentProgress({
          ...res.data,
          studentName: student.name,
          studentEmail: student.email,
        });
      }
    } catch (err) {
      console.warn('Could not fetch student progress:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Teacher Analytics & Student Progress</h2>
        <p className="text-sm text-slate-400">Track subscriber metrics, course revenues, and student performance</p>
      </div>

      {/* Revenue Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Paid Subscribers</p>
            <p className="text-2xl font-black text-white mt-1">{revenue?.totalSubscribers || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Monthly Revenue</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{revenue?.monthlyRevenue || 0} EGP</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Platform Share</p>
            <p className="text-2xl font-black text-white mt-1">{revenue?.platformSharePercentage || 85}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Enrolled Students Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Enrolled Students</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active subscribers across all your subject streams</p>
          </div>
          <span className="text-xs text-indigo-400 bg-indigo-600/10 px-3 py-1 rounded-full border border-indigo-500/20 font-bold">
            {students.length} Enrolled
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No students currently enrolled in your courses.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-6">Student</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Enrolled Subject</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-4 px-6 font-semibold text-white">{st.name}</td>
                    <td className="py-4 px-6 text-slate-400">{st.email}</td>
                    <td className="py-4 px-6">{st.subjectName || 'General Curriculum'}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleViewStudentProgress(st)}
                        className="py-1.5 px-3 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30 font-semibold transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Progress</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Progress Drawer / Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Student Progress Analysis</h3>

            {loadingProgress ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                <span>Calculating student progress metrics...</span>
              </div>
            ) : selectedStudentProgress ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <p className="text-xs text-slate-400">Student</p>
                  <p className="text-sm font-bold text-white">{selectedStudentProgress.studentName}</p>
                  <p className="text-xs text-slate-500">{selectedStudentProgress.studentEmail}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                    <p className="text-xs text-slate-400">Total Watch Time</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {Math.round((selectedStudentProgress.totalWatchTimeSec || 0) / 60)} Mins
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                    <p className="text-xs text-slate-400">Quiz Average</p>
                    <p className="text-xl font-bold text-indigo-400 mt-1">
                      {selectedStudentProgress.avgQuizScore || 0}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Courses</h4>
                  {(selectedStudentProgress.courses || []).map((c: any) => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">{c.titleEn}</p>
                        <p className="text-[11px] text-slate-400">{c.completedLessons} / {c.totalLessons} Lessons Completed</p>
                      </div>
                      <span className="text-xs font-bold text-indigo-400">{c.progress || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No detailed metrics available for this student.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
