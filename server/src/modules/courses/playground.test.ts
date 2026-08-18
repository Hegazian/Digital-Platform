import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { generateAccessToken } from '../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Playground Execution API (TDD)', () => {
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

  it('POST /api/v1/playgrounds/execute - should execute simple python code successfully', async () => {
    const res = await request(app)
      .post('/api/v1/playgrounds/execute')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'python',
        code: 'print("Hello from TDD")',
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.output).toContain('Hello from TDD');
    expect(res.body.data.error).toBe('');
  });

  it('POST /api/v1/playgrounds/execute - should return error for syntax error code', async () => {
    const res = await request(app)
      .post('/api/v1/playgrounds/execute')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'python',
        code: 'print("Missing parenthesis)',
      });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.data.error).toBeDefined();
  });

  it('POST /api/v1/playgrounds/execute - should reject unauthorized requests', async () => {
    const res = await request(app)
      .post('/api/v1/playgrounds/execute')
      .send({
        language: 'python',
        code: 'print("Hack")',
      });
    
    expect(res.status).toBe(401);
  });
});
