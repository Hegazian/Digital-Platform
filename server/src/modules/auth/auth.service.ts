import bcrypt from 'bcrypt';
import { Role, TeacherStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError, BadRequestError, ForbiddenError } from '../../utils/errors';

export class AuthService {
  static async register(data: any) {
    const { email, password, name, role } = data;

    // SECURITY: Block public registration as ADMIN.
    // Admins can only be created via seed script or by existing admins.
    const allowedRoles = [Role.STUDENT, Role.TEACHER, Role.PARENT];
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

    const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}
