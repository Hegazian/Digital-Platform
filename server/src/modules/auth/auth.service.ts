import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Role, TeacherStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // keep in sync with JWT_REFRESH_EXPIRES_IN

/** High-entropy random tokens only need a collision-resistant digest. */
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

async function persistRefreshToken(userId: string, token: string): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
}

export class AuthService {
  static async register(data: any) {
    const { email, password, name, role, studentNumber, gradeId } = data;

    // SECURITY: Block public registration as ADMIN.
    // Admins can only be created via seed script or by existing admins.
    const allowedRoles = [Role.STUDENT, Role.TEACHER];
    const sanitizedRole = role && allowedRoles.includes(role) ? role : Role.STUDENT;

    if (role === Role.ADMIN) {
      throw new ForbiddenError('Admin accounts cannot be created through public registration');
    }

    // Students must carry their identifier and grade year (zod enforces for
    // HTTP; this guard covers direct service callers).
    if (sanitizedRole === Role.STUDENT) {
      if (!studentNumber || String(studentNumber).trim().length < 3) {
        throw new BadRequestError('Student number is required for student accounts');
      }
      if (!gradeId) {
        throw new BadRequestError('Grade year is required for student accounts');
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    if (studentNumber) {
      const existingNumber = await prisma.user.findUnique({
        where: { studentNumber },
        select: { id: true },
      });
      if (existingNumber) {
        throw new ConflictError('This student number is already registered');
      }
    }

    if (gradeId) {
      const grade = await prisma.grade.findUnique({ where: { id: gradeId } });
      if (!grade) {
        throw new BadRequestError('Invalid grade year');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const teacherStatus = sanitizedRole === Role.TEACHER ? TeacherStatus.PENDING : null;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: sanitizedRole,
        teacherStatus,
        isActive: true,
        ...(sanitizedRole === Role.STUDENT && studentNumber
          ? { studentNumber: String(studentNumber).trim() }
          : {}),
        ...(gradeId ? { gradeId } : {}),
      },
    });

    // Send welcome notification email (non-blocking)
    try {
      const { sendWelcomeEmail } = await import('../../utils/email');
      sendWelcomeEmail(user.email, user.name).catch((err) =>
        console.warn('Welcome email error:', err)
      );
    } catch (e) {
      // Ignore background email import errors
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teacherStatus: user.teacherStatus,
    };
  }

  static async login(data: any) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated or unverified');
    }

    if (user.role === Role.TEACHER && user.teacherStatus === TeacherStatus.PENDING) {
      throw new UnauthorizedError('Teacher account is pending approval');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Enterprise MFA Check
    if (user.mfaEnabled && user.mfaSecret) {
      if (data.mfaCode) {
        const { verifyTotpToken } = await import('../../utils/totp');
        const isCodeValid = await verifyTotpToken(user.id, user.mfaSecret, String(data.mfaCode));
        if (!isCodeValid) {
          throw new UnauthorizedError('Invalid MFA authentication code');
        }
      } else {
        const { generateAccessToken } = await import('../../utils/jwt');
        const mfaSessionToken = generateAccessToken({ userId: user.id, purpose: 'mfa_challenge' });
        return {
          mfaRequired: true,
          mfaSessionToken,
          message: 'MFA authentication code required',
        };
      }
    }

    const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    await persistRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  static async verifyMfaLogin(data: { mfaSessionToken: string; mfaCode: string }) {
    const { mfaSessionToken, mfaCode } = data;
    if (!mfaSessionToken || !mfaCode) {
      throw new BadRequestError('mfaSessionToken and mfaCode are required');
    }

    let decoded: any;
    try {
      const { verifyAccessToken } = await import('../../utils/jwt');
      decoded = verifyAccessToken(mfaSessionToken);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired MFA session token');
    }

    if (decoded.purpose !== 'mfa_challenge') {
      throw new UnauthorizedError('Invalid MFA challenge token purpose');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive || !user.mfaSecret) {
      throw new UnauthorizedError('Invalid user account or MFA not configured');
    }

    const { verifyTotpToken } = await import('../../utils/totp');
    const isCodeValid = await verifyTotpToken(user.id, user.mfaSecret, mfaCode);
    if (!isCodeValid) {
      throw new UnauthorizedError('Invalid MFA authentication code');
    }

    const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    await persistRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Refresh with server-side session validation + rotation:
   * - the token must match a stored, unrevoked, unexpired hash
   * - presenting a REVOKED token suggests theft -> the whole family for that
   *   user is revoked (all sessions must re-login)
   */
  static async refreshToken(token: string) {
    if (!token) {
      throw new BadRequestError('Refresh token is required');
    }

    let decoded: any;
    try {
      const { verifyRefreshToken } = await import('../../utils/jwt');
      decoded = verifyRefreshToken(token) as any;
    } catch (err: any) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (stored.revokedAt) {
      // Replay of a rotated-out token: assume compromise and kill all sessions.
      await prisma.refreshToken.updateMany({
        where: { userId: decoded.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError('Session revoked. Please log in again.');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is invalid or deactivated');
    }

    const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /** Revokes the presented session (logout). Idempotent by design. */
  static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawRefreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Kills every live session for a user (deactivation, future password change). */
  static async revokeAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get user profile details.
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teacherStatus: true,
        avatar: true,
        gradeId: true,
        studentNumber: true,
        grade: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            code: true,
          },
        },
        mfaEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update student / user profile information (name, avatar, grade).
   */
  static async updateProfile(
    userId: string,
    data: {
      name?: string;
      avatar?: string;
      gradeId?: string | null;
      studentNumber?: string | null;
    }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (data.gradeId) {
      const grade = await prisma.grade.findUnique({ where: { id: data.gradeId } });
      if (!grade) {
        throw new BadRequestError('Invalid grade ID');
      }
    }

    if (data.name !== undefined && data.name.trim().length < 2) {
      throw new BadRequestError('Name must be at least 2 characters long');
    }

    // Only students may carry a student number; teachers/admins cannot set one.
    let studentNumberValue: string | null | undefined;
    if ('studentNumber' in data && user.role === Role.STUDENT) {
      if (data.studentNumber === null || data.studentNumber === '') {
        studentNumberValue = null;
      } else if (data.studentNumber) {
        studentNumberValue = data.studentNumber;
        const clash = await prisma.user.findFirst({
          where: { studentNumber: studentNumberValue, id: { not: userId } },
          select: { id: true },
        });
        if (clash) {
          throw new ConflictError('This student number is already registered');
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.gradeId !== undefined && { gradeId: data.gradeId }),
        ...(studentNumberValue !== undefined && { studentNumber: studentNumberValue }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teacherStatus: true,
        avatar: true,
        gradeId: true,
        studentNumber: true,
        grade: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            code: true,
          },
        },
        mfaEnabled: true,
      },
    });

    return updated;
  }
}

