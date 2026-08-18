"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../app"));
const prisma_1 = require("../../prisma");
const jwt_1 = require("../../utils/jwt");
const bcrypt_1 = __importDefault(require("bcrypt"));
(0, vitest_1.describe)('Playground Execution API (TDD)', () => {
    let studentToken;
    let studentUserId;
    (0, vitest_1.beforeAll)(async () => {
        // Create a student user for testing authenticated code execution
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const studentUser = await prisma_1.prisma.user.create({
            data: {
                email: `test_student_play_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'TDD Student',
                role: 'STUDENT',
            },
        });
        studentUserId = studentUser.id;
        studentToken = (0, jwt_1.generateAccessToken)({
            userId: studentUser.id,
            role: 'STUDENT',
            teacherStatus: null,
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma_1.prisma.user.deleteMany({
            where: { email: { contains: 'test_student_play_' } },
        });
    });
    (0, vitest_1.it)('POST /api/v1/playgrounds/execute - should execute simple python code successfully', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/playgrounds/execute')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
            language: 'python',
            code: 'print("Hello from TDD")',
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.output).toContain('Hello from TDD');
        (0, vitest_1.expect)(res.body.data.error).toBe('');
    });
    (0, vitest_1.it)('POST /api/v1/playgrounds/execute - should return error for syntax error code', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/playgrounds/execute')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
            language: 'python',
            code: 'print("Missing parenthesis)',
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.success).toBe(false);
        (0, vitest_1.expect)(res.body.data.error).toBeDefined();
    });
    (0, vitest_1.it)('POST /api/v1/playgrounds/execute - should reject unauthorized requests', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/playgrounds/execute')
            .send({
            language: 'python',
            code: 'print("Hack")',
        });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
});
