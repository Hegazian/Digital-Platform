import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Role, TeacherStatus } from '@prisma/client';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import { StorageService } from '../../../utils/storage';

describe('Video Pipeline Integration Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  let studentId: string;
  let subjectId: string;
  let courseId: string;
  const uploadedVideoIds: string[] = [];

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
    const uploadedVideos = await prisma.video.findMany({ where: { id: { in: uploadedVideoIds } }, select: { videoUrl: true } });
    for (const video of uploadedVideos) if (video.videoUrl) await StorageService.deleteFile(video.videoUrl);
    await prisma.video.deleteMany({ where: { id: { in: uploadedVideoIds } } });
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
    it('streams a validated upload from private staging and reports processing until probed', async () => {
      const fixture = Buffer.from('0000ftypisom' + 'video payload');
      const res = await request(app)
        .post('/api/v1/videos/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', fixture, { filename: 'lesson.mp4', contentType: 'video/mp4' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PROCESSING');
      expect(res.body.data.sizeBytes).toBe(fixture.length);
      expect(res.body.data.videoUrl).toContain('/uploads/lesson-videos/');
      uploadedVideoIds.push(res.body.data.id);

      const playback = await request(app)
        .get(`/api/v1/videos/${res.body.data.id}/playback-url`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(playback.status).toBe(409);
    });

    it('rejects mismatched media and does not create a video record', async () => {
      const before = await prisma.video.count({ where: { teacherId } });
      const res = await request(app)
        .post('/api/v1/videos/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', Buffer.from('not an mp4 file'), { filename: 'bad.mp4', contentType: 'video/mp4' });

      expect(res.status).toBe(400);
      expect(await prisma.video.count({ where: { teacherId } })).toBe(before);
    });

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
