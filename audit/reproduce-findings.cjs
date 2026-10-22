/* Read-only application probes with process-local database doubles.
 * No real database, AI provider, email, or payment gateway is contacted.
 * Run from the repository root: node audit/reproduce-findings.cjs
 * These probes demonstrate existing defects; they are not regression tests.
 */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireServer = createRequire(path.resolve('server/package.json'));
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = '';
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SUPABASE_ANON_KEY = '';
process.env.UPLOADS_DIR = path.resolve('audit/fixtures/uploads');
requireServer('tsx/cjs');
requireServer('tsx/esm/api').register();
const request = requireServer('supertest');
const { prisma } = requireServer('./src/prisma.ts');
const app = requireServer('./src/app.ts').default;
const { CourseService } = requireServer('./src/modules/courses/course.service.ts');
const { CommerceService } = requireServer('./src/modules/commerce/commerce.service.ts');
const { AssessmentService } = requireServer('./src/modules/assessment/assessment.service.ts');
const { EntitlementResolver } = requireServer('./src/modules/commerce/entitlement-resolver.service.ts');
const { TeacherController } = requireServer('./src/modules/teacher/teacher.controller.ts');
const { TeacherService } = requireServer('./src/modules/teacher/teacher.service.ts');
const { LiveController } = requireServer('./src/modules/live/live.controller.ts');
const { LiveService } = requireServer('./src/modules/live/live.service.ts');
const { AuthService } = requireServer('./src/modules/auth/auth.service.ts');
const { generateAccessToken } = requireServer('./src/utils/jwt.ts');
const results = [];
const changes = [];
function replace(obj, key, value) {
  const before = obj[key]; obj[key] = value; changes.push(() => { obj[key] = before; });
}
function restore() { while (changes.length) changes.pop()(); }
async function probe(id, description, fn) {
  try { results.push({ id, description, observed: await fn() }); }
  catch (error) { results.push({ id, description, probeError: error.message }); }
  finally { restore(); }
}
function resDouble() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}
const course = {
  id: 'audit-course', teacherId: 'teacher-owner', subjectId: 'audit-subject',
  status: 'PUBLISHED', isPublished: true, isFree: false, visibility: 'PRIVATE',
  modules: [{ id: 'audit-module', lessons: [{ id: 'audit-lesson', content: 'Paid textbook-derived lesson',
    video: { videoUrl: '/uploads/lesson-videos/audit-fixture.mp4' },
    materials: [{ fileUrl: '/uploads/lesson-materials/audit.pdf' }],
    quiz: { questions: [{ id: 'q1', type: 'SHORT_ANSWER', correctAnswer: 'answer-secret', options: [], explanation: 'hidden' }] },
    blocks: [{ blockType: 'TEXT', configurationJson: '{"html":"Paid block"}' }],
  }] }], sections: [],
};
(async () => {
  const fixtureDir = path.join(process.env.UPLOADS_DIR, 'lesson-videos');
  fs.mkdirSync(fixtureDir, { recursive: true });
  const fixture = path.join(fixtureDir, 'audit-fixture.mp4');
  const uploadedFixtures = [];
  fs.writeFileSync(fixture, 'AUDIT-ONLY-VIDEO-BYTES');
  try {
    await probe('F01', 'Anonymous access to an uploaded video bypasses streaming authorization', async () => {
      const res = await request(app).get('/uploads/lesson-videos/audit-fixture.mp4');
      return { httpStatus: res.status, bytes: res.body.length, authenticated: false };
    });
    await probe('F02-F03', 'Anonymous PRIVATE course response exposes paid data and short-answer key', async () => {
      replace(prisma.course, 'findUnique', async () => structuredClone(course));
      replace(prisma.product, 'findFirst', async () => null);
      const res = await request(app).get('/api/v1/courses/audit-course');
      const lesson = res.body.data.modules[0].lessons[0];
      return { httpStatus: res.status, visibility: res.body.data.visibility, content: lesson.content,
        videoUrl: lesson.video.videoUrl, materialUrl: lesson.materials[0].fileUrl,
        correctAnswer: lesson.quiz.questions[0].correctAnswer };
    });
    await probe('F04', 'Unrelated teacher can read a quiz answer key', async () => {
      replace(prisma.user, 'findUnique', async () => ({ isActive: true }));
      replace(prisma.quiz, 'findUnique', async () => ({ id: 'quiz-owned-by-someone-else', questions: [{ type: 'MCQ', options: [{ id: 'a', isCorrect: true }] }] }));
      const token = generateAccessToken({ userId: 'audit-unrelated-teacher', role: 'TEACHER', teacherStatus: 'APPROVED' });
      const res = await request(app).get('/api/v1/quizzes/quiz-owned-by-someone-else').set('Authorization', `Bearer ${token}`);
      return { httpStatus: res.status, isCorrect: res.body.data.questions[0].options[0].isCorrect };
    });
    await probe('F05', 'Expired assessment response includes the internal answer snapshot', async () => {
      const attempt = { id: 'attempt', studentId: 'student', status: 'IN_PROGRESS', expiresAt: new Date(0),
        questionsSnapshotJson: JSON.stringify([{ correctAnswerJson: '"answer-secret"' }]), assessment: { passingScore: 50 } };
      replace(prisma.assessmentAttempt, 'findUnique', async () => attempt);
      replace(prisma.assessmentAttempt, 'update', async ({ data }) => ({ ...attempt, ...data }));
      const result = await AssessmentService.submitAttempt('student', 'attempt', []);
      return { status: result.status, questionsSnapshotJson: result.attempt.questionsSnapshotJson };
    });
    await probe('F06', 'Subject subscription grants resolver access but course paywall endpoint denies access', async () => {
      replace(prisma.course, 'findUnique', async () => ({ id: 'audit-course', subjectId: 'audit-subject', gradeId: null }));
      replace(prisma.entitlement, 'findFirst', async () => null);
      replace(prisma.subscription, 'findFirst', async () => ({ status: 'ACTIVE', endDate: new Date(Date.now() + 86400000) }));
      replace(prisma.user, 'findUnique', async () => ({ role: 'STUDENT' }));
      replace(prisma.video, 'findUnique', async () => ({ teacherId: 'teacher-owner', lesson: { module: { courseId: 'audit-course', course: { subjectId: 'audit-subject' } } } }));
      return { paywall: await CommerceService.checkCourseAccess('student', 'audit-course'),
        resolverAccess: await EntitlementResolver.hasCourseAccess('student', 'audit-course') };
    });
    await probe('F07', 'Announcement request body overrides the authenticated teacher identity', async () => {
      let received;
      replace(TeacherService, 'broadcastAnnouncement', async (data) => { received = data; return {}; });
      await TeacherController.broadcastAnnouncement({ user: { userId: 'actual-teacher' }, body: { teacherId: 'victim-teacher', courseId: 'victim-course' } }, resDouble(), (e) => { throw e; });
      return { authenticatedTeacher: 'actual-teacher', serviceTeacher: received.teacherId };
    });
    await probe('F08', 'Live-session request body overrides the authenticated teacher identity', async () => {
      let received;
      replace(LiveService, 'createLiveSession', async (data) => { received = data; return {}; });
      await LiveController.createLiveSession({ user: { userId: 'actual-teacher' }, body: { teacherId: 'victim-teacher', subjectId: 'subject' } }, resDouble(), (e) => { throw e; });
      return { authenticatedTeacher: 'actual-teacher', serviceTeacher: received.teacherId };
    });
    await probe('F09', 'Idempotency key lookup can return another student order', async () => {
      replace(prisma.order, 'findUnique', async () => ({ id: 'victim-order', studentId: 'victim-student', transactionRef: 'victim-reference' }));
      const result = await CommerceService.createOrder('attacker-student', { idempotencyKey: 'known-key', productId: 'other-product', paymentMethod: 'MANUAL' });
      return { caller: 'attacker-student', returnedStudent: result.studentId, transactionRef: result.transactionRef };
    });
    await probe('F10', 'Exchange-rate update is stripped by the config validation schema', async () => {
      let updated;
      replace(prisma.user, 'findUnique', async () => ({ isActive: true }));
      replace(prisma.appConfig, 'findFirst', async () => ({ id: 'config', exchangeRateUsdToEgp: 48 }));
      replace(prisma.appConfig, 'update', async ({ data }) => { updated = data; return { id: 'config', exchangeRateUsdToEgp: 48, ...data }; });
      const token = generateAccessToken({ userId: 'audit-config-admin', role: 'ADMIN' });
      const res = await request(app).patch('/api/v1/config').set('Authorization', `Bearer ${token}`).send({ exchangeRateUsdToEgp: 60 });
      return { httpStatus: res.status, submittedRate: 60, savedRate: res.body.data.exchangeRateUsdToEgp, updateData: updated };
    });
    await probe('F11', 'Rejected teacher can obtain a login session', async () => {
      const password = 'AuditOnlyPassword123!';
      const passwordHash = await requireServer('bcrypt').hash(password, 4);
      replace(prisma.user, 'findUnique', async () => ({ id: 'rejected-teacher', role: 'TEACHER', teacherStatus: 'REJECTED', isActive: true, password: passwordHash, mfaEnabled: false }));
      replace(prisma.refreshToken, 'create', async () => ({}));
      const result = await AuthService.login({ email: 'audit@example.invalid', password });
      return { teacherStatus: 'REJECTED', sessionIssued: !!result.tokens?.accessToken };
    });
    await probe('F12', 'Old ADMIN role in access token survives a database role change', async () => {
      replace(prisma.user, 'findUnique', async () => ({ isActive: true, role: 'STUDENT' }));
      const token = generateAccessToken({ userId: 'audit-demoted-admin', role: 'ADMIN' });
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      return { httpStatus: res.status, currentDatabaseRole: 'STUDENT', authorizedRole: res.body.user.role };
    });
    await probe('F13', 'AI without provider key returns the same physics answer for unrelated Arabic prompt', async () => {
      replace(prisma.user, 'findUnique', async () => ({ isActive: true }));
      const token = generateAccessToken({ userId: 'audit-ai-student', role: 'STUDENT' });
      const res = await request(app).post('/api/v1/ai/tutor').set('Authorization', `Bearer ${token}`).send({ prompt: 'ما ناتج ٢ + ٢؟' });
      return { httpStatus: res.status, provider: res.body.data.provider, answer: res.body.data.answer };
    });
    await probe('F14', 'Database outage health endpoint returns HTTP 200', async () => {
      replace(prisma, '$queryRawUnsafe', async () => { throw new Error('audit unavailable'); });
      const res = await request(app).get('/health');
      return { httpStatus: res.status, reportedStatus: res.body.status, database: res.body.database };
    });
    await probe('F15', 'Student can upload HTML and JavaScript disguised with an allowed PDF MIME type', async () => {
      replace(prisma.user, 'findUnique', async () => ({ isActive: true }));
      const token = generateAccessToken({ userId: 'audit-upload-student', role: 'STUDENT' });
      const observations = [];
      for (const [filename, content] of [['audit-active.html', '<html><body>Harmless audit fixture</body></html>'], ['audit-active.js', '/* Harmless audit fixture */']]) {
        const upload = await request(app).post('/api/v1/assignments/uploads').set('Authorization', `Bearer ${token}`)
          .attach('file', Buffer.from(content), { filename, contentType: 'application/pdf' });
        const fileUrl = upload.body.data?.fileUrl;
        if (!fileUrl?.startsWith('/uploads/')) throw new Error(`Probe upload did not use local fixture storage: HTTP ${upload.status}, ${upload.body.message}`);
        const filePath = path.resolve(process.env.UPLOADS_DIR, fileUrl.slice('/uploads/'.length));
        if (!filePath.startsWith(process.env.UPLOADS_DIR + path.sep)) throw new Error('Unexpected fixture path');
        uploadedFixtures.push(filePath);
        const read = await request(app).get(fileUrl);
        observations.push({ filename, uploadStatus: upload.status, anonymousReadStatus: read.status, servedContentType: read.headers['content-type'] });
      }
      return observations;
    });
    fs.writeFileSync(path.resolve('audit/reproduction-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    restore();
    fs.unlinkSync(fixture);
    for (const file of uploadedFixtures) fs.unlinkSync(file);
    await prisma.$disconnect();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
