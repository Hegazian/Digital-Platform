import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

/**
 * Exam engine end-to-end (Phase U3):
 * teacher authors pool -> questions -> timed assessment;
 * student starts (sanitized snapshot) -> submits -> auto-graded.
 */
describe('Assessment Lifecycle', () => {
  const ts = Date.now();
  let teacherToken: string;
  let studentToken: string;
  const cleanup = {
    userIds: [] as string[],
    poolId: '',
    assessmentId: '',
    attemptIds: [] as string[],
  };

  async function login(email: string, password: string) {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return res.body.data.tokens.accessToken as string;
  }

  beforeAll(async () => {
    const passwordHash = await bcryptHash('Password123!');
    const teacher = await prisma.user.create({
      data: {
        email: `exams-teacher-${ts}@test.com`,
        password: passwordHash,
        name: 'Exam Teacher',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
        isActive: true,
      },
    });
    const student = await prisma.user.create({
      data: {
        email: `exams-student-${ts}@test.com`,
        password: passwordHash,
        name: 'Exam Student',
        role: 'STUDENT',
        isActive: true,
      },
    });
    cleanup.userIds.push(teacher.id, student.id);
    teacherToken = await login(`exams-teacher-${ts}@test.com`, 'Password123!');
    studentToken = await login(`exams-student-${ts}@test.com`, 'Password123!');
  });

  afterAll(async () => {
    try {
      await prisma.assessmentAttempt.deleteMany({ where: { id: { in: cleanup.attemptIds } } });
      if (cleanup.assessmentId)
        await prisma.assessment.deleteMany({ where: { id: cleanup.assessmentId } });
      if (cleanup.poolId) await prisma.questionPool.deleteMany({ where: { id: cleanup.poolId } });
      await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
    } catch {}
  });

  function bcryptHash(pw: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return import('bcrypt').then((b) => b.hash(pw, 10));
  }

  it('teacher creates a pool, adds questions, publishes an assessment', async () => {
    const pool = await request(app)
      .post('/api/v1/assessment/pools')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ titleEn: `Physics Mechanics ${ts}`, titleAr: 'ميكانيكا' });
    expect(pool.status).toBe(201);
    cleanup.poolId = pool.body.data.id;

    const mcq = await request(app)
      .post(`/api/v1/assessment/pools/${cleanup.poolId}/questions`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        textEn: 'What is Newton second law?',
        textAr: 'قانون نيوتن الثاني؟',
        questionType: 'MCQ',
        difficulty: 'MEDIUM',
        points: 10,
        optionsJson: ['F=ma', 'F=mv', 'E=mc2'],
        correctAnswerJson: 'F=ma',
        explanation: 'Force equals mass times acceleration',
      });
    expect(mcq.status).toBe(201);

    const tf = await request(app)
      .post(`/api/v1/assessment/pools/${cleanup.poolId}/questions`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        textEn: 'Gravity accelerates falling objects.',
        textAr: 'الجاذبية تسرع الأجسام الساقطة.',
        questionType: 'TRUE_FALSE',
        difficulty: 'EASY',
        points: 10,
        optionsJson: ['True', 'False'],
        correctAnswerJson: 'true',
      });
    expect(tf.status).toBe(201);

    // Validation guard: MCQ without options is rejected
    const badMcq = await request(app)
      .post(`/api/v1/assessment/pools/${cleanup.poolId}/questions`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        textEn: 'Bad question?',
        textAr: 'سؤال سيء',
        questionType: 'MCQ',
        optionsJson: [],
      });
    expect(badMcq.status).toBe(400);

    const assessment = await request(app)
      .post('/api/v1/assessment/assessments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        poolId: cleanup.poolId,
        titleEn: `Mechanics Quiz ${ts}`,
        titleAr: 'اختبار الميكانيكا',
        durationMinutes: 10,
        passingScore: 60,
        totalQuestions: 2,
      });
    expect(assessment.status).toBe(201);
    cleanup.assessmentId = assessment.body.data.id;

    const pools = await request(app)
      .get('/api/v1/assessment/pools')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(pools.status).toBe(200);
    expect(pools.body.data.some((p: any) => p.id === cleanup.poolId)).toBe(true);
  });

  it('student starts an attempt with a sanitized snapshot and deadline', async () => {
    const start = await request(app)
      .post(`/api/v1/assessment/assessments/${cleanup.assessmentId}/start`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(start.status).toBe(201);
    cleanup.attemptIds.push(start.body.data.id);

    const snap = start.body.data.questionsSnapshot;
    expect(snap.length).toBe(2);
    // Answer keys must never reach the student:
    for (const q of snap) {
      expect(q.correctAnswerJson).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }
    expect(new Date(start.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('submitting all-correct answers grades 100 and passes', async () => {
    const attempt = await request(app)
      .post(`/api/v1/assessment/assessments/${cleanup.assessmentId}/start`)
      .set('Authorization', `Bearer ${studentToken}`);
    cleanup.attemptIds.push(attempt.body.data.id);
    const attemptId = attempt.body.data.id;

    const submit = await request(app)
      .post(`/api/v1/assessment/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          { questionId: attempt.body.data.questionsSnapshot.find((q: any) => q.type === 'MCQ').id, answer: 'F=ma' },
          { questionId: attempt.body.data.questionsSnapshot.find((q: any) => q.type === 'TRUE_FALSE').id, answer: 'true' },
        ],
      });
    expect(submit.status).toBe(200);
    expect(submit.body.data.score).toBeCloseTo(100, 0);
    expect(submit.body.data.isPassed).toBe(true);

    // Double-submit must be rejected
    const again = await request(app)
      .post(`/api/v1/assessment/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId: 'x', answer: 'y' }] });
    expect(again.status).toBe(400);
  });
});
