"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const entitlement_resolver_service_1 = require("../entitlement-resolver.service");
const client_1 = require("@prisma/client");
(0, vitest_1.describe)('Unified Entitlement Resolver (TDD)', () => {
    let subStudentId;
    let entStudentId;
    let courseStudentId;
    let expiredStudentId;
    let subjectId;
    let courseId;
    let teacherId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher-resolver-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Teacher Resolver',
                role: 'TEACHER',
            },
        });
        teacherId = teacher.id;
        // 2. Create Subject
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Subject Resolver ${Date.now()}`,
                nameAr: 'مادة التحقق',
            },
        });
        subjectId = subject.id;
        // 3. Create Course under Subject
        const course = await prisma_1.prisma.course.create({
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
        const subStudent = await prisma_1.prisma.user.create({
            data: {
                email: `student-sub-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Subscription Student',
                role: 'STUDENT',
            },
        });
        subStudentId = subStudent.id;
        await prisma_1.prisma.subscription.create({
            data: {
                userId: subStudentId,
                subjectId,
                period: client_1.SubscriptionPeriod.MONTHLY,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'ACTIVE',
            },
        });
        // 5. Student with active Entitlement for Subject (Paymob / Fawry / Voucher)
        const entStudent = await prisma_1.prisma.user.create({
            data: {
                email: `student-ent-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Entitlement Student',
                role: 'STUDENT',
            },
        });
        entStudentId = entStudent.id;
        await prisma_1.prisma.entitlement.create({
            data: {
                studentId: entStudentId,
                resourceType: client_1.EntitlementType.SUBJECT,
                resourceId: subjectId,
                sourceType: client_1.EntitlementSource.PURCHASE,
                startsAt: new Date(),
                expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                status: client_1.EntitlementStatus.ACTIVE,
            },
        });
        // 6. Student with direct Course Entitlement
        const courseStudent = await prisma_1.prisma.user.create({
            data: {
                email: `student-course-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Course Student',
                role: 'STUDENT',
            },
        });
        courseStudentId = courseStudent.id;
        await prisma_1.prisma.entitlement.create({
            data: {
                studentId: courseStudentId,
                resourceType: client_1.EntitlementType.COURSE,
                resourceId: courseId,
                sourceType: client_1.EntitlementSource.VOUCHER,
                startsAt: new Date(),
                expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                status: client_1.EntitlementStatus.ACTIVE,
            },
        });
        // 7. Student with Expired Entitlement
        const expiredStudent = await prisma_1.prisma.user.create({
            data: {
                email: `student-expired-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Expired Student',
                role: 'STUDENT',
            },
        });
        expiredStudentId = expiredStudent.id;
        await prisma_1.prisma.entitlement.create({
            data: {
                studentId: expiredStudentId,
                resourceType: client_1.EntitlementType.SUBJECT,
                resourceId: subjectId,
                sourceType: client_1.EntitlementSource.PURCHASE,
                startsAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                status: client_1.EntitlementStatus.ACTIVE,
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.entitlement.deleteMany({
                where: {
                    studentId: { in: [subStudentId, entStudentId, courseStudentId, expiredStudentId] },
                },
            });
            await prisma_1.prisma.subscription.deleteMany({ where: { userId: subStudentId } });
            await prisma_1.prisma.course.deleteMany({ where: { id: courseId } });
            await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
            await prisma_1.prisma.user.deleteMany({
                where: {
                    id: { in: [teacherId, subStudentId, entStudentId, courseStudentId, expiredStudentId] },
                },
            });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('should resolve subject access for student with active Subscription', async () => {
        const hasAccess = await entitlement_resolver_service_1.EntitlementResolver.hasSubjectAccess(subStudentId, subjectId);
        (0, vitest_1.expect)(hasAccess).toBe(true);
        const hasCourseAccess = await entitlement_resolver_service_1.EntitlementResolver.hasCourseAccess(subStudentId, courseId);
        (0, vitest_1.expect)(hasCourseAccess).toBe(true);
    });
    (0, vitest_1.it)('should resolve subject access for student with active Subject Entitlement', async () => {
        const hasAccess = await entitlement_resolver_service_1.EntitlementResolver.hasSubjectAccess(entStudentId, subjectId);
        (0, vitest_1.expect)(hasAccess).toBe(true);
        const hasCourseAccess = await entitlement_resolver_service_1.EntitlementResolver.hasCourseAccess(entStudentId, courseId);
        (0, vitest_1.expect)(hasCourseAccess).toBe(true);
    });
    (0, vitest_1.it)('should resolve course access for student with direct Course Entitlement', async () => {
        const hasCourseAccess = await entitlement_resolver_service_1.EntitlementResolver.hasCourseAccess(courseStudentId, courseId);
        (0, vitest_1.expect)(hasCourseAccess).toBe(true);
    });
    (0, vitest_1.it)('should deny access for expired subscription / entitlement', async () => {
        const hasAccess = await entitlement_resolver_service_1.EntitlementResolver.hasSubjectAccess(expiredStudentId, subjectId);
        (0, vitest_1.expect)(hasAccess).toBe(false);
        const hasCourseAccess = await entitlement_resolver_service_1.EntitlementResolver.hasCourseAccess(expiredStudentId, courseId);
        (0, vitest_1.expect)(hasCourseAccess).toBe(false);
    });
});
