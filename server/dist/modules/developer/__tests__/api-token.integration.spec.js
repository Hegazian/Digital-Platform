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
(0, vitest_1.describe)('Developer API Tokens (TDD)', () => {
    let adminToken;
    let adminId;
    let apiTokenId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: `admin_dev_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'Developer Admin',
                role: 'ADMIN',
            },
        });
        adminId = admin.id;
        adminToken = (0, jwt_1.generateAccessToken)({
            userId: admin.id,
            role: 'ADMIN',
            teacherStatus: null,
        });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.apiToken.deleteMany();
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'admin_dev_' } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('POST /api/v1/developer/tokens - should create a new API token', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/developer/tokens')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            name: 'Zapier Integration Token',
            scopes: ['read:users', 'write:enrollments'],
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.id).toBeDefined();
        (0, vitest_1.expect)(res.body.data.token).toBeDefined(); // Only returned once!
        apiTokenId = res.body.data.id;
    });
    (0, vitest_1.it)('GET /api/v1/developer/tokens - should list API tokens', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/developer/tokens')
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
        (0, vitest_1.expect)(res.body.data[0].token).toBeUndefined(); // Should not return raw token on list
    });
});
