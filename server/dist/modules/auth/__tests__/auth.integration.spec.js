"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const app_1 = __importDefault(require("../../../app"));
(0, vitest_1.describe)('Auth Integration Tests', () => {
    const testPrefix = `auth-test-${Date.now()}`;
    const studentEmail = `${testPrefix}-student@test.com`;
    const dupEmail = `${testPrefix}-dup@test.com`;
    const loginEmail = `${testPrefix}-login@test.com`;
    const wrongPassEmail = `${testPrefix}-wrongpass@test.com`;
    const cleanDb = async () => {
        try {
            await prisma_1.prisma.user.deleteMany({
                where: {
                    email: {
                        in: [studentEmail, dupEmail, loginEmail, wrongPassEmail],
                    },
                },
            });
        }
        catch (e) { }
    };
    (0, vitest_1.beforeAll)(async () => {
        await cleanDb();
    }, 15000);
    (0, vitest_1.afterAll)(async () => {
        await cleanDb();
    }, 15000);
    (0, vitest_1.describe)('POST /api/v1/auth/register', () => {
        (0, vitest_1.it)('should successfully register a new student', async () => {
            const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send({
                email: studentEmail,
                password: 'Password123!',
                name: 'Test Student',
                role: 'STUDENT',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.email).toBe(studentEmail);
            (0, vitest_1.expect)(res.body.data.role).toBe('STUDENT');
        });
        (0, vitest_1.it)('should fail when registering an existing email', async () => {
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send({
                email: dupEmail,
                password: 'password',
                name: 'First User',
            });
            const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send({
                email: dupEmail,
                password: 'password',
                name: 'Second User',
            });
            (0, vitest_1.expect)(res.status).toBe(409);
            (0, vitest_1.expect)(res.body.success).toBe(false);
            (0, vitest_1.expect)(res.body.message).toMatch(/exists/i);
        });
    });
    (0, vitest_1.describe)('POST /api/v1/auth/login', () => {
        (0, vitest_1.it)('should login and return tokens for valid credentials', async () => {
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send({
                email: loginEmail,
                password: 'ValidPassword123',
                name: 'Login User',
            });
            const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/login').send({
                email: loginEmail,
                password: 'ValidPassword123',
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.tokens.accessToken).toBeDefined();
        });
        (0, vitest_1.it)('should fail login for wrong password', async () => {
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send({
                email: wrongPassEmail,
                password: 'CorrectPassword',
                name: 'User',
            });
            const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/login').send({
                email: wrongPassEmail,
                password: 'WrongPassword',
            });
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
});
