"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const course_service_1 = require("../course.service");
const prisma_1 = require("../../../prisma");
(0, vitest_1.describe)('Teacher Architecture & Course Lifecycle (teacher.md)', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Course Lifecycle & Publishing Flow', () => {
        (0, vitest_1.it)('should submit a draft course for review', async () => {
            const mockCourse = {
                id: 'course-1',
                titleEn: 'Physics Grade 12',
                titleAr: 'فيزياء',
                teacherId: 'teacher-1',
                status: 'DRAFT',
                modules: [
                    {
                        id: 'module-1',
                        lessons: [{ id: 'lesson-1', blocks: [{ id: 'block-1' }] }],
                    },
                ],
            };
            vitest_1.vi.spyOn(prisma_1.prisma.course, 'findUnique').mockResolvedValue(mockCourse);
            vitest_1.vi.spyOn(prisma_1.prisma.course, 'update').mockResolvedValue({
                ...mockCourse,
                status: 'UNDER_REVIEW',
            });
            const result = await course_service_1.CourseService.submitCourseForReview('course-1', 'teacher-1');
            (0, vitest_1.expect)(result.status).toBe('UNDER_REVIEW');
            (0, vitest_1.expect)(prisma_1.prisma.course.update).toHaveBeenCalledWith({
                where: { id: 'course-1' },
                data: { status: 'UNDER_REVIEW' },
            });
        });
        (0, vitest_1.it)('should reject review submission if course has no modules or lessons', async () => {
            const emptyCourse = {
                id: 'course-empty',
                teacherId: 'teacher-1',
                status: 'DRAFT',
                modules: [],
            };
            vitest_1.vi.spyOn(prisma_1.prisma.course, 'findUnique').mockResolvedValue(emptyCourse);
            await (0, vitest_1.expect)(course_service_1.CourseService.submitCourseForReview('course-empty', 'teacher-1')).rejects.toThrow('Course must contain at least one module and lesson before submitting for review');
        });
        (0, vitest_1.it)('should allow admin/authorized review to approve and publish a course', async () => {
            const reviewedCourse = {
                id: 'course-1',
                status: 'UNDER_REVIEW',
            };
            vitest_1.vi.spyOn(prisma_1.prisma.course, 'findUnique').mockResolvedValue(reviewedCourse);
            vitest_1.vi.spyOn(prisma_1.prisma.course, 'update').mockResolvedValue({
                ...reviewedCourse,
                status: 'PUBLISHED',
                isPublished: true,
            });
            const result = await course_service_1.CourseService.reviewCourseStatus('course-1', 'APPROVED');
            (0, vitest_1.expect)(result.status).toBe('PUBLISHED');
            (0, vitest_1.expect)(result.isPublished).toBe(true);
        });
    });
    (0, vitest_1.describe)('Module & Lesson Block Architecture', () => {
        (0, vitest_1.it)('should create a CourseModule for a course', async () => {
            const mockModule = {
                id: 'mod-1',
                courseId: 'course-1',
                titleEn: 'Mechanics',
                titleAr: 'الميكانيكا',
                sortOrder: 1,
            };
            vitest_1.vi.spyOn(prisma_1.prisma.courseModule, 'create').mockResolvedValue(mockModule);
            const result = await course_service_1.CourseService.createModule('course-1', {
                titleEn: 'Mechanics',
                titleAr: 'الميكانيكا',
                sortOrder: 1,
            });
            (0, vitest_1.expect)(result.id).toBe('mod-1');
            (0, vitest_1.expect)(prisma_1.prisma.courseModule.create).toHaveBeenCalledWith({
                data: {
                    courseId: 'course-1',
                    titleEn: 'Mechanics',
                    titleAr: 'الميكانيكا',
                    sortOrder: 1,
                },
            });
        });
        (0, vitest_1.it)('should create a LessonBlock attached to a lesson', async () => {
            const mockBlock = {
                id: 'block-1',
                lessonId: 'lesson-1',
                blockType: 'VIDEO',
                configurationJson: JSON.stringify({ mediaId: 'vid-100' }),
                sortOrder: 1,
            };
            vitest_1.vi.spyOn(prisma_1.prisma.lessonBlock, 'create').mockResolvedValue(mockBlock);
            const result = await course_service_1.CourseService.addLessonBlock('lesson-1', {
                blockType: 'VIDEO',
                configuration: { mediaId: 'vid-100' },
                sortOrder: 1,
            });
            (0, vitest_1.expect)(result.blockType).toBe('VIDEO');
            (0, vitest_1.expect)(JSON.parse(result.configurationJson).mediaId).toBe('vid-100');
        });
        (0, vitest_1.it)('should reorder modules transactionally', async () => {
            vitest_1.vi.spyOn(prisma_1.prisma, '$transaction').mockResolvedValue([{}, {}]);
            const reordered = await course_service_1.CourseService.reorderModules('course-1', [
                { id: 'mod-2', sortOrder: 1 },
                { id: 'mod-1', sortOrder: 2 },
            ]);
            (0, vitest_1.expect)(reordered).toBe(true);
        });
    });
    (0, vitest_1.describe)('Assignments & Student Submissions Engine', () => {
        (0, vitest_1.it)('should allow teacher to grade an assignment submission and update status', async () => {
            const mockSubmission = {
                id: 'sub-1',
                assignmentId: 'assign-1',
                studentId: 'student-1',
                status: 'SUBMITTED',
                assignment: { maxScore: 100 },
            };
            vitest_1.vi.spyOn(prisma_1.prisma.assignmentSubmission, 'findUnique').mockResolvedValue(mockSubmission);
            vitest_1.vi.spyOn(prisma_1.prisma.assignmentSubmission, 'update').mockResolvedValue({
                ...mockSubmission,
                status: 'GRADED',
                score: 88,
                feedback: 'Great effort',
                gradedById: 'teacher-1',
            });
            const result = await course_service_1.CourseService.gradeAssignmentSubmission('sub-1', 'teacher-1', {
                score: 88,
                feedback: 'Great effort',
            });
            (0, vitest_1.expect)(result.status).toBe('GRADED');
            (0, vitest_1.expect)(result.score).toBe(88);
        });
        (0, vitest_1.it)('should reject score higher than maxScore', async () => {
            const mockSubmission = {
                id: 'sub-1',
                assignment: { maxScore: 100 },
            };
            vitest_1.vi.spyOn(prisma_1.prisma.assignmentSubmission, 'findUnique').mockResolvedValue(mockSubmission);
            await (0, vitest_1.expect)(course_service_1.CourseService.gradeAssignmentSubmission('sub-1', 'teacher-1', {
                score: 120,
                feedback: 'Too high',
            })).rejects.toThrow('Score cannot exceed maximum score of 100');
        });
    });
    (0, vitest_1.describe)('Teacher Dashboard & Analytics Aggregation', () => {
        (0, vitest_1.it)('should aggregate teacher dashboard metrics', async () => {
            vitest_1.vi.spyOn(prisma_1.prisma.course, 'count').mockResolvedValue(5);
            vitest_1.vi.spyOn(prisma_1.prisma.entitlement, 'count').mockResolvedValue(140);
            vitest_1.vi.spyOn(prisma_1.prisma.assignmentSubmission, 'count').mockResolvedValue(8);
            const stats = await course_service_1.CourseService.getTeacherDashboardStats('teacher-1');
            (0, vitest_1.expect)(stats.activeCourses).toBe(5);
            (0, vitest_1.expect)(stats.totalStudents).toBe(140);
            (0, vitest_1.expect)(stats.pendingAssignments).toBe(8);
        });
    });
});
