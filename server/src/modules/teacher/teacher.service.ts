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
        OR: [
          { module: { course: { teacherId } } },
          { section: { course: { teacherId } } },
        ],
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

    // Assessments tied to this student. (Assessment has no lesson relation in
    // the current schema; cross-teacher exposure is bounded by the enrollment
    // gate above — only students enrolled in THIS teacher's subjects pass.)
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
