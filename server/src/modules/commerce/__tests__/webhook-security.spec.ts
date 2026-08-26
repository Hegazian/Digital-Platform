import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import crypto from 'crypto';

describe('Payment Webhook Cryptographic Verification (TDD)', () => {
  let studentToken: string;
  let studentId: string;
  let subjectId: string;
  let productId: string;
  let orderId: string;

  const TEST_PAYMOB_SECRET = process.env.PAYMOB_HMAC_SECRET || 'test_paymob_hmac_secret_key_123';

  // Helper mirroring the server's canonical Paymob HMAC scheme
  // (sorted key=value pairs, key names included in the signed material).
  function generatePaymobSignature(data: Record<string, any>, secret: string): string {
    const canonical = Object.keys(data)
      .filter((k) => data[k] !== undefined)
      .sort()
      .map((k) => `${k}=${String(data[k])}`)
      .join('&');
    return crypto.createHmac('sha512', secret).update(canonical).digest('hex');
  }

  beforeAll(async () => {
    // 1. Create Student
    const student = await prisma.user.create({
      data: {
        email: `student-webhook-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Webhook Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });

    // 2. Create Subject
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Webhook Physics ${Date.now()}`,
        nameAr: 'فيزياء',
      },
    });
    subjectId = subject.id;

    // 3. Create Product
    const product = await prisma.product.create({
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
    const order = await prisma.order.create({
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

  afterAll(async () => {
    try {
      await prisma.entitlement.deleteMany({ where: { studentId } });
      await prisma.order.deleteMany({ where: { studentId } });
      await prisma.product.deleteMany({ where: { id: productId } });
      await prisma.subject.deleteMany({ where: { id: subjectId } });
      await prisma.user.deleteMany({ where: { id: studentId } });
    } catch (e) {}
  });

  it('should REJECT Paymob webhook missing HMAC signature with 401', async () => {
    const res = await request(app)
      .post('/api/v1/commerce/webhooks/paymob')
      .send({
        orderId,
        transactionRef: `tx_${Date.now()}`,
        success: true,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/signature/i);
  });

  it('should REJECT Paymob webhook with forged / invalid HMAC signature with 401', async () => {
    const payload = {
      orderId,
      transactionRef: `tx_${Date.now()}`,
      success: true,
    };

    const forgedSignature = 'abcdef1234567890deadbeef';

    const res = await request(app)
      .post('/api/v1/commerce/webhooks/paymob')
      .set('x-paymob-hmac', forgedSignature)
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid.*signature/i);
  });

  it('should ACCEPT Paymob webhook with valid HMAC signature and reconcile order', async () => {
    const payload = {
      orderId,
      transactionRef: `legit_tx_${Date.now()}`,
      success: true,
      amount: 300, // must match the order total (amount reconciliation is mandatory)
    };

    const validSignature = generatePaymobSignature(payload, TEST_PAYMOB_SECRET);

    const res = await request(app)
      .post('/api/v1/commerce/webhooks/paymob')
      .set('x-paymob-hmac', validSignature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PAID');

    // Verify Entitlement was created
    const entitlement = await prisma.entitlement.findFirst({
      where: { studentId, orderId },
    });
    expect(entitlement).toBeDefined();
    expect(entitlement?.status).toBe('ACTIVE');
  });
});
