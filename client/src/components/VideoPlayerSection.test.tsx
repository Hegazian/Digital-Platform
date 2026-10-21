import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fetchApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import VideoPlayerSection from './VideoPlayerSection';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));
vi.mock('./editor/CodePlaygroundBlock', () => ({ default: () => null }));
vi.mock('./editor/CollaborativeBoardBlock', () => ({ default: () => null }));
vi.mock('./discussions/DiscussionForum', () => ({ default: () => null }));
vi.mock('./player/AssignmentRunner', () => ({ default: () => null }));
vi.mock('./player/AttemptHistory', () => ({ default: () => null }));
vi.mock('./player/InteractiveQuizRunner', () => ({ default: () => null }));
vi.mock('./player/CurriculumSidebar', () => ({ default: ({ modules }: any) => <aside>{modules.flatMap((m: any) => m.lessons).map((l: any) => <span key={l.id}>{l.titleEn}</span>)}</aside> }));
vi.mock('./commerce/CheckoutModal', () => ({ default: ({ onAccessGranted }: any) => <button onClick={onAccessGranted}>Confirm access</button> }));

describe('curriculum after a new access grant', () => {
  let allowed = false;
  let paid = false;
  beforeEach(() => {
    allowed = false;
    paid = false;
    vi.clearAllMocks();
    useAppStore.setState({ user: { id: 'student-1', role: 'STUDENT', name: 'Student', email: 'student@test.invalid' } as any, selectedCourseId: 'course-1', lang: 'en' });
    vi.mocked(fetchApi).mockImplementation(async (path) => {
      if (path === '/courses/course-1') return { data: { id: 'course-1', titleEn: 'Fixture course', teacherId: 'teacher-1', isFree: !paid, priceEgp: paid ? 150 : 0 } };
      if (path.includes('check-course')) return { data: { hasAccess: allowed } };
      if (path === '/courses/course-1/enroll') { allowed = true; return { success: true }; }
      if (path === '/courses/course-1/learning') return { data: { id: 'course-1', titleEn: 'Fixture course', modules: [{ id: 'm1', titleEn: 'Unit', lessons: [{ id: 'lesson-1', titleEn: 'Newly accessible lesson' }] }] } };
      return { data: { courses: [], completedLessonIds: [] } };
    });
  });

  it('loads protected lessons immediately after free enrollment', async () => {
    render(<VideoPlayerSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Enroll Now/ }));
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith('/courses/course-1/learning'));
    expect(await screen.findByText('Newly accessible lesson', { selector: 'aside span' })).toBeVisible();
  });

  it('loads protected lessons immediately after verified checkout', async () => {
    paid = true;
    render(<VideoPlayerSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Unlock Course/ }));
    allowed = true;
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm access' }));
    expect(await screen.findByText('Newly accessible lesson', { selector: 'aside span' })).toBeVisible();
  });
});
