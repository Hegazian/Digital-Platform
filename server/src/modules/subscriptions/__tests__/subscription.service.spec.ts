import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { SubscriptionService } from '../subscription.service';
import { SubscriptionPeriod, SubscriptionStatus } from '@prisma/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../utils/errors';

vi.mock('../../../prisma', () => ({
  prisma: {
    subjectPricing: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('SubscriptionService Unit Tests (Manual Payments)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createManualSubscription', () => {
    it('should create a PENDING subscription request', async () => {
      const mockPricing = { id: 'p1', isActive: true };
      const mockSub = { id: 'sub1', status: 'PENDING' };
      
      (prisma.subjectPricing.findUnique as any).mockResolvedValue(mockPricing);
      (prisma.subscription.findFirst as any).mockResolvedValue(null);
      (prisma.subscription.create as any).mockResolvedValue(mockSub);

      const result = await SubscriptionService.createManualSubscription({
        userId: 'u1',
        subjectId: 's1',
        period: SubscriptionPeriod.MONTHLY,
        paymentMethod: 'VODAFONE_CASH',
        transactionId: '01012345678',
      });

      expect(result.id).toBe('sub1');
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.PENDING,
            paymentMethod: 'VODAFONE_CASH',
            transactionId: '01012345678',
          }),
        })
      );
    });

    it('should throw BadRequestError if user already has an active subscription for the subject', async () => {
      const mockPricing = { id: 'p1', isActive: true };
      (prisma.subjectPricing.findUnique as any).mockResolvedValue(mockPricing);
      (prisma.subscription.findFirst as any).mockResolvedValue({ status: 'ACTIVE' });

      await expect(
        SubscriptionService.createManualSubscription({
          userId: 'u1',
          subjectId: 's1',
          period: SubscriptionPeriod.MONTHLY,
          paymentMethod: 'INSTAPAY',
          transactionId: 'REF123',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('approveSubscription', () => {
    it('should activate a pending subscription and recalculate dates', async () => {
      const mockPendingSub = { id: 'sub1', status: 'PENDING', period: 'MONTHLY' };
      (prisma.subscription.findUnique as any).mockResolvedValue(mockPendingSub);
      (prisma.subscription.update as any).mockResolvedValue({ id: 'sub1', status: 'ACTIVE' });

      const result = await SubscriptionService.approveSubscription('sub1');

      expect(result.status).toBe('ACTIVE');
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub1' },
          data: expect.objectContaining({
            status: SubscriptionStatus.ACTIVE,
          }),
        })
      );
    });

    it('should throw BadRequestError if subscription is not pending', async () => {
      (prisma.subscription.findUnique as any).mockResolvedValue({ id: 'sub1', status: 'ACTIVE' });
      await expect(SubscriptionService.approveSubscription('sub1')).rejects.toThrow(BadRequestError);
    });
  });

  describe('rejectSubscription', () => {
    it('should mark a pending subscription as REJECTED', async () => {
      (prisma.subscription.findUnique as any).mockResolvedValue({ id: 'sub1', status: 'PENDING' });
      (prisma.subscription.update as any).mockResolvedValue({ id: 'sub1', status: 'REJECTED' });

      const result = await SubscriptionService.rejectSubscription('sub1');
      expect(result.status).toBe('REJECTED');
    });
  });
});
