import { Router } from 'express';
import { createThread, getCourseThreads, postReply } from './discussion.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireCourseLearningAccess } from '../commerce/course-learning-access.middleware';
import { prisma } from '../../prisma';

const router = Router();

const assertCourseAccess = requireCourseLearningAccess(async (req) => req.params.courseId as string);
const assertThreadAccess = requireCourseLearningAccess(async (req) => {
  const thread = await prisma.discussionThread.findUnique({ where: { id: req.params.id as string }, select: { courseId: true } });
  return thread?.courseId ?? null;
});
const assertCreateThreadAccess = requireCourseLearningAccess(async (req) =>
  typeof req.body?.courseId === 'string' ? req.body.courseId : null
);

router.get('/courses/:courseId', authenticate, assertCourseAccess, getCourseThreads);
router.post('/threads', authenticate, assertCreateThreadAccess, createThread);
router.post('/threads/:id/replies', authenticate, assertThreadAccess, postReply);

export default router;
