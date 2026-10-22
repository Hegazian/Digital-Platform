import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

/**
 * Curated collections management (Phase U3):
 * PREVIOUS STATE: controller faked responses with in-memory mocks on any DB
 * error and only create/list-published existed. Now full admin CRUD with
 * atomic course membership and strict permissions.
 */
describe('Collections Admin Management', () => {
  const ts = Date.now();
  let adminToken: string;
  let studentToken: string;
  let teacherToken: string;
  const cleanup = {
    userIds: [] as string[],
    collectionIds: [] as string[],
    courseIds: [] as string[],
    subjectIds: [] as string[],
    productIds: [] as string[],
  };

  beforeAll(async () => {
    const bcrypt = await import('bcrypt');
    async function makeUser(email: string, role: 'ADMIN' | 'STUDENT' | 'TEACHER') {
      return prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash('Password123!', 10),
          name: email.split('@')[0],
          role,
          isActive: true,
          ...(role === 'TEACHER' ? { teacherStatus: 'APPROVED' } : {}),
        },
      });
    }

    const admin = await makeUser(`coll-admin-${ts}@test.com`, 'ADMIN');
    const student = await makeUser(`coll-student-${ts}@test.com`, 'STUDENT');
    const teacher = await makeUser(`coll-teacher-${ts}@test.com`, 'TEACHER');
    cleanup.userIds.push(admin.id, student.id, teacher.id);

    adminToken = generateAccessToken({ userId: admin.id, role: 'ADMIN' });
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });
    teacherToken = generateAccessToken({ userId: teacher.id, role: 'TEACHER' });

    // Two published courses to curate
    const subject = await prisma.subject.create({
      data: { nameEn: `Coll Subject ${ts}`, nameAr: 'مادة' },
    });
    cleanup.subjectIds.push(subject.id);

    for (let i = 0; i < 2; i++) {
      const course = await prisma.course.create({
        data: {
          titleEn: `Coll Course ${i} ${ts}`,
          titleAr: `دورة ${i}`,
          description: 'collection fixture',
          teacherId: teacher.id,
          subjectId: subject.id,
          status: 'PUBLISHED',
          isPublished: true,
        },
      });
      cleanup.courseIds.push(course.id);
    }
  });

  afterAll(async () => {
    try {
      await prisma.collection.deleteMany({
        where: { id: { in: cleanup.collectionIds } },
      });
      await prisma.product.deleteMany({ where: { id: { in: cleanup.productIds } } }).catch(() => undefined);
      await prisma.course.deleteMany({ where: { id: { in: cleanup.courseIds } } });
      await prisma.subject.deleteMany({ where: { id: { in: cleanup.subjectIds } } });
      await prisma.refreshToken
        .deleteMany({ where: { userId: { in: cleanup.userIds } } })
        .catch(() => undefined);
      await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
    } catch {}
  });

  it('admin creates a collection; students/teachers cannot', async () => {
    const asStudent = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ titleEn: 'Nope', titleAr: 'لا', slug: `nope-${ts}` });
    expect(asStudent.status).toBe(403);

    const asTeacher = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ titleEn: 'Nope Teacher', titleAr: 'لا', slug: `nope-t-${ts}` });
    expect(asTeacher.status).toBe(403);

    const res = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        titleEn: `Career Starters ${ts}`,
        titleAr: 'بدايات مهنية',
        slug: `career-starters-${ts}`,
        description: 'First steps into your future',
        isPublished: false,
      });
    expect(res.status).toBe(201);
    cleanup.collectionIds.push(res.body.data.id);
  });

  it('invalid slugs are rejected by validation', async () => {
    const res = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ titleEn: 'Bad Slug', titleAr: 'سيء', slug: 'Not Kebab!' });
    expect(res.status).toBe(400);
  });

  it('public list hides unpublished; admin sees all with includeUnpublished', async () => {
    const pub = await request(app).get('/api/v1/collections');
    expect(pub.status).toBe(200);
    expect(pub.body.data.some((c: any) => c.slug === `career-starters-${ts}`)).toBe(false);

    const adminList = await request(app)
      .get('/api/v1/collections?includeUnpublished=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(
      adminList.body.data.some((c: any) => c.slug === `career-starters-${ts}`)
    ).toBe(true);
  });

  it('admin replaces course membership atomically; unknown ids rejected', async () => {
    const id = cleanup.collectionIds[0];

    const badCourseId = await request(app)
      .put(`/api/v1/collections/${id}/courses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseIds: [cleanup.courseIds[0], '00000000-0000-4000-8000-000000000000'] });
    expect(badCourseId.status).toBe(400);

    const set = await request(app)
      .put(`/api/v1/collections/${id}/courses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseIds: [cleanup.courseIds[1], cleanup.courseIds[0]] });
    expect(set.status).toBe(200);

    // Order preserved + joined course data present
    const orderedTitles = set.body.data.courses.map((cc: any) => cc.course.titleEn);
    expect(orderedTitles[0]).toContain('Coll Course 1');
    expect(set.body.data.courses[0].course.teacher?.name).toBeTruthy();

    // Replace again -> exactly the new set (no leftovers)
    const set2 = await request(app)
      .put(`/api/v1/collections/${id}/courses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseIds: [cleanup.courseIds[0]] });
    expect(set2.body.data.courses.length).toBe(1);
  });

  it('admin publishes via PATCH; public GET then returns it with courses', async () => {
    const id = cleanup.collectionIds[0];

    const patch = await request(app)
      .patch(`/api/v1/collections/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isPublished: true, description: 'Updated description' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.isPublished).toBe(true);

    const pubGet = await request(app).get(`/api/v1/collections/${id}`);
    expect(pubGet.status).toBe(200);
    expect(pubGet.body.data.description).toBe('Updated description');
    expect(pubGet.body.data.courses.length).toBe(1);

    const deleteAsStudent = await request(app)
      .delete(`/api/v1/collections/${id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(deleteAsStudent.status).toBe(403);

    const del = await request(app)
      .delete(`/api/v1/collections/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    cleanup.collectionIds = [];
  });
});
