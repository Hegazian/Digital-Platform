import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { NotificationService } from '../notifications/notification.service';

export class TeacherService {
  static async getEnrolledStudents(teacherId: string) {
    // 1. Get all courses created by teacher
    const courses = await prisma.course.findMany({
      where: { teacherId },
      select: { id: true, subjectId: true },
    });

    const subjectIds = Array.from(new Set(courses.map((c) => c.subjectId)));

    // 2. Find students with active entitlements for these subjects
    const entitlements = await prisma.entitlement.findMany({
      where: {
        resourceType: 'SUBJECT',
        resourceId: { in: subjectIds },
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    const uniqueStudents = Array.from(
      new Map(entitlements.map((e) => [e.student.id, e.student])).values()
    );

    return uniqueStudents;
  }

  static async getStudentProgress(teacherId: string, studentId: string) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const completedLessons = await prisma.lessonProgress.count({
      where: { userId: studentId, isCompleted: true },
    });

    const attempts = await prisma.assessmentAttempt.findMany({
      where: { studentId },
      select: { score: true, isPassed: true },
    });

    return {
      student,
      totalLessonsCompleted: completedLessons,
      totalAssessmentsAttempted: attempts.length,
      averageScore:
        attempts.length > 0
          ? attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / attempts.length
          : 0,
    };
  }

  static async broadcastAnnouncement(data: {
    teacherId: string;
    courseId: string;
    titleEn: string;
    titleAr: string;
    messageEn: string;
    messageAr: string;
  }) {
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.teacherId !== data.teacherId) {
      throw new ForbiddenError('You do not own this course');
    }

    // Find all entitled students for course subject
    const entitlements = await prisma.entitlement.findMany({
      where: {
        resourceType: 'SUBJECT',
        resourceId: course.subjectId,
        status: 'ACTIVE',
      },
      select: { studentId: true },
    });

    let notificationsSent = 0;
    for (const ent of entitlements) {
      await NotificationService.createNotification({
        userId: ent.studentId,
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        messageEn: data.messageEn,
        messageAr: data.messageAr,
      });
      notificationsSent++;
    }

    return { notificationsSent };
  }

  static async getRevenueSummary(teacherId: string) {
    const students = await this.getEnrolledStudents(teacherId);
    const coursesCount = await prisma.course.count({ where: { teacherId } });

    return {
      totalStudentsEnrolled: students.length,
      totalCoursesCreated: coursesCount,
      revenueEgp: students.length * 1500, // Estimated subject enrollment revenue
    };
  }
}
