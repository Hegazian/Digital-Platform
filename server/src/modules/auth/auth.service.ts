import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Role, TeacherStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { decryptMfaSecret } from '../../utils/mfa-crypto';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // keep in sync with JWT_REFRESH_EXPIRES_IN
const REFRESH_RACE_WINDOW_MS = 5_000;

/** High-entropy random tokens only need a collision-resistant digest. */
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

async function persistRefreshToken(userId: string, token: string): Promise<void> {
  const familyId = crypto.randomUUID();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      familyId,
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
    if (sanitizedRole === Role.TEACHER) {
      const config = await (prisma as any).appConfig?.findFirst?.({ select: { allowTeacherRegistration: true } });
      if (config && config.allowTeacherRegistration === false) {
        throw new ForbiddenError('Teacher registration is currently closed');
      }
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.role === Role.TEACHER && user.teacherStatus !== TeacherStatus.APPROVED) {
      throw new ForbiddenError('Teacher account is not approved');
    }

    // Enterprise MFA Check
    if (user.mfaEnabled && user.mfaSecret) {
      if (data.mfaCode) {
        const { verifyTotpToken } = await import('../../utils/totp');
        const isCodeValid = await verifyTotpToken(user.id, decryptMfaSecret(user.mfaSecret), String(data.mfaCode));
        if (!isCodeValid) {
          throw new UnauthorizedError('Invalid MFA authentication code');
        }
      } else {
        const { generateAccessToken } = await import('../../utils/jwt');
        const mfaSessionToken = generateAccessToken({ userId: user.id, authVersion: user.authVersion, purpose: 'mfa_challenge' });
        return {
          mfaRequired: true,
          mfaSessionToken,
          message: 'MFA authentication code required',
        };
      }
    }

    const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus, authVersion: user.authVersion };
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
    if ((decoded.authVersion ?? 0) !== (user.authVersion ?? 0)) {
      throw new UnauthorizedError('MFA challenge is no longer valid; please sign in again');
    }
    if (user.role === Role.TEACHER && user.teacherStatus !== TeacherStatus.APPROVED) {
      throw new ForbiddenError('Teacher account is not approved');
    }

    const { verifyTotpToken } = await import('../../utils/totp');
    let isCodeValid = await verifyTotpToken(user.id, decryptMfaSecret(user.mfaSecret), mfaCode);
    if (!isCodeValid) {
      const codeHash = hashToken(mfaCode.trim().toUpperCase().replace(/-/g, ''));
      const consumed = await prisma.mfaRecoveryCode.updateMany({
        where: { userId: user.id, codeHash, usedAt: null },
        data: { usedAt: new Date() },
      });
      isCodeValid = consumed.count === 1;
    }
    if (!isCodeValid) {
      throw new UnauthorizedError('Invalid MFA authentication code');
    }

    const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus, authVersion: user.authVersion };
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
   * - an immediate consumed-token race returns a recoverable conflict
   * - delayed replay revokes only the token's device family
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

    if (!stored || stored.expiresAt <= new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (stored.userId !== decoded.userId) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const revokeFamilyOnReplay = async () => {
      const familyId = stored.familyId || stored.id;
      await prisma.$transaction(async (tx) => {
        // Serialize family revocation with successor insertion. A single
        // UPDATE snapshot could otherwise miss an in-flight new successor.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${familyId}, 0))`;
        await tx.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
      });
    };

    if (stored.consumedAt) {
      if (Date.now() - stored.consumedAt.getTime() <= REFRESH_RACE_WINDOW_MS) {
        throw new ConflictError('Refresh token was just rotated. Retry with the latest session cookie.', 'REFRESH_ALREADY_ROTATED');
      }
      await revokeFamilyOnReplay();
      throw new UnauthorizedError('Session family revoked. Please log in again.', 'SESSION_REVOKED');
    }

    if (stored.revokedAt) {
      throw new UnauthorizedError('Session is revoked. Please log in again.');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      throw new UnauthorizedError('User account is invalid or deactivated');
    }
    if (!user.isActive) {
      await this.revokeAllForUser(user.id);
      throw new UnauthorizedError('User account is invalid or deactivated');
    }

    if (user.role === Role.TEACHER && user.teacherStatus !== TeacherStatus.APPROVED) {
      await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new ForbiddenError('Teacher account is not approved');
    }
    if ((decoded.authVersion ?? 0) !== (user.authVersion ?? 0)) {
      throw new UnauthorizedError('Session authorization has changed; please sign in again');
    }

    const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus, authVersion: user.authVersion };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    const consumedAt = new Date();
    const familyId = stored.familyId || stored.id;
    const rotated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${familyId}, 0))`;
      const claim = await tx.refreshToken.updateMany({
        where: {
          id: stored.id,
          userId: user.id,
          revokedAt: null,
          consumedAt: null,
          expiresAt: { gt: consumedAt },
        },
        data: { revokedAt: consumedAt, consumedAt },
      });
      if (claim.count !== 1) return false;

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(newRefreshToken),
          expiresAt: new Date(consumedAt.getTime() + REFRESH_TTL_MS),
          familyId,
          parentTokenId: stored.id,
        },
      });
      return true;
    });

    if (!rotated) {
      const latest = await prisma.refreshToken.findUnique({ where: { id: stored.id } });
      if (latest?.consumedAt && Date.now() - latest.consumedAt.getTime() <= REFRESH_RACE_WINDOW_MS) {
        throw new ConflictError('Refresh token was just rotated. Retry with the latest session cookie.', 'REFRESH_ALREADY_ROTATED');
      }
      if (latest?.consumedAt) {
        await revokeFamilyOnReplay();
      }
      throw new UnauthorizedError('Session family revoked. Please log in again.', 'SESSION_REVOKED');
    }

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

