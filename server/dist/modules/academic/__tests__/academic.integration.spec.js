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
(0, vitest_1.describe)('Academic Hierarchy Integration Tests', () => {
    let adminToken;
    let studentToken;
    let stageId;
    let gradeId;
    let yearId;
    let subjectId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Admin user
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: `admin-acad-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Admin User',
                role: 'ADMIN',
            },
        });
        adminToken = (0, jwt_1.generateAccessToken)({ userId: admin.id, role: 'ADMIN' });
        // 2. Create Student user
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-acad-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Student User',
                role: 'STUDENT',
            },
        });
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT' });
        // 3. Create a Subject
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Physics Sec 1 ${Date.now()}`,
                nameAr: 'فيزياء الصف الأول',
            },
        });
        subjectId = subject.id;
    });
    (0, vitest_1.afterAll)(async () => {
        // Cleanup academic test entities
        if (subjectId) {
            await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
        }
        if (stageId) {
            await prisma_1.prisma.educationalStage.deleteMany({ where: { id: stageId } });
        }
        if (yearId) {
            await prisma_1.prisma.academicYear.deleteMany({ where: { id: yearId } });
        }
        await prisma_1.prisma.user.deleteMany({ where: { email: { contains: '-acad-' } } });
    });
    (0, vitest_1.describe)('Educational Stages API', () => {
        (0, vitest_1.it)('should allow ADMIN to create an educational stage', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/academic/stages')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                nameEn: 'Secondary Stage',
                nameAr: 'المرحلة الثانوية',
                code: `SEC_${Date.now()}`,
                sortOrder: 1,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.nameEn).toBe('Secondary Stage');
            stageId = res.body.data.id;
        });
        (0, vitest_1.it)('should deny non-ADMIN from creating an educational stage', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/academic/stages')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                nameEn: 'Unauthorized Stage',
                nameAr: 'مرحلة غير مصرحة',
                code: 'UNAUTH',
            });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('should list all educational stages publicly', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/v1/academic/stages');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });
    (0, vitest_1.describe)('Grades API', () => {
        (0, vitest_1.it)('should allow ADMIN to create a grade within a stage', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/academic/grades')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                stageId,
                nameEn: 'Grade 10 - 1st Secondary',
                nameAr: 'الصف الأول الثانوي',
                code: `G10_${Date.now()}`,
                sortOrder: 1,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.stageId).toBe(stageId);
            gradeId = res.body.data.id;
        });
        (0, vitest_1.it)('should list grades for a specific stage', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get(`/api/v1/academic/stages/${stageId}/grades`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data[0].id).toBe(gradeId);
        });
    });
    (0, vitest_1.describe)('Academic Years API', () => {
        (0, vitest_1.it)('should allow ADMIN to create an academic year', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/academic/years')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                name: '2026/2027',
                startDate: '2026-09-01T00:00:00.000Z',
                endDate: '2027-06-30T00:00:00.000Z',
                isActive: true,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.name).toBe('2026/2027');
            yearId = res.body.data.id;
        });
    });
    (0, vitest_1.describe)('Grade-Subject Association API', () => {
        (0, vitest_1.it)('should link a subject to a grade and academic year', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/academic/grade-subjects')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                gradeId,
                subjectId,
                academicYearId: yearId,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.gradeId).toBe(gradeId);
            (0, vitest_1.expect)(res.body.data.subjectId).toBe(subjectId);
        });
        (0, vitest_1.it)('should query subjects available for a student grade', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get(`/api/v1/academic/grades/${gradeId}/subjects`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data.some((s) => s.id === subjectId)).toBe(true);
        });
    });
});
