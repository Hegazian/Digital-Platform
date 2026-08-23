import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Role, TeacherStatus } from '@prisma/client';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

/**
 * Regression tests for course read gating & answer-key sanitization.
 * Guards against reintroduction of:
 *  - public access to DRAFT/UNDER_REVIEW/REJECTED curricula
 *  - leaking quiz correct answers (isCorrect) to non-managers
 */

describe('Course Read Visibility & Answer Sanitization', () => {
  let teacherAToken: string;
  let teacherBToken: string;
  let studentToken: string;
  let teacherAId: string;
  let teacherBId: string;
  let studentId: string;
  let subjectId: string;
  let draftCourseId: string;
  let publishedCourseId: string;

  const seedCurriculum = async (courseId: string, marker: string) => {
    const mod = await prisma.courseModule.create({
      data: { courseId, titleEn: `Module ${marker}`, titleAr: `وحدة ${marker}` },
    });
    const quiz = await prisma.quiz.create({
      data: {
        titleEn: `Quiz ${marker}`,
        titleAr: `اختبار ${marker}`,
        passingScore: 50,
        maxAttempts: 2,
      },
    });
    await prisma.question.create({
      data: {
        quizId: quiz.id,
        questionText: `What is ${marker}?`,
        orderIndex: 1,
        points: 5,
        explanation: 'Secret explanation',
        options: [
          { id: 'opt1', text: 'Wrong', isCorrect: false },
          { id: 'opt2', text: 'Right', isCorrect: true },
        ],
      },
    });
    await prisma.lesson.create({
      data: { moduleId: mod.id, titleEn: `Lesson ${marker}`, titleAr: `درس ${marker}`, quizId: quiz.id },
    });
  };

  beforeAll(async () => {
    const ts = Date.now();

    const [teacherA, teacherB, student, subject] = await Promise.all([
      prisma.user.create({
        data: {
          email: `vis-ta-${ts}@edu.com`,
          password: 'pass',
          name: 'Vis Teacher A',
          role: Role.TEACHER,
          teacherStatus: TeacherStatus.APPROVED,
        },
      }),
      prisma.user.create({
        data: {
          email: `vis-tb-${ts}@edu.com`,
          password: 'pass',
          name: 'Vis Teacher B',
          role: Role.TEACHER,
          teacherStatus: TeacherStatus.APPROVED,
        },
      }),
      prisma.user.create({
        data: { email: `vis-st-${ts}@edu.com`, password: 'pass', name: 'Vis Student', role: Role.STUDENT },
      }),
      prisma.subject.create({ data: { nameEn: `VisibilitySubject-${ts}`, nameAr: 'مادة' } }),
    ]);

    teacherAId = teacherA.id;
    teacherBId = teacherB.id;
    studentId = student.id;
    subjectId = subject.id;

    teacherAToken = generateAccessToken({
      userId: teacherA.id,
      role: Role.TEACHER,
      teacherStatus: TeacherStatus.APPROVED,
    });
    teacherBToken = generateAccessToken({
      userId: teacherB.id,
      role: Role.TEACHER,
      teacherStatus: TeacherStatus.APPROVED,
    });
    studentToken = generateAccessToken({ userId: student.id, role: Role.STUDENT });

    const draft = await prisma.course.create({
      data: {
        titleEn: `VIS-DRAFT-${ts}`,
        titleAr: 'مسودة',
        description: 'Unpublished course must never leak publicly',
        teacherId: teacherAId,
        subjectId,
      },
    });
    draftCourseId = draft.id;

    const pub = await prisma.course.create({
      data: {
        titleEn: `VIS-PUB-${ts}`,
        titleAr: 'منشور',
        description: 'Published course for catalog browsing',
        teacherId: teacherAId,
        subjectId,
        status: 'PUBLISHED',
        isPublished: true,
      },
    });
    publishedCourseId = pub.id;

    await seedCurriculum(draftCourseId, 'Draft');
    await seedCurriculum(publishedCourseId, 'Pub');
  }, 150_000);

  afterAll(async () => {
    try {
      await prisma.course.deleteMany({ where: { subjectId } });
      await prisma.subject.deleteMany({ where: { id: subjectId } });
      await prisma.user.deleteMany({ where: { id: { in: [teacherAId, teacherBId, studentId] } } });
    } catch (e) {
      // best-effort cleanup
    }
  });

  const collectAnswerFlags = (payload: any): boolean => {
    const found: any[] = [];
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      if ('isCorrect' in node) found.push(node);
      Object.values(node).forEach(walk);
    };
    walk(payload);
    return found.length > 0;
  };

  it('anonymous GET /courses returns published courses only, without answer keys', async () => {
    const res = await request(app).get('/api/v1/courses');

    expect(res.status).toBe(200);
    const titles: string[] = res.body.data.courses.map((c: any) => c.titleEn);
    expect(titles.some((t) => t.includes('VIS-DRAFT'))).toBe(false);
    expect(titles.some((t) => t.includes('VIS-PUB'))).toBe(true);
    expect(collectAnswerFlags(res.body)).toBe(false);
  });

  it('anonymous GET /courses/:id on a draft returns 404', async () => {
    const res = await request(app).get(`/api/v1/courses/${draftCourseId}`);
    expect(res.status).toBe(404);
  });

  it('anonymous GET /courses/:id on a published course strips isCorrect and explanation', async () => {
    const res = await request(app).get(`/api/v1/courses/${publishedCourseId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');
    expect(res.body.data.modules[0].lessons[0].quiz.questions[0].options.some((o: any) => o.text === 'Right')).toBe(true);
    expect(collectAnswerFlags(res.body)).toBe(false);
    expect(res.body.data.modules[0].lessons[0].quiz.questions[0].explanation).toBeNull();
  });

  it('teacher portal (my-courses) lists the owning teacher DRAFT courses', async () => {
    // Regression: getTeacherCourses previously dropped req.user, so
    // getAllCourses treated the call as anonymous and hid every draft -
    // newly created courses never appeared in the teacher portal.
    const list = await request(app)
      .get('/api/v1/courses/teacher/my-courses')
      .set('Authorization', `Bearer ${teacherAToken}`);

    expect(list.status).toBe(200);
    const titles: string[] = (list.body.data ?? []).map((c: any) => c.titleEn);
    expect(titles.some((t) => t.includes('VIS-DRAFT'))).toBe(true);

    // Teacher B's list must still exclude foreign drafts:
    const other = await request(app)
      .get('/api/v1/courses/teacher/my-courses')
      .set('Authorization', `Bearer ${teacherBToken}`);
    expect(other.status).toBe(200);
    const otherTitles: string[] = (other.body.data ?? []).map((c: any) => c.titleEn);
    expect(otherTitles.some((t) => t.includes('VIS-DRAFT'))).toBe(false);
  });

  it('owning teacher can read own draft in full, including answer keys', async () => {    const res = await request(app)
      .get(`/api/v1/courses/${draftCourseId}`)
      .set('Authorization', `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    expect(collectAnswerFlags(res.body)).toBe(true);
  });

  it('another teacher cannot read a foreign draft and sees only published + own in list', async () => {
    const detail = await request(app)
      .get(`/api/v1/courses/${draftCourseId}`)
      .set('Authorization', `Bearer ${teacherBToken}`);
    expect(detail.status).toBe(404);

    const list = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${teacherBToken}`);
    expect(list.status).toBe(200);
    const titles: string[] = list.body.data.courses.map((c: any) => c.titleEn);
    expect(titles.some((t) => t.includes('VIS-DRAFT'))).toBe(false);
    expect(titles.some((t) => t.includes('VIS-PUB'))).toBe(true);
  });

  it('student cannot enumerate drafts via status/isPublished query params', async () => {
    const res = await request(app)
      .get('/api/v1/courses?status=DRAFT&isPublished=false')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const titles: string[] = res.body.data.courses.map((c: any) => c.titleEn);
    expect(titles).not.toContain(expect.stringContaining('VIS-DRAFT'));
    expect(res.body.data.courses.every((c: any) => c.status === 'PUBLISHED')).toBe(true);
  });

  it('sections of an unpublished course are hidden from anonymous callers', async () => {
    // Add a section to the draft course
    const section = await prisma.section.create({
      data: { courseId: draftCourseId, titleEn: 'Hidden Section', titleAr: 'قسم مخفي', orderIndex: 1 },
    });

    try {
      const anon = await request(app).get(`/api/v1/courses/${draftCourseId}/sections`);
      expect(anon.status).toBe(404);

      const owner = await request(app)
        .get(`/api/v1/courses/${draftCourseId}/sections`)
        .set('Authorization', `Bearer ${teacherAToken}`);
      expect(owner.status).toBe(200);
      expect(owner.body.data.some((s: any) => s.titleEn === 'Hidden Section')).toBe(true);
    } finally {
      await prisma.section.delete({ where: { id: section.id } }).catch(() => undefined);
    }
  });
});
