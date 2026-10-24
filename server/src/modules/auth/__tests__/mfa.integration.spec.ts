import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';
import { generateSync } from 'otplib';
import { decryptMfaSecret, isEncryptedMfaSecret } from '../../../utils/mfa-crypto';
import { verifyTotpToken } from '../../../utils/totp';

describe('Multi-Factor Authentication (MFA) API (TDD)', () => {
  let adminToken: string;
  let adminId: string;
  let mfaSecret: string;
  let recoveryCodes: string[];

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
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.qrCode).toBeDefined();
    mfaSecret = res.body.data.secret;
    const repeated = await request(app).post('/api/v1/mfa/setup').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(repeated.status).toBe(200);
    expect(repeated.body.data.secret).toBe(mfaSecret);
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
    expect(res.body.data.recoveryCodes).toHaveLength(10);
    recoveryCodes = res.body.data.recoveryCodes;
    expect(isEncryptedMfaSecret(user!.mfaSecret!)).toBe(true);
    expect(decryptMfaSecret(user!.mfaSecret!)).toBe(mfaSecret);
  });

  it('consumes each recovery code once at MFA login', async () => {
    const profile = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
    const challenge = generateAccessToken({ userId: adminId, authVersion: profile.authVersion, purpose: 'mfa_challenge' });
    const rawCode = recoveryCodes[0];
    const first = await request(app).post('/api/v1/auth/mfa-login').send({ mfaSessionToken: challenge, mfaCode: rawCode });
    expect(first.status).toBe(200);
    const replay = await request(app).post('/api/v1/auth/mfa-login').send({ mfaSessionToken: challenge, mfaCode: rawCode });
    expect(replay.status).toBe(401);
  });

  it('atomically accepts a TOTP time step once under concurrent verification', async () => {
    await prisma.user.update({ where: { id: adminId }, data: { mfaLastTimeStep: null } });
    const code = generateSync({ secret: mfaSecret });
    const results = await Promise.all([
      verifyTotpToken(adminId, mfaSecret, code),
      verifyTotpToken(adminId, mfaSecret, code),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((result) => !result)).toHaveLength(1);
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

  it('POST /api/v1/mfa/setup - stages a replacement without disabling the current factor', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { mfaEnabled: true, mfaSecret: true } });
    // Reset consumed time step so current time window is accepted as a new code
    await prisma.user.update({
      where: { id: adminId },
      data: { mfaLastTimeStep: null },
    });

    // Wrong password and TOTP never replace the active factor.
    const currentTotp = generateSync({ secret: mfaSecret });
    const resWrongPass = await request(app)
      .post('/api/v1/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'WrongPassword!', currentToken: currentTotp });
    expect(resWrongPass.status).toBe(401);

    // 3. With wrong TOTP code
    const resWrongTotp = await request(app)
      .post('/api/v1/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'password123', currentToken: '000000' });
    expect(resWrongTotp.status).toBe(401);

    // Valid current credentials create a separate pending factor.
    const resSuccess = await request(app)
      .post('/api/v1/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'password123', currentToken: currentTotp });
    expect(resSuccess.status).toBe(200);
    expect(resSuccess.body.data.secret).toBeDefined();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { mfaEnabled: true, mfaSecret: true } });
    expect(after.mfaEnabled).toBe(true);
    expect(after.mfaSecret).toBe(before.mfaSecret);
    const pending = await prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { mfaPendingSecret: true, mfaPendingExpiresAt: true } });
    expect(pending.mfaPendingSecret).toBeTruthy();
    expect(pending.mfaPendingSecret).not.toBe(before.mfaSecret);
    expect(pending.mfaPendingExpiresAt!.getTime()).toBeGreaterThan(Date.now());

    const cancel = await request(app).post('/api/v1/mfa/cancel-setup').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(cancel.status).toBe(200);
    const afterCancel = await prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { mfaEnabled: true, mfaSecret: true, mfaPendingSecret: true } });
    expect(afterCancel).toEqual({ mfaEnabled: true, mfaSecret: before.mfaSecret, mfaPendingSecret: null });
  });

  it('requires admin authority and audits factor reset while revoking target sessions', async () => {
    const student = await prisma.user.create({
      data: { email: `mfa_student_${Date.now()}@eduplatform.com`, password: 'x', name: 'MFA Student', role: 'STUDENT' },
    });
    const studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });
    const denied = await request(app).post(`/api/v1/mfa/admin-reset/${adminId}`)
      .set('Authorization', `Bearer ${studentToken}`).send({ reason: 'Verified support request' });
    expect(denied.status).toBe(403);

    const before = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
    const success = await request(app).post(`/api/v1/mfa/admin-reset/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`).send({ reason: 'Verified identity recovery request' });
    expect(success.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
    expect(after.mfaEnabled).toBe(false);
    expect(after.mfaSecret).toBeNull();
    expect(after.authVersion).toBe(before.authVersion + 1);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'MFA_ADMIN_RESET', entityId: adminId, userId: adminId } });
    expect(audit?.details).toMatchObject({ reason: 'Verified identity recovery request' });
    await prisma.user.delete({ where: { id: student.id } });
  });
});
