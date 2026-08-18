import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

describe('Teacher Studio Facilities Integration Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  let studentId: string;
  let subjectId: string;
  let courseId: string;

  beforeAll(async () => {
    // 1. Create Approved Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher-studio-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Studio Teacher',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
      },
    });
    teacherId = teacher.id;
    teacherToken = generateAccessToken({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });

    // 2. Create Student
    const student = await prisma.user.create({
      data: {
        email: `student-studio-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Studio Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });

    // 3. Create Subject & Course
    const subject = await prisma.subject.create({
      data: { nameEn: 'Physics Studio', nameAr: 'فيزياء استوديو' },
    });
    subjectId = subject.id;

    const course = await prisma.course.create({
      data: {
        titleEn: 'Quantum Physics',
        titleAr: 'فيزياء الكم',
        description: 'Advanced Quantum Mechanics',
        teacherId: teacher.id,
        subjectId: subject.id,
        isPublished: true,
      },
    });
    courseId = course.id;

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
    if (studentId) {
      await prisma.entitlement.deleteMany({ where: { studentId } });
      await prisma.notification.deleteMany({ where: { userId: studentId } });
    }
    if (courseId) {
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    if (subjectId) {
      await prisma.subject.deleteMany({ where: { id: subjectId } });
    }
    await prisma.user.deleteMany({ where: { email: { contains: '-studio-' } } });
  });

  describe('GET /api/v1/teacher/students', () => {
    it('should allow teacher to list all enrolled students across their courses', async () => {
      const res = await request(app)
        .get('/api/v1/teacher/students')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((s: any) => s.id === studentId)).toBe(true);
    });

    it('should deny non-teacher access', async () => {
      const res = await request(app)
        .get('/api/v1/teacher/students')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/teacher/students/:studentId/progress', () => {
    it('should allow teacher to inspect specific student progress and performance', async () => {
      const res = await request(app)
        .get(`/api/v1/teacher/students/${studentId}/progress`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.id).toBe(studentId);
      expect(typeof res.body.data.totalLessonsCompleted).toBe('number');
    });
  });

  describe('POST /api/v1/teacher/announcements', () => {
    it('should allow teacher to broadcast an announcement to enrolled students', async () => {
      const res = await request(app)
        .post('/api/v1/teacher/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          courseId,
          titleEn: 'Live Review Session Today',
          titleAr: 'جلسة مراجعة مباشرة اليوم',
          messageEn: 'Join us at 6 PM for midterm preparation.',
          messageAr: 'انضم إلينا الساعة 6 مساءً للتحضير للامتحان.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notificationsSent).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/teacher/revenue', () => {
    it('should return earnings overview and voucher redemption counts for teacher', async () => {
      const res = await request(app)
        .get('/api/v1/teacher/revenue')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalStudentsEnrolled).toBe('number');
    });
  });
});
