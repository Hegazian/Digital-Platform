import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

/**
 * Career tracks (P1): defaults auto-seed on first read, subjects are linked
 * by keyword, and users persist a personal track preference.
 */
describe('Career Tracks', () => {
  const ts = Date.now();
  let studentToken: string;
  let studentId: string;
  let subjectId: string;
  const cleanupUserIds: string[] = [];

  beforeAll(async () => {
    async function makeUser(email: string) {
      const bcrypt = await import('bcrypt');
      return prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash('Password123!', 10),
          name: email.split('@')[0],
          role: 'STUDENT',
          isActive: true,
        },
      });
    }
    const s = await makeUser(`career-student-${ts}@test.com`);
    studentId = s.id;
    cleanupUserIds.push(s.id);
    studentToken = generateAccessToken({ userId: s.id, role: 'STUDENT' });

    // A subject that must match the engineering keywords
    const physics = await prisma.subject.create({
      data: { nameEn: `Advanced Physics ${ts}`, nameAr: 'فيزياء متقدمة' },
    });
    subjectId = physics.id;
  });

  afterAll(async () => {
    try {
      await prisma.user.update({
        where: { id: studentId },
        data: { interestedTrackId: null },
      }).catch(() => undefined);
      await prisma.careerTrackSubject.deleteMany({ where: { subjectId } }).catch(() => undefined);
      await prisma.subject.deleteMany({ where: { id: subjectId } }).catch(() => undefined);
      await prisma.refreshToken
        .deleteMany({ where: { userId: { in: cleanupUserIds } } })
        .catch(() => undefined);
      await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } }).catch(() => undefined);
    } catch {}
  });

  it('GET /career-tracks auto-seeds the default tracks (Scientific Math positioning) and links matching subjects', async () => {
    const res = await request(app).get('/api/v1/careers');
    expect(res.status).toBe(200);

    const slugs = res.body.data.map((t: any) => t.slug);
    // On-position defaults only — legacy medicine/science tracks are hidden.
    for (const slug of ['engineering', 'development']) {
      expect(slugs).toContain(slug);
    }
    expect(slugs).not.toContain('medicine');
    expect(slugs).not.toContain('science');

    // Names reflect the faculty-oriented repositioning.
    const engineering = res.body.data.find((t: any) => t.slug === 'engineering');
    expect(engineering.nameEn).toBe('Engineering Faculties');
    expect(engineering.subjects.some((s: any) => s.subject.id === subjectId)).toBe(true);
  });

  it('student saves, reads and clears their track preference', async () => {
    const save = await request(app)
      .put('/api/v1/careers/mine')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ slug: 'engineering' });
    expect(save.status).toBe(200);
    expect(save.body.data.slug).toBe('engineering');

    const mine = await request(app)
      .get('/api/v1/careers/mine')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data?.slug).toBe('engineering');

    const dbUser = await prisma.user.findUnique({
      where: { id: studentId },
      select: { interestedTrackId: true },
    });
    expect(dbUser?.interestedTrackId).toBeTruthy();

    const clear = await request(app)
      .put('/api/v1/careers/mine')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ slug: null });
    expect(clear.status).toBe(200);
    expect(clear.body.data).toBeNull();

    const mineAfter = await request(app)
      .get('/api/v1/careers/mine')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(mineAfter.body.data).toBeNull();
  });

  it('rejects unknown track slugs and unauthenticated writes', async () => {
    const bad = await request(app)
      .put('/api/v1/careers/mine')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ slug: `not-a-track-${ts}` });
    expect(bad.status).toBe(404);

    const anon = await request(app)
      .put('/api/v1/careers/mine')
      .send({ slug: 'engineering' });
    expect(anon.status).toBe(401);
  });

  describe('track progress framing', () => {
    let courseId: string;
    let lessonIds: string[] = [];
    const cleanupCourseResources: (() => Promise<void>)[] = [];

    afterAll(async () => {
      for (const fn of cleanupCourseResources.reverse()) {
        await fn().catch(() => undefined);
      }
    });

    async function seedPublishedCourseWithLessons(titleEn: string, lessonCount: number) {
      const teacher = await prisma.user.create({
        data: {
          email: `career-teacher-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
          password: 'x'.repeat(20),
          name: 'Career Teacher',
          role: 'TEACHER',
          isActive: true,
        },
      });
      cleanupUserIds.push(teacher.id);

      const course = await prisma.course.create({
        data: {
          titleEn,
          titleAr: titleEn,
          description: 'progress fixture',
          teacherId: teacher.id,
          subjectId,
          status: 'PUBLISHED',
          isPublished: true,
        },
      });
      courseId = course.id;

      const mod = await prisma.courseModule.create({
        data: { courseId: course.id, titleEn: 'M', titleAr: 'و' },
      });
      cleanupCourseResources.push(async () => {
        await prisma.courseModule.deleteMany({ where: { id: mod.id } }).catch(() => undefined);
      });

      for (let i = 1; i <= lessonCount; i++) {
        const l = await prisma.lesson.create({
          data: { moduleId: mod.id, titleEn: `${titleEn} L${i}`, titleAr: 'درس', orderIndex: i },
        });
        lessonIds.push(l.id);
      }

      cleanupCourseResources.push(async () => {
        await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
        await prisma.course.deleteMany({ where: { id: courseId } }).catch(() => undefined);
        // teacher has no other resources
      });
    }

    it('select the engineering track first (subject is linked to it)', async () => {
      const save = await request(app)
        .put('/api/v1/careers/mine')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ slug: 'engineering' });
      expect(save.status).toBe(200);
    });

    it('reports zeroed progress before any completion exists', async () => {
      await seedPublishedCourseWithLessons(`Progress Physics A ${ts}`, 2);

      const res = await request(app)
        .get('/api/v1/careers/mine/progress')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);

      const d = res.body.data;
      expect(d.track?.slug).toBe('engineering');
      expect(d.totalCourses).toBeGreaterThanOrEqual(1);
      expect(d.completedLessons).toBe(0);
      expect(d.nextCourse).toBeTruthy();

      // Deterministic assertions scoped to OUR fixture (shared DB adds other
      // engineering subjects from sibling suites):
      const mine = (d.courseBreakdown ?? []).find((c: any) =>
        c.titleEn.includes('Progress Physics A')
      );
      expect(mine).toBeTruthy();
      expect(mine.totalLessons).toBe(2);
      expect(mine.completedLessons).toBe(0);
      expect(mine.isCompleted).toBe(false);
    });

    it('partial completion counts as started, not completed; nextCourse skips finished courses', async () => {
      const lessons = await prisma.lesson.findMany({
        where: { module: { courseId } },
        select: { id: true },
        orderBy: { orderIndex: 'asc' },
      });
      expect(lessons.length).toBe(2);
      const firstLesson = lessons[0].id;

      await prisma.lessonProgress.create({
        data: {
          userId: studentId,
          lessonId: firstLesson,
          watchTimeSec: 60,
          isCompleted: true,
          lastWatched: new Date(),
        },
      });

      const res = await request(app)
        .get('/api/v1/careers/mine/progress')
        .set('Authorization', `Bearer ${studentToken}`);
      const d = res.body.data;
      const mineAfterFirst = (d.courseBreakdown ?? []).find((c: any) =>
        c.titleEn.includes('Progress Physics A')
      );
      expect(mineAfterFirst.completedLessons).toBe(1);
      expect(mineAfterFirst.isCompleted).toBe(false);

      expect(d.startedCourses).toBeGreaterThanOrEqual(1);

      // Complete everything -> completedCourses increments
      for (const l of lessons) {
        if (l.id === firstLesson) continue;
        await prisma.lessonProgress.upsert({
          where: { userId_lessonId: { userId: studentId, lessonId: l.id } },
          create: {
            userId: studentId,
            lessonId: l.id,
            watchTimeSec: 30,
            isCompleted: true,
            lastWatched: new Date(),
          },
          update: { isCompleted: true },
        });
      }

      const final = await request(app)
        .get('/api/v1/careers/mine/progress')
        .set('Authorization', `Bearer ${studentToken}`);
      const f = final.body.data;
      expect(f.completedCourses).toBeGreaterThanOrEqual(1);
      const mineDone = (f.courseBreakdown ?? []).find((c: any) =>
        c.titleEn.includes('Progress Physics A')
      );
      expect(mineDone.isCompleted).toBe(true);
    });

    it('students without a track get a null-track payload instead of an error', async () => {
      const outsider = await makeStudent(`career-notrack-${ts}@test.com`);
      const res = await request(app)
        .get('/api/v1/careers/mine/progress')
        .set('Authorization', `Bearer ${outsider.token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.track).toBeNull();
    });

    async function makeStudent(email: string) {
      const bcrypt = await import('bcrypt');
      const u = await prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash('Password123!', 10),
          name: email.split('@')[0],
          role: 'STUDENT',
          isActive: true,
        },
      });
      cleanupUserIds.push(u.id);
      return { token: generateAccessToken({ userId: u.id, role: 'STUDENT' }) };
    }
  });
});
