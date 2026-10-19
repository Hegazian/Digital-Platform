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
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: '-quiz-' } },
      });
    } catch {
      // Best-effort in case child test suites have active foreign keys
    }
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

  describe('Quiz Answer Key & Entitlement Security (P0-2)', () => {
    let teacherAToken: string;
    let teacherBToken: string;
    let studentUToken: string;
    let studentEToken: string;
    let adminToken: string;

    let teacherAId: string;
    let teacherBId: string;
    let studentUId: string;
    let studentEId: string;
    let adminId: string;

    let p02SubjectId: string;
    let p02CourseId: string;
    let p02SectionId: string;
    let p02LessonId: string;
    let p02QuizId: string;

    beforeAll(async () => {
      const ts = Date.now();
      const hashedPassword = await bcrypt.hash('Pass123!', 10);

      const [teacherA, teacherB, studentU, studentE, admin, subject] = await Promise.all([
        prisma.user.create({
          data: {
            email: `teacherA-quiz-p02-${ts}@test.com`,
            password: hashedPassword,
            name: 'Teacher A',
            role: 'TEACHER',
            teacherStatus: 'APPROVED',
            isActive: true,
          },
        }),
        prisma.user.create({
          data: {
            email: `teacherB-quiz-p02-${ts}@test.com`,
            password: hashedPassword,
            name: 'Teacher B',
            role: 'TEACHER',
            teacherStatus: 'APPROVED',
            isActive: true,
          },
        }),
        prisma.user.create({
          data: {
            email: `studentU-quiz-p02-${ts}@test.com`,
            password: hashedPassword,
            name: 'Student Unenrolled',
            role: 'STUDENT',
            isActive: true,
          },
        }),
        prisma.user.create({
          data: {
            email: `studentE-quiz-p02-${ts}@test.com`,
            password: hashedPassword,
            name: 'Student Entitled',
            role: 'STUDENT',
            isActive: true,
          },
        }),
        prisma.user.create({
          data: {
            email: `admin-quiz-p02-${ts}@test.com`,
            password: hashedPassword,
            name: 'Admin User',
            role: 'ADMIN',
            isActive: true,
          },
        }),
        prisma.subject.create({
          data: {
            nameEn: `P0-2 Subject ${ts}`,
            nameAr: 'مادة p0-2',
          },
        }),
      ]);

      teacherAId = teacherA.id;
      teacherBId = teacherB.id;
      studentUId = studentU.id;
      studentEId = studentE.id;
      adminId = admin.id;
      p02SubjectId = subject.id;

      teacherAToken = generateAccessToken({ userId: teacherA.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
      teacherBToken = generateAccessToken({ userId: teacherB.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
      studentUToken = generateAccessToken({ userId: studentU.id, role: 'STUDENT', teacherStatus: null });
      studentEToken = generateAccessToken({ userId: studentE.id, role: 'STUDENT', teacherStatus: null });
      adminToken = generateAccessToken({ userId: admin.id, role: 'ADMIN', teacherStatus: null });

      // Create paid course owned by Teacher A
      const course = await prisma.course.create({
        data: {
          titleEn: `Paid Course P0-2 ${ts}`,
          titleAr: 'دورة مدفوعة',
          description: 'Testing quiz answer key isolation and entitlements',
          teacherId: teacherAId,
          subjectId: p02SubjectId,
          isFree: false,
          isPublished: true,
          status: 'PUBLISHED',
        },
      });
      p02CourseId = course.id;

      // Section (not free preview)
      const section = await prisma.section.create({
        data: {
          courseId: p02CourseId,
          titleEn: 'Paid Section',
          titleAr: 'قسم مدفوع',
          isFreePreview: false,
          orderIndex: 0,
        },
      });
      p02SectionId = section.id;

      // Lesson
      const lesson = await prisma.lesson.create({
        data: {
          sectionId: p02SectionId,
          titleEn: 'Paid Lesson with Quiz',
          titleAr: 'درس مع اختبار',
          orderIndex: 0,
        },
      });
      p02LessonId = lesson.id;

      // Quiz with MCQ and SHORT_ANSWER
      const quiz = await prisma.quiz.create({
        data: {
          titleEn: 'Secret Quiz P0-2',
          titleAr: 'اختبار سري',
          passingScore: 70,
          questions: {
            create: [
              {
                questionText: 'What is the answer to life, universe, and everything?',
                type: 'SHORT_ANSWER',
                correctAnswer: '42',
                explanation: 'From Hitchhikers Guide to Galaxy',
                orderIndex: 0,
                points: 5,
                options: [],
              },
              {
                questionText: 'Which option is correct?',
                type: 'MCQ',
                points: 5,
                orderIndex: 1,
                explanation: 'A is correct',
                options: [
                  { id: 'opt_1', text: 'Option A', isCorrect: true },
                  { id: 'opt_2', text: 'Option B', isCorrect: false },
                ],
              },
            ],
          },
        },
      });
      p02QuizId = quiz.id;

      // Link quiz to lesson
      await prisma.lesson.update({
        where: { id: p02LessonId },
        data: { quizId: p02QuizId },
      });

      // Grant entitlement to Student E for this course
      await prisma.entitlement.create({
        data: {
          studentId: studentEId,
          resourceType: 'COURSE',
          resourceId: p02CourseId,
          status: 'ACTIVE',
          sourceType: 'ADMIN_GRANT',
        },
      });
    });

    afterAll(async () => {
      try {
        await prisma.entitlement.deleteMany({
          where: { studentId: { in: [studentUId, studentEId] } },
        });
        await prisma.lesson.deleteMany({
          where: { id: p02LessonId },
        });
        await prisma.quiz.deleteMany({
          where: { id: p02QuizId },
        });
        await prisma.section.deleteMany({
          where: { id: p02SectionId },
        });
        await prisma.course.deleteMany({
          where: { id: p02CourseId },
        });
        await prisma.subject.deleteMany({
          where: { id: p02SubjectId },
        });
        await prisma.user.deleteMany({
          where: { id: { in: [teacherAId, teacherBId, studentUId, studentEId, adminId] } },
        });
      } catch (e) {
        // best effort
      }
    });

    it('Test Case 1: Student E course detail payload strips correctAnswer and isCorrect', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${p02CourseId}`)
        .set('Authorization', `Bearer ${studentEToken}`);

      expect(res.status).toBe(200);
      const lesson = res.body.data.sections[0].lessons[0];
      expect(lesson.quiz).toBeDefined();
      const questions = lesson.quiz.questions;
      expect(questions).toHaveLength(2);

      const shortQ = questions.find((q: any) => q.type === 'SHORT_ANSWER');
      expect(shortQ.correctAnswer).toBeFalsy();
      expect(shortQ.explanation).toBeFalsy();

      const mcqQ = questions.find((q: any) => q.type === 'MCQ');
      expect(mcqQ.explanation).toBeFalsy();
      expect(mcqQ.options[0].isCorrect).toBeUndefined();
      expect(mcqQ.options[1].isCorrect).toBeUndefined();
    });

    it('Test Case 2: Un-entitled Student U is blocked on GET /api/v1/quizzes/:id with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${p02QuizId}`)
        .set('Authorization', `Bearer ${studentUToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access|enrolled|forbidden/i);
    });

    it('Test Case 3: Entitled Student E receives sanitized quiz on GET /api/v1/quizzes/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${p02QuizId}`)
        .set('Authorization', `Bearer ${studentEToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.questions).toHaveLength(2);

      for (const q of res.body.data.questions) {
        expect(q.correctAnswer).toBeFalsy();
        expect(q.explanation).toBeFalsy();
        if (Array.isArray(q.options)) {
          for (const opt of q.options) {
            expect(opt.isCorrect).toBeUndefined();
          }
        }
      }
    });

    it('Test Case 4: Non-owning Teacher B is blocked on GET /api/v1/quizzes/:id with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${p02QuizId}`)
        .set('Authorization', `Bearer ${teacherBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/own|access|forbidden/i);
    });

    it('Test Case 5: Owning Teacher A and Admin receive full answer keys on GET /api/v1/quizzes/:id', async () => {
      const teacherRes = await request(app)
        .get(`/api/v1/quizzes/${p02QuizId}`)
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(teacherRes.status).toBe(200);
      const teacherQuestions = teacherRes.body.data.questions;
      const tShort = teacherQuestions.find((q: any) => q.type === 'SHORT_ANSWER');
      expect(tShort.correctAnswer).toBe('42');
      expect(tShort.explanation).toBe('From Hitchhikers Guide to Galaxy');
      const tMcq = teacherQuestions.find((q: any) => q.type === 'MCQ');
      expect(tMcq.options.find((o: any) => o.text === 'Option A').isCorrect).toBe(true);

      const adminRes = await request(app)
        .get(`/api/v1/quizzes/${p02QuizId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      const adminQuestions = adminRes.body.data.questions;
      const aShort = adminQuestions.find((q: any) => q.type === 'SHORT_ANSWER');
      expect(aShort.correctAnswer).toBe('42');
      const aMcq = adminQuestions.find((q: any) => q.type === 'MCQ');
      expect(aMcq.options.find((o: any) => o.text === 'Option A').isCorrect).toBe(true);
    });
  });
});
