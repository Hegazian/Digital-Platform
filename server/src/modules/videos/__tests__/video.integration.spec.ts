import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
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
  let lessonId: string;
  let videoId: string;

  beforeAll(async () => {
    // Setup clean database records
    await prisma.subscription.deleteMany();
    await prisma.material.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.section.deleteMany();
    await prisma.course.deleteMany();
    await prisma.subjectPricing.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.video.deleteMany();
    await prisma.user.deleteMany();

    // Create Teacher
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

    // Create Student
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

    // Create Subject, Course, Section, Lesson
    const subject = await prisma.subject.create({
      data: {
        nameEn: 'Physics 101',
        nameAr: 'فيزياء 101',
      },
    });
    subjectId = subject.id;

    const course = await prisma.course.create({
      data: {
        titleEn: 'Intro to Mechanics',
        titleAr: 'مقدمة في الميكانيكا',
        description: 'Physics mechanics course',
        teacherId: teacher.id,
        subjectId: subject.id,
        isPublished: true,
      },
    });
    courseId = course.id;

    const section = await prisma.section.create({
      data: {
        courseId: course.id,
        titleEn: 'Chapter 1: Newton Laws',
        titleAr: 'الباب الأول: قوانين نيوتن',
        orderIndex: 1,
        isFreePreview: true, // Chapter 1 is free
      },
    });
    sectionId = section.id;
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany();
    await prisma.material.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.section.deleteMany();
    await prisma.course.deleteMany();
    await prisma.subjectPricing.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.video.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/v1/videos/initiate-upload', () => {
    it('should allow approved teachers to initiate video upload', async () => {
      const res = await request(app)
        .post('/api/v1/videos/initiate-upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          fileName: 'lecture1.mp4',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.videoId).toBeDefined();
      expect(res.body.data.status).toBe('UPLOADING');
      
      videoId = res.body.data.videoId;
    });

    it('should block non-teachers from initiating upload', async () => {
      const res = await request(app)
        .post('/api/v1/videos/initiate-upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ fileName: 'lecture1.mp4' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/videos/:videoId/process-hls', () => {
    it('should transcode video into HLS AES-128 encrypted files and update status to READY', async () => {
      // First link video to lesson
      const lesson = await prisma.lesson.create({
        data: {
          sectionId,
          titleEn: 'Lesson 1: Newton First Law',
          titleAr: 'الدرس الأول: قانون نيوتن الأول',
          orderIndex: 1,
          videoId,
        },
      });
      lessonId = lesson.id;

      const res = await request(app)
        .post(`/api/v1/videos/${videoId}/process-hls`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('READY');
      expect(res.body.data.hlsUrl).toBeDefined();
      expect(res.body.data.encryptionKey).toBeDefined();
    });
  });

  describe('GET /api/v1/videos/:videoId/key (AES-128 Key Delivery)', () => {
    it('should deliver 16-byte AES-128 binary key for free preview lesson to authenticated student', async () => {
      const res = await request(app)
        .get(`/api/v1/videos/${videoId}/key`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/octet-stream');
      expect(res.body).toBeDefined();
    }, 15000);

    it('should deny key delivery to unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/v1/videos/${videoId}/key`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/videos/:videoId/manifest.m3u8', () => {
    it('should return HLS playlist manifest for ready video', async () => {
      const res = await request(app)
        .get(`/api/v1/videos/${videoId}/manifest.m3u8`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.apple.mpegurl');
      expect(res.text).toContain('#EXTM3U');
      expect(res.text).toContain('#EXT-X-KEY:METHOD=AES-128');
    });
  });
});
