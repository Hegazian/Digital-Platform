import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { generateSecret, generateSync } from 'otplib';
import { prisma } from '../../../prisma';
import app from '../../../app';
import { generateAccessToken } from '../../../utils/jwt';
import { encryptMfaSecret } from '../../../utils/mfa-crypto';
import { verifyTotpToken } from '../../../utils/totp';

describe('MFA review: reset versus in-flight enrollment', () => {
  let operator: string, target: string, operatorToken: string;
  beforeAll(async () => {
    operator = (await prisma.user.create({ data: { email: `operator-${randomUUID()}@mfa.test`, password: 'fixture', name: 'Operator', role: 'ADMIN' } })).id;
    target = (await prisma.user.create({ data: { email: `target-${randomUUID()}@mfa.test`, password: 'fixture', name: 'Target', role: 'STUDENT' } })).id;
    const account = await prisma.user.findUniqueOrThrow({ where: { id: operator } });
    operatorToken = generateAccessToken({ userId: operator, role: 'ADMIN', authVersion: account.authVersion });
  });
  afterAll(async () => { vi.restoreAllMocks(); await prisma.user.deleteMany({ where: { id: { in: [operator, target] } } }); });

  it('a reset cannot be undone by an already-running enrollment confirmation', async () => {
    const oldSecret = generateSecret(), pendingSecret = generateSecret();
    const current = await prisma.user.update({ where: { id: target }, data: {
      mfaEnabled: true, mfaSecret: encryptMfaSecret(oldSecret), mfaPendingSecret: encryptMfaSecret(pendingSecret),
      mfaPendingExpiresAt: new Date(Date.now() + 60_000), mfaLastTimeStep: null,
    } });
    const token = generateAccessToken({ userId: target, role: 'STUDENT', authVersion: current.authVersion });
    let reached!: () => void, resume!: () => void;
    const ready = new Promise<void>(resolve => { reached = resolve; });
    const paused = new Promise<void>(resolve => { resume = resolve; });
    const read = prisma.user.findUnique.bind(prisma.user);
    let intercepted = false;
    const spy = vi.spyOn(prisma.user, 'findUnique').mockImplementation((async (args: any) => {
      const snapshot = await read(args);
      if (args.where.id === target && !args.select && !intercepted) {
        intercepted = true; reached(); await paused;
      }
      return snapshot;
    }) as any);
    try {
      const pending = request(app).post('/api/v1/mfa/verify').set('Authorization', `Bearer ${token}`)
        .send({ token: generateSync({ secret: pendingSecret }) }).then(response => response);
      await ready;
      const reset = await request(app).post(`/api/v1/mfa/admin-reset/${target}`).set('Authorization', `Bearer ${operatorToken}`)
        .send({ reason: 'Confirmed identity recovery during enrollment' });
      expect(reset.status).toBe(200);
      resume();
      expect((await pending).status).toBe(409);
      expect(await prisma.user.findUniqueOrThrow({ where: { id: target } })).toMatchObject({ mfaEnabled: false, mfaSecret: null, mfaPendingSecret: null });
      expect(await prisma.mfaRecoveryCode.count({ where: { userId: target } })).toBe(0);
      expect(await verifyTotpToken(target, oldSecret, generateSync({ secret: oldSecret }))).toBe(false);
    } finally { resume(); spy.mockRestore(); }
  });
});
