import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { NotificationService } from './notification.service';

export class NotificationController {
  static async getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notifications = await NotificationService.getUserNotifications(userId);
      res.status(200).json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updated = await NotificationService.markAsRead(userId, id as string);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
