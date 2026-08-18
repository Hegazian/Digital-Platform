import { Router } from 'express';
import { setupMfa, verifyMfa } from './mfa.controller';
import { authenticate } from './auth.middleware';

const router = Router();

router.post('/setup', authenticate, setupMfa);
router.post('/verify', authenticate, verifyMfa);

export default router;
