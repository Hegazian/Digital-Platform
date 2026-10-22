import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '../../../prisma';
import { AdminService } from '../admin.service';
import { assertDedicatedTestDatabase } from '../../../utils/test-database';

describe('last active administrator PostgreSQL races', () => {
  it.each([false, true])('retains an administrator during concurrent deactivation/demotion (mixed=%s)', async (mixed) => {
    assertDedicatedTestDatabase();
    const previous = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    const ids = [randomUUID(), randomUUID()];
    const realTransaction = prisma.$transaction.bind(prisma);
    let reads = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    try {
      await prisma.user.updateMany({ where: { id: { in: previous.map((u) => u.id) } }, data: { isActive: false } });
      await prisma.user.createMany({ data: ids.map((id) => ({ id, email: `${id}@race.invalid`, password: 'inert-test-hash', name: 'Race admin', role: 'ADMIN', isActive: true })) });
      // Both real transactions observe count=2 before either writes. Retried
      // transactions use a fresh snapshot and do not wait at the barrier again.
      vi.spyOn(prisma, '$transaction').mockImplementation(((work: any, options: any) => realTransaction(async (tx: any) => work(new Proxy(tx, {
        get(target, property) {
          if (property !== 'user') return target[property];
          return new Proxy(target.user, {
            get(user, method) {
              if (method !== 'count') return user[method];
              return async (...args: any[]) => {
                const count = await user.count(...args);
                if (++reads <= 2) {
                  if (reads === 2) release();
                  await barrier;
                }
                return count;
              };
            },
          });
        },
      })), options)) as any);
      const results = await Promise.allSettled([
        AdminService.setUserActiveStatus(ids[0], false),
        mixed ? AdminService.updateUser(ids[1], { role: 'STUDENT' }) : AdminService.setUserActiveStatus(ids[1], false),
      ]);
      expect(reads).toBeGreaterThanOrEqual(2);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
      expect(await prisma.user.count({ where: { id: { in: ids }, role: 'ADMIN', isActive: true } })).toBe(1);
    } finally {
      release();
      vi.restoreAllMocks();
      await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.user.updateMany({ where: { id: { in: previous.map((u) => u.id) } }, data: { isActive: true } });
    }
  });
});
