import { Router } from 'express';
import { createApiToken, getApiTokens } from './api-token.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { requireCapability } from '../../utils/capabilities';

const router = Router();
router.use(requireCapability('DEVELOPER_INTEGRATIONS'));

// Only ADMINs can create/view Developer API Tokens
router.post('/tokens', authenticate, requireRole([Role.ADMIN]), createApiToken);
router.get('/tokens', authenticate, requireRole([Role.ADMIN]), getApiTokens);

export default router;
