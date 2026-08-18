"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../../app"));
const prisma_1 = require("../../../prisma");
const jwt_1 = require("../../../utils/jwt");
(0, vitest_1.describe)('Commerce & Entitlement Integration Tests', () => {
    let adminToken;
    let studentToken;
    let studentId;
    let subjectId;
    let productId;
    let voucherCode;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Admin
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: `admin-comm-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Commerce Admin',
                role: 'ADMIN',
            },
        });
        adminToken = (0, jwt_1.generateAccessToken)({ userId: admin.id, role: 'ADMIN' });
        // 2. Create Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-comm-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Commerce Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT' });
        // 3. Create Subject
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Commerce Physics ${Date.now()}`,
                nameAr: 'فيزياء',
            },
        });
        subjectId = subject.id;
    });
    (0, vitest_1.afterAll)(async () => {
        if (voucherCode) {
            await prisma_1.prisma.voucher.deleteMany({ where: { code: voucherCode } });
        }
        if (studentId) {
            await prisma_1.prisma.entitlement.deleteMany({ where: { studentId } });
            await prisma_1.prisma.order.deleteMany({ where: { studentId } });
        }
        if (productId) {
            await prisma_1.prisma.product.deleteMany({ where: { id: productId } });
        }
        if (subjectId) {
            await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
        }
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: '-comm-' } } });
    });
    (0, vitest_1.describe)('Products Management API', () => {
        (0, vitest_1.it)('should allow ADMIN to create a product catalog item', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/commerce/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                nameEn: 'Physics 1st Secondary Term Subscription',
                nameAr: 'اشتراك فيزياء الصف الأول',
                productType: 'SUBJECT',
                resourceId: subjectId,
                priceEgp: 450.00,
                priceUsd: 15.00,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.priceEgp).toBe('450');
            productId = res.body.data.id;
        });
        (0, vitest_1.it)('should list all active products publicly', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/v1/commerce/products');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data.some((p) => p.id === productId)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Orders & Checkout API', () => {
        (0, vitest_1.it)('should allow student to create a pending order', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/commerce/orders')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                productId,
                paymentMethod: 'PAYMOB',
                idempotencyKey: `idemp-ord-${Date.now()}`,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.status).toBe('PENDING');
            (0, vitest_1.expect)(res.body.data.paymentMethod).toBe('PAYMOB');
        });
        (0, vitest_1.it)('should reconcile Paymob webhook callback idempotently and grant entitlement', async () => {
            const idempotencyKey = `idemp-webhook-${Date.now()}`;
            // Create initial order
            const orderRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/commerce/orders')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                productId,
                paymentMethod: 'PAYMOB',
                idempotencyKey,
            });
            const orderId = orderRes.body.data.id;
            // Simulate Paymob webhook notification
            const payload1 = {
                orderId,
                transactionRef: `paymob_tx_${Date.now()}`,
                success: true,
            };
            const { calculatePaymobHmac } = await Promise.resolve().then(() => __importStar(require('../../../utils/webhook-security')));
            const hmac1 = calculatePaymobHmac(payload1, process.env.PAYMOB_HMAC_SECRET || 'test_paymob_hmac_secret_key_123');
            const webhookRes1 = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/commerce/webhooks/paymob')
                .set('x-paymob-hmac', hmac1)
                .send(payload1);
            (0, vitest_1.expect)(webhookRes1.status).toBe(200);
            (0, vitest_1.expect)(webhookRes1.body.data.status).toBe('PAID');
            // Duplicate webhook call should be idempotent
            const webhookRes2 = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/commerce/webhooks/paymob')
                .set('x-paymob-hmac', hmac1)
                .send(payload1);
            (0, vitest_1.expect)(webhookRes2.status).toBe(200);
            (0, vitest_1.expect)(webhookRes2.body.message).toMatch(/Order already processed/i);
        });
    });
    (0, vitest_1.describe)('Entitlements Access API', () => {
        (0, vitest_1.it)('should confirm student active entitlement for subject', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/commerce/entitlements/check?resourceType=SUBJECT&resourceId=${subjectId}`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.hasAccess).toBe(true);
        });
    });
    (0, vitest_1.describe)('Vouchers API', () => {
        (0, vitest_1.it)('should allow ADMIN to generate a voucher code', async () => {
            voucherCode = `VOUCHER-${Date.now()}`;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/commerce/vouchers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                code: voucherCode,
                resourceType: 'SUBJECT',
                resourceId: subjectId,
                durationDays: 30,
                maxUses: 1,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.code).toBe(voucherCode);
        });
        (0, vitest_1.it)('should allow student to redeem valid voucher and receive entitlement', async () => {
            // Create student 2
            const student2 = await prisma_1.prisma.user.create({
                data: {
                    email: `student2-comm-${Date.now()}@test.com`,
                    password: 'Password123!',
                    name: 'Student 2',
                    role: 'STUDENT',
                },
            });
            const s2Token = (0, jwt_1.generateAccessToken)({ userId: student2.id, role: 'STUDENT' });
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/commerce/vouchers/redeem')
                .set('Authorization', `Bearer ${s2Token}`)
                .send({ code: voucherCode });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.status).toBe('ACTIVE');
            // Cleanup student 2
            await prisma_1.prisma.entitlement.deleteMany({ where: { studentId: student2.id } });
            await prisma_1.prisma.user.deleteMany({ where: { id: student2.id } });
        });
    });
});
