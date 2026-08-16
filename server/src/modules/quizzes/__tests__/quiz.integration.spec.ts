import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Quiz API Integration Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let studentId: string;
  let quizId: string;
  let questionId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('Pass123!', 10);
    
    // Create teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher-quiz-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Quiz Teacher',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
        isActive: true,
      },
    });
    teacherToken = generateAccessToken({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });

    // Create student
    const student = await prisma.user.create({
      data: {
        email: `student-quiz-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Quiz Student',
        role: 'STUDENT',
        isActive: true,
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT', teacherStatus: null });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '-quiz-' } },
    });
  });

  describe('POST /api/v1/quizzes', () => {
    it('should create a quiz (Teacher)', async () => {
      const payload = {
        titleEn: 'Math Quiz 1',
        titleAr: 'اختبار رياضيات ١',
        passingScore: 50,
        questions: [
          {
            questionText: 'What is 2+2?',
            points: 10,
            options: [
              { id: 'o1', text: '3', isCorrect: false },
              { id: 'o2', text: '4', isCorrect: true },
            ],
            explanation: 'Basic math',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      quizId = res.body.data.id;
      questionId = res.body.data.questions[0].id;
    });

    it('should deny quiz creation to student', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ titleEn: 'T', titleAr: 'T', questions: [] });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/quizzes/:id', () => {
    it('should strip correct answers for student', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const question = res.body.data.questions[0];
      expect(question.explanation).toBeNull();
      expect(question.options[0].isCorrect).toBeUndefined();
    });

    it('should retain correct answers for teacher', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      const question = res.body.data.questions[0];
      expect(question.explanation).toBe('Basic math');
      expect(question.options[1].isCorrect).toBe(true);
    });
  });

  describe('POST /api/v1/quizzes/:id/attempts', () => {
    it('should auto-grade a student attempt', async () => {
      const payload = {
        answers: [{ questionId, selectedOptionId: 'o2' }], // The correct option
      };

      const res = await request(app)
        .post(`/api/v1/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(100);
      expect(res.body.data.isPassed).toBe(true);
    });
  });

  describe('GET /api/v1/quizzes/:id/attempts', () => {
    it('should retrieve student attempts', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].score).toBe(100);
    });
  });
});
