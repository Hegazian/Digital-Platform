import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Developer API Tokens (TDD)', () => {
  let adminToken: string;
  let adminId: string;
  let apiTokenId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `admin_dev_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Developer Admin',
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
      await prisma.apiToken.deleteMany();
      await prisma.user.deleteMany({ where: { email: { contains: 'admin_dev_' } } });
    } catch (e) {}
  });

  it('POST /api/v1/developer/tokens - should create a new API token', async () => {
    const res = await request(app)
      .post('/api/v1/developer/tokens')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Zapier Integration Token',
        scopes: ['read:users', 'write:enrollments'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.token).toBeDefined(); // Only returned once!
    apiTokenId = res.body.data.id;
  });

  it('GET /api/v1/developer/tokens - should list API tokens', async () => {
    const res = await request(app)
      .get('/api/v1/developer/tokens')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].token).toBeUndefined(); // Should not return raw token on list
  });
});
