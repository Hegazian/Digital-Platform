import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { validateBody } from '../../utils/validate';
import { createManualSubscriptionSchema } from '../../utils/schemas';

const subscriptionRouter = Router();

// Static Routes
subscriptionRouter.post('/manual', authenticate, requireRole([Role.STUDENT], false), validateBody(createManualSubscriptionSchema), SubscriptionController.createManualSubscription);
subscriptionRouter.get('/me', authenticate, SubscriptionController.getMySubscriptions);
subscriptionRouter.get('/pending', authenticate, requireRole([Role.ADMIN]), SubscriptionController.getPending);

// Parameterized Routes
subscriptionRouter.patch('/:id/approve', authenticate, requireRole([Role.ADMIN]), SubscriptionController.approve);
subscriptionRouter.patch('/:id/reject', authenticate, requireRole([Role.ADMIN]), SubscriptionController.reject);
subscriptionRouter.delete('/:id', authenticate, SubscriptionController.cancelSubscription);

export default subscriptionRouter;
