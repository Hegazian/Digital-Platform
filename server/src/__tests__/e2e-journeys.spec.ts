import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app';
import { prisma } from '../prisma';

/**
 * Executable end-to-end journeys mirroring the requirements doc:
 *   E2E-001 Platform Setup
 *   E2E-002 Course Creation to Publication
 *   E2E-003 Student Learning Flow
 * Runs against the real app + database via supertest.
 */

describe('End-to-End Journeys', () => {
  const ts = Date.now();
  const adminEmail = `e2e-admin-${ts}@edu.com`;
  const teacherEmail = `e2e-teacher-${ts}@edu.com`;
  const studentEmail = `e2e-student-${ts}@edu.com`;
  const password = 'Password123!';

  let adminToken = '';
  let teacherToken = '';
  let studentToken = '';
  let cleanupIds = {
    userIds: [] as string[],
    subjectId: '',
    courseId: '',
    lessonId: '',
    quizId: '',
    assignmentId: '',
    yearId: '',
    gradeId: '',
    stageId: '',
  };

  afterAll(async () => {
    try {
      if (cleanupIds.courseId) {
        await prisma.course.deleteMany({ where: { id: cleanupIds.courseId } });
      }
      await prisma.subject.deleteMany({ where: { id: cleanupIds.subjectId } });
      await prisma.academicYear.deleteMany({ where: { id: cleanupIds.yearId } });
      await prisma.educationalStage.deleteMany({ where: { id: cleanupIds.stageId } });
      if (cleanupIds.quizId) await prisma.quiz.deleteMany({ where: { id: cleanupIds.quizId } });
      if (cleanupIds.assignmentId)
        await prisma.assignment.deleteMany({ where: { id: cleanupIds.assignmentId } });
      await prisma.user.deleteMany({
        where: { email: { contains: `-e2e-${ts}@edu.com` } },
      });
      await prisma.$disconnect();
    } catch {
      // best-effort
    }
  });

  describe('E2E-001 — Platform Setup', () => {
    it('admin logs in with valid credentials', async () => {
      const hash = await bcrypt.hash(password, 10);
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hash,
          name: 'E2E Admin',
          role: 'ADMIN',
        },
      });
      cleanupIds.userIds.push(admin.id);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('ADMIN');
      adminToken = res.body.data.tokens.accessToken;
    });

    it('admin creates academic year, stage, grade, subject, and a teacher (TC-ADMIN-041 delta checks)', async () => {
      const statsBefore = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statsBefore.status).toBe(200);
      const teachersBefore = statsBefore.body.data.users.teachers;

      // Academic year
      const year = await request(app)
        .post('/api/v1/academic/years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `2026/2027 E2E ${ts}`, startDate: '2026-09-01', endDate: '2027-06-30' });
      expect(year.status).toBe(201);
      cleanupIds.yearId = year.body.data.id;

      // Stage -> Grade
      const stage = await request(app)
        .post('/api/v1/academic/stages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nameEn: `Secondary E2E ${ts}`, nameAr: 'ثانوي', code: `SEC-E2E-${ts}` });
      expect(stage.status).toBe(201);
      cleanupIds.stageId = stage.body.data.id;

      const grade = await request(app)
        .post('/api/v1/academic/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stageId: cleanupIds.stageId,
          nameEn: `Grade 12 E2E ${ts}`,
          nameAr: 'صف ١٢',
          code: `G12-${ts}`,
        });
      expect(grade.status).toBe(201);
      cleanupIds.gradeId = grade.body.data.id;

      // Subject
      const subject = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nameEn: `Physics E2E ${ts}`, nameAr: 'فيزياء' });
      expect(subject.status).toBe(201);
      cleanupIds.subjectId = subject.body.data.id;

      // Teacher creation by admin (auto-approved)
      const teacher = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: teacherEmail,
          password,
          name: 'E2E Teacher',
          role: 'TEACHER',
        });
      expect(teacher.status).toBe(201);
      cleanupIds.userIds.push(teacher.body.data.id);

      // Stats accuracy: the newly created teacher is reflected in the count
      // (TC-ADMIN-041). Tolerant of concurrent writers on a shared database.
      const statsAfter = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statsAfter.status).toBe(200);
      expect(statsAfter.body.data.users.teachers).toBeGreaterThanOrEqual(teachersBefore + 1);
      expect(statsAfter.body.data.users.total).toBeGreaterThan(statsBefore.body.data.users.total);

      // Teacher logs in
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: teacherEmail, password });
      expect(login.status).toBe(200);
      expect(login.body.data.user.role).toBe('TEACHER');
      teacherToken = login.body.data.tokens.accessToken;
    });
  });

  describe('E2E-002 — Course Creation to Publication', () => {
    it('teacher builds course -> module -> lesson(video) -> quiz -> assignment, then submits', async () => {
      const course = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          titleEn: `E2E Physics ${ts}`,
          titleAr: 'فيزياء',
          description: 'Full E2E journey physics course',
          subjectId: cleanupIds.subjectId,
          gradeId: cleanupIds.gradeId,
        });
      expect(course.status).toBe(201);
      expect(course.body.data.status).toBe('DRAFT');
      cleanupIds.courseId = course.body.data.id;

      // This journey models a FREE course. Courses are monetized by default,
      // so flag it free explicitly: enrollment stays closed for any course
      // that still has an active priced product (no checkout bypass).
      const pricing = await request(app)
        .patch(`/api/v1/courses/${cleanupIds.courseId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ isFree: true });
      expect(pricing.status).toBe(200);

      const mod = await request(app)
        .post(`/api/v1/courses/${cleanupIds.courseId}/modules`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ titleEn: 'Mechanics', titleAr: 'ميكانيكا' });
      expect(mod.status).toBe(201);

      const lesson = await request(app)
        .post(`/api/v1/courses/modules/${mod.body.data.id}/lessons`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          titleEn: 'Newton Laws',
          titleAr: 'قوانين نيوتن',
          video: { title: 'Newton Lecture', videoUrl: '/uploads/e2e.mp4', duration: 1800 },
          quiz: {
            title: 'Newton Check',
            passingScore: 50,
            maxAttempts: 2,
            questions: [
              {
                questionText: 'F = ?',
                type: 'MCQ',
                points: 10,
                options: [
                  { text: 'ma', isCorrect: true },
                  { text: 'mv', isCorrect: false },
                ],
              },
            ],
          },
        });
      expect(lesson.status).toBe(201);
      cleanupIds.lessonId = lesson.body.data.id;
      cleanupIds.quizId = lesson.body.data.quizId;

      const assignment = await request(app)
        .post(`/api/v1/assignments/lesson/${cleanupIds.lessonId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          titleEn: 'Problem Set 1',
          instructions: 'Solve problems 1-10',
          maxScore: 100,
          allowLateSubmission: true,
          dueDate: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
        });
      expect(assignment.status).toBe(201);
      cleanupIds.assignmentId = assignment.body.data.id;

      const submit = await request(app)
        .post(`/api/v1/courses/${cleanupIds.courseId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(submit.status).toBe(200);
      expect(submit.body.data.status).toBe('UNDER_REVIEW');
    });

    it('admin approves and publishes; course becomes publicly visible', async () => {
      const review = await request(app)
        .post(`/api/v1/courses/${cleanupIds.courseId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'APPROVED' });
      expect(review.status).toBe(200);
      expect(review.body.data.status).toBe('PUBLISHED');

      const anon = await request(app).get(`/api/v1/courses/${cleanupIds.courseId}`);
      expect(anon.status).toBe(200);
      expect(anon.body.data.status).toBe('PUBLISHED');
      // Answer keys must not leak to anonymous viewers
      const q = anon.body.data.modules[0].lessons[0].quiz.questions[0];
      expect(q.options.some((o: any) => o.isCorrect === true)).toBe(false);
    });
  });

  describe('E2E-003 — Student Learning Flow', () => {
    let selectedOptionId = '';

    it('student registers and browses the published catalog', async () => {
      const grade = await prisma.grade.findFirst({ select: { id: true } });
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: studentEmail,
          password,
          name: 'E2E Student',
          role: 'STUDENT',
          studentNumber: `E2E-${ts}`,
          ...(grade ? { gradeId: grade.id } : {}),
        });
      expect(reg.status).toBe(201);

      const student = await prisma.user.findUnique({ where: { email: studentEmail } });
      cleanupIds.userIds.push(student!.id);

      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: studentEmail, password });
      expect(login.status).toBe(200);
      studentToken = login.body.data.tokens.accessToken;

      const catalog = await request(app)
        .get(`/api/v1/courses?search=E2E Physics ${ts}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(catalog.status).toBe(200);
      expect(catalog.body.data.courses.some((c: any) => c.id === cleanupIds.courseId)).toBe(true);
    });

    it('student enrolls and gains access to content', async () => {
      const enroll = await request(app)
        .post(`/api/v1/courses/${cleanupIds.courseId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(enroll.status).toBe(200);

      const detail = await request(app)
        .get(`/api/v1/courses/${cleanupIds.courseId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(detail.status).toBe(200);
    });

    it('student takes the quiz; server grades it correctly (TC-STUDENT-040/041/044)', async () => {
      const questions = await prisma.question.findMany({ where: { quizId: cleanupIds.quizId } });
      const q = questions[0];
      const correct = (q.options as any[]).find((o) => o.isCorrect);
      selectedOptionId = correct.id;

      await request(app)
        .post(`/api/v1/quizzes/${cleanupIds.quizId}/attempts/start`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(201);

      const submit = await request(app)
        .post(`/api/v1/quizzes/${cleanupIds.quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: [{ questionId: q.id, selectedOptionId }] });

      expect(submit.status).toBe(200);
      expect(submit.body.data.score).toBe(100);
      expect(submit.body.data.isPassed).toBe(true);
    });

    it('attempt limit is enforced server-side (TC-STUDENT-042)', async () => {
      // Quiz allows 2 attempts; second attempt then third must fail.
      const start2 = await request(app)
        .post(`/api/v1/quizzes/${cleanupIds.quizId}/attempts/start`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(start2.status).toBe(201);

      const questions = await prisma.question.findMany({ where: { quizId: cleanupIds.quizId } });
      const submit2 = await request(app)
        .post(`/api/v1/quizzes/${cleanupIds.quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: [{ questionId: questions[0].id, selectedOptionId }] });
      expect([200, 400]).toContain(submit2.status); // graded OR limit hit

      if (submit2.status === 200) {
        const blocked = await request(app)
          .post(`/api/v1/quizzes/${cleanupIds.quizId}/attempts/start`)
          .set('Authorization', `Bearer ${studentToken}`);
        expect(blocked.status).toBe(400);
      }
    });

    it('assignment submit -> teacher grades -> student sees score & feedback (TC-STUDENT-050..054)', async () => {
      const submit = await request(app)
        .post(`/api/v1/assignments/${cleanupIds.assignmentId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ submissionText: 'My solutions to problems 1-10.' });
      expect(submit.status).toBe(201);
      expect(['SUBMITTED', 'LATE']).toContain(submit.body.data.status);

      const inbox = await request(app)
        .get(`/api/v1/assignments/${cleanupIds.assignmentId}/submissions`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(inbox.status).toBe(200);
      expect(inbox.body.data.length).toBeGreaterThan(0);

      const submissionId = inbox.body.data[0].id;
      const grade = await request(app)
        .post(`/api/v1/assignments/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ score: 92, feedback: 'Excellent work!' });
      expect(grade.status).toBe(200);
      expect(grade.body.data.status).toBe('GRADED');

      const mine = await request(app)
        .get('/api/v1/assignments/my-submissions')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(mine.status).toBe(200);
      const gradedMine = mine.body.data.find(
        (s: any) => s.assignment?.titleEn === 'Problem Set 1'
      );
      expect(gradedMine.score).toBe(92);
      expect(gradedMine.feedback).toBe('Excellent work!');
    });

    it('lesson completion persists and progress % updates (TC-STUDENT-060/061)', async () => {
      const complete = await request(app)
        .post(`/api/v1/progress/${cleanupIds.lessonId}/complete`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(complete.status).toBe(200);

      const prog = await request(app)
        .get(`/api/v1/progress/course/${cleanupIds.courseId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(prog.status).toBe(200);
      expect(prog.body.data.completedLessonIds).toContain(cleanupIds.lessonId);

      const summary = await request(app)
        .get('/api/v1/progress/summary')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(summary.status).toBe(200);
      const thisCourse = summary.body.data.courses.find((c: any) => c.id === cleanupIds.courseId);
      expect(thisCourse.progress).toBeGreaterThan(0);
      // Grade history present (TC-STUDENT-063)
      expect(
        summary.body.data.recentGrades.some((g: any) => g.assignmentTitle === 'Problem Set 1')
      ).toBe(true);
    });
  });
});
