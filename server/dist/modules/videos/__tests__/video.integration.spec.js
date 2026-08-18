"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const client_1 = require("@prisma/client");
const app_1 = __importDefault(require("../../../app"));
const prisma_1 = require("../../../prisma");
const jwt_1 = require("../../../utils/jwt");
(0, vitest_1.describe)('Video Pipeline Integration Tests', () => {
    let teacherToken;
    let studentToken;
    let teacherId;
    let studentId;
    let subjectId;
    let courseId;
    (0, vitest_1.beforeAll)(async () => {
        // Teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `videoteacher-${Date.now()}@test.com`,
                password: 'hashedpassword',
                name: 'Video Teacher',
                role: client_1.Role.TEACHER,
                teacherStatus: client_1.TeacherStatus.APPROVED,
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({ userId: teacher.id, role: teacher.role, teacherStatus: teacher.teacherStatus });
        // Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `videostudent-${Date.now()}@test.com`,
                password: 'hashedpassword',
                name: 'Video Student',
                role: client_1.Role.STUDENT,
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: student.role });
        // Subject, Course
        const subject = await prisma_1.prisma.subject.create({
            data: { nameEn: `Physics 101 ${Date.now()}`, nameAr: 'فيزياء 101' },
        });
        subjectId = subject.id;
        const course = await prisma_1.prisma.course.create({
            data: {
                titleEn: 'Intro to Mechanics',
                titleAr: 'مقدمة',
                description: 'Physics',
                teacherId: teacher.id,
                subjectId: subject.id,
                isPublished: true,
            },
        });
        courseId = course.id;
    });
    (0, vitest_1.afterAll)(async () => {
        if (courseId) {
            await prisma_1.prisma.course.deleteMany({ where: { id: courseId } });
        }
        if (subjectId) {
            await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
        }
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'videoteacher-' } } });
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'videostudent-' } } });
    });
    (0, vitest_1.describe)('POST /api/v1/videos/upload', () => {
        (0, vitest_1.it)('should block non-teachers from uploading', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/videos/upload')
                .set('Authorization', `Bearer ${studentToken}`)
                .attach('file', Buffer.from('fake video data'), 'test.mp4');
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/videos/:videoId/playback-url', () => {
        (0, vitest_1.it)('should deny playback url for non-existent video', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/videos/00000000-0000-0000-0000-000000000000/playback-url')
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
});
