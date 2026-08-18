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
(0, vitest_1.describe)('Teacher Studio Facilities Integration Tests', () => {
    let teacherToken;
    let studentToken;
    let teacherId;
    let studentId;
    let subjectId;
    let courseId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Approved Teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher-studio-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Studio Teacher',
                role: 'TEACHER',
                teacherStatus: 'APPROVED',
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
        // 2. Create Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-studio-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Studio Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT' });
        // 3. Create Subject & Course
        const subject = await prisma_1.prisma.subject.create({
            data: { nameEn: 'Physics Studio', nameAr: 'فيزياء استوديو' },
        });
        subjectId = subject.id;
        const course = await prisma_1.prisma.course.create({
            data: {
                titleEn: 'Quantum Physics',
                titleAr: 'فيزياء الكم',
                description: 'Advanced Quantum Mechanics',
                teacherId: teacher.id,
                subjectId: subject.id,
                isPublished: true,
            },
        });
        courseId = course.id;
        // 4. Enroll Student via Active Entitlement
        await prisma_1.prisma.entitlement.create({
            data: {
                studentId: student.id,
                resourceType: 'SUBJECT',
                resourceId: subject.id,
                status: 'ACTIVE',
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        if (studentId) {
            await prisma_1.prisma.entitlement.deleteMany({ where: { studentId } });
            await prisma_1.prisma.notification.deleteMany({ where: { userId: studentId } });
        }
        if (courseId) {
            await prisma_1.prisma.course.deleteMany({ where: { id: courseId } });
        }
        if (subjectId) {
            await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
        }
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: '-studio-' } } });
    });
    (0, vitest_1.describe)('GET /api/v1/teacher/students', () => {
        (0, vitest_1.it)('should allow teacher to list all enrolled students across their courses', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/teacher/students')
                .set('Authorization', `Bearer ${teacherToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data.some((s) => s.id === studentId)).toBe(true);
        });
        (0, vitest_1.it)('should deny non-teacher access', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/teacher/students')
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/teacher/students/:studentId/progress', () => {
        (0, vitest_1.it)('should allow teacher to inspect specific student progress and performance', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/teacher/students/${studentId}/progress`)
                .set('Authorization', `Bearer ${teacherToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.student.id).toBe(studentId);
            (0, vitest_1.expect)(typeof res.body.data.totalLessonsCompleted).toBe('number');
        });
    });
    (0, vitest_1.describe)('POST /api/v1/teacher/announcements', () => {
        (0, vitest_1.it)('should allow teacher to broadcast an announcement to enrolled students', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/teacher/announcements')
                .set('Authorization', `Bearer ${teacherToken}`)
                .send({
                courseId,
                titleEn: 'Live Review Session Today',
                titleAr: 'جلسة مراجعة مباشرة اليوم',
                messageEn: 'Join us at 6 PM for midterm preparation.',
                messageAr: 'انضم إلينا الساعة 6 مساءً للتحضير للامتحان.',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.notificationsSent).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/teacher/revenue', () => {
        (0, vitest_1.it)('should return earnings overview and voucher redemption counts for teacher', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/teacher/revenue')
                .set('Authorization', `Bearer ${teacherToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(typeof res.body.data.totalStudentsEnrolled).toBe('number');
        });
    });
});
