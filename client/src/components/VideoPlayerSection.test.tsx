import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('ignores a delayed curriculum response after the user switches courses', async () => {
    allowed = true;
    let finishOld!: (data: any) => void;
    const general = vi.mocked(fetchApi).getMockImplementation()!;
    vi.mocked(fetchApi).mockImplementation(async (path, options) => {
      if (path === '/courses/course-1') return new Promise((resolve) => { finishOld = resolve; });
      if (path === '/courses/course-2') return { data: { id: 'course-2', titleEn: 'Second course', teacherId: 'teacher-1' } };
      if (path === '/courses/course-2/learning') return { data: { id: 'course-2', titleEn: 'Second course', modules: [{ id: 'unit-2', lessons: [{ id: 'lesson-2', titleEn: 'Second course lesson' }] }] } };
      return general(path, options);
    });
    render(<VideoPlayerSection />);
    await waitFor(() => expect(finishOld).toBeDefined());
    act(() => useAppStore.setState({ selectedCourseId: 'course-2' }));
    expect(await screen.findByText('Second course lesson', { selector: 'aside span' })).toBeVisible();
    await act(async () => { finishOld({ data: { id: 'course-1', titleEn: 'Old course', teacherId: 'teacher-1' } }); });
    expect(screen.getByText('Second course lesson', { selector: 'aside span' })).toBeVisible();
    expect(screen.queryByText('Newly accessible lesson', { selector: 'aside span' })).not.toBeInTheDocument();
  });

  it('does not reopen the previous course when its enrollment finishes after navigation', async () => {
    let finishEnrollment!: (value: any) => void;
    const general = vi.mocked(fetchApi).getMockImplementation()!;
    vi.mocked(fetchApi).mockImplementation(async (path, options) => {
      if (path === '/courses/course-1/enroll') return new Promise((resolve) => { finishEnrollment = resolve; });
      if (path === '/courses/course-2') return { data: { id: 'course-2', titleEn: 'Second course', teacherId: 'teacher-1' } };
      if (path === '/courses/course-2/learning') return { data: { id: 'course-2', titleEn: 'Second course', modules: [{ id: 'unit-2', lessons: [{ id: 'lesson-2', titleEn: 'Second course lesson' }] }] } };
      return general(path, options);
    });
    render(<VideoPlayerSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Enroll Now/ }));
    await waitFor(() => expect(finishEnrollment).toBeDefined());
    allowed = true;
    act(() => useAppStore.setState({ selectedCourseId: 'course-2' }));
    expect(await screen.findByText('Second course lesson', { selector: 'aside span' })).toBeVisible();
    await act(async () => { finishEnrollment({ success: true }); });
    expect(screen.getByText('Second course lesson', { selector: 'aside span' })).toBeVisible();
    expect(screen.queryByText(/Enrolled successfully/)).not.toBeInTheDocument();
  });
});
