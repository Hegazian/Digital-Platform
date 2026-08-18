import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../prisma';
import { CommerceService } from '../commerce.service';
import { EntitlementType } from '@prisma/client';

describe('Voucher Concurrency & Atomic Redemption (TDD)', () => {
  let subjectId: string;
  let voucherCode: string;
  const studentIds: string[] = [];

  beforeAll(async () => {
    // 1. Create Subject
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Voucher Test Subject ${Date.now()}`,
        nameAr: 'مادة تجربة الكوبونات',
      },
    });
    subjectId = subject.id;

    // 2. Create 10 Students
    for (let i = 0; i < 10; i++) {
      const student = await prisma.user.create({
        data: {
          email: `voucher-student-${i}-${Date.now()}@test.com`,
          password: 'Password123!',
          name: `Student ${i}`,
          role: 'STUDENT',
        },
      });
      studentIds.push(student.id);
    }
  });

  afterAll(async () => {
    try {
      if (voucherCode) {
        await prisma.entitlement.deleteMany({ where: { resourceId: subjectId } });
        await prisma.voucher.deleteMany({ where: { code: voucherCode } });
      }
      for (const id of studentIds) {
        await prisma.user.deleteMany({ where: { id } });
      }
      if (subjectId) {
        await prisma.subject.deleteMany({ where: { id: subjectId } });
      }
    } catch (e) {}
  });

  it('should strictly respect maxUses=2 under heavy concurrent redemptions', async () => {
    voucherCode = `CONCUR-2X-${Date.now()}`;

    // Create voucher with maxUses = 2
    await CommerceService.createVoucher({
      code: voucherCode,
      resourceType: EntitlementType.SUBJECT,
      resourceId: subjectId,
      durationDays: 30,
      maxUses: 2,
    });

    // Fire 10 simultaneous redemption requests
    const redemptionPromises = studentIds.map((studentId) =>
      CommerceService.redeemVoucher(studentId, voucherCode)
        .then((res) => ({ success: true, res }))
        .catch((err) => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(redemptionPromises);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Exactly 2 must succeed, 8 must fail
    expect(successes.length).toBe(2);
    expect(failures.length).toBe(8);

    // Database verification: usedCount must be exactly 2
    const voucherInDb = await prisma.voucher.findUnique({
      where: { code: voucherCode },
    });
    expect(voucherInDb?.usedCount).toBe(2);

    // Database verification: exactly 2 entitlements granted
    const entitlements = await prisma.entitlement.findMany({
      where: { resourceId: subjectId, sourceType: 'VOUCHER' },
    });
    expect(entitlements.length).toBe(2);
  });
});
