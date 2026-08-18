import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

describe('Zoom Live Classes Integration Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  let studentId: string;
  let subjectId: string;
  let liveSessionId: string;

  beforeAll(async () => {
    // 1. Create Approved Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher-live-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Live Teacher',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
      },
    });
    teacherId = teacher.id;
    teacherToken = generateAccessToken({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });

    // 2. Create Student
    const student = await prisma.user.create({
      data: {
        email: `student-live-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Live Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });

    // 3. Create Subject
    const subject = await prisma.subject.create({
      data: { nameEn: 'Live Math Subject', nameAr: 'مادة رياضيات مباشرة' },
    });
    subjectId = subject.id;

    // 4. Enroll Student via Active Entitlement
    await prisma.entitlement.create({
      data: {
        studentId: student.id,
        resourceType: 'SUBJECT',
        resourceId: subject.id,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    if (liveSessionId) {
      await prisma.liveSession.deleteMany({ where: { id: liveSessionId } });
    }
    if (studentId) {
      await prisma.entitlement.deleteMany({ where: { studentId } });
    }
    if (subjectId) {
      await prisma.subject.deleteMany({ where: { id: subjectId } });
    }
    await prisma.user.deleteMany({ where: { email: { contains: '-live-' } } });
  });

  describe('POST /api/v1/live/sessions', () => {
    it('should allow teacher to schedule a Zoom live meeting session', async () => {
      const res = await request(app)
        .post('/api/v1/live/sessions')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          subjectId,
          titleEn: 'Live Problem Solving Workshop',
          titleAr: 'ورشة حل المسائل المباشرة',
          startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
          durationMinutes: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.titleEn).toBe('Live Problem Solving Workshop');
      expect(res.body.data).toHaveProperty('zoomStartUrl');
      expect(res.body.data).toHaveProperty('zoomJoinUrl');
      liveSessionId = res.body.data.id;
    });

    it('should deny non-teacher access', async () => {
      const res = await request(app)
        .post('/api/v1/live/sessions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          subjectId,
          titleEn: 'Unauthorized Meeting',
          titleAr: 'اجتماع غير مصرح',
          startTime: new Date().toISOString(),
          durationMinutes: 30,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/live/sessions/subject/:subjectId', () => {
    it('should allow entitled student to list upcoming live sessions with join URL', async () => {
      const res = await request(app)
        .get(`/api/v1/live/sessions/subject/${subjectId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('zoomJoinUrl');
      // Student MUST NOT see teacher host start URL
      expect(res.body.data[0]).not.toHaveProperty('zoomStartUrl');
    });
  });
});
