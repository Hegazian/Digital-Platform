import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';

describe('Auth Module API', () => {
  const getTestUser = async () => {
    // Students must register with a student number + grade year.
    const existingGrade = await prisma.grade.findFirst({ select: { id: true } });
    let gradeId: string | undefined = existingGrade?.id;
    if (!gradeId) {
      const stage = await prisma.educationalStage.create({
        data: {
          nameEn: 'Auth API Test Stage',
          nameAr: 'مرحلة اختبار',
          code: `AUTH_API_${Date.now()}`,
        },
      });
      const grade = await prisma.grade.create({
        data: {
          stageId: stage.id,
          nameEn: '1st Secondary',
          nameAr: 'الأول الثانوي',
          code: `AUTH_API_${Date.now()}`,
        },
      });
      gradeId = grade.id;
    }
    return {
      name: 'Test Student',
      email: `test-${Date.now()}-${Math.random()}@student.com`,
      password: 'password123',
      role: 'STUDENT',
      studentNumber: `T-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      gradeId,
    };
  };

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new student', async () => {
      const testUser = await getTestUser();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should fail if email is already registered', async () => {
      const testUser = await getTestUser();
      await request(app).post('/api/v1/auth/register').send(testUser);
      const res = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/User with this email already exists/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const testUser = await getTestUser();
      await request(app).post('/api/v1/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should fail login with wrong password', async () => {
      const testUser = await getTestUser();
      await request(app).post('/api/v1/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
