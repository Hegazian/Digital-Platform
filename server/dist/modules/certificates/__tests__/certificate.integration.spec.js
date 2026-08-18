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
const bcrypt_1 = __importDefault(require("bcrypt"));
(0, vitest_1.describe)('Automated Course Certificates API (TDD)', () => {
    let studentToken;
    let studentId;
    let certificateCode;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student_cert_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'Certificate Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({
            userId: student.id,
            role: 'STUDENT',
            teacherStatus: null,
        });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.certificate.deleteMany();
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'student_cert_' } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('POST /api/v1/certificates/issue - should generate certificate PDF buffer and code', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/certificates/issue')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
            courseId: 'demo-course-id',
            courseName: 'Physics 1st Secondary',
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.certificateCode).toBeDefined();
        certificateCode = res.body.data.certificateCode;
    });
    (0, vitest_1.it)('GET /api/v1/certificates/verify/:code - should verify certificate by code', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/certificates/verify/${certificateCode}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.certificateCode).toBe(certificateCode);
    });
});
