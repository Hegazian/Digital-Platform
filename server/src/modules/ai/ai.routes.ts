import { Router } from 'express';
import { askAITutor } from './ai.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.post('/tutor', authenticate, askAITutor);

export default router;
