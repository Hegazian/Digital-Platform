import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import { egpToUsd } from '../../../utils/currency';

/**
 * Configuration-driven platform branding (regression lock).
 *
 * PREVIOUS STATE (bugs these tests prevent from returning):
 * - site name/slogan were hardcoded 'EduPlatform' strings in components
 *   -> now served by GET /config and rendered client-side
 * - PUT /config silently dropped hostDomain/supportEmail/currency/
 *   requireCourseApproval on existing rows (create-only defaults)
 *   -> update path persists every provided field
 * - primaryColor/allowTeacherRegistration existed in DB/UI but nothing
 *   consumed them at runtime
 */
describe('Config-driven branding & settings round-trip', () => {
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const ts = Date.now();
    async function makeUser(email: string, role: 'ADMIN' | 'STUDENT') {
      const bcrypt = await import('bcrypt');
      const u = await prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash('Password123!', 10),
          name: email.split('@')[0],
          role,
          isActive: true,
        },
      });
      return u;
    }
    const admin = await makeUser(`cfg-admin-${ts}@test.com`, 'ADMIN');
    const student = await makeUser(`cfg-student-${ts}@test.com`, 'STUDENT');

    adminToken = generateAccessToken({ userId: admin.id, role: 'ADMIN' });
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });

    // Ensure a clean single row state for deterministic assertions
    await prisma.appConfig.deleteMany();
  });

  afterAll(async () => {
    try {
      // Leave a fresh default row behind (app expects one to exist)
      await prisma.appConfig.deleteMany();
      await prisma.appConfig.create({ data: {} });
      const tokens = [adminToken, studentToken]
        .map((t) => {
          try {
            return JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString()).userId as string;
          } catch {
            return '';
          }
        })
        .filter(Boolean);
      if (tokens.length) {
        await prisma.refreshToken.deleteMany({ where: { userId: { in: tokens } } });
        await prisma.user.deleteMany({ where: { id: { in: tokens } } });
      }
    } catch {}
  });

  it('GET /config auto-creates defaults including new slogan columns', async () => {
    const res = await request(app).get('/api/v1/config');
    expect(res.status).toBe(200);
    expect(res.body.data.siteNameEn).toBe('EduPlatform');
    expect(res.body.data.sloganEn).toBe('');
    expect(res.body.data.hostDomain).toBe('localhost:3000');
    expect(res.body.data.currency).toBe('EGP');
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.requireCourseApproval).toBe(true);
    expect(res.body.data.capabilities).toEqual({ codeExecution: false, collaborativeBoards: false, developerIntegrations: false, automatedPaymentGateways: false });
  });

  it('PUT /config persists EVERY advertised field (previous bug: partial drop)', async () => {
    const payload = {
      siteNameEn: 'Mawsoaa Academy',
      siteNameAr: 'أكاديمية موسوعة',
      sloganEn: 'Where future engineers are built',
      sloganAr: 'حيث يُصنع مهندسو الغد',
      siteDescriptionEn: 'Egyptian secondary STEM, personalized.',
      hostDomain: 'learn.mawsoaa.com',
      supportEmail: 'hello@mawsoaa.com',
      currency: 'EGP',
      exchangeRateUsdToEgp: 49,
      requireCourseApproval: false,
      allowTeacherRegistration: false,
      primaryColor: '#7c3aed',
      expectedVersion: (await request(app).get('/api/v1/config')).body.data.version,
    };

    const put = await request(app)
      .put('/api/v1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect(put.status).toBe(200);

    // Read back via PUBLIC endpoint: what the app will actually render.
    const get = await request(app).get('/api/v1/config');
    const cfg = get.body.data;
    expect(cfg.siteNameEn).toBe(payload.siteNameEn);
    expect(cfg.siteNameAr).toBe(payload.siteNameAr);
    expect(cfg.sloganEn).toBe(payload.sloganEn);
    expect(cfg.sloganAr).toBe(payload.sloganAr);
    expect(cfg.siteDescriptionEn).toBe(payload.siteDescriptionEn);
    expect(cfg.hostDomain).toBe(payload.hostDomain);
    expect(cfg.supportEmail).toBe(payload.supportEmail);
    expect(cfg.requireCourseApproval).toBe(true);
    expect(cfg.enableCodePlaygrounds).toBe(false);
    expect(cfg.enableCollaborativeBoards).toBe(false);
    expect(cfg.allowTeacherRegistration).toBe(false);
    expect(cfg.primaryColor).toBe('#7c3aed');
    expect(cfg.version).toBe(payload.expectedVersion + 1);
    expect(Number(cfg.exchangeRateUsdToEgp)).toBe(49);
    expect(cfg.capabilities.developerIntegrations).toBe(false);
    expect(put.body.data.capabilities).toEqual(cfg.capabilities);
  });

  it('PATCH also works and supports partial updates and nullable descriptions', async () => {
    const patch = await request(app)
      .patch('/api/v1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        expectedVersion: (await request(app).get('/api/v1/config')).body.data.version,
        sloganEn: 'Today’s students. Tomorrow’s doctors.',
        siteDescriptionEn: null,
        siteDescriptionAr: null,
        exchangeRateUsdToEgp: 50,
      });
    expect(patch.status).toBe(200);

    const get = await request(app).get('/api/v1/config');
    expect(get.body.data.sloganEn).toBe('Today’s students. Tomorrow’s doctors.');
    expect(Number(get.body.data.exchangeRateUsdToEgp)).toBe(50);
    expect(await egpToUsd(50)).toBe(1);
    // Partial patch must not have clobbered other fields:
    expect(get.body.data.siteNameEn).toBe('Mawsoaa Academy');
  });

  it('rejects unknown or non-EGP fields and stale concurrent edits', async () => {
    const version = (await request(app).get('/api/v1/config')).body.data.version;
    const unknown = await request(app)
      .patch('/api/v1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ expectedVersion: version, capabilities: { developerIntegrations: true } });
    expect(unknown.status).toBe(400);

    const otherCurrency = await request(app)
      .patch('/api/v1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ expectedVersion: version, currency: 'USD' });
    expect(otherCurrency.status).toBe(400);

    const [first, second] = await Promise.all([
      request(app).patch('/api/v1/config').set('Authorization', `Bearer ${adminToken}`).send({ expectedVersion: version, sloganEn: 'First write' }),
      request(app).patch('/api/v1/config').set('Authorization', `Bearer ${adminToken}`).send({ expectedVersion: version, sloganEn: 'Second write' }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect([first.body.code, second.body.code].filter(Boolean)).toEqual(['CONFIG_VERSION_CONFLICT']);
  });

  it('validation: rejects invalid colors/emails; students cannot write', async () => {
    const bad = await request(app)
      .put('/api/v1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ expectedVersion: (await request(app).get('/api/v1/config')).body.data.version, primaryColor: 'not-a-color', supportEmail: 'nope' });
    expect(bad.status).toBe(400);

    const forbidden = await request(app)
      .put('/api/v1/config')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ expectedVersion: 1, siteNameEn: 'Hacked' });
    expect(forbidden.status).toBe(403);

    const anon = await request(app).put('/api/v1/config').send({ expectedVersion: 1, siteNameEn: 'Hacked' });
    expect(anon.status).toBe(401);
  });
});
