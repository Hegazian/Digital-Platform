import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../prisma';
import { CommerceService } from '../commerce.service';
import { ProductType, OrderStatus, EntitlementStatus } from '@prisma/client';

describe('Transactional Webhook Idempotency & Entitlement Issuance (TDD)', () => {
  let studentId: string;
  let subjectId: string;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    // 1. Create Student
    const student = await prisma.user.create({
      data: {
        email: `webhook-student-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Webhook Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;

    // 2. Create Subject
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Webhook Subject ${Date.now()}`,
        nameAr: 'مادة الويب هوك',
      },
    });
    subjectId = subject.id;

    // 3. Create Product
    const product = await prisma.product.create({
      data: {
        nameEn: 'Full Subject Bundle',
        nameAr: 'حزمة المادة الكاملة',
        productType: ProductType.SUBJECT,
        resourceId: subjectId,
        priceEgp: 300,
        priceUsd: 10,
      },
    });
    productId = product.id;

    // 4. Create Order in PENDING status
    const order = await prisma.order.create({
      data: {
        studentId,
        productId,
        status: OrderStatus.PENDING,
        totalAmountEgp: 300,
        totalAmountUsd: 10,
        idempotencyKey: `idemp-key-${Date.now()}`,
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    try {
      await prisma.entitlement.deleteMany({ where: { studentId } });
      await prisma.order.deleteMany({ where: { studentId } });
      await prisma.product.deleteMany({ where: { id: productId } });
      await prisma.subject.deleteMany({ where: { id: subjectId } });
      await prisma.user.deleteMany({ where: { id: studentId } });
    } catch (e) {}
  });

  it('should process payment webhook atomically and create entitlement', async () => {
    const res = await CommerceService.processPaymobWebhook({
      orderId,
      transactionRef: 'PAYMOB-TXN-123456',
      success: true,
      amount: 300, // matches order.totalAmountEgp (reconciliation is mandatory)
    });

    expect(res.status).toBe(OrderStatus.PAID);
    expect(res.order.status).toBe(OrderStatus.PAID);

    // Verify order in database
    const orderInDb = await prisma.order.findUnique({ where: { id: orderId } });
    expect(orderInDb?.status).toBe(OrderStatus.PAID);
    expect(orderInDb?.transactionRef).toBe('PAYMOB-TXN-123456');

    // Verify exactly 1 entitlement was granted
    const entitlements = await prisma.entitlement.findMany({
      where: { orderId, studentId },
    });
    expect(entitlements.length).toBe(1);
    expect(entitlements[0].status).toBe(EntitlementStatus.ACTIVE);
    expect(entitlements[0].resourceId).toBe(subjectId);
  });

  it('should handle duplicate webhook retry idempotently without duplicating entitlements', async () => {
    // Retry with exact same orderId and transactionRef (simulating Paymob webhook retry)
    const retryRes = await CommerceService.processPaymobWebhook({
      orderId,
      transactionRef: 'PAYMOB-TXN-123456',
      success: true,
      amount: 300,
    });

    expect(retryRes.message).toBe('Order already processed');
    expect(retryRes.status).toBe(OrderStatus.PAID);

    // Verify still exactly 1 entitlement exists in database
    const entitlements = await prisma.entitlement.findMany({
      where: { orderId, studentId },
    });
    expect(entitlements.length).toBe(1);
  });
});
