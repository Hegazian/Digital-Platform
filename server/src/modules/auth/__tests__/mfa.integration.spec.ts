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

  it('GET /api/v1/auth/profile - initially returns mfaEnabled: false and strips mfaSecret', async () => {
    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mfaEnabled).toBe(false);
    expect(res.body.data.mfaSecret).toBeUndefined();
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

  it('GET /api/v1/auth/profile - returns mfaEnabled: true after verification and no secret', async () => {
    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mfaEnabled).toBe(true);
    expect(res.body.data.mfaSecret).toBeUndefined();
  });

  it('POST /api/v1/mfa/verify - should reject invalid TOTP token', async () => {
    const res = await request(app)
      .post('/api/v1/mfa/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ token: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/mfa/setup - preserves an enabled factor when replacement is unavailable', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { mfaEnabled: true, mfaSecret: true } });
    // Reset consumed time step so current time window is accepted as a new code
    await prisma.user.update({
      where: { id: adminId },
      data: { mfaLastTimeStep: null },
    });

    // 1. Without credentials
    const resNoCreds = await request(app)
      .post('/api/v1/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(resNoCreds.status).toBe(409);
    expect(resNoCreds.body.message).toContain('MFA is already enabled');

    // 2. With wrong password
    const currentTotp = generateSync({ secret: mfaSecret });
    const resWrongPass = await request(app)
      .post('/api/v1/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'WrongPassword!', currentToken: currentTotp });
    expect(resWrongPass.status).toBe(409);

    // 3. With wrong TOTP code
    const resWrongTotp = await request(app)
      .post('/api/v1/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'password123', currentToken: '000000' });
    expect(resWrongTotp.status).toBe(409);

    // 4. With valid current password and valid current TOTP code
    const resSuccess = await request(app)
      .post('/api/v1/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'password123', currentToken: currentTotp });
    expect(resSuccess.status).toBe(409);
    expect(resSuccess.body.data).toBeUndefined();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { mfaEnabled: true, mfaSecret: true } });
    expect(after).toEqual(before);
  });
});
