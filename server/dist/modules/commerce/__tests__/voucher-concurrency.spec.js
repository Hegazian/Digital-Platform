"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const commerce_service_1 = require("../commerce.service");
const client_1 = require("@prisma/client");
(0, vitest_1.describe)('Voucher Concurrency & Atomic Redemption (TDD)', () => {
    let subjectId;
    let voucherCode;
    const studentIds = [];
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Subject
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Voucher Test Subject ${Date.now()}`,
                nameAr: 'مادة تجربة الكوبونات',
            },
        });
        subjectId = subject.id;
        // 2. Create 10 Students
        for (let i = 0; i < 10; i++) {
            const student = await prisma_1.prisma.user.create({
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
    (0, vitest_1.afterAll)(async () => {
        try {
            if (voucherCode) {
                await prisma_1.prisma.entitlement.deleteMany({ where: { resourceId: subjectId } });
                await prisma_1.prisma.voucher.deleteMany({ where: { code: voucherCode } });
            }
            for (const id of studentIds) {
                await prisma_1.prisma.user.deleteMany({ where: { id } });
            }
            if (subjectId) {
                await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
            }
        }
        catch (e) { }
    });
    (0, vitest_1.it)('should strictly respect maxUses=2 under heavy concurrent redemptions', async () => {
        voucherCode = `CONCUR-2X-${Date.now()}`;
        // Create voucher with maxUses = 2
        await commerce_service_1.CommerceService.createVoucher({
            code: voucherCode,
            resourceType: client_1.EntitlementType.SUBJECT,
            resourceId: subjectId,
            durationDays: 30,
            maxUses: 2,
        });
        // Fire 10 simultaneous redemption requests
        const redemptionPromises = studentIds.map((studentId) => commerce_service_1.CommerceService.redeemVoucher(studentId, voucherCode)
            .then((res) => ({ success: true, res }))
            .catch((err) => ({ success: false, error: err.message })));
        const results = await Promise.all(redemptionPromises);
        const successes = results.filter((r) => r.success);
        const failures = results.filter((r) => !r.success);
        // Exactly 2 must succeed, 8 must fail
        (0, vitest_1.expect)(successes.length).toBe(2);
        (0, vitest_1.expect)(failures.length).toBe(8);
        // Database verification: usedCount must be exactly 2
        const voucherInDb = await prisma_1.prisma.voucher.findUnique({
            where: { code: voucherCode },
        });
        (0, vitest_1.expect)(voucherInDb?.usedCount).toBe(2);
        // Database verification: exactly 2 entitlements granted
        const entitlements = await prisma_1.prisma.entitlement.findMany({
            where: { resourceId: subjectId, sourceType: 'VOUCHER' },
        });
        (0, vitest_1.expect)(entitlements.length).toBe(2);
    });
});
