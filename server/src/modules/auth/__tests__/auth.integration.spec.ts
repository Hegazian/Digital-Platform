import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../prisma';
import app from '../../../app';

describe('Auth Integration Tests', () => {
  const testPrefix = `auth-test-${Date.now()}`;
  const studentEmail = `${testPrefix}-student@test.com`;
  const dupEmail = `${testPrefix}-dup@test.com`;
  const loginEmail = `${testPrefix}-login@test.com`;
  const wrongPassEmail = `${testPrefix}-wrongpass@test.com`;
  let gradeId: string;

  const cleanDb = async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [studentEmail, dupEmail, loginEmail, wrongPassEmail],
          },
        },
      });
    } catch (e) {}
  };

  beforeAll(async () => {
    await cleanDb();
    // Students must register with a grade year — reuse (or create) one.
    const existing = await prisma.grade.findFirst({ select: { id: true } });
    if (existing) {
      gradeId = existing.id;
    } else {
      const stage = await prisma.educationalStage.create({
        data: {
          nameEn: 'Auth Test Stage',
          nameAr: 'مرحلة اختبار',
          code: `AUTH_STAGE_${Date.now()}`,
        },
      });
      const grade = await prisma.grade.create({
        data: {
          stageId: stage.id,
          nameEn: '1st Secondary',
          nameAr: 'الأول الثانوي',
          code: `AUTH_${Date.now()}`,
        },
      });
      gradeId = grade.id;
    }
    if (!gradeId) {
      throw new Error(
        'Test setup failed: no gradeId available. Did you run `npm run db:push:test`?'
      );
    }
  }, 15000);

  afterAll(async () => {
    await cleanDb();
  }, 15000);

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new student', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: studentEmail,
        password: 'Password123!',
        name: 'Test Student',
        role: 'STUDENT',
        studentNumber: `SN${Date.now() % 100000000}`,
        gradeId,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(studentEmail);
      expect(res.body.data.role).toBe('STUDENT');
    });

    it('should reject a student registration missing student number / grade year', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: `${testPrefix}-noid@test.com`,
        password: 'Password123!',
        name: 'No Identity',
        role: 'STUDENT',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail when registering an existing email', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: dupEmail,
        password: 'password',
        name: 'First User',
        studentNumber: `D1${Date.now() % 100000000}`,
        gradeId,
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        email: dupEmail,
        password: 'password',
        name: 'Second User',
        studentNumber: `D2${Date.now() % 100000000}`,
        gradeId,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exists/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login and return tokens for valid credentials', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: loginEmail,
        password: 'ValidPassword123',
        name: 'Login User',
        studentNumber: `L1${Date.now() % 100000000}`,
        gradeId,
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: loginEmail,
        password: 'ValidPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should fail login for wrong password', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: wrongPassEmail,
        password: 'CorrectPassword',
        name: 'User',
        studentNumber: `W1${Date.now() % 100000000}`,
        gradeId,
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: wrongPassEmail,
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);
    });
  });
});
