import { Router } from 'express';
import { executeCode } from './playground.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// Protect code execution so only logged-in users (students/teachers) can run code
router.post('/execute', authenticate, executeCode);

export default router;
