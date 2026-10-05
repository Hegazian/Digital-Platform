'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Video as VideoIcon,
  Lock,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../../lib/store';

export interface CurriculumLesson {
  id: string;
  titleEn: string;
  titleAr: string;
  duration?: string | number;
  isFreePreview?: boolean;
  videoId?: string;
  video?: any;
  materials?: any[];
  quiz?: any;
  blocks?: any[];
  isCompleted?: boolean;
}

export interface CurriculumModule {
  id: string;
  titleEn: string;
  titleAr: string;
  lessons: CurriculumLesson[];
}

interface CurriculumSidebarProps {
  modules: CurriculumModule[];
  activeLessonId: string;
  completedLessonIds: Set<string>;
  hasAccess: boolean;
  onSelectLesson: (lesson: CurriculumLesson) => void;
}

export default function CurriculumSidebar({
  modules,
  activeLessonId,
  completedLessonIds,
  hasAccess,
  onSelectLesson,
}: CurriculumSidebarProps) {
  const { lang } = useAppStore();
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (modId: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  return (
    <div className="w-full lg:w-80 glass-panel border border-slate-800 rounded-3xl flex flex-col h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Course Curriculum
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">
          {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} Lessons
        </span>
      </div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
        {modules.map((mod, modIdx) => {
          const isCollapsed = !!collapsedModules[mod.id || `mod-${modIdx}`];
          const modTitle = lang === 'ar' ? mod.titleAr || mod.titleEn : mod.titleEn;
          const completedInModule = (mod.lessons || []).filter((l) =>
            completedLessonIds.has(l.id)
          ).length;

          return (
            <div key={mod.id || modIdx} className="rounded-2xl overflow-hidden">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(mod.id || `mod-${modIdx}`)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-900/60 transition group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-indigo-600/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center border border-indigo-500/20 shrink-0">
                    {modIdx + 1}
                  </span>
                  <span className="font-bold text-xs text-slate-200 group-hover:text-white truncate">
                    {modTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {completedInModule}/{(mod.lessons || []).length}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Lessons in Module */}
              {!isCollapsed && (
                <div className="pl-3 pr-1 pb-2 space-y-1">
                  {(mod.lessons || []).map((lesson, lIdx) => {
                    const isActive = lesson.id === activeLessonId;
                    const isCompleted = completedLessonIds.has(lesson.id);
                    const isLocked = !hasAccess && !lesson.isFreePreview;
                    const lessonTitle =
                      lang === 'ar' ? lesson.titleAr || lesson.titleEn : lesson.titleEn;

                    return (
                      <button
                        key={lesson.id || lIdx}
                        onClick={() => !isLocked && onSelectLesson(lesson)}
                        disabled={isLocked}
                        className={`w-full p-2.5 rounded-xl text-left transition flex items-start gap-2.5 ${
                          isActive
                            ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-sm'
                            : isLocked
                            ? 'opacity-40 cursor-not-allowed text-slate-500'
                            : 'hover:bg-slate-900/40 text-slate-300'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="mt-0.5 shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <PlayCircle
                              className={`w-3.5 h-3.5 ${
                                isActive ? 'text-indigo-400' : 'text-slate-500'
                              }`}
                            />
                          )}
                        </div>

                        {/* Title & Resource Pills */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <p
                              className={`text-xs font-semibold truncate ${
                                isActive ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {lessonTitle}
                            </p>
                            {lesson.duration && (
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                {typeof lesson.duration === 'number'
                                  ? `${lesson.duration}m`
                                  : lesson.duration}
                              </span>
                            )}
                          </div>

                          {/* Pills */}
                          <div className="flex flex-wrap items-center gap-1">
                            {lesson.videoId && (
                              <span className="text-[9px] font-bold text-indigo-300 bg-indigo-600/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <VideoIcon className="w-2.5 h-2.5" /> Video
                              </span>
                            )}
                            {(lesson.materials || []).length > 0 && (
                              <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <FileText className="w-2.5 h-2.5" /> PDF
                              </span>
                            )}
                            {lesson.quiz && (
                              <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <HelpCircle className="w-2.5 h-2.5" /> Quiz
                              </span>
                            )}
                            {lesson.isFreePreview && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                Free
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
