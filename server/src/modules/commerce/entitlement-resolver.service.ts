import { prisma } from '../../prisma';
import { EntitlementType, EntitlementStatus, Role } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../utils/errors';

export class EntitlementResolver {
  /**
   * Resolves the course (and its owner) that a lesson belongs to,
   * through either its module or its section parent.
   */
  static async resolveLessonCourse(lessonId: string): Promise<{ courseId: string; teacherId: string } | null> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        moduleId: true,
        sectionId: true,
        module: { select: { courseId: true, course: { select: { teacherId: true } } } },
        section: { select: { courseId: true, course: { select: { teacherId: true } } } },
      },
    });
    if (!lesson) return null;

    const courseId = lesson.module?.courseId || lesson.section?.courseId;
    const teacherId = lesson.module?.course?.teacherId || lesson.section?.course?.teacherId;
    return courseId && teacherId ? { courseId, teacherId } : null;
  }

  /**
   * Resolves the course a quiz belongs to (via its optional lesson).
   * Standalone (unattached) quizzes return null -> treated as open practice.
   */
  static async resolveQuizCourse(quizId: string): Promise<{ courseId: string; teacherId: string } | null> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        lesson: {
          select: {
            module: { select: { courseId: true, course: { select: { teacherId: true } } } },
            section: { select: { courseId: true, course: { select: { teacherId: true } } } },
          },
        },
      },
    });
    const lesson = quiz?.lesson;
    const courseId = lesson?.module?.courseId || lesson?.section?.courseId;
    const teacherId = lesson?.module?.course?.teacherId || lesson?.section?.course?.teacherId;
    return courseId && teacherId ? { courseId, teacherId } : null;
  }

  /**
   * Resolves the course an assignment belongs to (assignments always carry a
   * lessonId when relevant to learning flows).
   */
  static async resolveAssignmentCourse(assignmentId: string): Promise<{ courseId: string; teacherId: string } | null> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { lessonId: true },
    });
    if (!assignment?.lessonId) return null;
    return this.resolveLessonCourse(assignment.lessonId);
  }

  /**
   * NFR-001 / TC-STUDENT-032/033: only enrolled students (active entitlement),
   * the owning teacher, or admins may interact with paid learning content.
   * Throws NotFoundError for unknown content and ForbiddenError otherwise.
   */
  static async assertLearningAccess(
    userId: string,
    userRole: Role | undefined,
    content: { courseId: string | null; teacherId?: string | null }
  ): Promise<void> {
    if (!content.courseId) {
      // Content not anchored to any course — nothing to protect here.
      return;
    }
    if (userRole === Role.ADMIN) return;
    if (content.teacherId && content.teacherId === userId) return;

    const hasAccess = await this.hasCourseAccess(userId, content.courseId);

    if (!hasAccess) {
      throw new ForbiddenError('You must be enrolled in this course to access its learning activities');
    }
  }

  /**
   * Checks whether a student has an active access grant for a given subject.
   * Access is confirmed if:
   * 1. The student has an active `Subscription` record for the subject.
   * 2. OR the student has an active `Entitlement` for the subject (from Paymob, Fawry, or Voucher).
   */
  static async hasSubjectAccess(studentId: string, subjectId: string): Promise<boolean> {
    const now = new Date();

    // 1. Check active subscription
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId: studentId,
        subjectId,
        status: 'ACTIVE',
        endDate: { gte: now },
      },
    });

    if (activeSub) return true;

    // 2. Check active entitlement for subject
    const activeEnt = await prisma.entitlement.findFirst({
      where: {
        studentId,
        resourceType: EntitlementType.SUBJECT,
        resourceId: subjectId,
        status: EntitlementStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    });

    return Boolean(activeEnt);
  }

  /**
   * Checks whether a student has active access to a specific course.
   * Access is confirmed if:
   * 1. The student has direct active `Entitlement` for the course.
   * 2. OR the student has active subject access for the parent subject of the course.
   */
  static async hasCourseAccess(studentId: string, courseId: string): Promise<boolean> {
    const now = new Date();

    // 1. Check direct course entitlement
    const courseEnt = await prisma.entitlement.findFirst({
      where: {
        studentId,
        resourceType: EntitlementType.COURSE,
        resourceId: courseId,
        status: EntitlementStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    });

    if (courseEnt) return true;

    // 2. Lookup course parent subject and check subject access
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { subjectId: true },
    });

    if (course && course.subjectId) {
      return await this.hasSubjectAccess(studentId, course.subjectId);
    }

    return false;
  }

  /**
   * Aggregates all accessible subjects and courses for a student.
   */
  static async getAccessibleResources(studentId: string): Promise<{
    subjectIds: Set<string>;
    courseIds: Set<string>;
  }> {
    const now = new Date();
    const subjectIds = new Set<string>();
    const courseIds = new Set<string>();

    // 1. Subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: studentId,
        status: 'ACTIVE',
        endDate: { gte: now },
      },
      select: { subjectId: true },
    });
    subscriptions.forEach((s) => subjectIds.add(s.subjectId));

    // 2. Entitlements
    const entitlements = await prisma.entitlement.findMany({
      where: {
        studentId,
        status: EntitlementStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      select: { resourceType: true, resourceId: true },
    });

    entitlements.forEach((e) => {
      if (e.resourceType === EntitlementType.SUBJECT) {
        subjectIds.add(e.resourceId);
      } else if (e.resourceType === EntitlementType.COURSE) {
        courseIds.add(e.resourceId);
      }
    });

    return { subjectIds, courseIds };
  }
}
