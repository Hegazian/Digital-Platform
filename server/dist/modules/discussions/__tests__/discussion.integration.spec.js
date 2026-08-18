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
(0, vitest_1.describe)('Community Discussions API (TDD)', () => {
    let studentToken;
    let studentId;
    let threadId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student_disc_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'Discussion Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({
            userId: student.id,
            role: 'STUDENT',
            teacherStatus: null,
        });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.discussionReply.deleteMany();
            await prisma_1.prisma.discussionThread.deleteMany();
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'student_disc_' } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('POST /api/v1/discussions/threads - should create a discussion thread', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/discussions/threads')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
            courseId: 'demo-course-id',
            title: 'How to solve Problem 3?',
            content: 'I need help understanding Newton third law in chapter 1.',
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.id).toBeDefined();
        threadId = res.body.data.id;
    });
    (0, vitest_1.it)('GET /api/v1/discussions/courses/:courseId - should fetch threads for a course', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/discussions/courses/demo-course-id')
            .set('Authorization', `Bearer ${studentToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
    });
    (0, vitest_1.it)('POST /api/v1/discussions/threads/:id/replies - should post a reply to a thread', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/discussions/threads/${threadId}/replies`)
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
            content: 'Remember that action and reaction forces act on different bodies!',
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.threadId).toBe(threadId);
    });
});
