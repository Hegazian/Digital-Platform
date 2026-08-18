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
const audit_service_1 = require("../audit.service");
(0, vitest_1.describe)('Immutable Audit Trails (TDD)', () => {
    let adminToken;
    let adminId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: `admin_audit_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'Audit Admin',
                role: 'ADMIN',
            },
        });
        adminId = admin.id;
        adminToken = (0, jwt_1.generateAccessToken)({
            userId: admin.id,
            role: 'ADMIN',
            teacherStatus: null,
        });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.auditLog.deleteMany();
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'admin_audit_' } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('AuditService - should securely log an action', async () => {
        await (0, audit_service_1.logAuditAction)(adminId, 'USER_DELETED', 'test-user-id', 'User', { reason: 'Violation' }, '127.0.0.1');
        const logs = await prisma_1.prisma.auditLog.findMany({ where: { userId: adminId } });
        (0, vitest_1.expect)(logs.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(logs[0].action).toBe('USER_DELETED');
    });
    (0, vitest_1.it)('GET /api/v1/audit - should list audit logs for admins', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/audit')
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
        (0, vitest_1.expect)(res.body.data.length).toBeGreaterThan(0);
    });
});
