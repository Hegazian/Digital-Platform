import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { fetchApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import VideoUploader from './VideoUploader';

vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));

describe('VideoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ lang: 'en' });
    vi.mocked(fetchApi).mockResolvedValue({ data: { id: 'video-1', videoUrl: 'uploads/video-1', status: 'PROCESSING' } } as any);
  });

  it('reports processing truthfully in English and does not invent upload percentages', async () => {
    const onUploadComplete = vi.fn();
    render(<VideoUploader onUploadComplete={onUploadComplete} />);
    const input = document.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(['video'], 'lesson.mp4', { type: 'video/mp4' })] } });

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));

    expect(await screen.findByText('Video uploaded. Processing is required before playback.')).toBeInTheDocument();
    expect(onUploadComplete).toHaveBeenCalledWith('uploads/video-1');
  });

  it('shows the processing state in Arabic', async () => {
    useAppStore.setState({ lang: 'ar' });
    render(<VideoUploader />);
    const input = document.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(['video'], 'lesson.mp4', { type: 'video/mp4' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'رفع الفيديو' }));

    expect(await screen.findByText('تم رفع الفيديو. يجب إكمال المعالجة قبل تشغيله.')).toBeInTheDocument();
  });
});
