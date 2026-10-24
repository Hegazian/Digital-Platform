import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import { StorageService } from '../../../utils/storage';

describe('Assignment and document delivery HTTP regressions', () => {
  const runId = randomUUID();
  const pdf = Buffer.from('%PDF-1.7\nUploaded student answer\n%%EOF');
  const users: string[] = [];
  const uploads: string[] = [];
  let courseId: string, subjectId: string, lessonId: string, assignmentId: string;
  let teacherToken: string, studentToken: string, otherToken: string, outsiderToken: string;
  let uploaded: any, submissionId: string, contentUrl: string;

  beforeAll(async () => {
    const tokens: string[] = [];
    for (const [index, role] of ['TEACHER', 'STUDENT', 'STUDENT', 'STUDENT'].entries()) {
      const user = await prisma.user.create({ data: {
        email: `assignment-http-${runId}-${index}@test.invalid`, name: 'HTTP fixture', password: 'unused',
        role: role as 'TEACHER' | 'STUDENT', teacherStatus: role === 'TEACHER' ? 'APPROVED' : null,
      } });
      users.push(user.id);
      tokens.push(generateAccessToken({ userId: user.id, role: user.role, authVersion: user.authVersion }));
    }
    [teacherToken, studentToken, otherToken, outsiderToken] = tokens;
    const subject = await prisma.subject.create({ data: { nameEn: `HTTP ${runId}`, nameAr: 'اختبار' } });
    subjectId = subject.id;
    const course = await prisma.course.create({ data: {
      teacherId: users[0], subjectId, titleEn: 'File delivery fixture', titleAr: 'اختبار الملفات', description: 'M0 regression fixture', status: 'PUBLISHED', isPublished: true, isFree: true,
    } });
    courseId = course.id;
    const module = await prisma.courseModule.create({ data: { courseId, titleEn: 'Unit', titleAr: 'وحدة' } });
    const lesson = await prisma.lesson.create({ data: { moduleId: module.id, titleEn: 'Lesson', titleAr: 'درس', orderIndex: 0 } });
    lessonId = lesson.id;
    for (const studentId of users.slice(1, 3)) await prisma.entitlement.create({ data: {
      studentId, resourceId: courseId, resourceType: 'COURSE', sourceType: 'ADMIN_GRANT', status: 'ACTIVE',
    } });
    const assignment = await prisma.assignment.create({ data: { lessonId, createdById: users[0], titleEn: 'Homework', titleAr: 'واجب', maxAttempts: 5 } });
    assignmentId = assignment.id;
  });

  afterAll(async () => {
    for (const upload of uploads) await StorageService.deleteFile(upload);
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    if (subjectId) await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.entitlement.deleteMany({ where: { studentId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it('reads and updates assignments through unbound Express callbacks', async () => {
    const detail = await request(app).get(`/api/v1/assignments/${assignmentId}`).auth(studentToken, { type: 'bearer' });
    expect(detail.status).toBe(200);
    const list = await request(app).get(`/api/v1/assignments/lesson/${lessonId}`).auth(studentToken, { type: 'bearer' });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    const update = await request(app).patch(`/api/v1/assignments/${assignmentId}`).auth(teacherToken, { type: 'bearer' }).send({ titleEn: 'Updated homework' });
    expect(update.status).toBe(200);
    expect(update.body.data.titleEn).toBe('Updated homework');
  });

  it('blocks assignment metadata reads and lesson enumeration for an unenrolled student', async () => {
    expect((await request(app).get(`/api/v1/assignments/${assignmentId}`).auth(outsiderToken, { type: 'bearer' })).status).toBe(403);
    expect((await request(app).get(`/api/v1/assignments/lesson/${lessonId}`).auth(outsiderToken, { type: 'bearer' })).status).toBe(403);
  });

  it('accepts a real upload through both schema and service validation', async () => {
    const upload = await request(app).post('/api/v1/assignments/uploads').auth(studentToken, { type: 'bearer' }).attach('file', pdf, { filename: 'إجابة.pdf', contentType: 'application/pdf' });
    expect(upload.status).toBe(201);
    uploaded = upload.body.data;
    uploads.push(uploaded.fileUrl);
    expect(uploaded.uploadToken).toEqual(expect.any(String));
    const result = await request(app).post(`/api/v1/assignments/${assignmentId}/submit`).auth(studentToken, { type: 'bearer' }).send({ files: [uploaded] });
    expect(result.status).toBe(201);
    submissionId = result.body.data.id;
    contentUrl = result.body.data.files[0].fileUrl;
    expect(contentUrl).toMatch(/^\/api\/v1\/assignments\/submission-files\/[^/]+\/content$/);
    expect(JSON.stringify(result.body)).not.toContain(uploaded.fileUrl);
  });

  it('rejects another student reusing an upload and rejects traversal references', async () => {
    const other = await request(app).post(`/api/v1/assignments/${assignmentId}/submit`).auth(otherToken, { type: 'bearer' }).send({ files: [uploaded] });
    expect(other.status).toBe(400);
    const traversal = await request(app).post(`/api/v1/assignments/${assignmentId}/submit`).auth(studentToken, { type: 'bearer' }).send({ files: [{ ...uploaded, fileUrl: '/uploads/submission-files/../private.txt' }] });
    expect(traversal.status).toBe(400);
    expect(await prisma.assignmentSubmission.count({ where: { assignmentId } })).toBe(1);
  });

  it('protects submission bytes while allowing the student and assigned grader', async () => {
    expect((await request(app).get(contentUrl)).status).toBe(401);
    expect((await request(app).get(contentUrl).auth(otherToken, { type: 'bearer' })).status).toBe(403);
    for (const token of [studentToken, teacherToken]) {
      const response = await request(app).get(contentUrl).auth(token, { type: 'bearer' });
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toContain('no-store');
      expect(Buffer.from(response.body)).toEqual(pdf);
    }
    const graded = await request(app).post(`/api/v1/assignments/submissions/${submissionId}/grade`).auth(teacherToken, { type: 'bearer' }).send({ score: 80 });
    expect(graded.status).toBe(200);
    expect(graded.body.data.files[0].fileUrl).toBe(contentUrl);
  });

  it('delivers managed material bytes with Bearer auth and rejects cross-account access', async () => {
    const upload = await request(app).post('/api/v1/materials/upload').auth(teacherToken, { type: 'bearer' })
      .field('lessonId', lessonId).field('title', 'Study PDF').attach('file', pdf, { filename: 'study.pdf', contentType: 'application/pdf' });
    expect(upload.status).toBe(201);
    const stored = await prisma.material.findUniqueOrThrow({ where: { id: upload.body.data.id } });
    uploads.push(stored.fileUrl);
    const url = upload.body.data.fileUrl;
    expect((await request(app).get(url)).status).toBe(401);
    expect((await request(app).get(url).auth(outsiderToken, { type: 'bearer' })).status).toBe(403);
    const response = await request(app).get(url).auth(studentToken, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(Buffer.from(response.body)).toEqual(pdf);
  });
});
