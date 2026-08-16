import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';

const subscriptionRouter = Router();

// Student Routes
subscriptionRouter.post('/manual', authenticate, SubscriptionController.createManualSubscription);
subscriptionRouter.get('/me', authenticate, SubscriptionController.getMySubscriptions);
subscriptionRouter.delete('/:id', authenticate, SubscriptionController.cancelSubscription);

// Admin Routes for manual approval
subscriptionRouter.get('/pending', authenticate, requireRole('ADMIN'), SubscriptionController.getPending);
subscriptionRouter.patch('/:id/approve', authenticate, requireRole('ADMIN'), SubscriptionController.approve);
subscriptionRouter.patch('/:id/reject', authenticate, requireRole('ADMIN'), SubscriptionController.reject);

export default subscriptionRouter;
