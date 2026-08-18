"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../../app"));
const prisma_1 = require("../../../prisma");
const jwt_1 = require("../../../utils/jwt");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
(0, vitest_1.describe)('Material API Integration Tests', () => {
    let teacherToken;
    let studentToken;
    let teacherId;
    let studentId;
    let subjectId;
    let courseId;
    let sectionId;
    let lessonId;
    let materialId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('Pass123!', 10);
        const timestamp = Date.now();
        // Create Teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `mat-teacher-${timestamp}@test.com`,
                password: hashedPassword,
                name: 'Mat Teacher',
                role: 'TEACHER',
                teacherStatus: 'APPROVED',
                isActive: true,
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
        // Create Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `mat-student-${timestamp}@test.com`,
                password: hashedPassword,
                name: 'Mat Student',
                role: 'STUDENT',
                isActive: true,
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT', teacherStatus: null });
        // Create Subject, Course, Section, Lesson
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Mat Subject ${timestamp}`,
                nameAr: `مادة ${timestamp}`,
                description: 'Subject for materials test',
            },
        });
        subjectId = subject.id;
        const course = await prisma_1.prisma.course.create({
            data: {
                titleEn: 'Course Materials Test',
                titleAr: 'دورة المرفقات',
                description: 'Testing materials',
                teacherId: teacher.id,
                subjectId: subject.id,
                isPublished: true,
            },
        });
        courseId = course.id;
        const section = await prisma_1.prisma.section.create({
            data: {
                courseId: course.id,
                titleEn: 'Section 1',
                titleAr: 'الباب 1',
                orderIndex: 1,
                isFreePreview: false,
            },
        });
        sectionId = section.id;
        const lesson = await prisma_1.prisma.lesson.create({
            data: {
                sectionId: section.id,
                titleEn: 'Lesson 1',
                titleAr: 'الدرس 1',
                orderIndex: 1,
            },
        });
        lessonId = lesson.id;
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma_1.prisma.subject.deleteMany({ where: { nameEn: { contains: 'Mat Subject' } } });
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'mat-' } } });
    });
    (0, vitest_1.describe)('POST /api/v1/materials/upload', () => {
        (0, vitest_1.it)('should allow teacher to upload file material', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/materials/upload')
                .set('Authorization', `Bearer ${teacherToken}`)
                .field('lessonId', lessonId)
                .field('title', 'Chapter 1 PDF Summary')
                .attach('file', Buffer.from('%PDF-1.4 Mock PDF Content'), 'summary.pdf');
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.id).toBeDefined();
            (0, vitest_1.expect)(res.body.data.title).toBe('Chapter 1 PDF Summary');
            materialId = res.body.data.id;
        });
        (0, vitest_1.it)('should deny upload to student', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/materials/upload')
                .set('Authorization', `Bearer ${studentToken}`)
                .field('lessonId', lessonId)
                .field('title', 'Unauthorized Upload')
                .attach('file', Buffer.from('test'), 'test.pdf');
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/materials/lesson/:lessonId', () => {
        (0, vitest_1.it)('should deny non-subscribed student access to materials', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/materials/lesson/${lessonId}`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('should allow active subscribed student to get lesson materials', async () => {
            // Create active subscription for student
            await prisma_1.prisma.subscription.create({
                data: {
                    userId: studentId,
                    subjectId,
                    period: 'MONTHLY',
                    status: client_1.SubscriptionStatus.ACTIVE,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/materials/lesson/${lessonId}`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });
    (0, vitest_1.describe)('DELETE /api/v1/materials/:id', () => {
        (0, vitest_1.it)('should allow teacher owner to delete material', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/v1/materials/${materialId}`)
                .set('Authorization', `Bearer ${teacherToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
        });
    });
});
