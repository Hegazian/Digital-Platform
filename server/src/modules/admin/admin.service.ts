import { prisma } from '../../prisma';
import { Role, TeacherStatus, SubscriptionStatus } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { logAuditAction } from '../audit/audit.service';
import { invalidateActivationCache } from '../auth/auth.middleware';

export class AdminService {
  /**
   * Get all users with optional filtering by role, teacher status, and search query.
   * Supports pagination via skip/take.
   */
  static async getAllUsers(filters: {
    role?: Role;
    teacherStatus?: TeacherStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { role, teacherStatus, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (teacherStatus) where.teacherStatus = teacherStatus;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          teacherStatus: true,
          isActive: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              courses: true,
              subscriptions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all pending teacher applications awaiting admin review.
   */
  static async getPendingTeachers() {
    return await prisma.user.findMany({
      where: {
        role: Role.TEACHER,
        teacherStatus: TeacherStatus.PENDING,
      },
      select: {
        id: true,
        email: true,
        name: true,
        teacherStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve or reject a teacher application.
   * Sends notification email to the teacher.
   */
  static async updateTeacherStatus(
    teacherId: string,
    status: 'APPROVED' | 'REJECTED',
    adminId?: string
  ) {
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    if (teacher.role !== Role.TEACHER) {
      throw new BadRequestError('User is not a teacher');
    }

    if (teacher.teacherStatus === status) {
      throw new BadRequestError(`Teacher is already ${status}`);
    }

    const updated = await prisma.user.update({
      where: { id: teacherId },
      data: { teacherStatus: status as TeacherStatus },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teacherStatus: true,
      },
    });

    // Send notification email to teacher (non-blocking)
    try {
      const { sendTeacherStatusEmail } = await import('../../utils/email');
      sendTeacherStatusEmail(updated.email, updated.name, status).catch((err) =>
        console.warn('Teacher status email error:', err)
      );
    } catch (e) {
      // Ignore background email errors
    }

    await logAuditAction(
      adminId || teacherId,
      'TEACHER_STATUS_UPDATED',
      teacherId,
      'User',
      { status }
    );

    return updated;
  }

  /**
   * Deactivate or reactivate a user account.
   */
  static async setUserActiveStatus(userId: string, isActive: boolean, adminId?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prevent deactivating other admins
    if (user.role === Role.ADMIN && !isActive) {
      throw new ForbiddenError('Cannot deactivate admin accounts');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Instant revocation: next request from this user re-checks the DB.
    invalidateActivationCache(userId);

    // Deactivation also kills every live refresh session immediately
    // (reactivation requires a fresh login).
    if (!isActive) {
      const { AuthService } = await import('../auth/auth.service');
      await AuthService.revokeAllForUser(userId);
    }

    await logAuditAction(
      adminId || userId,
      isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      userId,
      'User',
      { isActive }
    );

    return updated;
  }

  /**
   * Create a new user (Teacher or Student) directly by Admin.
   */
  static async createUser(data: {
    email: string;
    password: string;
    name: string;
    role?: Role;
    teacherStatus?: TeacherStatus;
    gradeId?: string;
    isActive?: boolean;
  }, adminId?: string) {
    const { email, password, name, role = Role.STUDENT, teacherStatus, gradeId, isActive = true } = data;

    // Defense in depth: the zod layer enforces this for HTTP traffic, but
    // direct callers must never be able to provision a guessable credential.
    if (!password || password.length < 8) {
      throw new BadRequestError('A password of at least 8 characters is required');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestError('User with this email already exists');
    }

    if (gradeId) {
      const grade = await prisma.grade.findUnique({ where: { id: gradeId } });
      if (!grade) {
        throw new BadRequestError('Invalid grade ID');
      }
    }

    const { default: bcrypt } = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    const resolvedTeacherStatus = role === Role.TEACHER ? (teacherStatus || TeacherStatus.APPROVED) : null;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        teacherStatus: resolvedTeacherStatus,
        gradeId: gradeId || null,
        isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teacherStatus: true,
        gradeId: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditAction(
      adminId || user.id,
      'USER_CREATED',
      user.id,
      'User',
      { email: user.email, role: user.role }
    );

    return user;
  }

  /**
   * Update an existing user's information by Admin.
   */
  static async updateUser(
    userId: string,
    data: {
      name?: string;
      email?: string;
      role?: Role;
      teacherStatus?: TeacherStatus;
      gradeId?: string | null;
      isActive?: boolean;
      password?: string;
    },
    adminId?: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) {
        throw new BadRequestError('Another user with this email already exists');
      }
    }

    if (data.gradeId) {
      const grade = await prisma.grade.findUnique({ where: { id: data.gradeId } });
      if (!grade) {
        throw new BadRequestError('Invalid grade ID');
      }
    }

    let hashedPassword: string | undefined;
    if (data.password) {
      const { default: bcrypt } = await import('bcrypt');
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.role && { role: data.role }),
        ...(data.teacherStatus !== undefined && { teacherStatus: data.teacherStatus }),
        ...(data.gradeId !== undefined && { gradeId: data.gradeId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teacherStatus: true,
        gradeId: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditAction(
      adminId || userId,
      'USER_UPDATED',
      userId,
      'User',
      { updatedFields: Object.keys(data) }
    );

    return updated;
  }

  /**
   * Update academic year.
   */
  static async updateAcademicYear(
    id: string,
    data: {
      name?: string;
      startDate?: string | Date;
      endDate?: string | Date;
      isActive?: boolean;
    }
  ) {
    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) {
      throw new NotFoundError('Academic year not found');
    }

    return await prisma.academicYear.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Get platform-wide analytics and statistics.
   */
  static async getPlatformStats() {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    const totalStudents = await prisma.user.count({ where: { role: Role.STUDENT } });
    const totalTeachers = await prisma.user.count({ where: { role: Role.TEACHER } });

    const pendingTeachers = await prisma.user.count({ where: { role: Role.TEACHER, teacherStatus: TeacherStatus.PENDING } });
    const approvedTeachers = await prisma.user.count({ where: { role: Role.TEACHER, teacherStatus: TeacherStatus.APPROVED } });
    const totalCourses = await prisma.course.count();
    const publishedCourses = await prisma.course.count({ where: { isPublished: true } });
    const totalSubjects = await prisma.subject.count();
    const activeSubscriptions = await prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } });
    const totalSubscriptions = await prisma.subscription.count();
    const totalVideos = await prisma.video.count();
    const totalQuizzes = await prisma.quiz.count();

    return {
      users: {
        total: totalUsers,
        activeUsers,
        students: totalStudents,
        teachers: totalTeachers,

        pendingTeachers,
        approvedTeachers,
      },
      content: {
        totalCourses,
        publishedCourses,
        totalSubjects,
        totalVideos,
        totalQuizzes,
      },
      subscriptions: {
        active: activeSubscriptions,
        total: totalSubscriptions,
      },
    };
  }
}

