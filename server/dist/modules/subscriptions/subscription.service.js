"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
const client_1 = require("@prisma/client");
class SubscriptionService {
    /**
     * Calculates the end date of a subscription based on period.
     */
    static calculateEndDate(startDate, period) {
        const endDate = new Date(startDate);
        if (period === client_1.SubscriptionPeriod.MONTHLY) {
            endDate.setMonth(endDate.getMonth() + 1);
        }
        else if (period === client_1.SubscriptionPeriod.SIX_MONTHS) {
            endDate.setMonth(endDate.getMonth() + 6);
        }
        else if (period === client_1.SubscriptionPeriod.YEARLY) {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        return endDate;
    }
    /**
     * Creates a manual subscription request (e.g. Vodafone Cash, InstaPay)
     */
    static async createManualSubscription(data) {
        const { userId, subjectId, period, paymentMethod, transactionId } = data;
        const pricing = await prisma_1.prisma.subjectPricing.findUnique({
            where: {
                subjectId_period: {
                    subjectId,
                    period,
                },
            },
        });
        if (!pricing || !pricing.isActive) {
            throw new errors_1.NotFoundError('Subscription pricing plan not found or inactive');
        }
        // Check if user already has a pending or active subscription for this subject
        const existing = await prisma_1.prisma.subscription.findFirst({
            where: {
                userId,
                subjectId,
                status: { in: [client_1.SubscriptionStatus.PENDING, client_1.SubscriptionStatus.ACTIVE] },
            },
        });
        if (existing) {
            throw new errors_1.BadRequestError(`You already have a ${existing.status.toLowerCase()} subscription for this subject.`);
        }
        const startDate = new Date();
        const endDate = this.calculateEndDate(startDate, period);
        const subscription = await prisma_1.prisma.subscription.create({
            data: {
                userId,
                subjectId,
                period,
                startDate,
                endDate,
                status: client_1.SubscriptionStatus.PENDING,
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
        return await prisma_1.prisma.subscription.findMany({
            where: { status: client_1.SubscriptionStatus.PENDING },
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
    static async approveSubscription(subscriptionId) {
        const subscription = await prisma_1.prisma.subscription.findUnique({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new errors_1.NotFoundError('Subscription not found');
        }
        if (subscription.status !== client_1.SubscriptionStatus.PENDING) {
            throw new errors_1.BadRequestError('Subscription is not pending approval');
        }
        // We reset the start date to now so they get the full time they paid for
        const startDate = new Date();
        const endDate = this.calculateEndDate(startDate, subscription.period);
        return await prisma_1.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: client_1.SubscriptionStatus.ACTIVE,
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
    static async rejectSubscription(subscriptionId) {
        const subscription = await prisma_1.prisma.subscription.findUnique({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new errors_1.NotFoundError('Subscription not found');
        }
        if (subscription.status !== client_1.SubscriptionStatus.PENDING) {
            throw new errors_1.BadRequestError('Subscription is not pending approval');
        }
        return await prisma_1.prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status: client_1.SubscriptionStatus.REJECTED },
        });
    }
    /**
     * Retrieves all subscriptions for a given student.
     */
    static async getUserSubscriptions(userId) {
        return await prisma_1.prisma.subscription.findMany({
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
    static async cancelSubscription(subscriptionId, userId) {
        const subscription = await prisma_1.prisma.subscription.findUnique({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new errors_1.NotFoundError('Subscription not found');
        }
        if (subscription.userId !== userId) {
            throw new errors_1.ForbiddenError('You do not own this subscription');
        }
        return await prisma_1.prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status: client_1.SubscriptionStatus.CANCELLED },
        });
    }
}
exports.SubscriptionService = SubscriptionService;
