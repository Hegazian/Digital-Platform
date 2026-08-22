import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { generateAccessToken } from '../../utils/jwt';
import { prisma } from '../../prisma';
import { Role } from '@prisma/client';

describe('Config API Endpoints', () => {
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    // authenticate() verifies the account is active in the DB (revocation check),
    // so the admin user must actually exist.
    const admin = await prisma.user.create({
      data: {
        email: `admin-config-test-${Date.now()}@edu.com`,
        password: 'pass',
        name: 'Config Admin',
        role: Role.ADMIN,
      },
    });
    adminId = admin.id;
    adminToken = generateAccessToken({
      userId: adminId,
      role: 'ADMIN',
      teacherStatus: null,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: adminId } }).catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  });

  it('GET /api/v1/config - should fetch default config', async () => {
    const res = await request(app).get('/api/v1/config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.siteNameEn).toBeDefined();
    expect(res.body.data.hostDomain).toBeDefined();
  });

  it('PUT /api/v1/config - should update platform settings and host domain for admins', async () => {
    const res = await request(app)
      .put('/api/v1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        siteNameEn: 'EduPlatform Master',
        hostDomain: 'learn.eduplatform.com',
        supportEmail: 'admin@eduplatform.com',
        currency: 'EGP',
        requireCourseApproval: true,
        enableCodePlaygrounds: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.siteNameEn).toBe('EduPlatform Master');
    expect(res.body.data.hostDomain).toBe('learn.eduplatform.com');
    expect(res.body.data.supportEmail).toBe('admin@eduplatform.com');
  });

  it('PATCH /api/v1/config - should update config for admins', async () => {
    const res = await request(app)
      .patch('/api/v1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        siteNameEn: 'Updated EduPlatform',
        enableCodePlaygrounds: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.siteNameEn).toBe('Updated EduPlatform');
  });

  it('PUT /api/v1/config - should reject unauthorized updates', async () => {
    const res = await request(app)
      .put('/api/v1/config')
      .send({
        siteNameEn: 'Hacked',
      });

    expect(res.status).toBe(401);
  });
});
