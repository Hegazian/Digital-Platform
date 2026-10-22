import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { VIDEO_STREAM_SECRET } from '../../../utils/env';

/**
 * Video playback pipeline (local-storage fallback):
 * lesson video -> entitled student requests /playback-url -> token-gated
 * /stream endpoint serves bytes (with Range support). Raw '/uploads/...'
 * paths must NEVER be directly playable, and traversal must be blocked.
 */
describe('Secure Video Playback Pipeline', () => {
  const ts = Date.now();
  let teacherId: string;
  let studentId: string;
  let courseId: string;
  let moduleId: string;
  let lessonId: string;
  let traversalLessonId: string;
  let videoId: string;
  let subjectId: string;
  let studentToken: string;
  let teacherToken: string;
  let outsiderToken: string;
  const cleanupUserIds: string[] = [];
  const cleanupVideoIds: string[] = [];
  let tempFilePath: string;

  const FIXTURE_BYTES = Buffer.from('FAKE_MP4_CONTENT_FOR_PIPELINE_TEST_'.repeat(64), 'utf8');

  async function makeUser(email: string, role: 'TEACHER' | 'STUDENT') {
    const bcrypt = await import('bcrypt');
    return prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash('Password123!', 10),
        name: email.split('@')[0],
        role,
        teacherStatus: role === 'TEACHER' ? 'APPROVED' : null,
        isActive: true,
      },
    });
  }

  async function login(userId: string, role: string) {
    return generateAccessToken({ userId, role: role as any });
  }

  beforeAll(async () => {
    const teacher = await makeUser(`vid-teacher-${ts}@test.com`, 'TEACHER');
    const student = await makeUser(`vid-student-${ts}@test.com`, 'STUDENT');
    const outsider = await makeUser(`vid-outsider-${ts}@test.com`, 'STUDENT');
    teacherId = teacher.id;
    studentId = student.id;
    cleanupUserIds.push(teacher.id, student.id, outsider.id);

    studentToken = await login(student.id, 'STUDENT');
    teacherToken = await login(teacher.id, 'TEACHER');
    outsiderToken = await login(outsider.id, 'STUDENT');

    const subject = await prisma.subject.create({
      data: { nameEn: `Vid Subject ${ts}`, nameAr: 'مادة' },
    });
    subjectId = subject.id;

    const course = await prisma.course.create({
      data: {
        titleEn: `Video Course ${ts}`,
        titleAr: 'دورة',
        description: 'Playback pipeline fixture',
        teacherId,
        subjectId,
        status: 'PUBLISHED',
        isPublished: true,
        isFree: true,
      },
    });
    courseId = course.id;

    // Free-course enrollment equivalent: direct active entitlement
    await prisma.entitlement.create({
      data: {
        studentId,
        resourceType: 'COURSE',
        resourceId: courseId,
        sourceType: 'ADMIN_GRANT',
        status: 'ACTIVE',
      },
    });

    const mod = await prisma.courseModule.create({
      data: { courseId, titleEn: 'M1', titleAr: 'و1' },
    });
    moduleId = mod.id;

    // Physical local-storage fixture (what StorageService would have written)
    const scopedVideoId = randomUUID();
    const fileName = `${randomUUID()}.mp4`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'lesson-videos', scopedVideoId);
    fs.mkdirSync(uploadDir, { recursive: true });
    tempFilePath = path.join(uploadDir, fileName);
    fs.writeFileSync(tempFilePath, FIXTURE_BYTES);

    const video = await prisma.video.create({
      data: {
        id: scopedVideoId,
        teacherId,
        status: 'READY',
        durationSec: 60,
        videoUrl: `/uploads/lesson-videos/${scopedVideoId}/${fileName}`,
        originalFileName: `pipeline-${ts}.mp4`,
        sizeBytes: FIXTURE_BYTES.length,
      },
    });
    videoId = video.id;
    cleanupVideoIds.push(video.id);

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        titleEn: 'Lesson with local video',
        titleAr: 'درس',
        orderIndex: 1,
        videoId,
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      await prisma.video.deleteMany({ where: { id: { in: [...cleanupVideoIds] } } }).catch(() => undefined);
      await prisma.lesson.deleteMany({ where: { id: { in: [lessonId, traversalLessonId].filter(Boolean) } } }).catch(() => undefined);
      await prisma.courseModule.deleteMany({ where: { id: moduleId } }).catch(() => undefined);
      await prisma.entitlement.deleteMany({ where: { studentId } }).catch(() => undefined);
      await prisma.course.deleteMany({ where: { id: courseId } }).catch(() => undefined);
      await prisma.subject.deleteMany({ where: { id: subjectId } }).catch(() => undefined);
      await prisma.refreshToken
        .deleteMany({ where: { userId: { in: cleanupUserIds } } })
        .catch(() => undefined);
      await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } }).catch(() => undefined);
    } catch {}
  });

  it('entitled student receives a token-gated stream URL, not a raw file path', async () => {
    const res = await request(app)
      .get(`/api/v1/videos/${videoId}/playback-url`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const url: string = res.body.data.playbackUrl;
    expect(url).toContain(`/api/v1/videos/${videoId}/stream?token=`);
    expect(url).not.toContain('/uploads/');
  });

  it('stream endpoint serves bytes for a valid token and rejects forged ones', async () => {
    const urlRes = await request(app)
      .get(`/api/v1/videos/${videoId}/playback-url`)
      .set('Authorization', `Bearer ${studentToken}`);
    const streamPath = (urlRes.body.data.playbackUrl as string).replace('/api/v1', '');

    const ok = await request(app).get(`/api/v1${streamPath}`);
    expect(ok.status).toBe(200);
    expect(Number(ok.headers['content-length'])).toBe(FIXTURE_BYTES.length);

    // Range request (seeking) returns a 206 slice.
    // Binary content-type: buffer manually instead of relying on .text
    const ranged = await request(app)
      .get(`/api/v1${streamPath}`)
      .set('Range', 'bytes=0-9')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(ranged.status).toBe(206);
    expect(ranged.headers['content-range']).toBe(`bytes 0-9/${FIXTURE_BYTES.length}`);
    const sliced = Buffer.isBuffer(ranged.body) ? ranged.body : Buffer.from(ranged.body ?? []);
    expect(sliced.length).toBe(10);

    const openEnded = await request(app)
      .get(`/api/v1${streamPath}`)
      .set('Range', 'bytes=10-')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(openEnded.status).toBe(206);
    expect(openEnded.headers['content-range']).toBe(`bytes 10-${FIXTURE_BYTES.length - 1}/${FIXTURE_BYTES.length}`);
    expect(Buffer.isBuffer(openEnded.body) ? openEnded.body : Buffer.from(openEnded.body ?? [])).toEqual(FIXTURE_BYTES.subarray(10));

    const suffix = await request(app)
      .get(`/api/v1${streamPath}`)
      .set('Range', 'bytes=-10')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(suffix.status).toBe(206);
    expect(suffix.headers['content-range']).toBe(`bytes ${FIXTURE_BYTES.length - 10}-${FIXTURE_BYTES.length - 1}/${FIXTURE_BYTES.length}`);
    expect(Buffer.isBuffer(suffix.body) ? suffix.body : Buffer.from(suffix.body ?? [])).toEqual(FIXTURE_BYTES.subarray(-10));

    for (const invalidRange of ['bytes=999999-', 'bytes=20-10', 'bytes=-0', 'bytes=0-1,4-5', 'items=0-1']) {
      const rejected = await request(app).get(`/api/v1${streamPath}`).set('Range', invalidRange);
      expect(rejected.status, invalidRange).toBe(416);
      expect(rejected.headers['content-range']).toBe(`bytes */${FIXTURE_BYTES.length}`);
    }

    const forged = await request(app).get(`/api/v1/videos/${videoId}/stream?token=forged-token`);
    expect(forged.status).toBe(401);
  });

  it('students WITHOUT entitlement are denied a playback URL', async () => {
    const res = await request(app)
      .get(`/api/v1/videos/${videoId}/playback-url`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect([403]).toContain(res.status);
  });

  it('path traversal in a stored videoUrl is blocked at the stream endpoint', async () => {
    const evil = await prisma.video.create({
      data: { teacherId, status: 'READY', videoUrl: '/uploads/../.env' },
    });
    cleanupVideoIds.push(evil.id);

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        titleEn: 'Traversal lesson',
        titleAr: 'درس',
        orderIndex: 2,
        videoId: evil.id,
      },
    });
    traversalLessonId = lesson.id;

    const res = await request(app)
      .get(`/api/v1/videos/${evil.id}/playback-url`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(404);
    const token = jwt.sign({ videoId: evil.id, userId: studentId, purpose: 'stream' }, VIDEO_STREAM_SECRET, { expiresIn: '120s' });

    const streamRes = await request(app)
      .get(`/api/v1/videos/${evil.id}/stream?token=${encodeURIComponent(token)}`);

    // Either the storage guard or missing-file handling kicks in - but the
    // response must never leak file contents outside uploads/.
    expect(streamRes.status).toBe(404);
    expect(streamRes.text).not.toContain('DATABASE_URL');
  });

  it('rejects unrelated private objects at authoring, signing and local delivery', async () => {
    const privateDir = path.join(process.cwd(), 'uploads', 'submission-files');
    const privateName = `${randomUUID()}.pdf`;
    fs.mkdirSync(privateDir, { recursive: true });
    fs.writeFileSync(path.join(privateDir, privateName), '%PDF-1.7 private student work');
    try {
      for (const videoUrl of [`submission-files/${privateName}`, `/uploads/submission-files/${privateName}`]) {
        const attached = await request(app).post(`/api/v1/courses/lessons/${lessonId}/video`).set('Authorization', `Bearer ${teacherToken}`).send({ videoUrl });
        expect(attached.status).toBe(400);
        const forged = await prisma.video.create({ data: { teacherId, status: 'READY', videoUrl } });
        cleanupVideoIds.push(forged.id);
        const granted = await request(app).get(`/api/v1/videos/${forged.id}/playback-url`).set('Authorization', `Bearer ${teacherToken}`);
        expect(granted.status).toBe(404);
        const token = jwt.sign({ videoId: forged.id, userId: teacherId, purpose: 'stream' }, VIDEO_STREAM_SECRET, { expiresIn: '120s' });
        const streamed = await request(app).get(`/api/v1/videos/${forged.id}/stream?token=${token}`);
        expect([400, 404]).toContain(streamed.status);
        expect(streamed.text).not.toContain('private student work');
      }
    } finally { fs.unlinkSync(path.join(privateDir, privateName)); }
  });
});
