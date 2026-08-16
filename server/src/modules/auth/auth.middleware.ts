import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors';
import { Role, TeacherStatus } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: Role;
    teacherStatus?: TeacherStatus;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token) as any;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      teacherStatus: decoded.teacherStatus
    };
    next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (req.user.role === Role.ADMIN) {
      return next(); // Admins bypass role checks
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }

    next();
  };
};

export const requireApprovedTeacher = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Not authenticated'));
  }

  if (req.user.role === Role.ADMIN) {
    return next();
  }

  if (req.user.role !== Role.TEACHER) {
    return next(new ForbiddenError('Only teachers can perform this action'));
  }

  // To check teacherStatus properly, we typically add it to JWT or fetch from DB.
  if (req.user.teacherStatus !== TeacherStatus.APPROVED) {
    return next(new ForbiddenError('Teacher account must be approved to perform this action'));
  }

  next();
};
