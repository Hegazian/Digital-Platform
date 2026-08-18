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
const crypto_1 = __importDefault(require("crypto"));
(0, vitest_1.describe)('Payment Webhook Cryptographic Verification (TDD)', () => {
    let studentToken;
    let studentId;
    let subjectId;
    let productId;
    let orderId;
    const TEST_PAYMOB_SECRET = process.env.PAYMOB_HMAC_SECRET || 'test_paymob_hmac_secret_key_123';
    // Helper to generate legitimate Paymob HMAC signature
    function generatePaymobSignature(data, secret) {
        const concatenatedValues = Object.keys(data)
            .sort()
            .map((k) => String(data[k]))
            .join('');
        return crypto_1.default.createHmac('sha512', secret).update(concatenatedValues).digest('hex');
    }
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-webhook-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Webhook Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT' });
        // 2. Create Subject
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Webhook Physics ${Date.now()}`,
                nameAr: 'فيزياء',
            },
        });
        subjectId = subject.id;
        // 3. Create Product
        const product = await prisma_1.prisma.product.create({
            data: {
                nameEn: 'Physics Webhook Term',
                nameAr: 'اشتراك فيزياء',
                productType: 'SUBJECT',
                resourceId: subjectId,
                priceEgp: 300.0,
                priceUsd: 10.0,
            },
        });
        productId = product.id;
        // 4. Create Order
        const order = await prisma_1.prisma.order.create({
            data: {
                studentId,
                productId,
                status: 'PENDING',
                totalAmountEgp: 300.0,
                totalAmountUsd: 10.0,
                paymentMethod: 'PAYMOB',
                idempotencyKey: `idemp-sec-${Date.now()}`,
            },
        });
        orderId = order.id;
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.entitlement.deleteMany({ where: { studentId } });
            await prisma_1.prisma.order.deleteMany({ where: { studentId } });
            await prisma_1.prisma.product.deleteMany({ where: { id: productId } });
            await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
            await prisma_1.prisma.user.deleteMany({ where: { id: studentId } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('should REJECT Paymob webhook missing HMAC signature with 401', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/commerce/webhooks/paymob')
            .send({
            orderId,
            transactionRef: `tx_${Date.now()}`,
            success: true,
        });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.success).toBe(false);
        (0, vitest_1.expect)(res.body.message).toMatch(/signature/i);
    });
    (0, vitest_1.it)('should REJECT Paymob webhook with forged / invalid HMAC signature with 401', async () => {
        const payload = {
            orderId,
            transactionRef: `tx_${Date.now()}`,
            success: true,
        };
        const forgedSignature = 'abcdef1234567890deadbeef';
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/commerce/webhooks/paymob')
            .set('x-paymob-hmac', forgedSignature)
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.success).toBe(false);
        (0, vitest_1.expect)(res.body.message).toMatch(/invalid.*signature/i);
    });
    (0, vitest_1.it)('should ACCEPT Paymob webhook with valid HMAC signature and reconcile order', async () => {
        const payload = {
            orderId,
            transactionRef: `legit_tx_${Date.now()}`,
            success: true,
        };
        const validSignature = generatePaymobSignature(payload, TEST_PAYMOB_SECRET);
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/commerce/webhooks/paymob')
            .set('x-paymob-hmac', validSignature)
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.status).toBe('PAID');
        // Verify Entitlement was created
        const entitlement = await prisma_1.prisma.entitlement.findFirst({
            where: { studentId, orderId },
        });
        (0, vitest_1.expect)(entitlement).toBeDefined();
        (0, vitest_1.expect)(entitlement?.status).toBe('ACTIVE');
    });
});
