import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { generateAccessToken } from '../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Playground capability gate', () => {
  let studentToken: string;
  let studentUserId: string;

  beforeAll(async () => {
    // Create a student user for testing authenticated code execution
    const hashedPassword = await bcrypt.hash('password123', 10);
    const studentUser = await prisma.user.create({
      data: {
        email: `test_student_play_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'TDD Student',
        role: 'STUDENT',
      },
    });
    studentUserId = studentUser.id;

    studentToken = generateAccessToken({
      userId: studentUser.id,
      role: 'STUDENT',
      teacherStatus: null,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_student_play_' } },
    });
  });

  it('never executes code even when the legacy opt-in flag is set', async () => {
    process.env.CODE_EXECUTION_ENABLED = 'true';
    const res = await request(app)
      .post('/api/v1/playgrounds/execute')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'python',
        code: 'print("Hello from TDD")',
      });
    
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FEATURE_DISABLED');
    delete process.env.CODE_EXECUTION_ENABLED;
  });

  it('returns the staged capability response before auth or execution', async () => {
    const res = await request(app)
      .post('/api/v1/playgrounds/execute')
      .send({
        language: 'python',
        code: 'print("Hack")',
      });
    
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });
});
