import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Developer Webhooks (TDD)', () => {
  let adminToken: string;
  let adminId: string;
  let webhookId: string | undefined;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `admin_webhooks_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Webhook Admin',
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
      if (webhookId) await prisma.webhookEndpoint.deleteMany({ where: { id: webhookId, userId: adminId } });
      await prisma.user.deleteMany({ where: { email: { contains: 'admin_webhooks_' } } });
    } catch (e) {}
  });

  it('POST /api/v1/developer/webhooks - should register a new webhook endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/developer/webhooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        url: 'https://hooks.zapier.com/hooks/catch/12345/abcde/',
        events: ['user.created', 'course.completed'],
      });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });

  it('GET /api/v1/developer/webhooks - should list registered webhooks', async () => {
    const res = await request(app)
      .get('/api/v1/developer/webhooks')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });
});
