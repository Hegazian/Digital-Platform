import { Router } from 'express';
import { registerWebhook, getWebhooks } from './webhook.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { requireCapability } from '../../utils/capabilities';

const router = Router();
router.use(requireCapability('DEVELOPER_INTEGRATIONS'));

// Only ADMINs can manage Webhooks
router.post('/webhooks', authenticate, requireRole([Role.ADMIN]), registerWebhook);
router.get('/webhooks', authenticate, requireRole([Role.ADMIN]), getWebhooks);

export default router;
