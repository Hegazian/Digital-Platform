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
(0, vitest_1.describe)('Quiz API Integration Tests', () => {
    let teacherToken;
    let studentToken;
    let studentId;
    let quizId;
    let questionId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('Pass123!', 10);
        // Create teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher-quiz-${Date.now()}@test.com`,
                password: hashedPassword,
                name: 'Quiz Teacher',
                role: 'TEACHER',
                teacherStatus: 'APPROVED',
                isActive: true,
            },
        });
        teacherToken = (0, jwt_1.generateAccessToken)({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
        // Create student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-quiz-${Date.now()}@test.com`,
                password: hashedPassword,
                name: 'Quiz Student',
                role: 'STUDENT',
                isActive: true,
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT', teacherStatus: null });
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma_1.prisma.user.deleteMany({
            where: { email: { contains: '-quiz-' } },
        });
    });
    (0, vitest_1.describe)('POST /api/v1/quizzes', () => {
        (0, vitest_1.it)('should create a quiz (Teacher)', async () => {
            const payload = {
                titleEn: 'Math Quiz 1',
                titleAr: 'اختبار رياضيات ١',
                passingScore: 50,
                questions: [
                    {
                        questionText: 'What is 2+2?',
                        points: 10,
                        options: [
                            { id: 'o1', text: '3', isCorrect: false },
                            { id: 'o2', text: '4', isCorrect: true },
                        ],
                        explanation: 'Basic math',
                    },
                ],
            };
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/quizzes')
                .set('Authorization', `Bearer ${teacherToken}`)
                .send(payload);
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            quizId = res.body.data.id;
            questionId = res.body.data.questions[0].id;
        });
        (0, vitest_1.it)('should deny quiz creation to student', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/quizzes')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ titleEn: 'T', titleAr: 'T', questions: [] });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/quizzes/:id', () => {
        (0, vitest_1.it)('should strip correct answers for student', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/quizzes/${quizId}`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            const question = res.body.data.questions[0];
            (0, vitest_1.expect)(question.explanation).toBeNull();
            (0, vitest_1.expect)(question.options[0].isCorrect).toBeUndefined();
        });
        (0, vitest_1.it)('should retain correct answers for teacher', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/quizzes/${quizId}`)
                .set('Authorization', `Bearer ${teacherToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            const question = res.body.data.questions[0];
            (0, vitest_1.expect)(question.explanation).toBe('Basic math');
            (0, vitest_1.expect)(question.options[1].isCorrect).toBe(true);
        });
    });
    (0, vitest_1.describe)('POST /api/v1/quizzes/:id/attempts', () => {
        (0, vitest_1.it)('should auto-grade a student attempt', async () => {
            const payload = {
                answers: [{ questionId, selectedOptionId: 'o2' }], // The correct option
            };
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/quizzes/${quizId}/attempts`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send(payload);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.score).toBe(100);
            (0, vitest_1.expect)(res.body.data.isPassed).toBe(true);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/quizzes/:id/attempts', () => {
        (0, vitest_1.it)('should retrieve student attempts', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/quizzes/${quizId}/attempts`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.length).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(res.body.data[0].score).toBe(100);
        });
    });
});
