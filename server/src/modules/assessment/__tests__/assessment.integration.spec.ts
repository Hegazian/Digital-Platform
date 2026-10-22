import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

describe('Question Bank & Dynamic Assessment Integration Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  let studentId: string;
  let poolId: string;
  let assessmentId: string;
  let attemptId: string;

  beforeAll(async () => {
    // 1. Create Approved Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher-assess-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Assessment Teacher',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
      },
    });
    teacherId = teacher.id;
    teacherToken = generateAccessToken({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });

    // 2. Create Student
    const student = await prisma.user.create({
      data: {
        email: `student-assess-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Assessment Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });
  });

  afterAll(async () => {
    if (studentId) {
      await prisma.assessmentAttempt.deleteMany({ where: { studentId } });
    }
    if (assessmentId) {
      await prisma.assessment.deleteMany({ where: { id: assessmentId } });
    }
    if (poolId) {
      await prisma.questionItem.deleteMany({ where: { poolId } });
      await prisma.questionPool.deleteMany({ where: { id: poolId } });
    }
    await prisma.user.deleteMany({ where: { email: { contains: '-assess-' } } });
  });

  describe('Question Pool & Items API', () => {
    it('should allow teacher to create a question pool', async () => {
      const res = await request(app)
        .post('/api/v1/assessment/pools')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          titleEn: 'Algebra & Calculus Question Bank',
          titleAr: 'بنك أسئلة الجبر والتفاضل',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.titleEn).toBe('Algebra & Calculus Question Bank');
      poolId = res.body.data.id;
    });

    it('should allow teacher to add questions of varying difficulty to the pool', async () => {
      // Add Easy Question
      const q1 = await request(app)
        .post(`/api/v1/assessment/pools/${poolId}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          textEn: 'What is 2 + 2?',
          textAr: 'ما هو 2 + 2؟',
          questionType: 'MCQ',
          difficulty: 'EASY',
          optionsJson: JSON.stringify(['2', '3', '4', '5']),
          correctAnswerJson: JSON.stringify('4'),
          points: 5,
        });
      expect(q1.status).toBe(201);

      // Add Medium Question
      const q2 = await request(app)
        .post(`/api/v1/assessment/pools/${poolId}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          textEn: 'What is the derivative of x^2?',
          textAr: 'ما هو مشتق x^2؟',
          questionType: 'MCQ',
          difficulty: 'MEDIUM',
          optionsJson: JSON.stringify(['x', '2x', 'x^2', '2']),
          correctAnswerJson: JSON.stringify('2x'),
          points: 10,
        });
      expect(q2.status).toBe(201);

      // Add Hard Question
      const q3 = await request(app)
        .post(`/api/v1/assessment/pools/${poolId}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          textEn: 'What is integral of 1/x dx?',
          textAr: 'ما هو تكامل 1/x dx؟',
          questionType: 'MCQ',
          difficulty: 'HARD',
          optionsJson: JSON.stringify(['ln|x| + C', 'x + C', '1/x^2', 'e^x']),
          correctAnswerJson: JSON.stringify('ln|x| + C'),
          points: 15,
        });
      expect(q3.status).toBe(201);
    });
  });

  describe('Dynamic Assessment Configuration API', () => {
    it('should allow teacher to create an assessment template', async () => {
      const res = await request(app)
        .post('/api/v1/assessment/assessments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          poolId,
          titleEn: 'Midterm Math Exam',
          titleAr: 'امتحان الرياضيات الميدتيرم',
          durationMinutes: 30,
          passingScore: 60,
          totalQuestions: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.durationMinutes).toBe(30);
      assessmentId = res.body.data.id;
    });
  });

  describe('Exam Assembly & Time-Bounded Grading Engine', () => {
    it('should assemble a randomized exam attempt session for student with hidden correct answers', async () => {
      const res = await request(app)
        .post(`/api/v1/assessment/assessments/${assessmentId}/start`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      expect(Array.isArray(res.body.data.questionsSnapshot)).toBe(true);
      expect(res.body.data.questionsSnapshot.length).toBeGreaterThan(0);

      // Correct answers MUST be stripped from student snapshot
      const firstQ = res.body.data.questionsSnapshot[0];
      expect(firstQ).not.toHaveProperty('correctAnswerJson');

      attemptId = res.body.data.id;
    });

    it('should auto-grade submitted attempt and calculate final score', async () => {
      // Get exam questions snapshot to answer
      const attemptRes = await request(app)
        .get(`/api/v1/assessment/attempts/${attemptId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      const snapshot = attemptRes.body.data.questionsSnapshot;
      const studentAnswers = snapshot.map((q: any) => ({
        questionId: q.id,
        answer: q.options[2], // Send choice
      }));

      const submitRes = await request(app)
        .post(`/api/v1/assessment/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: studentAnswers });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(['SUBMITTED', 'EXPIRED']).toContain(submitRes.body.data.status);
      expect(typeof submitRes.body.data.score).toBe('number');
    });

    it('should reject submission for expired attempt sessions', async () => {
      // Create a expired assessment attempt manually
      const expiredAttempt = await prisma.assessmentAttempt.create({
        data: {
          assessment: { connect: { id: assessmentId } },
          student: { connect: { id: studentId } },
          startedAt: new Date(Date.now() - 3600 * 1000),
          expiresAt: new Date(Date.now() - 1800 * 1000), // Expired 30 mins ago
          status: 'IN_PROGRESS',
          questionsSnapshotJson: JSON.stringify([]),
        },
      });

      const res = await request(app)
        .post(`/api/v1/assessment/attempts/${expiredAttempt.id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: [] });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXPIRED');

      // Cleanup
      await prisma.assessmentAttempt.deleteMany({ where: { id: expiredAttempt.id } });
    });
  });
});
