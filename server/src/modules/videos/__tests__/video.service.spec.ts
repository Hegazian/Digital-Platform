import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { VideoService } from '../video.service';

vi.mock('../../../prisma', () => ({
  prisma: {
    video: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    lesson: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
  },
}));

describe('VideoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createVideoRecord', () => {
    it('should create a video record with status UPLOADING', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        status: 'UPLOADING',
        r2StorageKey: 'uploads/raw/teacher-1/123-lecture1.mp4',
        createdAt: new Date(),
      };

      (prisma.video.create as any).mockResolvedValue(mockVideo);

      const result = await VideoService.createVideoRecord('teacher-1', 'lecture1.mp4');

      expect(prisma.video.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teacherId: 'teacher-1',
          status: 'UPLOADING',
        }),
      });
      expect(result).toEqual(mockVideo);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 16-byte hex encryption key string', () => {
      const key = VideoService.generateEncryptionKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });

  describe('verifyPlaybackAccess', () => {
    it('should grant access if section is free preview', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        status: 'READY',
        encryptionKey: '1234567890abcdef1234567890abcdef',
        lesson: {
          id: 'lesson-1',
          section: {
            isFreePreview: true,
            courseId: 'course-1',
            course: {
              subjectId: 'subject-1',
            },
          },
        },
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
        status: 'READY',
        encryptionKey: '1234567890abcdef1234567890abcdef',
        lesson: {
          id: 'lesson-1',
          section: {
            isFreePreview: false,
            courseId: 'course-1',
            course: {
              subjectId: 'subject-1',
            },
          },
        },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      (prisma.subscription.findFirst as any).mockResolvedValue(null);

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'student-1');
      expect(hasAccess).toBe(false);
    });

    it('should grant access if student has active subscription for the subject', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        status: 'READY',
        encryptionKey: '1234567890abcdef1234567890abcdef',
        lesson: {
          id: 'lesson-1',
          section: {
            isFreePreview: false,
            courseId: 'course-1',
            course: {
              subjectId: 'subject-1',
            },
          },
        },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      (prisma.subscription.findFirst as any).mockResolvedValue({ id: 'sub-1', isActive: true });

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'student-1');
      expect(hasAccess).toBe(true);
    });
  });
});
