import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';

/**
 * Dynamic subjects (product decision):
 * - approved teachers may create subjects themselves
 * - course creation accepts a free-form subjectName that is find-or-created
 * - repeating the same name collapses onto the existing subject
 */
describe('Dynamic Subject Creation & Course Linkage', () => {
  const ts = Date.now();
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  const cleanup = {
    userIds: [] as string[],
    courseIds: [] as string[],
    productIds: [] as string[],
    subjectIds: new Set<string>(),
  };

  beforeAll(async () => {
    async function makeUser(email: string, role: 'TEACHER' | 'STUDENT', extra: object = {}) {
      const bcrypt = await import('bcrypt');
      const user = await prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash('Password123!', 10),
          name: email.split('@')[0],
          role,
          isActive: true,
          ...extra,
        },
      });
      cleanup.userIds.push(user.id);
      return user;
    }

    const teacher = await makeUser(`dynsub-teacher-${ts}@test.com`, 'TEACHER', {
      teacherStatus: 'APPROVED',
    });
    const student = await makeUser(`dynsub-student-${ts}@test.com`, 'STUDENT');
    teacherId = teacher.id;

    teacherToken = (
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `dynsub-teacher-${ts}@test.com`, password: 'Password123!' })
    ).body.data.tokens.accessToken;

    studentToken = (
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `dynsub-student-${ts}@test.com`, password: 'Password123!' })
    ).body.data.tokens.accessToken;
  });

  afterAll(async () => {
    try {
      await prisma.product.deleteMany({ where: { id: { in: cleanup.productIds } } });
      await prisma.course.deleteMany({ where: { id: { in: cleanup.courseIds } } });
      await prisma.subject.deleteMany({ where: { id: { in: [...cleanup.subjectIds].filter(Boolean) } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: cleanup.userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
    } catch {}
  });

  it('approved teacher can create a subject; students cannot', async () => {
    const asStudent = await request(app)
      .post('/api/v1/subjects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ nameEn: `Forbidden Sub ${ts}`, nameAr: 'ممنوع' });
    expect(asStudent.status).toBe(403);

    const res = await request(app)
      .post('/api/v1/subjects')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ nameEn: `Teacher-Made Subject ${ts}`, nameAr: 'مادة من المعلم' });
    expect(res.status).toBe(201);
    cleanup.subjectIds.add(res.body.data.id);
  });

  it('course creation with a NEW subjectName auto-creates the subject', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: `Quantum Course ${ts}`,
        titleAr: 'دورة كوانتم',
        description: 'Course created with an invented subject name',
        subjectName: `Quantum Physics ${ts}`,
        isFree: true,
      });
    expect(res.status).toBe(201);
    cleanup.courseIds.push(res.body.data.id);

    const subject = await prisma.subject.findFirst({
      where: { nameEn: { equals: `quantum physics ${ts}`, mode: 'insensitive' } },
    });
    expect(subject).toBeTruthy();
    if (subject) cleanup.subjectIds.add(subject.id);

    const course = await prisma.course.findUnique({ where: { id: res.body.data.id } });
    expect(course?.subjectId).toBe(subject?.id);
  });

  it('reusing the same subjectName does NOT duplicate the subject', async () => {
    const before = await prisma.subject.count({
      where: { nameEn: { equals: `quantum physics ${ts}`, mode: 'insensitive' } },
    });

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: `Second Quantum Course ${ts}`,
        titleAr: 'دورة ثانية',
        description: 'Same subject name reused',
        subjectName: `quantum PHYSICS ${ts}`, // case differs on purpose
        priceEgp: 99,
        priceUsd: 5,
      });
    expect(res.status).toBe(201);
    cleanup.courseIds.push(res.body.data.id);

    const after = await prisma.subject.count({
      where: { nameEn: { equals: `quantum physics ${ts}`, mode: 'insensitive' } },
    });
    expect(after).toBe(before);

    // Both courses point at the SAME subject
    const c2 = await prisma.course.findUnique({ where: { id: res.body.data.id } });
    const firstCourse = await prisma.course.findUnique({ where: { id: cleanup.courseIds[0] } });
    expect(c2?.subjectId).toBe(firstCourse?.subjectId);

    const products = await prisma.product.findMany({
      where: { productType: 'COURSE', resourceId: res.body.data.id },
    });
    products.forEach((p) => cleanup.productIds.push(p.id));
  });

  it('course creation without any subject info is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: `Orphan Course ${ts}`,
        titleAr: 'دورة يتيمة',
        description: 'No subject provided anywhere',
      });
    expect(res.status).toBe(400);
  });

  it('editing a course with a new subjectName moves it to that subject', async () => {
    const create = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: `Movable Course ${ts}`,
        titleAr: 'دورة قابلة للنقل',
        description: 'Will be moved to another subject',
        subjectName: `Original Subject ${ts}`,
        isFree: true,
      });
    expect(create.status).toBe(201);
    cleanup.courseIds.push(create.body.data.id);

    const move = await request(app)
      .patch(`/api/v1/courses/${create.body.data.id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ subjectName: `Destination Subject ${ts}` });
    expect(move.status).toBe(200);

    const dest = await prisma.subject.findFirst({
      where: { nameEn: { equals: `destination subject ${ts}`, mode: 'insensitive' } },
    });
    cleanup.subjectIds.add(dest?.id ?? '');
    const moved = await prisma.course.findUnique({ where: { id: create.body.data.id } });
    expect(moved?.subjectId).toBe(dest?.id);
  });
});
