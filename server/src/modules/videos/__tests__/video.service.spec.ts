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
    entitlement: {
      findFirst: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../../utils/storage', () => ({
  StorageService: {
    uploadFile: vi.fn(),
    uploadFileFromPath: vi.fn(),
    deleteFile: vi.fn(),
    getSignedUrl: vi.fn(),
  },
}));

describe('VideoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadVideo', () => {
    it('streams the upload to storage and keeps it processing until a media probe verifies playback', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        status: 'PROCESSING',
        videoUrl: 'uploads/test.mp4',
      };

      (StorageService.uploadFileFromPath as any).mockResolvedValue('/uploads/lesson-videos/video-123/test.mp4');
      (prisma.video.create as any).mockResolvedValue(mockVideo);

      const signal = new AbortController().signal;
      const result = await VideoService.uploadVideo('teacher-1', 'C:/staging/file.upload', 'test.mp4', 'video/mp4', 100, signal);

      expect(StorageService.uploadFileFromPath).toHaveBeenCalledWith('C:/staging/file.upload', 'test.mp4', 'video/mp4', 100, 'lesson-videos', expect.any(String), signal);
      expect(prisma.video.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teacherId: 'teacher-1',
          status: 'PROCESSING',
          videoUrl: '/uploads/lesson-videos/video-123/test.mp4',
        }),
      });
      expect(result).toEqual(mockVideo);
    });

    it.each([
      ['clip.avi', 'video/x-msvideo'],
      ['clip.mkv', 'video/x-matroska'],
      ['clip.mov', 'video/quicktime'],
    ])('leaves unprocessed %s pending instead of claiming it is playable', async (fileName, mimeType) => {
      (StorageService.uploadFileFromPath as any).mockResolvedValue(`lesson-videos/video-456/${fileName}`);
      (prisma.video.create as any).mockImplementation(({ data }: any) => data);

      const result = await VideoService.uploadVideo('teacher-1', 'C:/staging/file.upload', fileName, mimeType, 100);

      expect(result.status).toBe('PROCESSING');
      expect(prisma.video.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'PROCESSING' }) });
    });

    it('removes the stored object if the database record cannot be created', async () => {
      (StorageService.uploadFileFromPath as any).mockResolvedValue('/uploads/lesson-videos/video-789/clip.mp4');
      (StorageService.deleteFile as any).mockResolvedValue(undefined);
      (prisma.video.create as any).mockRejectedValue(new Error('database unavailable'));

      await expect(VideoService.uploadVideo('teacher-1', 'C:/staging/file.upload', 'clip.mp4', 'video/mp4', 100))
        .rejects.toThrow('database unavailable');
      expect(StorageService.deleteFile).toHaveBeenCalledWith('/uploads/lesson-videos/video-789/clip.mp4');
    });
  });

  describe('verifyPlaybackAccess', () => {
    it('allows the approved course owner to inspect a video supplied by another uploader', async () => {
      (prisma.video.findUnique as any).mockResolvedValue({ id: 'v-admin', teacherId: 'admin-uploader',
        lesson: { section: { courseId: 'course-1', isFreePreview: false, course: { teacherId: 'course-owner', subjectId: 's1' } } } });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'course-owner', role: 'TEACHER', teacherStatus: 'APPROVED', isActive: true });
      await expect(VideoService.verifyPlaybackAccess('v-admin', 'course-owner')).resolves.toBe(true);
      expect(prisma.entitlement.findFirst).not.toHaveBeenCalled();
    });
    it('should grant access if section is a preview in a published course', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        lesson: { section: { isFreePreview: true, courseId: 'course-1', course: { subjectId: 'subject-1' } } },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT', isActive: true });
      (prisma.course.findUnique as any).mockResolvedValue({ retractedAt: null, isPublished: true, status: 'PUBLISHED' });

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'student-1');
      expect(hasAccess).toBe(true);
    });

    it('denies a free preview after its course is retracted', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        lesson: { section: { isFreePreview: true, courseId: 'course-1', course: { subjectId: 'subject-1' } } },
      };
      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT', isActive: true });
      (prisma.course.findUnique as any).mockResolvedValue({ retractedAt: new Date(), isPublished: true, status: 'PUBLISHED' });

      await expect(VideoService.verifyPlaybackAccess('video-123', 'student-1')).resolves.toBe(false);
    });

    it('should deny access if section is paid and student has no active subscription', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT', isActive: true });
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
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'student-1', role: 'STUDENT', isActive: true });
      (prisma.subscription.findFirst as any).mockResolvedValue({ id: 'sub-1', isActive: true });

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'student-1');
      expect(hasAccess).toBe(true);
    });

    it('should grant access if user is course teacher owner', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'teacher-1', role: 'TEACHER', teacherStatus: 'APPROVED', isActive: true });

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'teacher-1');
      expect(hasAccess).toBe(true);
    });

    it('should grant access if user is ADMIN', async () => {
      const mockVideo = {
        id: 'video-123',
        teacherId: 'teacher-1',
        lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
      };

      (prisma.video.findUnique as any).mockResolvedValue(mockVideo);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'admin-1', role: 'ADMIN', isActive: true });

      const hasAccess = await VideoService.verifyPlaybackAccess('video-123', 'admin-1');
      expect(hasAccess).toBe(true);
    });
  });
});
