import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';
import { generateSync } from 'otplib';

describe('Multi-Factor Authentication (MFA) API (TDD)', () => {
  let adminToken: string;
  let adminId: string;
  let mfaSecret: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `admin_mfa_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'MFA Admin',
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
      await prisma.user.deleteMany({ where: { email: { contains: 'admin_mfa_' } } });
    } catch (e) {}
  });

  it('POST /api/v1/mfa/setup - should generate MFA secret and QR code', async () => {
    const res = await request(app)
      .post('/api/v1/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.qrCode).toBeDefined();
    mfaSecret = res.body.data.secret;
  });

  it('POST /api/v1/mfa/verify - should verify valid TOTP token and enable MFA', async () => {
    const validToken = generateSync({ secret: mfaSecret });

    const res = await request(app)
      .post('/api/v1/mfa/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ token: validToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await prisma.user.findUnique({ where: { id: adminId } });
    expect(user?.mfaEnabled).toBe(true);
  });

  it('POST /api/v1/mfa/verify - should reject invalid TOTP token', async () => {
    const res = await request(app)
      .post('/api/v1/mfa/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ token: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
