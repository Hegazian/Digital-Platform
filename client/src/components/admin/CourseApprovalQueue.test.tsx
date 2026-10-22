import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CourseApprovalQueue from './CourseApprovalQueue';
import { fetchApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));
const metadata = { id: 'course-a', titleEn: 'Review course', titleAr: 'دورة', description: 'Review description', status: 'UNDER_REVIEW', isPublished: false };
const full = { ...metadata, modules: [{ id: 'unit-a', titleEn: 'Uploaded unit', lessons: [{ id: 'lesson-a', titleEn: 'Uploaded lesson' }] }] };
beforeEach(() => {
  vi.mocked(fetchApi).mockReset().mockImplementation(async (url) => {
    if (url === '/subjects') return { success: true, data: [] };
    if (url === '/courses/course-a') return { success: true, data: full };
    return { success: true, data: { courses: [metadata] } };
  });
});
describe('administrator curriculum inspection', () => {
  it('loads authorized details on inspection instead of treating catalog metadata as an empty curriculum', async () => {
    render(<CourseApprovalQueue />);
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect' }));
    expect(await screen.findByText('1. Uploaded lesson')).toBeVisible();
    expect(fetchApi).toHaveBeenCalledWith('/courses/course-a');
  });

  it('shows a retryable detail error rather than claiming there are no modules', async () => {
    vi.mocked(fetchApi).mockImplementation(async (url) => {
      if (url === '/courses/course-a') throw new Error('Storage temporarily unavailable');
      return { success: true, data: url === '/subjects' ? [] : { courses: [metadata] } };
    });
    render(<CourseApprovalQueue />);
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect' }));
    expect(await screen.findByText('Storage temporarily unavailable')).toBeVisible();
    expect(screen.queryByText('No modules or sections found in this course.')).not.toBeInTheDocument();
    vi.mocked(fetchApi).mockResolvedValue({ success: true, data: full });
    fireEvent.click(screen.getByRole('button', { name: 'Retry details' }));
    expect(await screen.findByText('1. Uploaded lesson')).toBeVisible();
  });
});
