import { prisma } from '../../prisma';
import { EntitlementType, EntitlementStatus, Role } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { effectiveEntitlementWhere, effectiveSubscriptionWhere } from './access-time';
import { AccessPolicy } from './access-policy.service';

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
   * Resolves the course that owns a collaborative board's lesson block
   * (LessonBlock -> Lesson -> Module|Section -> Course).
   */
  static async resolveLessonBlockCourse(blockId: string): Promise<{ courseId: string; teacherId: string } | null> {
    const block = await prisma.lessonBlock.findUnique({
      where: { id: blockId },
      select: {
        lesson: {
          select: {
            moduleId: true,
            sectionId: true,
            module: { select: { courseId: true, course: { select: { teacherId: true } } } },
            section: { select: { courseId: true, course: { select: { teacherId: true } } } },
          },
        },
      },
    });
    const lesson = block?.lesson;
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
    if (!quiz) throw new NotFoundError('Quiz not found');
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
    if (userRole === Role.TEACHER && content.teacherId === userId) return;

    const decision = await AccessPolicy.resolveLearning(userId, userRole, content);
    if (!decision.allowed) {
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
    return (await AccessPolicy.resolveSubject(studentId, subjectId)).allowed;
  }

  /**
   * Checks whether a student has active access to a specific course.
   * Access is confirmed if:
   * 1. The student has direct active `Entitlement` for the course.
   * 2. OR the student has active subject access for the parent subject of the course.
   * 3. OR the student holds a GRADE_BUNDLE entitlement covering the course's grade.
   */
  static async hasCourseAccess(studentId: string, courseId: string): Promise<boolean> {
    return (await AccessPolicy.resolveCourse(studentId, courseId)).allowed;
  }

  static async hasCoursePreviewAccess(courseId: string, userId?: string): Promise<boolean> {
    return (await AccessPolicy.resolveCoursePreview(courseId, userId)).allowed;
  }

  /**
   * Aggregates all accessible subjects, courses and grade bundles for a student.
   */
  static async getAccessibleResources(studentId: string): Promise<{
    subjectIds: Set<string>;
    courseIds: Set<string>;
    gradeBundleIds: Set<string>;
  }> {
    const now = new Date();
    const subjectIds = new Set<string>();
    const courseIds = new Set<string>();
    const gradeBundleIds = new Set<string>();

    // 1. Subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: studentId,
        ...effectiveSubscriptionWhere(now),
      },
      select: { subjectId: true },
    });
    subscriptions.forEach((s) => subjectIds.add(s.subjectId));

    // 2. Entitlements
    const entitlements = await prisma.entitlement.findMany({
      where: {
        studentId,
        ...effectiveEntitlementWhere(now),
      },
      select: { resourceType: true, resourceId: true },
    });

    const directCourseIds: string[] = [];
    entitlements.forEach((e) => {
      if (e.resourceType === EntitlementType.SUBJECT) {
        subjectIds.add(e.resourceId);
      } else if (e.resourceType === EntitlementType.COURSE) {
        directCourseIds.push(e.resourceId);
      } else if (e.resourceType === EntitlementType.GRADE_BUNDLE) {
        gradeBundleIds.add(e.resourceId);
      }
    });

    if (directCourseIds.length) {
      const availableCourses = await prisma.course.findMany({
        where: { id: { in: directCourseIds }, retractedAt: null },
        select: { id: true },
      });
      availableCourses.forEach((course) => courseIds.add(course.id));
    }

    return { subjectIds, courseIds, gradeBundleIds };
  }
}
