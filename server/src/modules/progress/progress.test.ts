import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';

describe('Progress Module API', () => {
  let studentToken: string;
  let studentId: string;
  let testLessonId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const teacherEmail = `teacher-prog-${timestamp}@test.com`;
    const studentEmail = `student-prog-${timestamp}@test.com`;

    // 1. Create Teacher
    const teacher = await prisma.user.create({
      data: {
        name: 'Test Teacher',
        email: teacherEmail,
        password: 'hash',
        role: 'TEACHER',
      }
    });

    // 2. Create Subject & Course & Lesson
    const subject = await prisma.subject.create({
      data: { nameEn: 'Math', nameAr: 'رياضيات' }
    });
    
    const course = await prisma.course.create({
      data: {
        titleEn: 'Algebra',
        titleAr: 'جبر',
        description: 'Test',
        teacherId: teacher.id,
        subjectId: subject.id,
        isPublished: true,
        status: 'PUBLISHED',
      }
    });

    const section = await prisma.section.create({
      data: {
        courseId: course.id,
        titleEn: 'Chapter 1',
        titleAr: 'فصل 1',
        orderIndex: 1
      }
    });

    const lesson = await prisma.lesson.create({
      data: {
        sectionId: section.id,
        titleEn: 'Intro',
        titleAr: 'مقدمة',
        orderIndex: 1
      }
    });
    testLessonId = lesson.id;

    // 3. Register Student
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Student',
      email: studentEmail,
      password: 'password123',
    });
    studentId = regRes.body.data.id;

    // Login Student to get token
    const logRes = await request(app).post('/api/v1/auth/login').send({
      email: studentEmail,
      password: 'password123',
    });
    studentToken = logRes.body.data.tokens.accessToken;

    // 4. Create active subscription
    await prisma.subscription.create({
      data: {
        userId: studentId,
        subjectId: subject.id,
        period: 'MONTHLY',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  });

  describe('POST /api/v1/progress/:lessonId', () => {
    it('should increment watch time by 10 seconds', async () => {
      const res = await request(app)
        .post(`/api/v1/progress/${testLessonId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ watchTimeDeltaSec: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.watchTimeSec).toBe(10);
      expect(res.body.data.isCompleted).toBe(false);

      // Call again to verify increment
      const res2 = await request(app)
        .post(`/api/v1/progress/${testLessonId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ watchTimeDeltaSec: 10 });

      expect(res2.body.data.watchTimeSec).toBe(20);
    });
  });

  describe('POST /api/v1/progress/:lessonId/complete', () => {
    it('should mark a lesson as complete', async () => {
      const res = await request(app)
        .post(`/api/v1/progress/${testLessonId}/complete`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isCompleted).toBe(true);
    });
  });

  describe('GET /api/v1/progress/summary', () => {
    it('should return 100% course progress after completing the single lesson', async () => {
      await request(app)
        .post(`/api/v1/progress/${testLessonId}/complete`)
        .set('Authorization', `Bearer ${studentToken}`);

      const res = await request(app)
        .get('/api/v1/progress/summary')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.courses).toHaveLength(1);
      expect(res.body.data.courses[0].progress).toBe(100);
      expect(res.body.data.courses[0].completedLessons).toBe(1);
    });
  });
});
