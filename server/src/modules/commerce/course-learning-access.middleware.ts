import { NextFunction, Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { EntitlementResolver } from './entitlement-resolver.service';
import { NotFoundError } from '../../utils/errors';
import { prisma } from '../../prisma';

/** Require an effective learning grant for content resolved to a course. */
export function requireCourseLearningAccess(resolveCourseId: (req: AuthRequest) => Promise<string | null>) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const courseId = await resolveCourseId(req);
      if (!courseId) throw new NotFoundError('Learning content not found');
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, teacherId: true, retractedAt: true },
      });
      if (!course) throw new NotFoundError('Learning content not found');
      const manager = req.user?.role === 'ADMIN' || (req.user?.role === 'TEACHER' && req.user.userId === course.teacherId);
      if (course.retractedAt && !manager) throw new NotFoundError('Learning content not found');
      await EntitlementResolver.assertLearningAccess(req.user!.userId, req.user?.role, {
        courseId: course.id,
        teacherId: course.teacherId,
      });
      next();
    } catch (error) { next(error); }
  };
}
