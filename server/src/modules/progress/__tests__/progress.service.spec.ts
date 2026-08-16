import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { ProgressService } from '../progress.service';
import { NotFoundError } from '../../../utils/errors';

vi.mock('../../../prisma', () => ({
  prisma: {
    lesson: {
      findUnique: vi.fn(),
    },
    lessonProgress: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
    },
    quizAttempt: {
      findMany: vi.fn(),
    },
  },
}));

describe('ProgressService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateWatchTime', () => {
    it('should throw NotFoundError if lesson does not exist', async () => {
      (prisma.lesson.findUnique as any).mockResolvedValue(null);

      await expect(
        ProgressService.updateWatchTime('user-1', 'non-existent-lesson', 30)
      ).rejects.toThrow(NotFoundError);
    });

    it('should upsert lesson progress with watch time increment', async () => {
      (prisma.lesson.findUnique as any).mockResolvedValue({ id: 'lesson-1' });
      (prisma.lessonProgress.upsert as any).mockResolvedValue({
        id: 'p-1',
        userId: 'user-1',
        lessonId: 'lesson-1',
        watchTimeSec: 30,
        isCompleted: false,
      });

      const res = await ProgressService.updateWatchTime('user-1', 'lesson-1', 30);
      expect(res.watchTimeSec).toBe(30);
      expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_lessonId: { userId: 'user-1', lessonId: 'lesson-1' } },
        })
      );
    });
  });

  describe('markCompleted', () => {
    it('should mark lesson as completed idempotently', async () => {
      (prisma.lessonProgress.upsert as any).mockResolvedValue({
        id: 'p-1',
        userId: 'user-1',
        lessonId: 'lesson-1',
        isCompleted: true,
      });

      const res = await ProgressService.markCompleted('user-1', 'lesson-1');
      expect(res.isCompleted).toBe(true);
    });
  });
});
