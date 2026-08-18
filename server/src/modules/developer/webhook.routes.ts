import { Router } from 'express';
import { registerWebhook, getWebhooks } from './webhook.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Only ADMINs can manage Webhooks
router.post('/webhooks', authenticate, requireRole([Role.ADMIN]), registerWebhook);
router.get('/webhooks', authenticate, requireRole([Role.ADMIN]), getWebhooks);

export default router;
