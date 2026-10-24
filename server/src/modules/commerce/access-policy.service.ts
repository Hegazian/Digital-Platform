import { EntitlementType, Role, Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { effectiveEntitlementWhere, effectiveSubscriptionWhere } from './access-time';

export type AccessSource = 'OPEN_PRACTICE' | 'COURSE_PREVIEW' | 'DIRECT_COURSE' | 'FREE_ENROLLMENT' | 'SUBJECT_ENTITLEMENT' | 'SUBJECT_SUBSCRIPTION' | 'GRADE_BUNDLE' | 'OWNER' | 'ADMIN' | 'DENIED';
export interface AccessDecision {
  allowed: boolean;
  source: AccessSource;
  expiresAt: Date | null;
  capabilities: readonly ('VIEW' | 'ASSESS' | 'DOWNLOAD' | 'DISCUSS')[];
}

const denied: AccessDecision = { allowed: false, source: 'DENIED', expiresAt: null, capabilities: [] };
type AccessDatabase = Pick<Prisma.TransactionClient, 'course' | 'subscription' | 'entitlement'>;
const granted = (source: AccessSource, expiresAt: Date | null): AccessDecision => ({
  allowed: true,
  source,
  expiresAt,
  capabilities: ['VIEW', 'ASSESS', 'DOWNLOAD', 'DISCUSS'],
});

/** The server-side decision point used by course learning surfaces. */
export class AccessPolicy {
  static async resolveSubject(studentId: string, subjectId: string, db: AccessDatabase = prisma): Promise<AccessDecision> {
    const now = new Date();
    const subscription = await db.subscription.findFirst({
      where: { userId: studentId, subjectId, ...effectiveSubscriptionWhere(now) },
      select: { endDate: true },
    });
    if (subscription) return granted('SUBJECT_SUBSCRIPTION', subscription.endDate);

    const entitlement = await db.entitlement.findFirst({
      where: { studentId, resourceType: EntitlementType.SUBJECT, resourceId: subjectId, ...effectiveEntitlementWhere(now) },
      select: { expiresAt: true },
    });
    return entitlement ? granted('SUBJECT_ENTITLEMENT', entitlement.expiresAt) : denied;
  }

  static async resolveCourse(studentId: string, courseId: string, db: AccessDatabase = prisma): Promise<AccessDecision> {
    const now = new Date();
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { subjectId: true, gradeId: true, retractedAt: true, status: true, isPublished: true },
    });
    if (!course || course.retractedAt) return denied;
    if (course.status !== 'ARCHIVED' && (course.status !== 'PUBLISHED' || !course.isPublished)) return denied;

    const direct = await db.entitlement.findFirst({
      where: { studentId, resourceType: EntitlementType.COURSE, resourceId: courseId, ...effectiveEntitlementWhere(now) },
      select: { expiresAt: true, sourceType: true },
    });
    if (direct) return granted(direct.sourceType === 'FREE_ENROLLMENT' ? 'FREE_ENROLLMENT' : 'DIRECT_COURSE', direct.expiresAt);

    if (course.subjectId) {
      const subject = await this.resolveSubject(studentId, course.subjectId, db);
      if (subject.allowed) return subject;
    }

    if (course.gradeId) {
      const bundle = await db.entitlement.findFirst({
        where: { studentId, resourceType: EntitlementType.GRADE_BUNDLE, resourceId: course.gradeId, ...effectiveEntitlementWhere(now) },
        select: { expiresAt: true },
      });
      if (bundle) return granted('GRADE_BUNDLE', bundle.expiresAt);
    }
    return denied;
  }

  static async resolveResource(studentId: string, resourceType: EntitlementType, resourceId: string): Promise<AccessDecision> {
    if (resourceType === EntitlementType.COURSE) return this.resolveCourse(studentId, resourceId);
    if (resourceType === EntitlementType.SUBJECT) return this.resolveSubject(studentId, resourceId);
    const grant = await prisma.entitlement.findFirst({ where: {
      studentId, resourceType, resourceId, ...effectiveEntitlementWhere(new Date()),
    }, select: { expiresAt: true } });
    return grant ? granted('GRADE_BUNDLE', grant.expiresAt) : denied;
  }

  static async resolveCoursePreview(courseId: string, userId?: string): Promise<AccessDecision> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { retractedAt: true, isPublished: true, status: true, visibility: true },
    });
    if (!course || course.retractedAt || !course.isPublished || course.status !== 'PUBLISHED') return denied;
    if (course.visibility === 'PRIVATE') return userId ? this.resolveCourse(userId, courseId) : denied;
    return { allowed: true, source: 'COURSE_PREVIEW', expiresAt: null, capabilities: ['VIEW', 'DOWNLOAD'] };
  }

  static async resolveLearning(userId: string, userRole: Role | undefined, content: { courseId: string | null; teacherId?: string | null }): Promise<AccessDecision> {
    if (!content.courseId) return granted('OPEN_PRACTICE', null); // standalone practice
    if (userRole === Role.ADMIN) return granted('ADMIN', null);
    if (userRole === Role.TEACHER && content.teacherId === userId) return granted('OWNER', null);
    return this.resolveCourse(userId, content.courseId);
  }
}
