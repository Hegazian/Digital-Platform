import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Subscription API Integration Tests (Manual)', () => {
  let studentToken: string;
  let adminToken: string;
  let subjectId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('Pass123!', 10);
    
    // Create admin
    const admin = await prisma.user.create({
      data: {
        email: `admin-sub-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Sub Admin',
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminToken = generateAccessToken({ userId: admin.id, role: 'ADMIN', teacherStatus: null });

    // Create student
    const student = await prisma.user.create({
      data: {
        email: `student-sub-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Sub Student',
        role: 'STUDENT',
        isActive: true,
      },
    });
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT', teacherStatus: null });

    // Create a subject and pricing
    const subject = await prisma.subject.create({
      data: {
        nameEn: 'Math',
        nameAr: 'رياضيات',
        description: 'Math Sub',
        thumbnail: 'math.jpg',
      },
    });
    subjectId = subject.id;

    await prisma.subjectPricing.create({
      data: {
        subjectId: subject.id,
        period: 'MONTHLY',
        priceEgp: 100,
        priceUsd: 10,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: '-sub-' } } });
    await prisma.subject.deleteMany({ where: { nameEn: 'Math' } });
  });

  describe('POST /api/v1/subscriptions/manual', () => {
    it('should create a pending manual subscription', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/manual')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          subjectId,
          period: 'MONTHLY',
          paymentMethod: 'VODAFONE_CASH',
          transactionId: '01012345678',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      subscriptionId = res.body.data.id;
    });

    it('should reject duplicate pending subscriptions', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/manual')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          subjectId,
          period: 'MONTHLY',
          paymentMethod: 'VODAFONE_CASH',
          transactionId: '01012345678',
        });

      expect(res.status).toBe(400); // Bad Request
    });
  });

  describe('GET /api/v1/subscriptions/pending', () => {
    it('should list pending subscriptions for admin', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((sub: any) => sub.id === subscriptionId)).toBe(true);
    });

    it('should deny access to student', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/pending')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/subscriptions/:id/approve', () => {
    it('should approve the pending subscription', async () => {
      const res = await request(app)
        .patch(`/api/v1/subscriptions/${subscriptionId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');
    });
  });

  describe('GET /api/v1/subscriptions/me', () => {
    it('should list the student active subscription', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].status).toBe('ACTIVE');
    });
  });
});
