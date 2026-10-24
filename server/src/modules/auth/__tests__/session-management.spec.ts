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
 * - replaying an old rotated token revokes only that session family
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

  it('replaying an old rotated token revokes only its session family', async () => {
    const tokens = await loginAndGetTokens();
    const second = await loginAndGetTokens();

    // Rotate the first family, then age the consumed token outside the
    // five-second concurrent-tab race window to model delayed token theft.
    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });
    const firstRow = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(tokens.refreshToken) } });
    expect(firstRow?.familyId).toBeTruthy();
    await prisma.refreshToken.update({ where: { id: firstRow!.id }, data: { consumedAt: new Date(Date.now() - 6_000) } });

    // Replay outside the race window -> revoke this family only.
    const replay = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });
    expect(replay.status).toBe(401);

    // An unrelated device family stays valid.
    const otherFamily = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: second.refreshToken });
    expect(otherFamily.status).toBe(200);

    const familyRows = await prisma.refreshToken.findMany({ where: { familyId: firstRow!.familyId } });
    expect(familyRows.every((row) => row.revokedAt !== null)).toBe(true);
  });

  it('revoking a family while its successor rotates leaves no live descendant', async () => {
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const tokens = await loginAndGetTokens();
      const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
      expect(first.status).toBe(200);
      const successor = refreshTokenFromCookies(first);
      const root = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: sha256(tokens.refreshToken) } });
      await prisma.refreshToken.update({ where: { id: root.id }, data: { consumedAt: new Date(Date.now() - 6_000) } });
      const [replay, rotation] = await Promise.all([
        request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }),
        request(app).post('/api/v1/auth/refresh').send({ refreshToken: successor }),
      ]);
      expect(replay.status).toBe(401);
      expect([200, 401]).toContain(rotation.status);
      expect(await prisma.refreshToken.count({ where: { familyId: root.familyId, revokedAt: null } })).toBe(0);
    }
  });

  it('allows only one successor during 20 concurrent refreshes and returns a recoverable conflict to losers', async () => {
    const tokens = await loginAndGetTokens();
    const outcomes = await Promise.all(Array.from({ length: 20 }, () => request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })));

    expect(outcomes.filter((res) => res.status === 200)).toHaveLength(1);
    expect(outcomes.filter((res) => res.status === 409)).toHaveLength(19);
    expect(outcomes.find((res) => res.status === 409)?.body.code).toBe('REFRESH_ALREADY_ROTATED');
    const winnerToken = refreshTokenFromCookies(outcomes.find((res) => res.status === 200)!);
    const oldRow = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(tokens.refreshToken) } });
    const familyRows = await prisma.refreshToken.findMany({ where: { familyId: oldRow!.familyId } });
    expect(familyRows.filter((row) => row.parentTokenId === oldRow!.id)).toHaveLength(1);
    expect(familyRows.filter((row) => row.revokedAt === null)).toHaveLength(1);

    const retry = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: winnerToken });
    expect(retry.status).toBe(200);
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
    const rotated = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(rotated.status).toBe(200);
    const currentToken = refreshTokenFromCookies(rotated);

    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: currentToken });
    expect(res.status).toBe(401);
    const live = await prisma.refreshToken.findMany({ where: { userId, revokedAt: null } });
    expect(live).toHaveLength(0);

    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  });
});
