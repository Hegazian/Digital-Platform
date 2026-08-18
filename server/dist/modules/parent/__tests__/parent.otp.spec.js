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
(0, vitest_1.describe)('Parent OTP Link Approval Workflow Tests', () => {
    let parentToken;
    let parentId;
    let studentId;
    let studentEmail;
    let otpCode;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Parent
        const parent = await prisma_1.prisma.user.create({
            data: {
                email: `parent-otp-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'OTP Parent',
                role: 'PARENT',
            },
        });
        parentId = parent.id;
        parentToken = (0, jwt_1.generateAccessToken)({ userId: parent.id, role: 'PARENT' });
        // 2. Create Student
        studentEmail = `student-otp-${Date.now()}@test.com`;
        const student = await prisma_1.prisma.user.create({
            data: {
                email: studentEmail,
                password: 'Password123!',
                name: 'OTP Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
    });
    (0, vitest_1.afterAll)(async () => {
        if (parentId && studentId) {
            await prisma_1.prisma.parentStudent.deleteMany({ where: { parentId } });
            await prisma_1.prisma.parentLinkOtp.deleteMany({ where: { parentUserId: parentId } });
        }
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: '-otp-' } } });
    });
    (0, vitest_1.describe)('POST /api/v1/parent/link-request', () => {
        (0, vitest_1.it)('should generate 6-digit OTP when parent requests link to student email', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/parent/link-request')
                .set('Authorization', `Bearer ${parentToken}`)
                .send({ studentEmail });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.messageEn).toContain('OTP');
            // Check DB for created OTP
            const otpRecord = await prisma_1.prisma.parentLinkOtp.findFirst({
                where: { parentUserId: parentId, studentEmail },
            });
            (0, vitest_1.expect)(otpRecord).not.toBeNull();
            (0, vitest_1.expect)(otpRecord?.otpCode.length).toBe(6);
            otpCode = otpRecord.otpCode;
        });
    });
    (0, vitest_1.describe)('POST /api/v1/parent/verify-otp', () => {
        (0, vitest_1.it)('should reject invalid OTP code', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/parent/verify-otp')
                .set('Authorization', `Bearer ${parentToken}`)
                .send({ studentEmail, otpCode: '999999' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('should confirm valid OTP code and establish active parent-student link', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/parent/verify-otp')
                .set('Authorization', `Bearer ${parentToken}`)
                .send({ studentEmail, otpCode });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.isLinked).toBe(true);
            // Verify link in DB
            const link = await prisma_1.prisma.parentStudent.findUnique({
                where: {
                    parentId_studentId: {
                        parentId,
                        studentId,
                    },
                },
            });
            (0, vitest_1.expect)(link).not.toBeNull();
        });
    });
});
