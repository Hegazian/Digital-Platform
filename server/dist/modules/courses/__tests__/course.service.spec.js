"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const course_service_1 = require("../course.service");
const errors_1 = require("../../../utils/errors");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        course: {
            findMany: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
            delete: vitest_1.vi.fn(),
            count: vitest_1.vi.fn(),
        },
        subject: {
            count: vitest_1.vi.fn().mockResolvedValue(1),
            findUnique: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('CourseService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('createCourse', () => {
        (0, vitest_1.it)('should create a course under a specific subject by an approved teacher', async () => {
            const courseData = {
                titleEn: 'Intro to Python',
                titleAr: 'مقدمة في بايثون',
                description: 'Learn Python programming from scratch',
                teacherId: 'teacher-1',
                subjectId: 'sub-1',
            };
            const mockCourse = { id: 'course-1', ...courseData, isPublished: false };
            prisma_1.prisma.subject.findUnique.mockResolvedValue({ id: 'sub-1', nameEn: 'Programming' });
            prisma_1.prisma.course.create.mockResolvedValue(mockCourse);
            const result = await course_service_1.CourseService.createCourse(courseData);
            (0, vitest_1.expect)(result.id).toBe('course-1');
            (0, vitest_1.expect)(result.isPublished).toBe(false);
            (0, vitest_1.expect)(prisma_1.prisma.course.create).toHaveBeenCalledWith({ data: courseData });
        });
        (0, vitest_1.it)('should throw NotFoundError if subjectId does not exist', async () => {
            prisma_1.prisma.subject.findUnique.mockResolvedValue(null);
            await (0, vitest_1.expect)(course_service_1.CourseService.createCourse({
                titleEn: 'Intro to Python',
                titleAr: 'مقدمة في بايثون',
                description: 'Desc',
                teacherId: 'teacher-1',
                subjectId: 'invalid-sub-id',
            })).rejects.toThrow(errors_1.NotFoundError);
        });
    });
    (0, vitest_1.describe)('publishCourse', () => {
        (0, vitest_1.it)('should toggle isPublished status to true', async () => {
            const mockCourse = {
                id: 'course-1',
                teacherId: 'teacher-1',
                isPublished: false,
            };
            prisma_1.prisma.course.findUnique.mockResolvedValue(mockCourse);
            prisma_1.prisma.course.update.mockResolvedValue({ ...mockCourse, isPublished: true });
            const result = await course_service_1.CourseService.publishCourse('course-1', 'teacher-1');
            (0, vitest_1.expect)(result.isPublished).toBe(true);
            (0, vitest_1.expect)(prisma_1.prisma.course.update).toHaveBeenCalledWith({
                where: { id: 'course-1' },
                data: { isPublished: true, status: 'PUBLISHED' },
            });
        });
        (0, vitest_1.it)('should throw ForbiddenError if non-owner teacher tries to publish', async () => {
            const mockCourse = {
                id: 'course-1',
                teacherId: 'teacher-owner',
                isPublished: false,
            };
            prisma_1.prisma.course.findUnique.mockResolvedValue(mockCourse);
            await (0, vitest_1.expect)(course_service_1.CourseService.publishCourse('course-1', 'teacher-other')).rejects.toThrow(errors_1.ForbiddenError);
        });
    });
    (0, vitest_1.describe)('getAllCourses', () => {
        (0, vitest_1.it)('should return paginated course list', async () => {
            prisma_1.prisma.course.findMany.mockResolvedValue([{ id: 'c1', titleEn: 'C1' }]);
            prisma_1.prisma.course.count.mockResolvedValue(1);
            const res = await course_service_1.CourseService.getAllCourses({ page: '1', limit: '10' });
            (0, vitest_1.expect)(res.courses).toBeDefined();
            (0, vitest_1.expect)(res.pagination.total).toBe(1);
            (0, vitest_1.expect)(res.pagination.page).toBe(1);
        });
    });
});
