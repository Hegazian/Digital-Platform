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
(0, vitest_1.describe)('Collaborative Board API & State Persistence (TDD)', () => {
    let teacherToken;
    let teacherId;
    let lessonBlockId;
    (0, vitest_1.beforeAll)(async () => {
        // Create teacher user
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher_board_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'Board Teacher',
                role: 'TEACHER',
                teacherStatus: 'APPROVED',
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({
            userId: teacher.id,
            role: 'TEACHER',
            teacherStatus: 'APPROVED',
        });
        // Create a subject, course, module, lesson, and lessonBlock
        const subject = await prisma_1.prisma.subject.create({
            data: { nameEn: 'Math Board', nameAr: 'رياضيات' },
        });
        const course = await prisma_1.prisma.course.create({
            data: {
                titleEn: 'Algebra',
                titleAr: 'جبر',
                description: 'Test course',
                teacherId: teacher.id,
                subjectId: subject.id,
            },
        });
        const section = await prisma_1.prisma.section.create({
            data: {
                courseId: course.id,
                titleEn: 'Ch 1',
                titleAr: 'فصل 1',
                orderIndex: 1,
            },
        });
        const lesson = await prisma_1.prisma.lesson.create({
            data: {
                sectionId: section.id,
                titleEn: 'Whiteboard Lesson',
                titleAr: 'درس سبورة',
            },
        });
        const block = await prisma_1.prisma.lessonBlock.create({
            data: {
                lessonId: lesson.id,
                blockType: 'TEXT',
                configurationJson: '{}',
            },
        });
        lessonBlockId = block.id;
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.board.deleteMany({ where: { lessonBlockId } });
            await prisma_1.prisma.lessonBlock.deleteMany({ where: { id: lessonBlockId } });
            await prisma_1.prisma.course.deleteMany({ where: { teacherId } });
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'teacher_board_' } } });
            await prisma_1.prisma.subject.deleteMany({ where: { nameEn: 'Math Board' } });
        }
        catch (e) {
            console.warn('Board cleanup error:', e);
        }
    });
    (0, vitest_1.it)('GET /api/v1/boards/:blockId - should fetch or initialize board state', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/boards/${lessonBlockId}`)
            .set('Authorization', `Bearer ${teacherToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data).toBeDefined();
        (0, vitest_1.expect)(res.body.data.lessonBlockId).toBe(lessonBlockId);
    });
    (0, vitest_1.it)('POST /api/v1/boards/:blockId/state - should save updated board state binary/JSON', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/boards/${lessonBlockId}/state`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
            elementsJson: JSON.stringify([{ type: 'line', x1: 10, y1: 10, x2: 50, y2: 50, color: '#00ffff' }]),
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        // Verify persistence
        const fetchRes = await (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/boards/${lessonBlockId}`)
            .set('Authorization', `Bearer ${teacherToken}`);
        (0, vitest_1.expect)(fetchRes.body.data.elementsJson).toContain('#00ffff');
    });
});
