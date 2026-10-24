import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Community Discussions API (TDD)', () => {
  let studentToken: string;
  let studentId: string;
  let outsiderId: string;
  let outsiderToken: string;
  let teacherId: string;
  let subjectId: string;
  let courseId: string;
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

    const teacher = await prisma.user.create({
      data: { email: `teacher_disc_${Date.now()}@eduplatform.com`, password: 'unused', name: 'Discussion Teacher', role: 'TEACHER', teacherStatus: 'APPROVED' },
    });
    teacherId = teacher.id;
    const subject = await prisma.subject.create({ data: { nameEn: `Discussion ${Date.now()}`, nameAr: 'مناقشة' } });
    subjectId = subject.id;
    const course = await prisma.course.create({
      data: { teacherId, subjectId, titleEn: 'Discussion course', titleAr: 'مقرر النقاش', description: 'Fixture', status: 'PUBLISHED', isPublished: true, isFree: true },
    });
    courseId = course.id;
    await prisma.entitlement.create({ data: { studentId, resourceType: 'COURSE', resourceId: courseId, sourceType: 'ADMIN_GRANT', status: 'ACTIVE' } });

    studentToken = generateAccessToken({
      userId: student.id,
      role: 'STUDENT',
      teacherStatus: null,
    });

    const outsider = await prisma.user.create({
      data: { email: `outsider_disc_${Date.now()}@eduplatform.com`, password: 'unused', name: 'Discussion Outsider', role: 'STUDENT' },
    });
    outsiderId = outsider.id;
    outsiderToken = generateAccessToken({ userId: outsider.id, role: outsider.role, authVersion: outsider.authVersion });
  });

  afterAll(async () => {
    try {
      if (courseId) await prisma.discussionThread.deleteMany({ where: { courseId } });
      if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
      if (subjectId) await prisma.subject.deleteMany({ where: { id: subjectId } });
      await prisma.user.deleteMany({ where: { id: { in: [studentId, outsiderId, teacherId] } } });
    } catch (e) {}
  });

  it('POST /api/v1/discussions/threads - should create a discussion thread', async () => {
    const res = await request(app)
      .post('/api/v1/discussions/threads')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId,
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
      .get(`/api/v1/discussions/courses/${courseId}`)
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

  it('denies discussion reads and replies to a student without course access', async () => {
    const list = await request(app).get(`/api/v1/discussions/courses/${courseId}`).auth(outsiderToken, { type: 'bearer' });
    const reply = await request(app).post(`/api/v1/discussions/threads/${threadId}/replies`).auth(outsiderToken, { type: 'bearer' }).send({ content: 'unauthorized' });
    expect(list.status).toBe(403);
    expect(reply.status).toBe(403);
  });
});
