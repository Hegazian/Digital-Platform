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
(0, vitest_1.describe)('Admin API Integration Tests', () => {
    let adminToken;
    let teacherToken;
    let pendingTeacherId;
    (0, vitest_1.beforeAll)(async () => {
        // Create admin user
        const hashedPassword = await bcrypt_1.default.hash('AdminPass123!', 10);
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: `admin-int-${Date.now()}@test.com`,
                password: hashedPassword,
                name: 'Test Admin',
                role: 'ADMIN',
                isActive: true,
            },
        });
        adminToken = (0, jwt_1.generateAccessToken)({ userId: admin.id, role: 'ADMIN', teacherStatus: null });
        // Create pending teacher
        const pendingTeacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher-pending-${Date.now()}@test.com`,
                password: hashedPassword,
                name: 'Pending Teacher',
                role: 'TEACHER',
                teacherStatus: 'PENDING',
                isActive: true,
            },
        });
        pendingTeacherId = pendingTeacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({ userId: pendingTeacher.id, role: 'TEACHER', teacherStatus: 'PENDING' });
        // Create some students for listing
        await prisma_1.prisma.user.create({
            data: {
                email: `student-admin-test-${Date.now()}@test.com`,
                password: hashedPassword,
                name: 'Test Student',
                role: 'STUDENT',
                isActive: true,
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        // Clean up test users
        await prisma_1.prisma.user.deleteMany({
            where: {
                email: { contains: '-int-' },
            },
        });
        await prisma_1.prisma.user.deleteMany({
            where: {
                email: { contains: '-pending-' },
            },
        });
        await prisma_1.prisma.user.deleteMany({
            where: {
                email: { contains: '-admin-test-' },
            },
        });
    });
    (0, vitest_1.describe)('GET /api/v1/admin/stats', () => {
        (0, vitest_1.it)('should return platform stats for admin', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.users).toBeDefined();
            (0, vitest_1.expect)(res.body.data.users.total).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(res.body.data.content).toBeDefined();
            (0, vitest_1.expect)(res.body.data.subscriptions).toBeDefined();
        });
        (0, vitest_1.it)('should deny stats access to non-admin (403)', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/admin/stats')
                .set('Authorization', `Bearer ${teacherToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/admin/users', () => {
        (0, vitest_1.it)('should return paginated user list for admin', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.users).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(res.body.data.users)).toBe(true);
            (0, vitest_1.expect)(res.body.data.pagination).toBeDefined();
            (0, vitest_1.expect)(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
        });
        (0, vitest_1.it)('should filter users by role', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/admin/users?role=TEACHER')
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            for (const user of res.body.data.users) {
                (0, vitest_1.expect)(user.role).toBe('TEACHER');
            }
        });
    });
    (0, vitest_1.describe)('GET /api/v1/admin/teachers/pending', () => {
        (0, vitest_1.it)('should list pending teachers', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/admin/teachers/pending')
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
        });
    });
    (0, vitest_1.describe)('PATCH /api/v1/admin/teachers/:id/status', () => {
        (0, vitest_1.it)('should approve a pending teacher', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/admin/teachers/${pendingTeacherId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'APPROVED' });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.teacherStatus).toBe('APPROVED');
        });
        (0, vitest_1.it)('should reject invalid status value', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/admin/teachers/${pendingTeacherId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'INVALID' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('should deny teacher status change to non-admin', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/admin/teachers/${pendingTeacherId}/status`)
                .set('Authorization', `Bearer ${teacherToken}`)
                .send({ status: 'APPROVED' });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
});
