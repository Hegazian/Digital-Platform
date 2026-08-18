import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import bcrypt from 'bcrypt';
import { generateSecret, generateSync } from 'otplib';

describe('MFA Enforcement at Login (TDD)', () => {
  let userWithoutMfaEmail: string;
  let userWithMfaEmail: string;
  let mfaSecret: string;
  let mfaSessionToken: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // 1. User without MFA
    userWithoutMfaEmail = `no-mfa-${Date.now()}@test.com`;
    await prisma.user.create({
      data: {
        email: userWithoutMfaEmail,
        password: hashedPassword,
        name: 'No MFA User',
        role: 'STUDENT',
        mfaEnabled: false,
      },
    });

    // 2. User with MFA enabled
    mfaSecret = generateSecret();
    userWithMfaEmail = `with-mfa-${Date.now()}@test.com`;
    await prisma.user.create({
      data: {
        email: userWithMfaEmail,
        password: hashedPassword,
        name: 'MFA User',
        role: 'STUDENT',
        mfaSecret,
        mfaEnabled: true,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email: { in: [userWithoutMfaEmail, userWithMfaEmail] },
        },
      });
    } catch (e) {}
  });

  it('should issue tokens directly when user has NO MFA enabled', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userWithoutMfaEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
  });

  it('should require MFA challenge (return mfaRequired & mfaSessionToken) when MFA is enabled', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userWithMfaEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mfaRequired).toBe(true);
    expect(res.body.data.mfaSessionToken).toBeDefined();
    expect(res.body.data.tokens).toBeUndefined();

    mfaSessionToken = res.body.data.mfaSessionToken;
  });

  it('should REJECT invalid TOTP code during MFA challenge with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/mfa-login')
      .send({
        mfaSessionToken,
        mfaCode: '000000',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid.*code/i);
  });

  it('should ACCEPT valid TOTP code during MFA challenge and issue tokens', async () => {
    const validCode = generateSync({ secret: mfaSecret });

    const res = await request(app)
      .post('/api/v1/auth/mfa-login')
      .send({
        mfaSessionToken,
        mfaCode: validCode,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(userWithMfaEmail);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
  });
});
