"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const progress_service_1 = require("../progress.service");
const errors_1 = require("../../../utils/errors");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        lesson: {
            findUnique: vitest_1.vi.fn(),
        },
        lessonProgress: {
            upsert: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
        },
        subscription: {
            findMany: vitest_1.vi.fn(),
        },
        quizAttempt: {
            findMany: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('ProgressService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('updateWatchTime', () => {
        (0, vitest_1.it)('should throw NotFoundError if lesson does not exist', async () => {
            prisma_1.prisma.lesson.findUnique.mockResolvedValue(null);
            await (0, vitest_1.expect)(progress_service_1.ProgressService.updateWatchTime('user-1', 'non-existent-lesson', 30)).rejects.toThrow(errors_1.NotFoundError);
        });
        (0, vitest_1.it)('should upsert lesson progress with watch time increment', async () => {
            prisma_1.prisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1' });
            prisma_1.prisma.lessonProgress.upsert.mockResolvedValue({
                id: 'p-1',
                userId: 'user-1',
                lessonId: 'lesson-1',
                watchTimeSec: 30,
                isCompleted: false,
            });
            const res = await progress_service_1.ProgressService.updateWatchTime('user-1', 'lesson-1', 30);
            (0, vitest_1.expect)(res.watchTimeSec).toBe(30);
            (0, vitest_1.expect)(prisma_1.prisma.lessonProgress.upsert).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { userId_lessonId: { userId: 'user-1', lessonId: 'lesson-1' } },
            }));
        });
    });
    (0, vitest_1.describe)('markCompleted', () => {
        (0, vitest_1.it)('should mark lesson as completed idempotently', async () => {
            prisma_1.prisma.lessonProgress.upsert.mockResolvedValue({
                id: 'p-1',
                userId: 'user-1',
                lessonId: 'lesson-1',
                isCompleted: true,
            });
            const res = await progress_service_1.ProgressService.markCompleted('user-1', 'lesson-1');
            (0, vitest_1.expect)(res.isCompleted).toBe(true);
        });
    });
});
