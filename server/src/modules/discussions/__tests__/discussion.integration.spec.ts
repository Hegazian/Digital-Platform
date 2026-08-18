import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Community Discussions API (TDD)', () => {
  let studentToken: string;
  let studentId: string;
  let threadId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const student = await prisma.user.create({
      data: {
        email: `student_disc_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Discussion Student',
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
      await prisma.discussionReply.deleteMany();
      await prisma.discussionThread.deleteMany();
      await prisma.user.deleteMany({ where: { email: { contains: 'student_disc_' } } });
    } catch (e) {}
  });

  it('POST /api/v1/discussions/threads - should create a discussion thread', async () => {
    const res = await request(app)
      .post('/api/v1/discussions/threads')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId: 'demo-course-id',
        title: 'How to solve Problem 3?',
        content: 'I need help understanding Newton third law in chapter 1.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    threadId = res.body.data.id;
  });

  it('GET /api/v1/discussions/courses/:courseId - should fetch threads for a course', async () => {
    const res = await request(app)
      .get('/api/v1/discussions/courses/demo-course-id')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/discussions/threads/:id/replies - should post a reply to a thread', async () => {
    const res = await request(app)
      .post(`/api/v1/discussions/threads/${threadId}/replies`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'Remember that action and reaction forces act on different bodies!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.threadId).toBe(threadId);
  });
});
