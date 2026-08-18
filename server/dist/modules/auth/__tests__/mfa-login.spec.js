"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../../app"));
const prisma_1 = require("../../../prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const otplib_1 = require("otplib");
(0, vitest_1.describe)('MFA Enforcement at Login (TDD)', () => {
    let userWithoutMfaEmail;
    let userWithMfaEmail;
    let mfaSecret;
    let mfaSessionToken;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('Password123!', 10);
        // 1. User without MFA
        userWithoutMfaEmail = `no-mfa-${Date.now()}@test.com`;
        await prisma_1.prisma.user.create({
            data: {
                email: userWithoutMfaEmail,
                password: hashedPassword,
                name: 'No MFA User',
                role: 'STUDENT',
                mfaEnabled: false,
            },
        });
        // 2. User with MFA enabled
        mfaSecret = (0, otplib_1.generateSecret)();
        userWithMfaEmail = `with-mfa-${Date.now()}@test.com`;
        await prisma_1.prisma.user.create({
            data: {
                email: userWithMfaEmail,
                password: hashedPassword,
                name: 'MFA User',
                role: 'STUDENT',
                mfaSecret,
                mfaEnabled: true,
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.user.deleteMany({
                where: {
                    email: { in: [userWithoutMfaEmail, userWithMfaEmail] },
                },
            });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('should issue tokens directly when user has NO MFA enabled', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({
            email: userWithoutMfaEmail,
            password: 'Password123!',
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.tokens.accessToken).toBeDefined();
        (0, vitest_1.expect)(res.body.data.tokens.refreshToken).toBeDefined();
    });
    (0, vitest_1.it)('should require MFA challenge (return mfaRequired & mfaSessionToken) when MFA is enabled', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({
            email: userWithMfaEmail,
            password: 'Password123!',
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.mfaRequired).toBe(true);
        (0, vitest_1.expect)(res.body.data.mfaSessionToken).toBeDefined();
        (0, vitest_1.expect)(res.body.data.tokens).toBeUndefined();
        mfaSessionToken = res.body.data.mfaSessionToken;
    });
    (0, vitest_1.it)('should REJECT invalid TOTP code during MFA challenge with 401', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/mfa-login')
            .send({
            mfaSessionToken,
            mfaCode: '000000',
        });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.success).toBe(false);
        (0, vitest_1.expect)(res.body.message).toMatch(/invalid.*code/i);
    });
    (0, vitest_1.it)('should ACCEPT valid TOTP code during MFA challenge and issue tokens', async () => {
        const validCode = (0, otplib_1.generateSync)({ secret: mfaSecret });
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/mfa-login')
            .send({
            mfaSessionToken,
            mfaCode: validCode,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.user.email).toBe(userWithMfaEmail);
        (0, vitest_1.expect)(res.body.data.tokens.accessToken).toBeDefined();
        (0, vitest_1.expect)(res.body.data.tokens.refreshToken).toBeDefined();
    });
});
