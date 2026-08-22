import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import jwt from 'jsonwebtoken';
import { Role, TeacherStatus, SubscriptionPeriod, EntitlementType } from '@prisma/client';
import { CommerceService } from '../commerce/commerce.service';

describe('TDD Suite: Course Governance, Single Pricing & Role Isolation', () => {
  let adminToken: string;
  let teacherOwnerToken: string;
  let otherTeacherToken: string;
  let studentToken: string;

  let adminUser: any;
  let teacherOwner: any;
  let otherTeacher: any;
  let studentUser: any;

  let testSubject: any;
  let testCourse: any;
  let testModule: any;
  let testLesson: any;

  async function retryPrisma<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (i === retries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
      }
    }
    throw new Error('Prisma retry exhausted');
  }

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Setup Admin
    adminUser = await retryPrisma(() =>
      prisma.user.upsert({
        where: { email: `tdd.admin.${timestamp}@platform.com` },
        update: {},
        create: {
          email: `tdd.admin.${timestamp}@platform.com`,
          password: '$2b$10$hashedpasswordfortddtests',
          name: 'TDD Admin Officer',
          role: Role.ADMIN,
          isActive: true,
        },
      })
    );
    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminUser.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 2. Setup Teacher A (Course Owner)
    teacherOwner = await retryPrisma(() =>
      prisma.user.upsert({
        where: { email: `tdd.owner.${timestamp}@platform.com` },
        update: {},
        create: {
          email: `tdd.owner.${timestamp}@platform.com`,
          password: '$2b$10$hashedpasswordfortddtests',
          name: 'Dr. Sarah (Physics Owner)',
          role: Role.TEACHER,
          teacherStatus: TeacherStatus.APPROVED,
          isActive: true,
        },
      })
    );
    teacherOwnerToken = jwt.sign(
      { userId: teacherOwner.id, role: teacherOwner.role, teacherStatus: TeacherStatus.APPROVED },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 3. Setup Teacher B (Other Teacher / Non-Owner)
    otherTeacher = await retryPrisma(() =>
      prisma.user.upsert({
        where: { email: `tdd.other.${timestamp}@platform.com` },
        update: {},
        create: {
          email: `tdd.other.${timestamp}@platform.com`,
          password: '$2b$10$hashedpasswordfortddtests',
          name: 'Dr. Karim (Other Teacher)',
          role: Role.TEACHER,
          teacherStatus: TeacherStatus.APPROVED,
          isActive: true,
        },
      })
    );
    otherTeacherToken = jwt.sign(
      { userId: otherTeacher.id, role: otherTeacher.role, teacherStatus: TeacherStatus.APPROVED },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 4. Setup Student
    studentUser = await retryPrisma(() =>
      prisma.user.upsert({
        where: { email: `tdd.student.${timestamp}@platform.com` },
        update: {},
        create: {
          email: `tdd.student.${timestamp}@platform.com`,
          password: '$2b$10$hashedpasswordfortddtests',
          name: 'Nour El-Din (Student)',
          role: Role.STUDENT,
          isActive: true,
        },
      })
    );
    studentToken = jwt.sign(
      { userId: studentUser.id, role: studentUser.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 5. Setup Subject
    testSubject = await retryPrisma(() =>
      prisma.subject.create({
        data: {
          nameEn: `TDD Physics Subject ${timestamp}`,
          nameAr: `مادة الفيزياء التجريبية ${timestamp}`,
          description: 'Subject for TDD testing suites.',
        },
      })
    );
  }, 60000);

  // -------------------------------------------------------------
  // TEST SECTION 1: Single-Teacher Exclusive Course Ownership
  // -------------------------------------------------------------
  describe('1. Single-Teacher Course Ownership & Non-Owner Guardrails', () => {
    it('1.1 Course Owner creates a course with single flat pricing', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${teacherOwnerToken}`)
        .send({
          titleEn: 'Advanced Mechanics & Planetary Gravity',
          titleAr: 'الميكانيكا المتقدمة والجاذبية الكونية',
          description: 'Comprehensive curriculum with single flat pricing unlocking all materials.',
          subjectId: testSubject.id,
          priceEgp: 190,
          priceUsd: 14,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testCourse = res.body.data;
      expect(testCourse.teacherId).toBe(teacherOwner.id);
      expect(testCourse.status).toBe('DRAFT');
    });

    it('1.2 Non-owner teacher is blocked (403) from updating course details', async () => {
      const res = await request(app)
        .patch(`/api/v1/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .send({ titleEn: 'Unauthorized Mutated Title' });

      expect(res.status).toBe(403);
    });

    it('1.3 Non-owner teacher is blocked (403) from adding modules to another teacher course', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${testCourse.id}/modules`)
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .send({
          titleEn: 'Injected Module',
          titleAr: 'وحدة غير مصرح بها',
        });

      expect(res.status).toBe(403);
    });

    it('1.4 Course Owner can add modules and lessons with video, PDF, and quiz', async () => {
      // Add Module
      const modRes = await request(app)
        .post(`/api/v1/courses/${testCourse.id}/modules`)
        .set('Authorization', `Bearer ${teacherOwnerToken}`)
        .send({
          titleEn: 'Unit 1: Circular Motion & Gravitational Fields',
          titleAr: 'الوحدة الأولى: الحركة الدائرية ومجال الجاذبية',
        });

      expect(modRes.status).toBe(201);
      testModule = modRes.body.data;

      // Add Lesson
      const lessonRes = await request(app)
        .post(`/api/v1/courses/modules/${testModule.id}/lessons`)
        .set('Authorization', `Bearer ${teacherOwnerToken}`)
        .send({
          titleEn: 'Lesson 1: Universal Gravitation Constant',
          titleAr: 'الدرس الأول: ثابت الجذب العام',
          content: 'Detailed derivation of gravitational acceleration.',
          estimatedDuration: 40,
          video: {
            title: 'gravitation_lesson1.mp4',
            videoUrl: 'https://stream.eduplatform.com/vod/gravitation1.mp4',
            duration: 2400,
          },
          materials: [
            {
              title: 'Summary Formula Guide (PDF)',
              fileUrl: 'https://cdn.eduplatform.com/docs/gravitation_summary.pdf',
              fileType: 'pdf',
              fileSize: 1800000,
            },
          ],
          quiz: {
            title: 'Gravitation Mastery Check',
            passingScore: 70,
            questions: [
              {
                questionText: 'What is the SI unit of gravitational field intensity?',
                points: 10,
                orderIndex: 1,
                options: [
                  { optionText: 'N/kg', isCorrect: true, orderIndex: 1 },
                  { optionText: 'N*m', isCorrect: false, orderIndex: 2 },
                ],
              },
            ],
          },
        });

      expect(lessonRes.status).toBe(201);
      testLesson = lessonRes.body.data;
    });

    it('1.5 Non-owner teacher is blocked (403) from deleting lessons or modules', async () => {
      const deleteLessonRes = await request(app)
        .delete(`/api/v1/courses/lessons/${testLesson.id}`)
        .set('Authorization', `Bearer ${otherTeacherToken}`);
      expect(deleteLessonRes.status).toBe(403);

      const deleteModRes = await request(app)
        .delete(`/api/v1/courses/modules/${testModule.id}`)
        .set('Authorization', `Bearer ${otherTeacherToken}`);
      expect(deleteModRes.status).toBe(403);
    });
  });

  // -------------------------------------------------------------
  // TEST SECTION 2: Admin Governance, Full Edit & Delete Powers
  // -------------------------------------------------------------
  describe('2. Admin Unrestricted Governance & Editing Powers', () => {
    it('2.1 Admin can edit any course title, description, and single pricing', async () => {
      const res = await request(app)
        .patch(`/api/v1/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          titleEn: 'Advanced Mechanics & Gravity (Admin Verified Edition)',
          priceEgp: 220,
          priceUsd: 16,
          description: 'Officially reviewed and calibrated by Ministry Curriculum Committee.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.titleEn).toBe('Advanced Mechanics & Gravity (Admin Verified Edition)');
    });

    it('2.2 Course Owner submits for review & Admin approves course to PUBLISHED', async () => {
      // Teacher submits
      const submitRes = await request(app)
        .post(`/api/v1/courses/${testCourse.id}/submit`)
        .set('Authorization', `Bearer ${teacherOwnerToken}`);
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.status).toBe('UNDER_REVIEW');

      // Admin approves
      const approveRes = await request(app)
        .post(`/api/v1/courses/${testCourse.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'APPROVED' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('PUBLISHED');
      expect(approveRes.body.data.isPublished).toBe(true);
    });

    it('2.3 Admin can delete any course across the platform directly', async () => {
      // Create a temporary course
      const tempCourse = await prisma.course.create({
        data: {
          titleEn: 'Obsolete Course to Delete',
          titleAr: 'دورة ملغاة',
          description: 'To test deletion.',
          teacherId: otherTeacher.id,
          subjectId: testSubject.id,
        },
      });

      const delRes = await request(app)
        .delete(`/api/v1/courses/${tempCourse.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const check = await prisma.course.findUnique({ where: { id: tempCourse.id } });
      expect(check).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // TEST SECTION 3: Single Flat Course Price & Student Unlocking
  // -------------------------------------------------------------
  describe('3. Single-Price Course Unlock (All Lessons & Materials Included)', () => {
    let voucherCode: string;

    it('3.1 Commercial endpoints block Teachers and Admins (403)', async () => {
      voucherCode = `TDD-VOUCHER-${Date.now()}`;
      await CommerceService.createVoucher({
        code: voucherCode,
        resourceType: EntitlementType.COURSE,
        resourceId: testCourse.id,
        durationDays: 45,
        maxUses: 5,
      });

      // Teacher attempt to redeem
      const teacherRes = await request(app)
        .post('/api/v1/commerce/vouchers/redeem')
        .set('Authorization', `Bearer ${teacherOwnerToken}`)
        .send({ code: voucherCode });
      expect(teacherRes.status).toBe(403);

      // Admin attempt to redeem
      const adminRes = await request(app)
        .post('/api/v1/commerce/vouchers/redeem')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: voucherCode });
      expect(adminRes.status).toBe(403);
    });

    it('3.2 Student redeems course voucher and unlocks the whole course', async () => {
      const res = await request(app)
        .post('/api/v1/commerce/vouchers/redeem')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: voucherCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resourceType).toBe('COURSE');
      expect(res.body.data.resourceId).toBe(testCourse.id);
    });

    it('3.3 Student accesses entire course and all lessons without per-lesson charges', async () => {
      // Verify check-course access endpoint
      const checkRes = await request(app)
        .get(`/api/v1/commerce/entitlements/check-course/${testCourse.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.hasAccess).toBe(true);

      // Fetch course details with all lessons & resources
      const courseRes = await request(app)
        .get(`/api/v1/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(courseRes.status).toBe(200);
      const data = courseRes.body.data;
      expect(data.priceEgp).toBe(220);
      expect(data.priceUsd).toBe(16);
      expect(data.modules.length).toBeGreaterThan(0);
      expect(data.modules[0].lessons[0].video.videoUrl).toBe('https://stream.eduplatform.com/vod/gravitation1.mp4');
      expect(data.modules[0].lessons[0].materials.length).toBe(1);
      expect(data.modules[0].lessons[0].quiz.questions.length).toBe(1);
    });
  });
});
