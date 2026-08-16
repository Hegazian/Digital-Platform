import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';
import { SubscriptionStatus } from '@prisma/client';

describe('Material API Integration Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  let studentId: string;
  let subjectId: string;
  let courseId: string;
  let sectionId: string;
  let lessonId: string;
  let materialId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('Pass123!', 10);
    const timestamp = Date.now();

    // Create Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `mat-teacher-${timestamp}@test.com`,
        password: hashedPassword,
        name: 'Mat Teacher',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
        isActive: true,
      },
    });
    teacherId = teacher.id;
    teacherToken = generateAccessToken({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });

    // Create Student
    const student = await prisma.user.create({
      data: {
        email: `mat-student-${timestamp}@test.com`,
        password: hashedPassword,
        name: 'Mat Student',
        role: 'STUDENT',
        isActive: true,
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT', teacherStatus: null });

    // Create Subject, Course, Section, Lesson
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Mat Subject ${timestamp}`,
        nameAr: `مادة ${timestamp}`,
        description: 'Subject for materials test',
      },
    });
    subjectId = subject.id;

    const course = await prisma.course.create({
      data: {
        titleEn: 'Course Materials Test',
        titleAr: 'دورة المرفقات',
        description: 'Testing materials',
        teacherId: teacher.id,
        subjectId: subject.id,
        isPublished: true,
      },
    });
    courseId = course.id;

    const section = await prisma.section.create({
      data: {
        courseId: course.id,
        titleEn: 'Section 1',
        titleAr: 'الباب 1',
        orderIndex: 1,
        isFreePreview: false,
      },
    });
    sectionId = section.id;

    const lesson = await prisma.lesson.create({
      data: {
        sectionId: section.id,
        titleEn: 'Lesson 1',
        titleAr: 'الدرس 1',
        orderIndex: 1,
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    await prisma.subject.deleteMany({ where: { nameEn: { contains: 'Mat Subject' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'mat-' } } });
  });

  describe('POST /api/v1/materials/upload', () => {
    it('should allow teacher to upload file material', async () => {
      const res = await request(app)
        .post('/api/v1/materials/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .field('lessonId', lessonId)
        .field('title', 'Chapter 1 PDF Summary')
        .attach('file', Buffer.from('%PDF-1.4 Mock PDF Content'), 'summary.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Chapter 1 PDF Summary');
      materialId = res.body.data.id;
    });

    it('should deny upload to student', async () => {
      const res = await request(app)
        .post('/api/v1/materials/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('lessonId', lessonId)
        .field('title', 'Unauthorized Upload')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/materials/lesson/:lessonId', () => {
    it('should deny non-subscribed student access to materials', async () => {
      const res = await request(app)
        .get(`/api/v1/materials/lesson/${lessonId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow active subscribed student to get lesson materials', async () => {
      // Create active subscription for student
      await prisma.subscription.create({
        data: {
          userId: studentId,
          subjectId,
          period: 'MONTHLY',
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app)
        .get(`/api/v1/materials/lesson/${lessonId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE /api/v1/materials/:id', () => {
    it('should allow teacher owner to delete material', async () => {
      const res = await request(app)
        .delete(`/api/v1/materials/${materialId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
