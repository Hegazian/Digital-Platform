import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Role, TeacherStatus } from '@prisma/client';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

describe('Video Pipeline Integration Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  let studentId: string;
  let subjectId: string;
  let courseId: string;

  beforeAll(async () => {
    // Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `videoteacher-${Date.now()}@test.com`,
        password: 'hashedpassword',
        name: 'Video Teacher',
        role: Role.TEACHER,
        teacherStatus: TeacherStatus.APPROVED,
      },
    });
    teacherId = teacher.id;
    teacherToken = generateAccessToken({ userId: teacher.id, role: teacher.role, teacherStatus: teacher.teacherStatus });

    // Student
    const student = await prisma.user.create({
      data: {
        email: `videostudent-${Date.now()}@test.com`,
        password: 'hashedpassword',
        name: 'Video Student',
        role: Role.STUDENT,
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: student.role });

    // Subject, Course
    const subject = await prisma.subject.create({
      data: { nameEn: `Physics 101 ${Date.now()}`, nameAr: 'فيزياء 101' },
    });
    subjectId = subject.id;

    const course = await prisma.course.create({
      data: {
        titleEn: 'Intro to Mechanics',
        titleAr: 'مقدمة',
        description: 'Physics',
        teacherId: teacher.id,
        subjectId: subject.id,
        isPublished: true,
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    if (courseId) {
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    if (subjectId) {
      await prisma.subject.deleteMany({ where: { id: subjectId } });
    }
    await prisma.user.deleteMany({ where: { email: { contains: 'videoteacher-' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'videostudent-' } } });
  });

  describe('POST /api/v1/videos/upload', () => {
    it('should block non-teachers from uploading', async () => {
      const res = await request(app)
        .post('/api/v1/videos/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('file', Buffer.from('fake video data'), 'test.mp4');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/videos/:videoId/playback-url', () => {
    it('should deny playback url for non-existent video', async () => {
      const res = await request(app)
        .get('/api/v1/videos/00000000-0000-0000-0000-000000000000/playback-url')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });
});
