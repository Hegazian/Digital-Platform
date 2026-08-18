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
(0, vitest_1.describe)('Subscription API Integration Tests (Manual)', () => {
    let studentToken;
    let adminToken;
    let subjectId;
    let subscriptionId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('Pass123!', 10);
        // Create admin
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: `admin-sub-${Date.now()}@test.com`,
                password: hashedPassword,
                name: 'Sub Admin',
                role: 'ADMIN',
                isActive: true,
            },
        });
        adminToken = (0, jwt_1.generateAccessToken)({ userId: admin.id, role: 'ADMIN', teacherStatus: null });
        // Create student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-sub-${Date.now()}@test.com`,
                password: hashedPassword,
                name: 'Sub Student',
                role: 'STUDENT',
                isActive: true,
            },
        });
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT', teacherStatus: null });
        // Create a subject and pricing
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: 'Math',
                nameAr: 'رياضيات',
                description: 'Math Sub',
                thumbnail: 'math.jpg',
            },
        });
        subjectId = subject.id;
        await prisma_1.prisma.subjectPricing.create({
            data: {
                subjectId: subject.id,
                period: 'MONTHLY',
                priceEgp: 100,
                priceUsd: 10,
                isActive: true,
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: '-sub-' } } });
        await prisma_1.prisma.subject.deleteMany({ where: { nameEn: 'Math' } });
    });
    (0, vitest_1.describe)('POST /api/v1/subscriptions/manual', () => {
        (0, vitest_1.it)('should create a pending manual subscription', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/subscriptions/manual')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                subjectId,
                period: 'MONTHLY',
                paymentMethod: 'VODAFONE_CASH',
                transactionId: '01012345678',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.status).toBe('PENDING');
            subscriptionId = res.body.data.id;
        });
        (0, vitest_1.it)('should reject duplicate pending subscriptions', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/subscriptions/manual')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                subjectId,
                period: 'MONTHLY',
                paymentMethod: 'VODAFONE_CASH',
                transactionId: '01012345678',
            });
            (0, vitest_1.expect)(res.status).toBe(400); // Bad Request
        });
    });
    (0, vitest_1.describe)('GET /api/v1/subscriptions/pending', () => {
        (0, vitest_1.it)('should list pending subscriptions for admin', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/subscriptions/pending')
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data.some((sub) => sub.id === subscriptionId)).toBe(true);
        });
        (0, vitest_1.it)('should deny access to student', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/subscriptions/pending')
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('PATCH /api/v1/subscriptions/:id/approve', () => {
        (0, vitest_1.it)('should approve the pending subscription', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/subscriptions/${subscriptionId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.status).toBe('ACTIVE');
        });
    });
    (0, vitest_1.describe)('GET /api/v1/subscriptions/me', () => {
        (0, vitest_1.it)('should list the student active subscription', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/subscriptions/me')
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.length).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(res.body.data[0].status).toBe('ACTIVE');
        });
    });
});
