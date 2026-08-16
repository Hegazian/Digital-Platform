import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { SubscriptionPeriod, SubscriptionStatus } from '@prisma/client';

export class SubscriptionService {
  /**
   * Calculates the end date of a subscription based on period.
   */
  static calculateEndDate(startDate: Date, period: SubscriptionPeriod): Date {
    const endDate = new Date(startDate);
    if (period === SubscriptionPeriod.MONTHLY) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (period === SubscriptionPeriod.SIX_MONTHS) {
      endDate.setMonth(endDate.getMonth() + 6);
    } else if (period === SubscriptionPeriod.YEARLY) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    return endDate;
  }

  /**
   * Creates a manual subscription request (e.g. Vodafone Cash, InstaPay)
   */
  static async createManualSubscription(data: {
    userId: string;
    subjectId: string;
    period: SubscriptionPeriod;
    paymentMethod: string;
    transactionId: string;
  }) {
    const { userId, subjectId, period, paymentMethod, transactionId } = data;

    const pricing = await prisma.subjectPricing.findUnique({
      where: {
        subjectId_period: {
          subjectId,
          period,
        },
      },
    });

    if (!pricing || !pricing.isActive) {
      throw new NotFoundError('Subscription pricing plan not found or inactive');
    }

    // Check if user already has a pending or active subscription for this subject
    const existing = await prisma.subscription.findFirst({
      where: {
        userId,
        subjectId,
        status: { in: [SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE] },
      },
    });

    if (existing) {
      throw new BadRequestError(`You already have a ${existing.status.toLowerCase()} subscription for this subject.`);
    }

    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, period);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        subjectId,
        period,
        startDate,
        endDate,
        status: SubscriptionStatus.PENDING,
        paymentMethod,
        transactionId,
      },
      include: {
        subject: { select: { nameEn: true, nameAr: true } },
      },
    });

    return subscription;
  }

  /**
   * Admin: List pending manual subscriptions
   */
  static async getPendingSubscriptions() {
    return await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.PENDING },
      include: {
        user: { select: { name: true, email: true } },
        subject: { select: { nameEn: true, nameAr: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Admin: Approve a manual subscription
   */
  static async approveSubscription(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestError('Subscription is not pending approval');
    }

    // We reset the start date to now so they get the full time they paid for
    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, subscription.period);

    return await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });
  }

  /**
   * Admin: Reject a manual subscription
   */
  static async rejectSubscription(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestError('Subscription is not pending approval');
    }

    return await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.REJECTED },
    });
  }

  /**
   * Retrieves all subscriptions for a given student.
   */
  static async getUserSubscriptions(userId: string) {
    return await prisma.subscription.findMany({
      where: { userId },
      include: {
        subject: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            thumbnail: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Cancels an active or pending subscription for a student.
   */
  static async cancelSubscription(subscriptionId: string, userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenError('You do not own this subscription');
    }

    return await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }
}
