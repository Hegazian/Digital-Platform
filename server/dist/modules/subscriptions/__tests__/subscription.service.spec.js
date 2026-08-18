"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const subscription_service_1 = require("../subscription.service");
const client_1 = require("@prisma/client");
const errors_1 = require("../../../utils/errors");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        subjectPricing: {
            findUnique: vitest_1.vi.fn(),
        },
        subscription: {
            findFirst: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
            updateMany: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('SubscriptionService Unit Tests (Manual Payments)', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('createManualSubscription', () => {
        (0, vitest_1.it)('should create a PENDING subscription request', async () => {
            const mockPricing = { id: 'p1', isActive: true };
            const mockSub = { id: 'sub1', status: 'PENDING' };
            prisma_1.prisma.subjectPricing.findUnique.mockResolvedValue(mockPricing);
            prisma_1.prisma.subscription.findFirst.mockResolvedValue(null);
            prisma_1.prisma.subscription.create.mockResolvedValue(mockSub);
            const result = await subscription_service_1.SubscriptionService.createManualSubscription({
                userId: 'u1',
                subjectId: 's1',
                period: client_1.SubscriptionPeriod.MONTHLY,
                paymentMethod: 'VODAFONE_CASH',
                transactionId: '01012345678',
            });
            (0, vitest_1.expect)(result.id).toBe('sub1');
            (0, vitest_1.expect)(prisma_1.prisma.subscription.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    status: client_1.SubscriptionStatus.PENDING,
                    paymentMethod: 'VODAFONE_CASH',
                    transactionId: '01012345678',
                }),
            }));
        });
        (0, vitest_1.it)('should throw BadRequestError if user already has an active subscription for the subject', async () => {
            const mockPricing = { id: 'p1', isActive: true };
            prisma_1.prisma.subjectPricing.findUnique.mockResolvedValue(mockPricing);
            prisma_1.prisma.subscription.findFirst.mockResolvedValue({ status: 'ACTIVE' });
            await (0, vitest_1.expect)(subscription_service_1.SubscriptionService.createManualSubscription({
                userId: 'u1',
                subjectId: 's1',
                period: client_1.SubscriptionPeriod.MONTHLY,
                paymentMethod: 'INSTAPAY',
                transactionId: 'REF123',
            })).rejects.toThrow(errors_1.BadRequestError);
        });
        (0, vitest_1.it)('should allow re-subscribing if previous subscription is CANCELLED or EXPIRED', async () => {
            const mockPricing = { id: 'p1', isActive: true };
            const mockNewSub = { id: 'sub2', status: 'PENDING' };
            prisma_1.prisma.subjectPricing.findUnique.mockResolvedValue(mockPricing);
            prisma_1.prisma.subscription.findFirst.mockResolvedValue(null);
            prisma_1.prisma.subscription.create.mockResolvedValue(mockNewSub);
            const result = await subscription_service_1.SubscriptionService.createManualSubscription({
                userId: 'u1',
                subjectId: 's1',
                period: client_1.SubscriptionPeriod.YEARLY,
                paymentMethod: 'VODAFONE_CASH',
                transactionId: '01099998888',
            });
            (0, vitest_1.expect)(result.id).toBe('sub2');
        });
    });
    (0, vitest_1.describe)('approveSubscription', () => {
        (0, vitest_1.it)('should activate a pending subscription and recalculate dates', async () => {
            const mockPendingSub = { id: 'sub1', status: 'PENDING', period: 'MONTHLY' };
            prisma_1.prisma.subscription.findUnique.mockResolvedValue(mockPendingSub);
            prisma_1.prisma.subscription.update.mockResolvedValue({ id: 'sub1', status: 'ACTIVE' });
            const result = await subscription_service_1.SubscriptionService.approveSubscription('sub1');
            (0, vitest_1.expect)(result.status).toBe('ACTIVE');
            (0, vitest_1.expect)(prisma_1.prisma.subscription.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 'sub1' },
                data: vitest_1.expect.objectContaining({
                    status: client_1.SubscriptionStatus.ACTIVE,
                }),
            }));
        });
        (0, vitest_1.it)('should throw BadRequestError if subscription is not pending', async () => {
            prisma_1.prisma.subscription.findUnique.mockResolvedValue({ id: 'sub1', status: 'ACTIVE' });
            await (0, vitest_1.expect)(subscription_service_1.SubscriptionService.approveSubscription('sub1')).rejects.toThrow(errors_1.BadRequestError);
        });
    });
    (0, vitest_1.describe)('rejectSubscription', () => {
        (0, vitest_1.it)('should mark a pending subscription as REJECTED', async () => {
            prisma_1.prisma.subscription.findUnique.mockResolvedValue({ id: 'sub1', status: 'PENDING' });
            prisma_1.prisma.subscription.update.mockResolvedValue({ id: 'sub1', status: 'REJECTED' });
            const result = await subscription_service_1.SubscriptionService.rejectSubscription('sub1');
            (0, vitest_1.expect)(result.status).toBe('REJECTED');
        });
    });
});
