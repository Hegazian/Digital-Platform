import { prisma } from '../../prisma';
import { Role, TeacherStatus, SubscriptionStatus } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';

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
    status: 'APPROVED' | 'REJECTED'
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

    return updated;
  }

  /**
   * Deactivate or reactivate a user account.
   */
  static async setUserActiveStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prevent deactivating other admins
    if (user.role === Role.ADMIN && !isActive) {
      throw new ForbiddenError('Cannot deactivate admin accounts');
    }

    return await prisma.user.update({
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
  }

  /**
   * Get platform-wide analytics and statistics.
   */
  static async getPlatformStats() {
    const totalUsers = await prisma.user.count();
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
