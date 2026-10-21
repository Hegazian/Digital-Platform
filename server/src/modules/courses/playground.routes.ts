import { Router } from 'express';
import { executeCode } from './playground.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireCapability } from '../../utils/capabilities';

const router = Router();

// Protect code execution so only logged-in users (students/teachers) can run code
router.post('/execute', requireCapability('CODE_EXECUTION'), authenticate, executeCode);

export default router;
