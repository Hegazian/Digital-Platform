import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../../prisma';

describe('one-time administrator provisioning', () => {
  const email = `bootstrap-${randomUUID()}@test.invalid`;
  const password = `M0-${randomUUID()}!`;
  afterAll(async () => { await prisma.user.deleteMany({ where: { email } }); });
  it('requires opt-in, creates an account once, and never overwrites it', async () => {
    const run = (allowed: boolean, value = password) => spawnSync(process.execPath, ['create-admin.js', email], { env: { ...process.env, ALLOW_INITIAL_ADMIN_PROVISIONING: String(allowed), INITIAL_ADMIN_PASSWORD: value }, encoding: 'utf8' });
    expect(run(false).status).toBe(1);
    expect(await prisma.user.count({ where: { email } })).toBe(0);
    expect(run(true).status).toBe(0);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe('ADMIN');
    expect(await bcrypt.compare(password, user.password)).toBe(true);
    expect(run(true, 'Replacement-password-123!').status).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).password).toBe(user.password);
  });
});
