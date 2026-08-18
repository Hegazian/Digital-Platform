import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../auth/auth.middleware';

const notificationRouter = Router();

notificationRouter.get('/me', authenticate, NotificationController.getMyNotifications);
notificationRouter.patch('/:id/read', authenticate, NotificationController.markAsRead);

export default notificationRouter;
