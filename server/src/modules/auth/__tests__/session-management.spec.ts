import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import app from '../../../app';
import { prisma } from '../../../prisma';

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

/**
 * Session management hardening (Phase U2):
 * - refresh tokens are registered server-side and rotated on every refresh
 * - replaying a rotated-out token revokes the whole family (theft signal)
 * - logout revokes the presented session
 * - deactivation kills every live session
 * - the refresh token is delivered as an httpOnly cookie
 */
describe('Refresh Session Rotation & Revocation', () => {
  const ts = Date.now();
  let email: string;
  let userId: string;
  let adminId: string;
  const cleanupUsers: string[] = [];

  /**
   * Refresh tokens are no longer returned in JSON bodies (XSS hardening).
   * Tests extract the raw token from the httpOnly cookie instead.
   */
  function refreshTokenFromCookies(res: { headers: { [k: string]: unknown } }): string {
    const cookies = res.headers['set-cookie'] as unknown as string[];
    const rtCookie = cookies?.find((c) => c.startsWith('eduplat_rt='));
    expect(rtCookie).toBeDefined();
    return decodeURIComponent(rtCookie!.split(';')[0].split('=').slice(1).join('='));
  }

  async function loginAndGetTokens(password = 'Password123!') {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data.tokens.refreshToken).toBeUndefined();
    return {
      accessToken: res.body.data.tokens.accessToken as string,
      refreshToken: refreshTokenFromCookies(res),
    };
  }

  beforeAll(async () => {
    email = `session-${ts}@test.com`;
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: 'Session Tester',
        role: 'STUDENT',
        isActive: true,
      },
    });
    userId = user.id;
    cleanupUsers.push(userId);

    const admin = await prisma.user.create({
      data: {
        email: `session-admin-${ts}@test.com`,
        password: 'Password123!',
        name: 'Session Admin',
        role: 'ADMIN',
      },
    });
    adminId = admin.id;
    cleanupUsers.push(adminId);
  });

  afterAll(async () => {
    try {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: [userId, adminId] } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanupUsers } } });
    } catch {}
  });

  it('login sets an httpOnly refresh cookie and registers the session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' });

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const rtCookie = cookies.find((c) => c.startsWith('eduplat_rt='));
    expect(rtCookie).toBeDefined();
    expect(rtCookie).toContain('HttpOnly');

    const stored = await prisma.refreshToken.findMany({ where: { userId } });
    expect(stored.length).toBeGreaterThanOrEqual(1);
  });

  it('rotates on refresh: old token becomes revoked, new one works', async () => {
    const tokens = await loginAndGetTokens();

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });
    expect(res.status).toBe(200);
    // New refresh token is delivered via the cookie only, never the body.
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeUndefined();
    const rotatedCookie = refreshTokenFromCookies(res);
    expect(rotatedCookie).not.toBe(tokens.refreshToken);

    const oldRow = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(tokens.refreshToken) },
    });
    expect(oldRow?.revokedAt).toBeTruthy();
  });

  it('replaying a rotated-out token revokes ALL sessions of that user', async () => {
    // Fresh family
    const tokens = await loginAndGetTokens();
    const second = await loginAndGetTokens();

    // Burn the first token once (legit rotation)
    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });

    // Replay the burned token -> theft signal
    const replay = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });
    expect(replay.status).toBe(401);

    // The parallel family must now be dead too
    const victim = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: second.refreshToken });
    expect(victim.status).toBe(401);

    const live = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
    });
    expect(live.length).toBe(0);
  });

  it('logout revokes the presented session', async () => {
    const tokens = await loginAndGetTokens();

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `eduplat_rt=${tokens.refreshToken}`);
    expect(res.status).toBe(200);

    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(tokens.refreshToken) },
    });
    expect(row?.revokedAt).toBeTruthy();
  });

  it('deactivation revokes every live session immediately', async () => {
    const tokens = await loginAndGetTokens();
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken })).status).toBe(200);

    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });
    expect(res.status).toBe(401);

    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  });
});
