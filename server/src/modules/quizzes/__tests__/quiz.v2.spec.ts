import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Role, TeacherStatus } from '@prisma/client';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

/**
 * Regression tests for the Quiz Engine v2:
 * - 5 question types with per-type validation
 * - timed attempts (start -> submit within limit)
 * - multi-select / short-answer grading
 * - essay questions route attempts to AWAITING_REVIEW
 * - owner-only quiz editing
 */

describe('Quiz Engine v2', () => {
  let teacherAToken: string;
  let teacherBToken: string;
  let studentToken: string;
  let teacherAId: string;
  let teacherBId: string;
  let studentId: string;
  let subjectId: string;
  let courseId: string;
  let moduleId: string;
  let lessonId: string;
  let quizId: string;

  beforeAll(async () => {
    const ts = Date.now();

    const [teacherA, teacherB, student, subject] = await Promise.all([
      prisma.user.create({
        data: {
          email: `quiz2-ta-${ts}@edu.com`,
          password: 'pass',
          name: 'Quiz2 Teacher A',
          role: Role.TEACHER,
          teacherStatus: TeacherStatus.APPROVED,
        },
      }),
      prisma.user.create({
        data: {
          email: `quiz2-tb-${ts}@edu.com`,
          password: 'pass',
          name: 'Quiz2 Teacher B',
          role: Role.TEACHER,
          teacherStatus: TeacherStatus.APPROVED,
        },
      }),
      prisma.user.create({
        data: { email: `quiz2-st-${ts}@edu.com`, password: 'pass', name: 'Quiz2 Student', role: Role.STUDENT },
      }),
      prisma.subject.create({ data: { nameEn: `Quiz2Subject-${ts}`, nameAr: 'مادة' } }),
    ]);

    teacherAId = teacherA.id;
    teacherBId = teacherB.id;
    studentId = student.id;
    subjectId = subject.id;

    const mk = (id: string, name: string) =>
      generateAccessToken({ userId: id, role: name === 'a' ? Role.TEACHER : name === 'b' ? Role.TEACHER : Role.STUDENT, teacherStatus: name === 's' ? undefined : TeacherStatus.APPROVED });
    teacherAToken = mk(teacherAId, 'a');
    teacherBToken = mk(teacherBId, 'b');
    studentToken = mk(studentId, 's');

    const course = await prisma.course.create({
      data: {
        titleEn: `QUIZ2-COURSE-${ts}`,
        titleAr: 'دورة',
        description: 'Anchor course for quiz v2 tests',
        teacherId: teacherAId,
        subjectId,
      },
    });
    courseId = course.id;

    const mod = await prisma.courseModule.create({
      data: { courseId, titleEn: 'Mod', titleAr: 'وحدة' },
    });
    moduleId = mod.id;

    // Enroll the student in the course (learning-access gate requires an
    // active entitlement for course-attached quizzes).
    await prisma.entitlement.create({
      data: {
        studentId,
        resourceType: 'COURSE',
        resourceId: courseId,
        status: 'ACTIVE',
        sourceType: 'ADMIN_GRANT',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.entitlement.deleteMany({ where: { studentId } });
      await prisma.course.deleteMany({ where: { subjectId } });
      await prisma.quiz.deleteMany({ where: { id: quizId } }).catch(() => undefined);
      await prisma.subject.deleteMany({ where: { id: subjectId } });
      await prisma.user.deleteMany({ where: { id: { in: [teacherAId, teacherBId, studentId] } } });
    } catch (e) {
      // best-effort cleanup
    }
  });

  const v2Payload = () => ({
    titleEn: 'Science Check v2',
    titleAr: 'اختبار علوم',
    passingScore: 50,
    maxAttempts: 3,
    timeLimit: 5, // minutes
    questions: [
      {
        questionText: 'Water formula?',
        type: 'MCQ',
        points: 10,
        options: [
          { text: 'H2O', isCorrect: true },
          { text: 'CO2', isCorrect: false },
        ],
      },
      {
        questionText: 'Select all prime numbers',
        type: 'MULTIPLE_SELECT',
        points: 10,
        options: [
          { text: '2', isCorrect: true },
          { text: '3', isCorrect: true },
          { text: '4', isCorrect: false },
        ],
      },
      {
        questionText: 'Capital of France?',
        type: 'SHORT_ANSWER',
        points: 5,
        correctAnswer: 'paris',
      },
      {
        questionText: 'Explain photosynthesis.',
        type: 'ESSAY',
        points: 15,
      },
    ],
  });

  it('teacher creates a quiz covering all 5 supported types (T/F validated too)', async () => {
    // TRUE_FALSE wrong shape is rejected first
    await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${teacherAToken}`)
      .send({
        titleEn: 'Bad TF',
        titleAr: 'خطأ',
        questions: [
          {
            questionText: 'Sky is blue',
            type: 'TRUE_FALSE',
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: false },
              { text: 'Maybe', isCorrect: false },
            ],
          },
        ],
      })
      .expect((res) => expect([400]).toContain(res.status));

    const res = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${teacherAToken}`)
      .send(v2Payload());

    expect(res.status).toBe(201);
    expect(res.body.data.questions).toHaveLength(4);
    quizId = res.body.data.id;

    // Anchor the quiz to a lesson for the ownership tests
    const lessonRes = await request(app)
      .post(`/api/v1/courses/modules/${moduleId}/lessons`)
      .set('Authorization', `Bearer ${teacherAToken}`)
      .send({ titleEn: 'Quiz2 Lesson', titleAr: 'درس' });
    lessonId = lessonRes.body.data.id;

    await prisma.lesson.update({ where: { id: lessonId }, data: { quizId } });
  });

  it('rejects an MCQ with more than one correct answer', async () => {
    const res = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${teacherAToken}`)
      .send({
        titleEn: 'Bad MCQ',
        titleAr: 'خطأ',
        questions: [
          {
            questionText: 'Pick one',
            type: 'MCQ',
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: true },
            ],
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/exactly one correct/i);
  });

  it('timed attempt: start -> submit correct answers -> graded incl. multi-select and short answer; essay flags review', async () => {
    const start = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts/start`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(start.status).toBe(201);
    expect(start.body.data.status).toBe('IN_PROGRESS');

    const questions = await prisma.question.findMany({
      where: { quizId },
      orderBy: { orderIndex: 'asc' },
    });

    const [mcq, multi, short, _essay] = questions;
    void _essay;

    const submit = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          { questionId: mcq.id, selectedOptionId: (mcq.options as any[]).find((o) => o.isCorrect)!.id },
          {
            questionId: multi.id,
            selectedOptionIds: (multi.options as any[]).filter((o) => o.isCorrect).map((o) => o.id),
          },
          { questionId: short.id, textAnswer: '  PARIS ' }, // normalization check
          { questionId: _essay.id, textAnswer: 'Student essay content...' },
        ],
      });

    expect(submit.status).toBe(200);
    // Auto-gradeable: 10 + 10 + 5 of 40 total => 25/40 = 63%
    expect(submit.body.data.score).toBe(63);
    expect(submit.body.data.needsReview).toBe(true);

    const attempt = await prisma.quizAttempt.findFirst({ where: { quizId, userId: studentId } });
    expect(attempt?.status).toBe('AWAITING_REVIEW');
  });

  it('expired timed attempt is recorded and further submissions are blocked without a fresh start', async () => {
    // Start a second attempt, then backdate it beyond the 5-minute limit.
    await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts/start`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(201);

    const open = await prisma.quizAttempt.findFirst({
      where: { quizId, userId: studentId, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
    });
    await prisma.quizAttempt.update({
      where: { id: open!.id },
      data: { startedAt: new Date(Date.now() - 10 * 60_000) },
    });

    const submit = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId: 'any', textAnswer: 'late' }] });

    expect(submit.status).toBe(400);
    expect(submit.body.message).toMatch(/time limit.*exceeded/i);
  });

  it('owning teacher can replace quiz definition and questions via PATCH', async () => {
    const res = await request(app)
      .patch(`/api/v1/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${teacherAToken}`)
      .send({
        passingScore: 80,
        maxAttempts: 5,
        questions: [
          {
            questionText: 'Only question now',
            type: 'TRUE_FALSE',
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: false },
            ],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.passingScore).toBe(80);
    expect(res.body.data.maxAttempts).toBe(5);
    expect(res.body.data.questions).toHaveLength(1);

    const count = await prisma.question.count({ where: { quizId } });
    expect(count).toBe(1);
  });

  it('another teacher cannot edit a foreign quiz', async () => {
    const res = await request(app)
      .patch(`/api/v1/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${teacherBToken}`)
      .send({ passingScore: 1 });

    expect(res.status).toBe(403);
  });
});
