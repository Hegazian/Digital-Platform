"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const client_1 = require("@prisma/client");
const app_1 = __importDefault(require("../../../app"));
const jwt_1 = require("../../../utils/jwt");
const prisma = new client_1.PrismaClient();
(0, vitest_1.describe)('Course & Subject Integration Tests', () => {
    let adminToken;
    let teacherToken;
    let studentToken;
    let teacherId;
    let subjectId;
    (0, vitest_1.beforeAll)(async () => {
        await prisma.$connect();
        const timestamp = Date.now();
        // Create Admin user
        const admin = await prisma.user.create({
            data: {
                email: `admin-crs-test-${timestamp}@edu.com`,
                password: 'pass',
                name: 'Admin User',
                role: client_1.Role.ADMIN,
            },
        });
        adminToken = (0, jwt_1.generateAccessToken)({ userId: admin.id, role: client_1.Role.ADMIN });
        // Create Approved Teacher user
        const teacher = await prisma.user.create({
            data: {
                email: `teacher-crs-test-${timestamp}@edu.com`,
                password: 'pass',
                name: 'Teacher User',
                role: client_1.Role.TEACHER,
                teacherStatus: client_1.TeacherStatus.APPROVED,
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({
            userId: teacher.id,
            role: client_1.Role.TEACHER,
            teacherStatus: client_1.TeacherStatus.APPROVED,
        });
        // Create Student user
        const student = await prisma.user.create({
            data: {
                email: `student-crs-test-${timestamp}@edu.com`,
                password: 'pass',
                name: 'Student User',
                role: client_1.Role.STUDENT,
            },
        });
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: client_1.Role.STUDENT });
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma.course.deleteMany({ where: { titleEn: { contains: 'Mastering JavaScript' } } });
        await prisma.subject.deleteMany({ where: { nameEn: { contains: 'CourseTestSubject' } } });
        await prisma.user.deleteMany({ where: { email: { contains: '-crs-test-' } } });
        await prisma.$disconnect();
    });
    (0, vitest_1.describe)('Subject Endpoints', () => {
        (0, vitest_1.it)('POST /api/v1/subjects - should allow ADMIN to create subject', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/subjects')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                nameEn: 'CourseTestSubject',
                nameAr: 'مادة اختبارية',
                description: 'Computer Science & Software Development',
                pricing: [
                    { period: 'MONTHLY', priceEgp: 300, priceUsd: 15 },
                    { period: 'YEARLY', priceEgp: 2500, priceUsd: 120 },
                ],
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.nameEn).toBe('CourseTestSubject');
            subjectId = res.body.data.id;
        });
        (0, vitest_1.it)('GET /api/v1/subjects - public route should list subjects', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/v1/subjects');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('POST /api/v1/subjects - non-admin should be forbidden (403)', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/subjects')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                nameEn: 'Math',
                nameAr: 'رياضيات',
            });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('Course Endpoints', () => {
        let courseId;
        (0, vitest_1.it)('POST /api/v1/courses - approved teacher can create course', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/courses')
                .set('Authorization', `Bearer ${teacherToken}`)
                .send({
                titleEn: 'Mastering JavaScript',
                titleAr: 'إتقان جافاسكريبت',
                description: 'Full stack JS programming',
                subjectId: subjectId,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.titleEn).toBe('Mastering JavaScript');
            courseId = res.body.data.id;
        });
        (0, vitest_1.it)('POST /api/v1/courses/:courseId/sections - teacher can add section', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/courses/${courseId}/sections`)
                .set('Authorization', `Bearer ${teacherToken}`)
                .send({
                titleEn: 'Chapter 1: Intro',
                titleAr: 'الفصل الأول: المقدمة',
                orderIndex: 1,
                isFreePreview: true,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.isFreePreview).toBe(true);
        });
        (0, vitest_1.it)('PATCH /api/v1/courses/:courseId/publish - owner teacher can publish course', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/courses/${courseId}/publish`)
                .set('Authorization', `Bearer ${teacherToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.isPublished).toBe(true);
        });
    });
});
