import { Router } from 'express';
import { createThread, getCourseThreads, postReply } from './discussion.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.get('/courses/:courseId', authenticate, getCourseThreads);
router.post('/threads', authenticate, createThread);
router.post('/threads/:id/replies', authenticate, postReply);

export default router;
