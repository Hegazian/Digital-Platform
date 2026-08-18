"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../../app"));
const prisma_1 = require("../../../prisma");
const jwt_1 = require("../../../utils/jwt");
(0, vitest_1.describe)('Question Bank & Dynamic Assessment Integration Tests', () => {
    let teacherToken;
    let studentToken;
    let teacherId;
    let studentId;
    let poolId;
    let assessmentId;
    let attemptId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Approved Teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher-assess-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Assessment Teacher',
                role: 'TEACHER',
                teacherStatus: 'APPROVED',
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
        // 2. Create Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-assess-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Assessment Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT' });
    });
    (0, vitest_1.afterAll)(async () => {
        if (studentId) {
            await prisma_1.prisma.assessmentAttempt.deleteMany({ where: { studentId } });
        }
        if (assessmentId) {
            await prisma_1.prisma.assessment.deleteMany({ where: { id: assessmentId } });
        }
        if (poolId) {
            await prisma_1.prisma.questionItem.deleteMany({ where: { poolId } });
            await prisma_1.prisma.questionPool.deleteMany({ where: { id: poolId } });
        }
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: '-assess-' } } });
    });
    (0, vitest_1.describe)('Question Pool & Items API', () => {
        (0, vitest_1.it)('should allow teacher to create a question pool', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/assessment/pools')
                .set('Authorization', `Bearer ${teacherToken}`)
                .send({
                titleEn: 'Algebra & Calculus Question Bank',
                titleAr: 'بنك أسئلة الجبر والتفاضل',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.titleEn).toBe('Algebra & Calculus Question Bank');
            poolId = res.body.data.id;
        });
        (0, vitest_1.it)('should allow teacher to add questions of varying difficulty to the pool', async () => {
            // Add Easy Question
            const q1 = await (0, supertest_1.default)(app_1.default)
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
            (0, vitest_1.expect)(q1.status).toBe(201);
            // Add Medium Question
            const q2 = await (0, supertest_1.default)(app_1.default)
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
            (0, vitest_1.expect)(q2.status).toBe(201);
            // Add Hard Question
            const q3 = await (0, supertest_1.default)(app_1.default)
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
            (0, vitest_1.expect)(q3.status).toBe(201);
        });
    });
    (0, vitest_1.describe)('Dynamic Assessment Configuration API', () => {
        (0, vitest_1.it)('should allow teacher to create an assessment template', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
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
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.durationMinutes).toBe(30);
            assessmentId = res.body.data.id;
        });
    });
    (0, vitest_1.describe)('Exam Assembly & Time-Bounded Grading Engine', () => {
        (0, vitest_1.it)('should assemble a randomized exam attempt session for student with hidden correct answers', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/assessment/assessments/${assessmentId}/start`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.status).toBe('IN_PROGRESS');
            (0, vitest_1.expect)(Array.isArray(res.body.data.questionsSnapshot)).toBe(true);
            (0, vitest_1.expect)(res.body.data.questionsSnapshot.length).toBeGreaterThan(0);
            // Correct answers MUST be stripped from student snapshot
            const firstQ = res.body.data.questionsSnapshot[0];
            (0, vitest_1.expect)(firstQ).not.toHaveProperty('correctAnswerJson');
            attemptId = res.body.data.id;
        });
        (0, vitest_1.it)('should auto-grade submitted attempt and calculate final score', async () => {
            // Get exam questions snapshot to answer
            const attemptRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/assessment/attempts/${attemptId}`)
                .set('Authorization', `Bearer ${studentToken}`);
            const snapshot = attemptRes.body.data.questionsSnapshot;
            const studentAnswers = snapshot.map((q) => ({
                questionId: q.id,
                answer: q.options[2], // Send choice
            }));
            const submitRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/assessment/attempts/${attemptId}/submit`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ answers: studentAnswers });
            (0, vitest_1.expect)(submitRes.status).toBe(200);
            (0, vitest_1.expect)(submitRes.body.success).toBe(true);
            (0, vitest_1.expect)(['SUBMITTED', 'EXPIRED']).toContain(submitRes.body.data.status);
            (0, vitest_1.expect)(typeof submitRes.body.data.score).toBe('number');
        });
        (0, vitest_1.it)('should reject submission for expired attempt sessions', async () => {
            // Create a expired assessment attempt manually
            const expiredAttempt = await prisma_1.prisma.assessmentAttempt.create({
                data: {
                    assessment: { connect: { id: assessmentId } },
                    student: { connect: { id: studentId } },
                    startedAt: new Date(Date.now() - 3600 * 1000),
                    expiresAt: new Date(Date.now() - 1800 * 1000), // Expired 30 mins ago
                    status: 'IN_PROGRESS',
                    questionsSnapshotJson: JSON.stringify([]),
                },
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/assessment/attempts/${expiredAttempt.id}/submit`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ answers: [] });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.status).toBe('EXPIRED');
            // Cleanup
            await prisma_1.prisma.assessmentAttempt.deleteMany({ where: { id: expiredAttempt.id } });
        });
    });
});
