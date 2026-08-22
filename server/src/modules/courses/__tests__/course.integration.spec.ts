import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient, Role, TeacherStatus } from '@prisma/client';
import app from '../../../app';
import { generateAccessToken } from '../../../utils/jwt';

const prisma = new PrismaClient();

describe('Course & Subject Integration Tests', () => {
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  let subjectId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const timestamp = Date.now();

    // Create Admin user
    const admin = await prisma.user.create({
      data: {
        email: `admin-crs-test-${timestamp}@edu.com`,
        password: 'pass',
        name: 'Admin User',
        role: Role.ADMIN,
      },
    });
    adminToken = generateAccessToken({ userId: admin.id, role: Role.ADMIN });

    // Create Approved Teacher user
    const teacher = await prisma.user.create({
      data: {
        email: `teacher-crs-test-${timestamp}@edu.com`,
        password: 'pass',
        name: 'Teacher User',
        role: Role.TEACHER,
        teacherStatus: TeacherStatus.APPROVED,
      },
    });
    teacherId = teacher.id;
    teacherToken = generateAccessToken({
      userId: teacher.id,
      role: Role.TEACHER,
      teacherStatus: TeacherStatus.APPROVED,
    });

    // Create Student user
    const student = await prisma.user.create({
      data: {
        email: `student-crs-test-${timestamp}@edu.com`,
        password: 'pass',
        name: 'Student User',
        role: Role.STUDENT,
      },
    });
    studentToken = generateAccessToken({ userId: student.id, role: Role.STUDENT });
  });

  afterAll(async () => {
    await prisma.course.deleteMany({ where: { titleEn: { contains: 'Mastering JavaScript' } } });
    await prisma.subject.deleteMany({ where: { nameEn: { contains: 'CourseTestSubject' } } });
    await prisma.user.deleteMany({ where: { email: { contains: '-crs-test-' } } });
    await prisma.$disconnect();
  });

  describe('Subject Endpoints', () => {
    it('POST /api/v1/subjects - should allow ADMIN to create subject', async () => {
      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nameEn: 'CourseTestSubject',
          nameAr: 'مادة اختبارية',
          description: 'Computer Science & Software Development',
          pricing: [
            { period: 'MONTHLY', priceEgp: 300, priceUsd: 15 },
            { period: 'YEARLY', priceEgp: 2500, priceUsd: 120 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nameEn).toBe('CourseTestSubject');
      subjectId = res.body.data.id;
    });

    it('GET /api/v1/subjects - public route should list subjects', async () => {
      const res = await request(app).get('/api/v1/subjects');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/subjects - non-admin should be forbidden (403)', async () => {
      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          nameEn: 'Math',
          nameAr: 'رياضيات',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Course Endpoints', () => {
    let courseId: string;

    it('POST /api/v1/courses - approved teacher can create course', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          titleEn: 'Mastering JavaScript',
          titleAr: 'إتقان جافاسكريبت',
          description: 'Full stack JS programming',
          subjectId: subjectId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.titleEn).toBe('Mastering JavaScript');
      courseId = res.body.data.id;
    });

    it('POST /api/v1/courses/:courseId/sections - teacher can add section', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${courseId}/sections`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          titleEn: 'Chapter 1: Intro',
          titleAr: 'الفصل الأول: المقدمة',
          orderIndex: 1,
          isFreePreview: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isFreePreview).toBe(true);
    });

    it('PATCH /api/v1/courses/:courseId/publish - teacher cannot self-publish (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/courses/${courseId}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('PATCH /api/v1/courses/:courseId/publish - admin cannot publish incomplete course (TC-ADMIN-034)', async () => {
      const res = await request(app)
        .patch(`/api/v1/courses/${courseId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/incomplete/i);
    });

    it('PATCH /api/v1/courses/:courseId/publish - admin can publish a complete course', async () => {
      // Make the course complete: module -> lesson -> attached video resource.
      const mod = await prisma.courseModule.create({
        data: { courseId, titleEn: 'Pub Mod', titleAr: 'وحدة' },
      });
      const video = await prisma.video.create({
        data: {
          teacherId,
          videoUrl: '/uploads/lesson-videos/pub.mp4',
          originalFileName: 'pub.mp4',
          status: 'READY',
        },
      });
      await prisma.lesson.create({
        data: { moduleId: mod.id, titleEn: 'Pub Lesson', titleAr: 'درس', videoId: video.id },
      });

      const res = await request(app)
        .patch(`/api/v1/courses/${courseId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(true);
      expect(res.body.data.status).toBe('PUBLISHED');
    });
  });
});
