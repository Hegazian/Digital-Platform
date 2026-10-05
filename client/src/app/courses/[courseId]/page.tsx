'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import VideoPlayerSection from '../../../components/VideoPlayerSection';
import { useAppStore } from '../../../lib/store';

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const { dir, setSelectedCourse } = useAppStore();

  // Deep-link support: hydrate the player store from the URL (TC-STUDENT-022).
  useEffect(() => {
    if (params?.courseId) {
      setSelectedCourse(params.courseId);
    }
    return () => setSelectedCourse(null);
  }, [params?.courseId, setSelectedCourse]);

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <VideoPlayerSection />
      </main>
    </div>
  );
}
