"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../app"));
const prisma_1 = require("../../prisma");
(0, vitest_1.describe)('Progress Module API', () => {
    let studentToken;
    let studentId;
    let testLessonId;
    (0, vitest_1.beforeAll)(async () => {
        const timestamp = Date.now();
        const teacherEmail = `teacher-prog-${timestamp}@test.com`;
        const studentEmail = `student-prog-${timestamp}@test.com`;
        // 1. Create Teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                name: 'Test Teacher',
                email: teacherEmail,
                password: 'hash',
                role: 'TEACHER',
            }
        });
        // 2. Create Subject & Course & Lesson
        const subject = await prisma_1.prisma.subject.create({
            data: { nameEn: 'Math', nameAr: 'رياضيات' }
        });
        const course = await prisma_1.prisma.course.create({
            data: {
                titleEn: 'Algebra',
                titleAr: 'جبر',
                description: 'Test',
                teacherId: teacher.id,
                subjectId: subject.id
            }
        });
        const section = await prisma_1.prisma.section.create({
            data: {
                courseId: course.id,
                titleEn: 'Chapter 1',
                titleAr: 'فصل 1',
                orderIndex: 1
            }
        });
        const lesson = await prisma_1.prisma.lesson.create({
            data: {
                sectionId: section.id,
                titleEn: 'Intro',
                titleAr: 'مقدمة',
                orderIndex: 1
            }
        });
        testLessonId = lesson.id;
        // 3. Register Student
        const regRes = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send({
            name: 'Student',
            email: studentEmail,
            password: 'password123',
        });
        studentId = regRes.body.data.id;
        // Login Student to get token
        const logRes = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/login').send({
            email: studentEmail,
            password: 'password123',
        });
        studentToken = logRes.body.data.tokens.accessToken;
        // 4. Create active subscription
        await prisma_1.prisma.subscription.create({
            data: {
                userId: studentId,
                subjectId: subject.id,
                period: 'MONTHLY',
                status: 'ACTIVE',
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });
    });
    (0, vitest_1.describe)('POST /api/v1/progress/:lessonId', () => {
        (0, vitest_1.it)('should increment watch time by 10 seconds', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/progress/${testLessonId}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ watchTimeDeltaSec: 10 });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.watchTimeSec).toBe(10);
            (0, vitest_1.expect)(res.body.data.isCompleted).toBe(false);
            // Call again to verify increment
            const res2 = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/progress/${testLessonId}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ watchTimeDeltaSec: 10 });
            (0, vitest_1.expect)(res2.body.data.watchTimeSec).toBe(20);
        });
    });
    (0, vitest_1.describe)('POST /api/v1/progress/:lessonId/complete', () => {
        (0, vitest_1.it)('should mark a lesson as complete', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/progress/${testLessonId}/complete`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.isCompleted).toBe(true);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/progress/summary', () => {
        (0, vitest_1.it)('should return 100% course progress after completing the single lesson', async () => {
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/progress/${testLessonId}/complete`)
                .set('Authorization', `Bearer ${studentToken}`);
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/progress/summary')
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.courses).toHaveLength(1);
            (0, vitest_1.expect)(res.body.data.courses[0].progress).toBe(100);
            (0, vitest_1.expect)(res.body.data.courses[0].completedLessons).toBe(1);
        });
    });
});
