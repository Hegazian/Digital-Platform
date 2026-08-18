"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const commerce_service_1 = require("../commerce.service");
const client_1 = require("@prisma/client");
(0, vitest_1.describe)('Transactional Webhook Idempotency & Entitlement Issuance (TDD)', () => {
    let studentId;
    let subjectId;
    let productId;
    let orderId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `webhook-student-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Webhook Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        // 2. Create Subject
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Webhook Subject ${Date.now()}`,
                nameAr: 'مادة الويب هوك',
            },
        });
        subjectId = subject.id;
        // 3. Create Product
        const product = await prisma_1.prisma.product.create({
            data: {
                nameEn: 'Full Subject Bundle',
                nameAr: 'حزمة المادة الكاملة',
                productType: client_1.ProductType.SUBJECT,
                resourceId: subjectId,
                priceEgp: 300,
                priceUsd: 10,
            },
        });
        productId = product.id;
        // 4. Create Order in PENDING status
        const order = await prisma_1.prisma.order.create({
            data: {
                studentId,
                productId,
                status: client_1.OrderStatus.PENDING,
                totalAmountEgp: 300,
                totalAmountUsd: 10,
                idempotencyKey: `idemp-key-${Date.now()}`,
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
    (0, vitest_1.it)('should process payment webhook atomically and create entitlement', async () => {
        const res = await commerce_service_1.CommerceService.processPaymobWebhook({
            orderId,
            transactionRef: 'PAYMOB-TXN-123456',
            success: true,
        });
        (0, vitest_1.expect)(res.status).toBe(client_1.OrderStatus.PAID);
        (0, vitest_1.expect)(res.order.status).toBe(client_1.OrderStatus.PAID);
        // Verify order in database
        const orderInDb = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
        (0, vitest_1.expect)(orderInDb?.status).toBe(client_1.OrderStatus.PAID);
        (0, vitest_1.expect)(orderInDb?.transactionRef).toBe('PAYMOB-TXN-123456');
        // Verify exactly 1 entitlement was granted
        const entitlements = await prisma_1.prisma.entitlement.findMany({
            where: { orderId, studentId },
        });
        (0, vitest_1.expect)(entitlements.length).toBe(1);
        (0, vitest_1.expect)(entitlements[0].status).toBe(client_1.EntitlementStatus.ACTIVE);
        (0, vitest_1.expect)(entitlements[0].resourceId).toBe(subjectId);
    });
    (0, vitest_1.it)('should handle duplicate webhook retry idempotently without duplicating entitlements', async () => {
        // Retry with exact same orderId and transactionRef (simulating Paymob webhook retry)
        const retryRes = await commerce_service_1.CommerceService.processPaymobWebhook({
            orderId,
            transactionRef: 'PAYMOB-TXN-123456',
            success: true,
        });
        (0, vitest_1.expect)(retryRes.message).toBe('Order already processed');
        (0, vitest_1.expect)(retryRes.status).toBe(client_1.OrderStatus.PAID);
        // Verify still exactly 1 entitlement exists in database
        const entitlements = await prisma_1.prisma.entitlement.findMany({
            where: { orderId, studentId },
        });
        (0, vitest_1.expect)(entitlements.length).toBe(1);
    });
});
