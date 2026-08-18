import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('AI Study Assistant API - Google Gemini (TDD)', () => {
  let studentToken: string;
  let studentId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const student = await prisma.user.create({
      data: {
        email: `student_ai_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'AI Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;

    studentToken = generateAccessToken({
      userId: student.id,
      role: 'STUDENT',
      teacherStatus: null,
    });
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({ where: { email: { contains: 'student_ai_' } } });
    } catch (e) {}
  });

  it('POST /api/v1/ai/tutor - should accept prompt and return AI study explanation', async () => {
    const res = await request(app)
      .post('/api/v1/ai/tutor')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        prompt: 'Explain Newton second law in simple terms for high school student.',
        courseContext: 'Physics 1st Secondary',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBeDefined();
    expect(typeof res.body.data.answer).toBe('string');
  });

  it('POST /api/v1/ai/tutor - should reject empty prompt', async () => {
    const res = await request(app)
      .post('/api/v1/ai/tutor')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        prompt: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
