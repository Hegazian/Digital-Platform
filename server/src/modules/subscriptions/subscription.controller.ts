import { Response, NextFunction } from 'express';
import { SubscriptionService } from './subscription.service';
import { AuthRequest } from '../auth/auth.middleware';
import { BadRequestError } from '../../utils/errors';
import { SubscriptionPeriod } from '@prisma/client';

export class SubscriptionController {
  /**
   * POST /api/v1/subscriptions/manual
   */
  static async createManualSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { subjectId, period, paymentMethod, transactionId } = req.body;
      if (!subjectId || !period || !paymentMethod || !transactionId) {
        throw new BadRequestError('subjectId, period, paymentMethod, and transactionId are required');
      }

      const userId = req.user!.userId;
      const subscription = await SubscriptionService.createManualSubscription({
        userId,
        subjectId,
        period: period as SubscriptionPeriod,
        paymentMethod,
        transactionId,
      });

      res.status(201).json({
        success: true,
        message: 'Subscription request submitted successfully',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/subscriptions/pending
   * (Admin only - handled by router middleware)
   */
  static async getPending(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pending = await SubscriptionService.getPendingSubscriptions();
      res.status(200).json({
        success: true,
        data: pending,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/subscriptions/:id/approve
   * (Admin only)
   */
  static async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const approved = await SubscriptionService.approveSubscription(id as string);
      res.status(200).json({
        success: true,
        message: 'Subscription approved successfully',
        data: approved,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/subscriptions/:id/reject
   * (Admin only)
   */
  static async reject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rejected = await SubscriptionService.rejectSubscription(id as string);
      res.status(200).json({
        success: true,
        message: 'Subscription rejected',
        data: rejected,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/subscriptions/me
   */
  static async getMySubscriptions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const subscriptions = await SubscriptionService.getUserSubscriptions(userId);
      res.status(200).json({
        success: true,
        data: subscriptions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/subscriptions/:id
   */
  static async cancelSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const cancelled = await SubscriptionService.cancelSubscription(id as string, userId);
      res.status(200).json({
        success: true,
        message: 'Subscription cancelled',
        data: cancelled,
      });
    } catch (error) {
      next(error);
    }
  }
}
