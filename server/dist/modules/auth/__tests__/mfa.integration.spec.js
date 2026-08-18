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
const otplib_1 = require("otplib");
(0, vitest_1.describe)('Multi-Factor Authentication (MFA) API (TDD)', () => {
    let adminToken;
    let adminId;
    let mfaSecret;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: `admin_mfa_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'MFA Admin',
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
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'admin_mfa_' } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('POST /api/v1/mfa/setup - should generate MFA secret and QR code', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/mfa/setup')
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.secret).toBeDefined();
        (0, vitest_1.expect)(res.body.data.qrCode).toBeDefined();
        mfaSecret = res.body.data.secret;
    });
    (0, vitest_1.it)('POST /api/v1/mfa/verify - should verify valid TOTP token and enable MFA', async () => {
        const validToken = (0, otplib_1.generateSync)({ secret: mfaSecret });
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/mfa/verify')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ token: validToken });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: adminId } });
        (0, vitest_1.expect)(user?.mfaEnabled).toBe(true);
    });
    (0, vitest_1.it)('POST /api/v1/mfa/verify - should reject invalid TOTP token', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/mfa/verify')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ token: '000000' });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.success).toBe(false);
    });
});
