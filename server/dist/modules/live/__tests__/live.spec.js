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
(0, vitest_1.describe)('Zoom Live Classes Integration Tests', () => {
    let teacherToken;
    let studentToken;
    let teacherId;
    let studentId;
    let subjectId;
    let liveSessionId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Approved Teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher-live-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Live Teacher',
                role: 'TEACHER',
                teacherStatus: 'APPROVED',
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
        // 2. Create Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-live-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Live Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT' });
        // 3. Create Subject
        const subject = await prisma_1.prisma.subject.create({
            data: { nameEn: 'Live Math Subject', nameAr: 'مادة رياضيات مباشرة' },
        });
        subjectId = subject.id;
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
        if (liveSessionId) {
            await prisma_1.prisma.liveSession.deleteMany({ where: { id: liveSessionId } });
        }
        if (studentId) {
            await prisma_1.prisma.entitlement.deleteMany({ where: { studentId } });
        }
        if (subjectId) {
            await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
        }
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: '-live-' } } });
    });
    (0, vitest_1.describe)('POST /api/v1/live/sessions', () => {
        (0, vitest_1.it)('should allow teacher to schedule a Zoom live meeting session', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/live/sessions')
                .set('Authorization', `Bearer ${teacherToken}`)
                .send({
                subjectId,
                titleEn: 'Live Problem Solving Workshop',
                titleAr: 'ورشة حل المسائل المباشرة',
                startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
                durationMinutes: 60,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.titleEn).toBe('Live Problem Solving Workshop');
            (0, vitest_1.expect)(res.body.data).toHaveProperty('zoomStartUrl');
            (0, vitest_1.expect)(res.body.data).toHaveProperty('zoomJoinUrl');
            liveSessionId = res.body.data.id;
        });
        (0, vitest_1.it)('should deny non-teacher access', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/live/sessions')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                subjectId,
                titleEn: 'Unauthorized Meeting',
                titleAr: 'اجتماع غير مصرح',
                startTime: new Date().toISOString(),
                durationMinutes: 30,
            });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/live/sessions/subject/:subjectId', () => {
        (0, vitest_1.it)('should allow entitled student to list upcoming live sessions with join URL', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/live/sessions/subject/${subjectId}`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(res.body.data[0]).toHaveProperty('zoomJoinUrl');
            // Student MUST NOT see teacher host start URL
            (0, vitest_1.expect)(res.body.data[0]).not.toHaveProperty('zoomStartUrl');
        });
    });
});
