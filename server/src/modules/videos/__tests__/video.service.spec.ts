import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { VideoService } from '../video.service';
import { StorageService } from '../../../utils/storage';
import jwt from 'jsonwebtoken';

vi.mock('../../../prisma', () => ({
  prisma: {
    video: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../../utils/storage', () => ({
  StorageService: {
    uploadFile: vi.fn(),
    getSignedUrl: vi.fn(),
  },
}));

describe('VideoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadVideo', () => {
    it('should upload to storage and create a video record with status READY', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        status: 'READY',
        videoUrl: 'uploads/test.mp4',
      };

      (StorageService.uploadFile as any).mockResolvedValue('uploads/test.mp4');
      (prisma.video.create as any).mockResolvedValue(mockVideo);

      const result = await VideoService.uploadVideo('teacher-1', Buffer.from('data'), 'test.mp4', 'video/mp4', 100);

      expect(StorageService.uploadFile).toHaveBeenCalled();
      expect(prisma.video.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teacherId: 'teacher-1',
          status: 'READY',
          videoUrl: 'uploads/test.mp4',
        }),
      });
      expect(result).toEqual(mockVideo);
    });
  });

  describe('verifyPlaybackAccess', () => {
    it('should grant access if section is free preview', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        lesson: { section: { isFreePreview: true, course: { subjectId: 'subject-1' } } },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT' });

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'student-1');
      expect(hasAccess).toBe(true);
    });

    it('should deny access if section is paid and student has no active subscription', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      (prisma.subscription.findFirst as any).mockResolvedValue(null);

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'student-1');
      expect(hasAccess).toBe(false);
    });

    it('should grant access if student has active subscription', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      (prisma.subscription.findFirst as any).mockResolvedValue({ id: 'sub-1', isActive: true });

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'student-1');
      expect(hasAccess).toBe(true);
    });
  });
});
