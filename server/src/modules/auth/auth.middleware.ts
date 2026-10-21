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

/** Kept as a no-op for existing callers; authorization is read from the DB on
 * every protected request, making revocation effective across API instances. */
export function invalidateActivationCache(_userId: string | null | undefined): void {}

async function getCurrentAccount(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, role: true, teacherStatus: true, authVersion: true },
  });
}

function isApprovedAccount(account: { role: Role; teacherStatus: TeacherStatus | null } | null): boolean {
  if (!account) return false;
  return account.role !== Role.TEACHER || account.teacherStatus === TeacherStatus.APPROVED;
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

  // MFA challenge tokens are intermediate credentials, NOT session tokens.
  // Accepting them here would let an attacker skip the second factor.
  if (decoded.purpose === 'mfa_challenge') {
    return next(new UnauthorizedError('Complete multi-factor authentication first'));
  }

  // The token proves identity only. Current role/approval/activation are
  // authoritative in the database, so stale elevated claims never survive a
  // demotion and changes take effect across every API process immediately.
  const account = await getCurrentAccount(decoded.userId);
  if (!account?.isActive) {
    return next(new UnauthorizedError('Account is deactivated or suspended'));
  }
  if ((decoded.authVersion ?? 0) !== account.authVersion) {
    return next(new UnauthorizedError('Session authorization has changed; please sign in again'));
  }
  if (!isApprovedAccount(account)) return next(new ForbiddenError('Teacher account is not approved'));

  req.user = {
    userId: account.id,
    role: account.role,
    teacherStatus: account.teacherStatus ?? undefined,
  };
  next();
};

/**
 * Attaches req.user when a valid Bearer token is present; continues
 * anonymously (req.user undefined) otherwise. Never rejects the request.
 */
export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(authHeader.split(' ')[1]) as any;
      if (decoded.purpose !== 'mfa_challenge') {
        const account = await getCurrentAccount(decoded.userId);
        if (account?.isActive && (decoded.authVersion ?? 0) === account.authVersion && isApprovedAccount(account)) {
          req.user = {
            userId: account.id,
            role: account.role,
            teacherStatus: account.teacherStatus ?? undefined,
          };
        }
      }
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
