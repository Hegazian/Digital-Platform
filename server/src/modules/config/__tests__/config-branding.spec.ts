import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../prisma';
import { persistConfigRevision } from '../config.controller';
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
    const saved = first.status === 200 ? first : second;
    const current = await request(app).get('/api/v1/config');
    expect(saved.body.data.version).toBe(version + 1);
    expect(['First write', 'Second write']).toContain(saved.body.data.sloganEn);
    expect(current.body.data.version).toBe(saved.body.data.version);
    expect(current.body.data.sloganEn).toBe(saved.body.data.sloganEn);

    const stale = await request(app).patch('/api/v1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ expectedVersion: version, sloganEn: 'Stale overwrite' });
    expect(stale.status).toBe(409);
    expect((await request(app).get('/api/v1/config')).body.data.sloganEn).toBe(saved.body.data.sloganEn);
  });

  it('keeps the conditional config write locked through its readback when a real PostgreSQL writer races', async () => {
    const config = await prisma.appConfig.findFirstOrThrow();
    const version = config.version;
    const readbackReached = deferred<void>();
    const allowReadback = deferred<void>();
    const staleUpdateStarted = deferred<void>();
    let holdReadback = true;
    let observeStaleUpdate = false;
    const controlledTransaction = <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => prisma.$transaction<T>((tx) => callback(new Proxy(tx, {
      get(target, property) {
        if (property !== 'appConfig') return Reflect.get(target, property, target);
        return new Proxy(target.appConfig, {
          get(delegate, methodName) {
            const method = Reflect.get(delegate, methodName, delegate);
            if (methodName === 'findUnique') {
              return async (args: any) => {
                if (holdReadback) {
                  holdReadback = false;
                  readbackReached.resolve();
                  await allowReadback.promise;
                }
                return method.call(delegate, args);
              };
            }
            if (methodName === 'updateMany') {
              return (args: any) => {
                if (observeStaleUpdate && args.where?.version === version) {
                  observeStaleUpdate = false;
                  staleUpdateStarted.resolve();
                }
                return method.call(delegate, args);
              };
            }
            return typeof method === 'function' ? method.bind(delegate) : method;
          },
        });
      },
    }) as Prisma.TransactionClient), { timeout: 12_000 });
    const write = (sloganEn: string) => persistConfigRevision(
      controlledTransaction,
      config.id,
      version,
      { sloganEn },
    );
    const firstWrite = write('Barrier writer A');
    let secondWrite: Promise<unknown> | undefined;
    try {
      await waitForBarrier(readbackReached.promise, 'the transactional readback');
      observeStaleUpdate = true;
      const competingWrite = write('Barrier writer B');
      secondWrite = competingWrite;
      await waitForBarrier(staleUpdateStarted.promise, 'the competing conditional update');
      // Let writer A finish its transactional readback so PostgreSQL can let
      // writer B recheck the version predicate and report a zero-row update.
      allowReadback.resolve();
      const [first, second] = await Promise.all([firstWrite, competingWrite]);
      expect(first?.sloganEn).toBe('Barrier writer A');
      expect(first?.version).toBe(version + 1);
      expect(second).toBeNull();

      const persisted = await prisma.appConfig.findUniqueOrThrow({ where: { id: config.id } });
      expect(persisted.sloganEn).toBe(first?.sloganEn);
      expect(persisted.version).toBe(first?.version);
    } finally {
      allowReadback.resolve();
      await Promise.allSettled([firstWrite, ...(secondWrite ? [secondWrite] : [])]);
    }
  }, 15_000);

  it('recalculates product display USD while preserving the EGP and USD order snapshots', async () => {
    const initial = (await request(app).get('/api/v1/config')).body.data;
    const initialRate = Number(initial.exchangeRateUsdToEgp);
    const productName = `Historical snapshot test product ${randomUUID()}`;
    let productId: string | undefined;
    let orderId: string | undefined;

    try {
      const createdProduct = await request(app)
        .post('/api/v1/commerce/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nameEn: productName,
          nameAr: 'منتج اختبار سجل السعر',
          productType: 'SUBJECT',
          resourceId: randomUUID(),
          priceEgp: 900,
        });
      productId = createdProduct.body.data?.id;
      expect(createdProduct.status).toBe(201);

      const createdOrder = await request(app)
        .post('/api/v1/commerce/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          productId,
          paymentMethod: 'MANUAL',
          idempotencyKey: `snapshot-order-${randomUUID()}`,
        });
      expect(createdOrder.status).toBe(201);
      orderId = createdOrder.body.data.id;
      const originalEgp = Number(createdOrder.body.data.totalAmountEgp);
      const originalUsd = Number(createdOrder.body.data.totalAmountUsd);

      const changedRate = initialRate === 60 ? 75 : 60;
      const changed = await request(app)
        .patch('/api/v1/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expectedVersion: (await request(app).get('/api/v1/config')).body.data.version,
          exchangeRateUsdToEgp: changedRate,
        });
      expect(changed.status).toBe(200);

      const catalog = await request(app).get('/api/v1/commerce/products');
      const currentProduct = catalog.body.data.find((product: any) => product.id === productId);
      expect(Number(currentProduct.priceEgp)).toBe(originalEgp);
      expect(Number(currentProduct.priceUsd)).toBe(Math.round((originalEgp / changedRate) * 100) / 100);

      const history = await request(app)
        .get('/api/v1/commerce/orders/me')
        .set('Authorization', `Bearer ${studentToken}`);
      const historicalOrder = history.body.data.find((order: any) => order.id === orderId);
      expect(Number(historicalOrder.totalAmountEgp)).toBe(originalEgp);
      expect(Number(historicalOrder.totalAmountUsd)).toBe(originalUsd);
    } finally {
      try {
        const current = (await request(app).get('/api/v1/config')).body.data;
        if (Number(current.exchangeRateUsdToEgp) !== initialRate) {
          await request(app)
            .patch('/api/v1/config')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ expectedVersion: current.version, exchangeRateUsdToEgp: initialRate });
        }
      } finally {
        if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
        if (productId) await prisma.product.deleteMany({ where: { id: productId } });
      }
    }
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function waitForBarrier(promise: Promise<void>, description: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Did not reach ${description}`)), 3_000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
