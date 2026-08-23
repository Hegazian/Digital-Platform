import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

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
    const uploadDir = path.join(process.cwd(), 'uploads', 'lesson-videos');
    fs.mkdirSync(uploadDir, { recursive: true });
    tempFilePath = path.join(uploadDir, `pipeline-${ts}.mp4`);
    fs.writeFileSync(tempFilePath, FIXTURE_BYTES);

    const video = await prisma.video.create({
      data: {
        teacherId,
        status: 'READY',
        durationSec: 60,
        videoUrl: `/uploads/lesson-videos/pipeline-${ts}.mp4`,
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
    const token = (res.body.data?.playbackUrl ?? '').split('token=')[1] ?? '';

    const streamRes = await request(app)
      .get(`/api/v1/videos/${evil.id}/stream?token=${encodeURIComponent(token)}`);

    // Either the storage guard or missing-file handling kicks in - but the
    // response must never leak file contents outside uploads/.
    expect([400, 403]).toContain(streamRes.status);
    expect(streamRes.text).not.toContain('DATABASE_URL');
  });
});
