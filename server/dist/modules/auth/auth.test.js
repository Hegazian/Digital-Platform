"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../app"));
(0, vitest_1.describe)('Auth Module API', () => {
    const getTestUser = () => ({
        name: 'Test Student',
        email: `test-${Date.now()}-${Math.random()}@student.com`,
        password: 'password123',
        role: 'STUDENT',
    });
    (0, vitest_1.describe)('POST /api/v1/auth/register', () => {
        (0, vitest_1.it)('should successfully register a new student', async () => {
            const testUser = getTestUser();
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/register')
                .send(testUser);
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.email).toBe(testUser.email);
        });
        (0, vitest_1.it)('should fail if email is already registered', async () => {
            const testUser = getTestUser();
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send(testUser);
            const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send(testUser);
            (0, vitest_1.expect)(res.status).toBe(409);
            (0, vitest_1.expect)(res.body.success).toBe(false);
            (0, vitest_1.expect)(res.body.message).toMatch(/User with this email already exists/i);
        });
    });
    (0, vitest_1.describe)('POST /api/v1/auth/login', () => {
        (0, vitest_1.it)('should login successfully with correct credentials', async () => {
            const testUser = getTestUser();
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send(testUser);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/login')
                .send({
                email: testUser.email,
                password: testUser.password,
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.tokens).toHaveProperty('accessToken');
        });
        (0, vitest_1.it)('should fail login with wrong password', async () => {
            const testUser = getTestUser();
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send(testUser);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/login')
                .send({
                email: testUser.email,
                password: 'wrongpassword',
            });
            (0, vitest_1.expect)(res.status).toBe(401);
            (0, vitest_1.expect)(res.body.success).toBe(false);
        });
    });
});
