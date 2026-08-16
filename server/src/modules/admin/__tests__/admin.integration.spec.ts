import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Admin API Integration Tests', () => {
  let adminToken: string;
  let teacherToken: string;
  let pendingTeacherId: string;

  beforeAll(async () => {
    // Create admin user
    const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
    const admin = await prisma.user.create({
      data: {
        email: `admin-int-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Test Admin',
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminToken = generateAccessToken({ userId: admin.id, role: 'ADMIN', teacherStatus: null });

    // Create pending teacher
    const pendingTeacher = await prisma.user.create({
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
    teacherToken = generateAccessToken({ userId: pendingTeacher.id, role: 'TEACHER', teacherStatus: 'PENDING' });

    // Create some students for listing
    await prisma.user.create({
      data: {
        email: `student-admin-test-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Test Student',
        role: 'STUDENT',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: { contains: '-int-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { contains: '-pending-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { contains: '-admin-test-' },
      },
    });
  });

  describe('GET /api/v1/admin/stats', () => {
    it('should return platform stats for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.users.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.content).toBeDefined();
      expect(res.body.data.subscriptions).toBeDefined();
    });

    it('should deny stats access to non-admin (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should return paginated user list for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter users by role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?role=TEACHER')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      for (const user of res.body.data.users) {
        expect(user.role).toBe('TEACHER');
      }
    });
  });

  describe('GET /api/v1/admin/teachers/pending', () => {
    it('should list pending teachers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/teachers/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PATCH /api/v1/admin/teachers/:id/status', () => {
    it('should approve a pending teacher', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/teachers/${pendingTeacherId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teacherStatus).toBe('APPROVED');
    });

    it('should reject invalid status value', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/teachers/${pendingTeacherId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID' });

      expect(res.status).toBe(400);
    });

    it('should deny teacher status change to non-admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/teachers/${pendingTeacherId}/status`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });
  });
});
