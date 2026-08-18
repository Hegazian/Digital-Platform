import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../prisma';
import { EntitlementResolver } from '../entitlement-resolver.service';
import { EntitlementType, EntitlementSource, EntitlementStatus, SubscriptionPeriod } from '@prisma/client';

describe('Unified Entitlement Resolver (TDD)', () => {
  let subStudentId: string;
  let entStudentId: string;
  let courseStudentId: string;
  let expiredStudentId: string;
  let subjectId: string;
  let courseId: string;
  let teacherId: string;

  beforeAll(async () => {
    // 1. Create Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher-resolver-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Teacher Resolver',
        role: 'TEACHER',
      },
    });
    teacherId = teacher.id;

    // 2. Create Subject
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Subject Resolver ${Date.now()}`,
        nameAr: 'مادة التحقق',
      },
    });
    subjectId = subject.id;

    // 3. Create Course under Subject
    const course = await prisma.course.create({
      data: {
        titleEn: `Course Resolver ${Date.now()}`,
        titleAr: 'دورة التحقق',
        description: 'Testing unified entitlement resolution',
        teacherId,
        subjectId,
        isPublished: true,
      },
    });
    courseId = course.id;

    // 4. Student with active Subscription (Vodafone Cash / InstaPay)
    const subStudent = await prisma.user.create({
      data: {
        email: `student-sub-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Subscription Student',
        role: 'STUDENT',
      },
    });
    subStudentId = subStudent.id;

    await prisma.subscription.create({
      data: {
        userId: subStudentId,
        subjectId,
        period: SubscriptionPeriod.MONTHLY,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    // 5. Student with active Entitlement for Subject (Paymob / Fawry / Voucher)
    const entStudent = await prisma.user.create({
      data: {
        email: `student-ent-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Entitlement Student',
        role: 'STUDENT',
      },
    });
    entStudentId = entStudent.id;

    await prisma.entitlement.create({
      data: {
        studentId: entStudentId,
        resourceType: EntitlementType.SUBJECT,
        resourceId: subjectId,
        sourceType: EntitlementSource.PURCHASE,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        status: EntitlementStatus.ACTIVE,
      },
    });

    // 6. Student with direct Course Entitlement
    const courseStudent = await prisma.user.create({
      data: {
        email: `student-course-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Course Student',
        role: 'STUDENT',
      },
    });
    courseStudentId = courseStudent.id;

    await prisma.entitlement.create({
      data: {
        studentId: courseStudentId,
        resourceType: EntitlementType.COURSE,
        resourceId: courseId,
        sourceType: EntitlementSource.VOUCHER,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: EntitlementStatus.ACTIVE,
      },
    });

    // 7. Student with Expired Entitlement
    const expiredStudent = await prisma.user.create({
      data: {
        email: `student-expired-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Expired Student',
        role: 'STUDENT',
      },
    });
    expiredStudentId = expiredStudent.id;

    await prisma.entitlement.create({
      data: {
        studentId: expiredStudentId,
        resourceType: EntitlementType.SUBJECT,
        resourceId: subjectId,
        sourceType: EntitlementSource.PURCHASE,
        startsAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        status: EntitlementStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.entitlement.deleteMany({
        where: {
          studentId: { in: [subStudentId, entStudentId, courseStudentId, expiredStudentId] },
        },
      });
      await prisma.subscription.deleteMany({ where: { userId: subStudentId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.subject.deleteMany({ where: { id: subjectId } });
      await prisma.user.deleteMany({
        where: {
          id: { in: [teacherId, subStudentId, entStudentId, courseStudentId, expiredStudentId] },
        },
      });
    } catch (e) {}
  });

  it('should resolve subject access for student with active Subscription', async () => {
    const hasAccess = await EntitlementResolver.hasSubjectAccess(subStudentId, subjectId);
    expect(hasAccess).toBe(true);

    const hasCourseAccess = await EntitlementResolver.hasCourseAccess(subStudentId, courseId);
    expect(hasCourseAccess).toBe(true);
  });

  it('should resolve subject access for student with active Subject Entitlement', async () => {
    const hasAccess = await EntitlementResolver.hasSubjectAccess(entStudentId, subjectId);
    expect(hasAccess).toBe(true);

    const hasCourseAccess = await EntitlementResolver.hasCourseAccess(entStudentId, courseId);
    expect(hasCourseAccess).toBe(true);
  });

  it('should resolve course access for student with direct Course Entitlement', async () => {
    const hasCourseAccess = await EntitlementResolver.hasCourseAccess(courseStudentId, courseId);
    expect(hasCourseAccess).toBe(true);
  });

  it('should deny access for expired subscription / entitlement', async () => {
    const hasAccess = await EntitlementResolver.hasSubjectAccess(expiredStudentId, subjectId);
    expect(hasAccess).toBe(false);

    const hasCourseAccess = await EntitlementResolver.hasCourseAccess(expiredStudentId, courseId);
    expect(hasCourseAccess).toBe(false);
  });
});
