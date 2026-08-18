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
(0, vitest_1.describe)('AI Study Assistant API - Google Gemini (TDD)', () => {
    let studentToken;
    let studentId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student_ai_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'AI Student',
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
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'student_ai_' } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('POST /api/v1/ai/tutor - should accept prompt and return AI study explanation', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/ai/tutor')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
            prompt: 'Explain Newton second law in simple terms for high school student.',
            courseContext: 'Physics 1st Secondary',
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.answer).toBeDefined();
        (0, vitest_1.expect)(typeof res.body.data.answer).toBe('string');
    });
    (0, vitest_1.it)('POST /api/v1/ai/tutor - should reject empty prompt', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/ai/tutor')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
            prompt: '',
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.success).toBe(false);
    });
});
