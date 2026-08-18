"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const video_service_1 = require("../video.service");
const storage_1 = require("../../../utils/storage");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        video: {
            create: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
        },
        user: {
            findUnique: vitest_1.vi.fn(),
        },
        subscription: {
            findFirst: vitest_1.vi.fn(),
        },
        entitlement: {
            findFirst: vitest_1.vi.fn(),
        },
        course: {
            findUnique: vitest_1.vi.fn(),
        },
    },
}));
vitest_1.vi.mock('../../../utils/storage', () => ({
    StorageService: {
        uploadFile: vitest_1.vi.fn(),
        getSignedUrl: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('VideoService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('uploadVideo', () => {
        (0, vitest_1.it)('should upload to storage and create a video record with status READY', async () => {
            const mockVideo = {
                id: 'video-123',
                teacherId: 'teacher-1',
                status: 'READY',
                videoUrl: 'uploads/test.mp4',
            };
            storage_1.StorageService.uploadFile.mockResolvedValue('uploads/test.mp4');
            prisma_1.prisma.video.create.mockResolvedValue(mockVideo);
            const result = await video_service_1.VideoService.uploadVideo('teacher-1', Buffer.from('data'), 'test.mp4', 'video/mp4', 100);
            (0, vitest_1.expect)(storage_1.StorageService.uploadFile).toHaveBeenCalled();
            (0, vitest_1.expect)(prisma_1.prisma.video.create).toHaveBeenCalledWith({
                data: vitest_1.expect.objectContaining({
                    teacherId: 'teacher-1',
                    status: 'READY',
                    videoUrl: 'uploads/test.mp4',
                }),
            });
            (0, vitest_1.expect)(result).toEqual(mockVideo);
        });
    });
    (0, vitest_1.describe)('verifyPlaybackAccess', () => {
        (0, vitest_1.it)('should grant access if section is free preview', async () => {
            const mockVideo = {
                id: 'video-123',
                teacherId: 'teacher-1',
                lesson: { section: { isFreePreview: true, course: { subjectId: 'subject-1' } } },
            };
            prisma_1.prisma.video.findUnique.mockResolvedValue(mockVideo);
            prisma_1.prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
            const hasAccess = await video_service_1.VideoService.verifyPlaybackAccess('video-123', 'student-1');
            (0, vitest_1.expect)(hasAccess).toBe(true);
        });
        (0, vitest_1.it)('should deny access if section is paid and student has no active subscription', async () => {
            const mockVideo = {
                id: 'video-123',
                teacherId: 'teacher-1',
                lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
            };
            prisma_1.prisma.video.findUnique.mockResolvedValue(mockVideo);
            prisma_1.prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
            prisma_1.prisma.subscription.findFirst.mockResolvedValue(null);
            const hasAccess = await video_service_1.VideoService.verifyPlaybackAccess('video-123', 'student-1');
            (0, vitest_1.expect)(hasAccess).toBe(false);
        });
        (0, vitest_1.it)('should grant access if student has active subscription', async () => {
            const mockVideo = {
                id: 'video-123',
                teacherId: 'teacher-1',
                lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
            };
            prisma_1.prisma.video.findUnique.mockResolvedValue(mockVideo);
            prisma_1.prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
            prisma_1.prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-1', isActive: true });
            const hasAccess = await video_service_1.VideoService.verifyPlaybackAccess('video-123', 'student-1');
            (0, vitest_1.expect)(hasAccess).toBe(true);
        });
        (0, vitest_1.it)('should grant access if user is course teacher owner', async () => {
            const mockVideo = {
                id: 'video-123',
                teacherId: 'teacher-1',
                lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
            };
            prisma_1.prisma.video.findUnique.mockResolvedValue(mockVideo);
            prisma_1.prisma.user.findUnique.mockResolvedValue({ id: 'teacher-1', role: 'TEACHER' });
            const hasAccess = await video_service_1.VideoService.verifyPlaybackAccess('video-123', 'teacher-1');
            (0, vitest_1.expect)(hasAccess).toBe(true);
        });
        (0, vitest_1.it)('should grant access if user is ADMIN', async () => {
            const mockVideo = {
                id: 'video-123',
                teacherId: 'teacher-1',
                lesson: { section: { isFreePreview: false, course: { subjectId: 'subject-1' } } },
            };
            prisma_1.prisma.video.findUnique.mockResolvedValue(mockVideo);
            prisma_1.prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
            const hasAccess = await video_service_1.VideoService.verifyPlaybackAccess('video-123', 'admin-1');
            (0, vitest_1.expect)(hasAccess).toBe(true);
        });
    });
});
