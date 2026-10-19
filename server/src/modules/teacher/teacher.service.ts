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
    const courseIds = courses.map((c) => c.id);

    // 2. Find students with active entitlements for these subjects or individual courses
    const entitlements = await prisma.entitlement.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          {
            resourceType: 'SUBJECT',
            resourceId: { in: subjectIds },
          },
          {
            resourceType: 'COURSE',
            resourceId: { in: courseIds },
          },
        ],
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

    // Ownership (NFR-001 / TC-TEACHER-102): teachers may only view progress
    // for students enrolled in THEIR courses. Resolve the intersection of
    // the student's active entitlements and the teacher's course subjects.
    const teacherCourses = await prisma.course.findMany({
      where: { teacherId },
      select: { id: true, subjectId: true },
    });
    const mySubjectIds = Array.from(new Set(teacherCourses.map((c) => c.subjectId)));

    if (mySubjectIds.length === 0) {
      throw new ForbiddenError('You have no courses to view student progress for');
    }

    const access = await prisma.entitlement.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
        OR: [
          { resourceType: 'SUBJECT', resourceId: { in: mySubjectIds } },
          {
            resourceType: 'COURSE',
            resourceId: { in: teacherCourses.map((c) => c.id) },
          },
        ],
      },
    });

    if (!access) {
      throw new ForbiddenError('This student is not enrolled in any of your courses');
    }

    // Scope counts to lessons inside THIS teacher's courses only.
    const myLessons = await prisma.lesson.findMany({
      where: {
        section: { course: { teacherId } },
      },
      select: { id: true },
    });
    const myLessonIds = myLessons.map((l) => l.id);

    const completedLessons =
      myLessonIds.length > 0
        ? await prisma.lessonProgress.count({
            where: { userId: studentId, isCompleted: true, lessonId: { in: myLessonIds } },
          })
        : 0;

    // Quizzes attempted by this student
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: studentId },
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
    courseId?: string;
    titleEn: string;
    titleAr: string;
    messageEn: string;
    messageAr: string;
  }) {
    let courseIds: string[] = [];
    let subjectIds: string[] = [];

    if (data.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: data.courseId },
      });

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      if (course.teacherId !== data.teacherId) {
        throw new ForbiddenError('You do not own this course');
      }

      courseIds = [course.id];
      subjectIds = [course.subjectId];
    } else {
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId: data.teacherId },
        select: { id: true, subjectId: true },
      });
      courseIds = teacherCourses.map((c) => c.id);
      subjectIds = Array.from(new Set(teacherCourses.map((c) => c.subjectId)));
    }

    if (courseIds.length === 0 && subjectIds.length === 0) {
      return { notificationsSent: 0 };
    }

    // Find all entitled students for course subject or course
    const entitlements = await prisma.entitlement.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { resourceType: 'SUBJECT', resourceId: { in: subjectIds } },
          { resourceType: 'COURSE', resourceId: { in: courseIds } },
        ],
      },
      select: { studentId: true },
    });

    const uniqueStudentIds = Array.from(new Set(entitlements.map((e) => e.studentId)));

    let notificationsSent = 0;
    for (const studentId of uniqueStudentIds) {
      await NotificationService.createNotification({
        userId: studentId,
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
    const courses = await prisma.course.findMany({
      where: { teacherId },
      select: { id: true, subjectId: true },
    });

    const courseIds = courses.map((c) => c.id);
    const subjectIds = Array.from(new Set(courses.map((c) => c.subjectId)));

    const paidOrders = await prisma.order.findMany({
      where: {
        status: 'PAID',
        product: {
          OR: [
            { productType: 'COURSE', resourceId: { in: courseIds } },
            { productType: 'SUBJECT', resourceId: { in: subjectIds } },
          ],
        },
      },
      select: {
        totalAmountEgp: true,
        totalAmountUsd: true,
      },
    });

    const revenueEgp = paidOrders.reduce((sum, order) => sum + Number(order.totalAmountEgp), 0);
    const revenueUsd = paidOrders.reduce((sum, order) => sum + Number(order.totalAmountUsd), 0);

    return {
      totalStudentsEnrolled: students.length,
      totalCoursesCreated: courses.length,
      revenueEgp,
      revenueUsd,
    };
  }
}
