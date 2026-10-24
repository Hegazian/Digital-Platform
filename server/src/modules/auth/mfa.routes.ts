import { Router } from 'express';
import { cancelMfaSetup, setupMfa, verifyMfa } from './mfa.controller';
import { authenticate, requireRole } from './auth.middleware';
import { validateBody } from '../../utils/validate';
import { mfaAdminResetSchema, mfaSetupSchema, mfaVerifySchema } from '../../utils/schemas';
import { Role } from '@prisma/client';
import { adminResetMfa } from './mfa.controller';

const router = Router();

router.post('/setup', authenticate, validateBody(mfaSetupSchema), setupMfa);
router.post('/verify', authenticate, validateBody(mfaVerifySchema), verifyMfa);
router.post('/cancel-setup', authenticate, cancelMfaSetup);
router.post('/admin-reset/:userId', authenticate, requireRole([Role.ADMIN]), validateBody(mfaAdminResetSchema), adminResetMfa);

export default router;
