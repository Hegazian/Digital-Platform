import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

describe('Commerce & Entitlement Integration Tests', () => {
  let adminToken: string;
  let studentToken: string;
  let studentId: string;
  let subjectId: string;
  let productId: string;
  let voucherCode: string;

  beforeAll(async () => {
    // 1. Create Admin
    const admin = await prisma.user.create({
      data: {
        email: `admin-comm-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Commerce Admin',
        role: 'ADMIN',
      },
    });
    adminToken = generateAccessToken({ userId: admin.id, role: 'ADMIN' });

    // 2. Create Student
    const student = await prisma.user.create({
      data: {
        email: `student-comm-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Commerce Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });

    // 3. Create Subject
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Commerce Physics ${Date.now()}`,
        nameAr: 'فيزياء',
      },
    });
    subjectId = subject.id;
  });

  afterAll(async () => {
    if (voucherCode) {
      await prisma.voucher.deleteMany({ where: { code: voucherCode } });
    }
    if (studentId) {
      await prisma.entitlement.deleteMany({ where: { studentId } });
      await prisma.order.deleteMany({ where: { studentId } });
    }
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    if (subjectId) {
      await prisma.subject.deleteMany({ where: { id: subjectId } });
    }
    await prisma.user.deleteMany({ where: { email: { contains: '-comm-' } } });
  });

  describe('Products Management API', () => {
    it('should allow ADMIN to create a product catalog item', async () => {
      const res = await request(app)
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

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priceEgp).toBe('450');
      productId = res.body.data.id;
    });

    it('should list all active products publicly', async () => {
      const res = await request(app).get('/api/v1/commerce/products');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((p: any) => p.id === productId)).toBe(true);
    });
  });

  describe('Orders & Checkout API', () => {
    it('should allow student to create a pending order', async () => {
      const res = await request(app)
        .post('/api/v1/commerce/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          productId,
          paymentMethod: 'PAYMOB',
          idempotencyKey: `idemp-ord-${Date.now()}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.paymentMethod).toBe('PAYMOB');
    });

    it('should reconcile Paymob webhook callback idempotently and grant entitlement', async () => {
      const idempotencyKey = `idemp-webhook-${Date.now()}`;
      
      // Create initial order
      const orderRes = await request(app)
        .post('/api/v1/commerce/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          productId,
          paymentMethod: 'PAYMOB',
          idempotencyKey,
        });
      const orderId = orderRes.body.data.id;

      // Simulate Paymob webhook notification (amount matches the order total)
      const payload1 = {
        orderId,
        transactionRef: `paymob_tx_${Date.now()}`,
        success: true,
        amount: 450,
      };
      const { calculatePaymobHmac } = await import('../../../utils/webhook-security');
      const hmac1 = calculatePaymobHmac(payload1, process.env.PAYMOB_HMAC_SECRET || 'test_paymob_hmac_secret_key_123');

      const webhookRes1 = await request(app)
        .post('/api/v1/commerce/webhooks/paymob')
        .set('x-paymob-hmac', hmac1)
        .send(payload1);

      expect(webhookRes1.status).toBe(200);
      expect(webhookRes1.body.data.status).toBe('PAID');

      // Duplicate webhook call should be idempotent
      const webhookRes2 = await request(app)
        .post('/api/v1/commerce/webhooks/paymob')
        .set('x-paymob-hmac', hmac1)
        .send(payload1);

      expect(webhookRes2.status).toBe(200);
      expect(webhookRes2.body.message).toMatch(/Order already processed/i);
    });
  });

  describe('Entitlements Access API', () => {
    it('should confirm student active entitlement for subject', async () => {
      const res = await request(app)
        .get(`/api/v1/commerce/entitlements/check?resourceType=SUBJECT&resourceId=${subjectId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasAccess).toBe(true);
    });
  });

  describe('Vouchers API', () => {
    it('should allow ADMIN to generate a voucher code', async () => {
      voucherCode = `VOUCHER-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/commerce/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: voucherCode,
          resourceType: 'SUBJECT',
          resourceId: subjectId,
          durationDays: 30,
          maxUses: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe(voucherCode);
    });

    it('should allow student to redeem valid voucher and receive entitlement', async () => {
      // Create student 2
      const student2 = await prisma.user.create({
        data: {
          email: `student2-comm-${Date.now()}@test.com`,
          password: 'Password123!',
          name: 'Student 2',
          role: 'STUDENT',
        },
      });
      const s2Token = generateAccessToken({ userId: student2.id, role: 'STUDENT' });

      const res = await request(app)
        .post('/api/v1/commerce/vouchers/redeem')
        .set('Authorization', `Bearer ${s2Token}`)
        .send({ code: voucherCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');

      // Cleanup student 2
      await prisma.entitlement.deleteMany({ where: { studentId: student2.id } });
      await prisma.user.deleteMany({ where: { id: student2.id } });
    });
  });
});
