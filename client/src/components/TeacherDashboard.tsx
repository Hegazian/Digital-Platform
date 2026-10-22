'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { fetchApi } from '../lib/api';
import { Layers, Video, Megaphone, Award, BarChart3, Webhook, FileQuestion, Mic } from 'lucide-react';
import CourseManager from './teacher/CourseManager';
import LiveSessionManager from './teacher/LiveSessionManager';
import AnnouncementManager from './teacher/AnnouncementManager';
import AssignmentStudio from './teacher/AssignmentStudio';
import AssessmentBuilder from './teacher/AssessmentBuilder';
import PodcastStudio from './teacher/PodcastStudio';
import TeacherAnalytics from './teacher/TeacherAnalytics';
import DeveloperTabs from './admin/DeveloperTabs';

interface Subject {
  id: string;
  nameEn: string;
  nameAr: string;
}

export default function TeacherDashboard() {
  const { user, lang } = useAppStore();
  const [activeTab, setActiveTab] = useState<'courses' | 'live' | 'exams' | 'podcasts' | 'announcements' | 'grading' | 'analytics'>('courses');
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);

  const loadCourses = async () => {
    try {
      const res = await fetchApi('/courses/teacher/my-courses');
      const courseList = res.data?.courses || res.data || [];
      if (Array.isArray(courseList)) {
        setCourses(courseList);
      }
    } catch (err) {
      console.warn('Could not fetch teacher courses:', err);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await fetchApi('/teacher/students');
      if (res.success && Array.isArray(res.data)) {
        setStudents(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch enrolled students:', err);
    }
  };

  const loadRevenue = async () => {
    try {
      const res = await fetchApi('/teacher/revenue');
      if (res.success) {
        setRevenue(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch teacher revenue:', err);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await fetchApi('/subjects');
      if (res.success && Array.isArray(res.data)) {
        setSubjects(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch subjects:', err);
    }
  };

  useEffect(() => {
    loadCourses();
    loadStudents();
    loadRevenue();
    loadSubjects();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-600/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Teacher Workspace
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">Welcome back, {user?.name || 'Educator'}</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your secondary school curriculums, live classes, student evaluations, and earnings.
          </p>
        </div>

        <button
          onClick={() => setShowDeveloperModal(!showDeveloperModal)}
          className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-2 transition"
        >
          <Webhook className="w-4 h-4" />
          <span>API & Docs</span>
        </button>
      </div>

      {/* Developer API Docs Modal */}
      {showDeveloperModal && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <DeveloperTabs />
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {[
          { id: 'courses', label: 'Courses & Curriculum', icon: Layers },
          { id: 'live', label: 'Live Zoom Classes', icon: Video },
          { id: 'exams', label: 'Exam Builder', icon: FileQuestion },
          { id: 'podcasts', label: 'Podcast Studio', icon: Mic },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'grading', label: 'Grading Center', icon: Award },
          { id: 'analytics', label: 'Analytics & Students', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === 'courses' && (
        <CourseManager
          courses={courses}
          subjects={subjects}
          onRefreshCourses={loadCourses}
          lang={lang}
        />
      )}

      {activeTab === 'live' && (
        <LiveSessionManager subjects={subjects} lang={lang} />
      )}

      {activeTab === 'exams' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <AssessmentBuilder />
        </div>
      )}

      {activeTab === 'podcasts' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <PodcastStudio />
        </div>
      )}

      {activeTab === 'announcements' && (
        <AnnouncementManager />
      )}

      {activeTab === 'grading' && (
        <AssignmentStudio />
      )}

      {activeTab === 'analytics' && (
        <TeacherAnalytics
          students={students}
          revenue={revenue}
        />
      )}
    </div>
  );
}
