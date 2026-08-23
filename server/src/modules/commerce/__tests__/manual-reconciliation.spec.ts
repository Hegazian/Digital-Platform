import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import { OrderStatus, ProductType } from '@prisma/client';

/**
 * Manual payment reconciliation (Phase U1):
 * student checkout -> PENDING order -> admin approves/rejects.
 * Approval MUST atomically grant the entitlement (same path as webhooks).
 */
describe('Admin Manual Order Reconciliation', () => {
  let adminToken: string;
  let studentToken: string;
  const cleanup: { users: string[]; products: string[]; orders: string[]; subjects: string[]; entitlements: string[] } = {
    users: [], products: [], orders: [], subjects: [], entitlements: [],
  };
  let studentId: string;
  let productId: string;

  beforeAll(async () => {
    const ts = Date.now();

    const admin = await prisma.user.create({
      data: {
        email: `admin-recon-${ts}@test.com`,
        password: 'Password123!',
        name: 'Recon Admin',
        role: 'ADMIN',
      },
    });
    cleanup.users.push(admin.id);
    adminToken = generateAccessToken({ userId: admin.id, role: 'ADMIN' });

    const student = await prisma.user.create({
      data: {
        email: `student-recon-${ts}@test.com`,
        password: 'Password123!',
        name: 'Recon Student',
        role: 'STUDENT',
      },
    });
    cleanup.users.push(student.id);
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });

    const subject = await prisma.subject.create({
      data: { nameEn: `Recon Subject ${ts}`, nameAr: 'مادة' },
    });
    cleanup.subjects.push(subject.id);

    const product = await prisma.product.create({
      data: {
        nameEn: 'Paid Course Product',
        nameAr: 'منتج مدفوع',
        productType: ProductType.COURSE,
        resourceId: subject.id,
        priceEgp: 250,
        priceUsd: 12,
      },
    });
    cleanup.products.push(product.id);
    productId = product.id;
  });

  afterAll(async () => {
    try {
      await prisma.entitlement.deleteMany({ where: { studentId } });
      await prisma.order.deleteMany({ where: { id: { in: cleanup.orders } } });
      await prisma.product.deleteMany({ where: { id: { in: cleanup.products } } });
      await prisma.subject.deleteMany({ where: { id: { in: cleanup.subjects } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanup.users } } });
    } catch {}
  });

  it('student creates a MANUAL order with a transaction reference', async () => {
    const res = await request(app)
      .post('/api/v1/commerce/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        productId,
        paymentMethod: 'MANUAL',
        idempotencyKey: `recon-${Date.now()}`,
        transactionRef: 'VF-cash-0123456789',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(OrderStatus.PENDING);
    expect(res.body.data.transactionRef).toBe('VF-cash-0123456789');
    expect(Number(res.body.data.totalAmountEgp)).toBe(250);
    cleanup.orders.push(res.body.data.id);

    // Idempotent replay returns the SAME order
    const replay = await request(app)
      .post('/api/v1/commerce/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        productId,
        paymentMethod: 'MANUAL',
        idempotencyKey: res.body.data.idempotencyKey,
        transactionRef: 'VF-cash-0123456789',
      });
    expect(replay.status).toBe(201);
    expect(replay.body.data.id).toBe(res.body.data.id);
  });

  it('student sees the pending order in their history', async () => {
    const res = await request(app)
      .get('/api/v1/commerce/orders/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((o: any) => o.product?.resourceId)).toBeTruthy();
  });

  it('admin approves -> order PAID + exactly one entitlement granted atomically', async () => {
    const orderId = cleanup.orders[0];

    const approve = await request(app)
      .patch(`/api/v1/commerce/admin/orders/${orderId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approve.status).toBe(200);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.PAID);

    // Duplicate approval must not duplicate anything
    const again = await request(app)
      .patch(`/api/v1/commerce/admin/orders/${orderId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(again.status).toBe(200);

    const entitlements = await prisma.entitlement.findMany({ where: { orderId } });
    expect(entitlements.length).toBe(1);
    cleanup.entitlements.push(entitlements[0].id);
  });

  it('admin rejects a second pending order; students cannot use admin endpoints', async () => {
    const create = await request(app)
      .post('/api/v1/commerce/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        productId,
        paymentMethod: 'MANUAL',
        idempotencyKey: `recon-reject-${Date.now()}`,
        transactionRef: 'bad-proof',
      });
    cleanup.orders.push(create.body.data.id);

    const rejectAsStudent = await request(app)
      .patch(`/api/v1/commerce/admin/orders/${create.body.data.id}/reject`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(rejectAsStudent.status).toBe(403);

    const reject = await request(app)
      .patch(`/api/v1/commerce/admin/orders/${create.body.data.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reject.status).toBe(200);

    const order = await prisma.order.findUnique({ where: { id: create.body.data.id } });
    expect(order?.status).toBe(OrderStatus.FAILED);

    const entitlements = await prisma.entitlement.findMany({ where: { orderId: create.body.data.id } });
    expect(entitlements.length).toBe(0);
  });
});
