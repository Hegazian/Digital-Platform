import bcrypt from 'bcrypt';
import { Role, TeacherStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';

export class AuthService {
  static async register(data: any) {
    const { email, password, name, role } = data;

    // SECURITY: Block public registration as ADMIN.
    // Admins can only be created via seed script or by existing admins.
    const allowedRoles = [Role.STUDENT, Role.TEACHER];
    const sanitizedRole = role && allowedRoles.includes(role) ? role : Role.STUDENT;

    if (role === Role.ADMIN) {
      throw new ForbiddenError('Admin accounts cannot be created through public registration');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
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
        const { verifySync } = await import('otplib');
        const verification = verifySync({ token: data.mfaCode, secret: user.mfaSecret });
        if (!verification.valid) {
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

    const { verifySync } = await import('otplib');
    const verification = verifySync({ token: mfaCode, secret: user.mfaSecret });
    if (!verification.valid) {
      throw new UnauthorizedError('Invalid MFA authentication code');
    }

    const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

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

  static async refreshToken(token: string) {
    if (!token) {
      throw new BadRequestError('Refresh token is required');
    }

    try {
      const { verifyRefreshToken } = await import('../../utils/jwt');
      const decoded = verifyRefreshToken(token) as any;

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User account is invalid or deactivated');
      }

      const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err: any) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
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

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.gradeId !== undefined && { gradeId: data.gradeId }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teacherStatus: true,
        avatar: true,
        gradeId: true,
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

