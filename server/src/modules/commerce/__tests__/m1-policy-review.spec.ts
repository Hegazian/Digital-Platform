import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../prisma';
import { AccessPolicy } from '../access-policy.service';
import { CommerceService } from '../commerce.service';
import { VideoService } from '../../videos/video.service';
import { MaterialService } from '../../materials/material.service';
import { CourseService } from '../../courses/course.service';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

describe('M1 review: access parity and discovery', () => {
  let teacher: string, buyer: string, outsider: string, subject: string, course: string, section: string, lesson: string, video: string, product: string;
  beforeAll(async () => {
    const users = await Promise.all(['teacher', 'buyer', 'outsider'].map((name) => prisma.user.create({ data: {
      email: `${name}-${randomUUID()}@m1-policy.test`, name, password: 'fixture-only',
      role: name === 'teacher' ? 'TEACHER' : 'STUDENT', teacherStatus: name === 'teacher' ? 'APPROVED' : null,
    } })));
    [teacher, buyer, outsider] = users.map(user => user.id);
    subject = (await prisma.subject.create({ data: { nameEn: `Review-${randomUUID()}`, nameAr: 'اختبار الصلاحيات' } })).id;
    course = (await prisma.course.create({ data: { teacherId: teacher, subjectId: subject,
      titleEn: 'Private course', titleAr: 'مقرر خاص', description: 'Fixture', status: 'PUBLISHED', isPublished: true, visibility: 'PRIVATE' } })).id;
    section = (await prisma.section.create({ data: { courseId: course, titleEn: 'Preview', titleAr: 'معاينة', orderIndex: 0, isFreePreview: true } })).id;
    video = (await prisma.video.create({ data: { teacherId: teacher, videoUrl: 'https://example.test/video.mp4', status: 'READY', originalFileName: 'video.mp4' } })).id;
    lesson = (await prisma.lesson.create({ data: { sectionId: section, videoId: video, titleEn: 'Lesson', titleAr: 'درس', orderIndex: 0 } })).id;
    await prisma.material.create({ data: { lessonId: lesson, title: 'Reference', fileUrl: 'https://example.test/ref.pdf', fileType: 'application/pdf', sizeBytes: 100 } });
    await prisma.subscription.create({ data: { userId: buyer, subjectId: subject, period: 'MONTHLY', status: 'ACTIVE', startDate: new Date(Date.now() - 60_000), endDate: new Date(Date.now() + 86_400_000) } });
    product = (await prisma.product.create({ data: { nameEn: 'Private product', nameAr: 'منتج خاص', productType: 'COURSE', resourceId: course, priceEgp: 100, priceUsd: 2 } })).id;
  });
  afterAll(async () => {
    await prisma.order.deleteMany({ where: { studentId: { in: [buyer, outsider] } } });
    await prisma.product.deleteMany({ where: { resourceId: { in: [course, subject] } } });
    await prisma.material.deleteMany({ where: { lessonId: lesson } });
    await prisma.lesson.deleteMany({ where: { id: lesson } });
    await prisma.video.deleteMany({ where: { id: video } });
    await prisma.section.deleteMany({ where: { id: section } });
    await prisma.course.deleteMany({ where: { id: course } });
    await prisma.subscription.deleteMany({ where: { subjectId: subject } });
    await prisma.subject.deleteMany({ where: { id: subject } });
    await prisma.user.deleteMany({ where: { id: { in: [teacher, buyer, outsider] } } });
  });
  it('private preview delivery requires membership and does not leak through the product catalog', async () => {
    expect(await AccessPolicy.resolveCoursePreview(course, outsider)).toMatchObject({ allowed: false });
    expect(await VideoService.verifyPlaybackAccess(video, outsider)).toBe(false);
    await expect(MaterialService.getMaterialsByLesson(lesson, outsider, 'STUDENT')).rejects.toThrow();
    expect(await VideoService.verifyPlaybackAccess(video, buyer)).toBe(true);
    expect(await MaterialService.getMaterialsByLesson(lesson, buyer, 'STUDENT')).toHaveLength(1);
    expect((await CommerceService.getAllProducts()).some(item => item.id === product)).toBe(false);
    const singlePool = new URL(process.env.DATABASE_URL!);
    singlePool.searchParams.set('connection_limit', '1');
    singlePool.searchParams.set('pool_timeout', '2');
    const key = randomUUID();
    const servicePath = path.resolve(__dirname, '../commerce.service.ts');
    const prismaPath = path.resolve(__dirname, '../../../prisma.ts');
    const probe = `const {CommerceService}=require(${JSON.stringify(servicePath)}); const {prisma}=require(${JSON.stringify(prismaPath)}); CommerceService.createOrder(${JSON.stringify(buyer)},${JSON.stringify({ productId: product, paymentMethod: 'MANUAL', idempotencyKey: key })}).catch(e=>{console.error(e.code||e.name);process.exitCode=1}).finally(()=>prisma.$disconnect());`;
    const checkout = spawnSync(process.execPath, ['--import', 'tsx', '--eval', probe], { cwd: path.resolve(__dirname, '../../../..'), env: { ...process.env, DATABASE_URL: singlePool.href, DIRECT_URL: singlePool.href }, encoding: 'utf8', timeout: 25_000, windowsHide: true });
    expect(checkout.error).toBeUndefined();
    expect(checkout.status, checkout.stderr).toBe(0);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
    const uploader = await prisma.user.create({ data: { email: `uploader-${randomUUID()}@m1-policy.test`, name: 'Admin uploader', password: 'fixture-only', role: 'ADMIN' } });
    try {
      await prisma.video.update({ where: { id: video }, data: { teacherId: uploader.id } });
      expect(await VideoService.verifyPlaybackAccess(video, teacher)).toBe(true);
    } finally {
      await prisma.video.update({ where: { id: video }, data: { teacherId: teacher } });
      await prisma.user.delete({ where: { id: uploader.id } });
    }
  });
  it('checkout access agrees with subscription access and denies drafts and retracted media', async () => {
    expect(await CommerceService.checkCourseAccess(buyer, course)).toMatchObject({ hasAccess: true });
    expect(await CommerceService.checkEntitlementAccess(buyer, 'SUBJECT', subject)).toMatchObject({ hasAccess: true });
    await prisma.course.update({ where: { id: course }, data: { status: 'DRAFT', isPublished: false } });
    expect(await CommerceService.checkCourseAccess(buyer, course)).toMatchObject({ hasAccess: false });
    await prisma.course.update({ where: { id: course }, data: { status: 'PUBLISHED', isPublished: true, retractedAt: new Date() } });
    await prisma.section.update({ where: { id: section }, data: { isFreePreview: false } });
    expect(await CommerceService.checkCourseAccess(buyer, course)).toMatchObject({ hasAccess: false });
    expect(await VideoService.verifyPlaybackAccess(video, buyer)).toBe(false);
    await expect(MaterialService.getMaterialsByLesson(lesson, buyer, 'STUDENT')).rejects.toThrow();
    expect(await CourseService.getCourseById(course, { userId: teacher, role: 'TEACHER' })).toMatchObject({ id: course });
    await expect(CourseService.getLearningCourse(course, { userId: buyer, role: 'STUDENT' })).rejects.toThrow();
  });
  it('a known private ID cannot create membership through free enrollment or checkout', async () => {
    await prisma.course.update({ where: { id: course }, data: { status: 'PUBLISHED', isPublished: true, retractedAt: null, isFree: true } });
    await expect(CourseService.enrollStudentFree(course, outsider)).rejects.toThrow(/assigned access/);
    await expect(CourseService.enrollStudentFree(course, buyer)).rejects.toThrow(/assigned access/);
    expect(await prisma.entitlement.count({ where: { studentId: buyer, resourceId: course } })).toBe(0);
    await expect(CommerceService.createOrder(outsider, { productId: product, paymentMethod: 'MANUAL', idempotencyKey: randomUUID() })).rejects.toThrow(/not available/);
    expect(await prisma.entitlement.count({ where: { studentId: outsider, resourceId: course } })).toBe(0);
    await prisma.course.update({ where: { id: course }, data: { isFree: false } });
  });
  it('concurrent manual-order retries converge and a changed request conflicts', async () => {
    const subjectProduct = await prisma.product.create({ data: { nameEn: 'Subject', nameAr: 'مادة', productType: 'SUBJECT', resourceId: subject, priceEgp: 200, priceUsd: 4 } });
    const key = randomUUID();
    const command = { productId: subjectProduct.id, paymentMethod: 'MANUAL' as const, idempotencyKey: key };
    const orders = await Promise.all(Array.from({ length: 8 }, () => CommerceService.createOrder(buyer, command)));
    expect(new Set(orders.map(order => order.id)).size).toBe(1);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
    await expect(CommerceService.createOrder(buyer, { ...command, productId: product })).rejects.toThrow(/different checkout/);
    await expect(CommerceService.createOrder(outsider, command)).rejects.toThrow(/another account/);
  });
  it('demoting a course teacher removes owner playback and policy bypasses', async () => {
    await prisma.course.update({ where: { id: course }, data: { status: 'PUBLISHED', isPublished: true, retractedAt: null } });
    await prisma.user.update({ where: { id: teacher }, data: { role: 'STUDENT', teacherStatus: null } });
    expect(await AccessPolicy.resolveLearning(teacher, 'STUDENT', { courseId: course, teacherId: teacher })).toMatchObject({ allowed: false });
    expect(await VideoService.verifyPlaybackAccess(video, teacher)).toBe(false);
  });
  it('concurrent free enrollment retries create one grant and archive blocks further joins', async () => {
    await prisma.course.update({ where: { id: course }, data: { status: 'PUBLISHED', isPublished: true, retractedAt: null, visibility: 'PUBLIC', isFree: true } });
    const replies = await Promise.all(Array.from({ length: 12 }, () => CourseService.enrollStudentFree(course, outsider)));
    expect(new Set(replies.map(reply => reply.entitlement.id)).size).toBe(1);
    expect(await prisma.entitlement.count({ where: { studentId: outsider, resourceId: course } })).toBe(1);
    await prisma.user.update({ where: { id: teacher }, data: { role: 'TEACHER', teacherStatus: 'APPROVED' } });
    await CourseService.archiveCourse(course, teacher, 'TEACHER');
    await expect(CourseService.enrollStudentFree(course, buyer)).rejects.toThrow(/unpublished/);
    expect(await CourseService.getCourseById(course, { userId: outsider, role: 'STUDENT' })).toMatchObject({ id: course });
  });
});
