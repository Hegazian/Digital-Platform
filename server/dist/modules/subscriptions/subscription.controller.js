"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
const subscription_service_1 = require("./subscription.service");
const errors_1 = require("../../utils/errors");
class SubscriptionController {
    /**
     * POST /api/v1/subscriptions/manual
     */
    static async createManualSubscription(req, res, next) {
        try {
            const { subjectId, period, paymentMethod, transactionId } = req.body;
            if (!subjectId || !period || !paymentMethod || !transactionId) {
                throw new errors_1.BadRequestError('subjectId, period, paymentMethod, and transactionId are required');
            }
            const userId = req.user.userId;
            const subscription = await subscription_service_1.SubscriptionService.createManualSubscription({
                userId,
                subjectId,
                period: period,
                paymentMethod,
                transactionId,
            });
            res.status(201).json({
                success: true,
                message: 'Subscription request submitted successfully',
                data: subscription,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/subscriptions/pending
     * (Admin only - handled by router middleware)
     */
    static async getPending(req, res, next) {
        try {
            const pending = await subscription_service_1.SubscriptionService.getPendingSubscriptions();
            res.status(200).json({
                success: true,
                data: pending,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /api/v1/subscriptions/:id/approve
     * (Admin only)
     */
    static async approve(req, res, next) {
        try {
            const { id } = req.params;
            const approved = await subscription_service_1.SubscriptionService.approveSubscription(id);
            res.status(200).json({
                success: true,
                message: 'Subscription approved successfully',
                data: approved,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /api/v1/subscriptions/:id/reject
     * (Admin only)
     */
    static async reject(req, res, next) {
        try {
            const { id } = req.params;
            const rejected = await subscription_service_1.SubscriptionService.rejectSubscription(id);
            res.status(200).json({
                success: true,
                message: 'Subscription rejected',
                data: rejected,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/subscriptions/me
     */
    static async getMySubscriptions(req, res, next) {
        try {
            const userId = req.user.userId;
            const subscriptions = await subscription_service_1.SubscriptionService.getUserSubscriptions(userId);
            res.status(200).json({
                success: true,
                data: subscriptions,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/v1/subscriptions/:id
     */
    static async cancelSubscription(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const cancelled = await subscription_service_1.SubscriptionService.cancelSubscription(id, userId);
            res.status(200).json({
                success: true,
                message: 'Subscription cancelled',
                data: cancelled,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SubscriptionController = SubscriptionController;
