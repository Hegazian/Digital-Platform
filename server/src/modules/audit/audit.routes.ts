import { Router } from 'express';
import { getAuditLogs } from './audit.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Only ADMINs can view Audit Logs
router.get('/', authenticate, requireRole([Role.ADMIN]), getAuditLogs);

export default router;
