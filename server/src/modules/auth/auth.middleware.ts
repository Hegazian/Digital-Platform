import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors';
import { Role, TeacherStatus } from '@prisma/client';
import { prisma } from '../../prisma';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: Role;
    teacherStatus?: TeacherStatus;
  };
}

/**
 * Short-TTL cache so deactivation takes effect within seconds without a DB
 * round-trip on every request. Admins can force-instant revocation via
 * invalidateActivationCache().
 */
const activationCache = new Map<string, { active: boolean; expiresAt: number }>();
const ACTIVATION_CACHE_TTL_MS = 30_000;

async function isUserActive(userId: string): Promise<boolean> {
  const cached = activationCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.active;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });
  const active = user?.isActive ?? false;
  activationCache.set(userId, { active, expiresAt: Date.now() + ACTIVATION_CACHE_TTL_MS });
  return active;
}

/** Forces the next request from this user to re-check the database. */
export function invalidateActivationCache(userId: string | null | undefined): void {
  if (userId) activationCache.delete(userId);
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];
  let decoded: any;
  try {
    decoded = verifyAccessToken(token) as any;
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  // Revocation check: deactivated users are rejected within the cache TTL.
  const active = await isUserActive(decoded.userId);
  if (!active) {
    return next(new UnauthorizedError('Account is deactivated or suspended'));
  }

  req.user = {
    userId: decoded.userId,
    role: decoded.role,
    teacherStatus: decoded.teacherStatus,
  };
  next();
};

/**
 * Attaches req.user when a valid Bearer token is present; continues
 * anonymously (req.user undefined) otherwise. Never rejects the request.
 */
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(authHeader.split(' ')[1]) as any;
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        teacherStatus: decoded.teacherStatus
      };
    } catch {
      // Invalid/expired token -> treat as anonymous instead of failing.
      // Public catalog browsing must keep working with stale tokens.
    }
  }
  next();
};

export const requireRole = (allowedRoles: Role[], allowAdminBypass = true) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (allowAdminBypass && req.user.role === Role.ADMIN) {
      return next(); // Admins bypass role checks where allowed
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
