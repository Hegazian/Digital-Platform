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
  let sectionId: string;
  let videoId: string;

  beforeAll(async () => {
    // Teacher
    const teacher = await prisma.user.create({
      data: {
        email: 'videoteacher@test.com',
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
        email: 'videostudent@test.com',
        password: 'hashedpassword',
        name: 'Video Student',
        role: Role.STUDENT,
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: student.role });

    // Subject, Course, Section
    const subject = await prisma.subject.create({
      data: { nameEn: 'Physics 101', nameAr: 'فيزياء 101' },
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

    const section = await prisma.section.create({
      data: {
        courseId: course.id,
        titleEn: 'Chapter 1',
        titleAr: 'الفصل ١',
        orderIndex: 1,
        isFreePreview: true,
      },
    });
    sectionId = section.id;
  });

  describe('POST /api/v1/videos/upload', () => {
    it('should block non-teachers from uploading', async () => {
      const res = await request(app)
        .post('/api/v1/videos/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('file', Buffer.from('fake video data'), 'test.mp4');

      expect(res.status).toBe(403);
    });

    // We cannot easily test the actual upload endpoint if it reaches out to Supabase
    // without mocking it. So we will skip the success upload case in integration test
    // or mock it. For now, we just test the authorization.
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
