import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';
import { logAuditAction } from '../audit.service';

describe('Immutable Audit Trails (TDD)', () => {
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `admin_audit_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Audit Admin',
        role: 'ADMIN',
      },
    });
    adminId = admin.id;

    adminToken = generateAccessToken({
      userId: admin.id,
      role: 'ADMIN',
      teacherStatus: null,
    });
  });

  afterAll(async () => {
    try {
      await prisma.auditLog.deleteMany();
      await prisma.user.deleteMany({ where: { email: { contains: 'admin_audit_' } } });
    } catch (e) {}
  });

  it('AuditService - should securely log an action', async () => {
    await logAuditAction(adminId, 'USER_DELETED', 'test-user-id', 'User', { reason: 'Violation' }, '127.0.0.1');
    const logs = await prisma.auditLog.findMany({ where: { userId: adminId } });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('USER_DELETED');
  });

  it('GET /api/v1/audit - should list audit logs for admins', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
