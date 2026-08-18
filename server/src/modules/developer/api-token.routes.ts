import { Router } from 'express';
import { createApiToken, getApiTokens } from './api-token.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Only ADMINs can create/view Developer API Tokens
router.post('/tokens', authenticate, requireRole([Role.ADMIN]), createApiToken);
router.get('/tokens', authenticate, requireRole([Role.ADMIN]), getApiTokens);

export default router;
