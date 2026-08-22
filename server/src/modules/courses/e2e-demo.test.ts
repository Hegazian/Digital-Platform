import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import jwt from 'jsonwebtoken';
import { Role, TeacherStatus, SubscriptionPeriod, EntitlementType } from '@prisma/client';

describe('Comprehensive LMS Lifecycle: Course Authoring, Single-Course Pricing & Admin Edit/Delete Powers', () => {
  let adminToken: string;
  let teacherToken: string;
  let otherTeacherToken: string;
  let studentToken: string;

  let adminUser: any;
  let teacherUser: any;
  let otherTeacherUser: any;
  let studentUser: any;

  let testSubject: any;
  let createdCourse: any;
  let createdModule: any;
  let createdLesson: any;
  let generatedVoucherCode: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Admin User
    adminUser = await prisma.user.upsert({
      where: { email: `admin_demo_${timestamp}@eduplatform.com` },
      update: {},
      create: {
        email: `admin_demo_${timestamp}@eduplatform.com`,
        password: '$2b$10$hashedpasswordfore2edemo',
        name: 'Demo System Admin',
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminUser.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 2. Course Owner Teacher
    teacherUser = await prisma.user.upsert({
      where: { email: `teacher_owner_${timestamp}@eduplatform.com` },
      update: {},
      create: {
        email: `teacher_owner_${timestamp}@eduplatform.com`,
        password: '$2b$10$hashedpasswordfore2edemo',
        name: 'Prof. Hesham Physics (Owner)',
        role: Role.TEACHER,
        teacherStatus: TeacherStatus.APPROVED,
        isActive: true,
      },
    });
    teacherToken = jwt.sign(
      { userId: teacherUser.id, role: teacherUser.role, teacherStatus: TeacherStatus.APPROVED },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 3. Other Teacher (Not the owner)
    otherTeacherUser = await prisma.user.upsert({
      where: { email: `other_teacher_${timestamp}@eduplatform.com` },
      update: {},
      create: {
        email: `other_teacher_${timestamp}@eduplatform.com`,
        password: '$2b$10$hashedpasswordfore2edemo',
        name: 'Prof. Tamer Chemistry',
        role: Role.TEACHER,
        teacherStatus: TeacherStatus.APPROVED,
        isActive: true,
      },
    });
    otherTeacherToken = jwt.sign(
      { userId: otherTeacherUser.id, role: otherTeacherUser.role, teacherStatus: TeacherStatus.APPROVED },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 4. Student
    studentUser = await prisma.user.upsert({
      where: { email: `student_demo_${timestamp}@eduplatform.com` },
      update: {},
      create: {
        email: `student_demo_${timestamp}@eduplatform.com`,
        password: '$2b$10$hashedpasswordfore2edemo',
        name: 'Omar Secondary Student',
        role: Role.STUDENT,
        isActive: true,
      },
    });
    studentToken = jwt.sign(
      { userId: studentUser.id, role: studentUser.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 5. Test Subject
    testSubject = await prisma.subject.create({
      data: {
        nameEn: `Physics Sec 1 Demo ${timestamp}`,
        nameAr: `فيزياء الصف الأول الثانوي ${timestamp}`,
        description: 'Comprehensive secondary physics mechanics and thermodynamics curriculum.',
      },
    });
  }, 60000);

  // STEP 1: Teacher creates course and strict ownership is verified
  it('Step 1: Course Authoring, Single-Course Pricing & Ownership Enforcement', async () => {
    // 1.1 Course Owner creates course with single course price (180 EGP / 12 USD)
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Kinematics and Newton Laws in Depth',
        titleAr: 'الحركة وقوانين نيوتن بالتفصيل',
        description: 'Complete masterclass on 1st secondary physics mechanics.',
        subjectId: testSubject.id,
        priceEgp: 180,
        priceUsd: 12,
      });

    expect(courseRes.status).toBe(201);
    expect(courseRes.body.success).toBe(true);
    createdCourse = courseRes.body.data;
    expect(createdCourse.teacherId).toBe(teacherUser.id);
    expect(createdCourse.status).toBe('DRAFT');

    // 1.2 Verification: Another teacher CANNOT edit or add modules to this course (403 Forbidden)
    const unauthorizedModuleRes = await request(app)
      .post(`/api/v1/courses/${createdCourse.id}/modules`)
      .set('Authorization', `Bearer ${otherTeacherToken}`)
      .send({
        titleEn: 'Malicious Injected Module',
        titleAr: 'وحدة غير مصرح بها',
      });
    expect(unauthorizedModuleRes.status).toBe(403);

    const unauthorizedEditRes = await request(app)
      .patch(`/api/v1/courses/${createdCourse.id}`)
      .set('Authorization', `Bearer ${otherTeacherToken}`)
      .send({ titleEn: 'Hacked Title' });
    expect(unauthorizedEditRes.status).toBe(403);

    // 1.3 Course Owner creates Chapter/Module
    const moduleRes = await request(app)
      .post(`/api/v1/courses/${createdCourse.id}/modules`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Unit 1: Linear Motion and Acceleration',
        titleAr: 'الوحدة الأولى: الحركة الخطية والعجلة',
        description: 'Scalars, vectors, displacement-time graphs, and uniform acceleration equations.',
      });

    expect(moduleRes.status).toBe(201);
    createdModule = moduleRes.body.data;

    // 1.4 Course Owner creates Lesson with Video, PDFs, and Quiz
    const lessonRes = await request(app)
      .post(`/api/v1/courses/modules/${createdModule.id}/lessons`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Lesson 1.1: Uniform Accelerated Motion & Vectors',
        titleAr: 'الدرس الأول: الحركة بعجلة منتظمة والمتجهات',
        content: 'Derivations of kinematic equations and sample exam problems.',
        estimatedDuration: 45,
        video: {
          title: 'kinematics-lecture-full-hd.mp4',
          videoUrl: 'https://cdn.eduplatform.com/videos/physics-sec1-lesson1.mp4',
          duration: 2700,
        },
        materials: [
          {
            title: 'Lesson 1 Summary Notes & Formula Sheet (PDF)',
            fileUrl: 'https://cdn.eduplatform.com/materials/physics-sec1-formulas.pdf',
            fileType: 'pdf',
            fileSize: 2048500,
          },
          {
            title: 'Homework Exercises & Practice Problems (PDF)',
            fileUrl: 'https://cdn.eduplatform.com/materials/physics-sec1-homework.pdf',
            fileType: 'pdf',
            fileSize: 1540000,
          },
        ],
        quiz: {
          title: 'Lesson 1 Self-Assessment Mastery Quiz',
          passingScore: 70,
          timeLimit: 20,
          questions: [
            {
              questionText: 'What is the acceleration of an object in free fall near Earth surface?',
              points: 10,
              orderIndex: 1,
              options: [
                { optionText: '9.8 m/s^2 downwards', isCorrect: true, orderIndex: 1 },
                { optionText: '0 m/s^2', isCorrect: false, orderIndex: 2 },
              ],
            },
          ],
        },
      });

    expect(lessonRes.status).toBe(201);
    createdLesson = lessonRes.body.data;

    // 1.5 Course Owner submits course for review
    const submitRes = await request(app)
      .post(`/api/v1/courses/${createdCourse.id}/submit`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('UNDER_REVIEW');
  });

  // STEP 2: Admin reviews course, configures pricing, and approves publication
  it('Step 2: Admin Review, Pricing Matrix, Vouchers & Publication', async () => {
    // 2.1 Admin lists pending review courses
    const queueRes = await request(app)
      .get('/api/v1/courses?status=UNDER_REVIEW')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(queueRes.status).toBe(200);
    const pendingList = queueRes.body.data?.courses || queueRes.body.data;
    const foundInQueue = pendingList.find((c: any) => c.id === createdCourse.id);
    expect(foundInQueue).toBeDefined();

    // 2.2 Admin configures pricing
    const pricingRes = await request(app)
      .put(`/api/v1/subjects/${testSubject.id}/pricing`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pricing: [
          { period: SubscriptionPeriod.MONTHLY, priceEgp: 250, priceUsd: 12 },
          { period: SubscriptionPeriod.SIX_MONTHS, priceEgp: 1200, priceUsd: 60 },
          { period: SubscriptionPeriod.YEARLY, priceEgp: 2200, priceUsd: 110 },
        ],
      });
    expect(pricingRes.status).toBe(200);

    // 2.3 Admin creates Promo Code / Voucher
    generatedVoucherCode = `SCHOLAR-${Date.now()}`;
    const voucherRes = await request(app)
      .post('/api/v1/commerce/vouchers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: generatedVoucherCode,
        resourceType: EntitlementType.SUBJECT,
        resourceId: testSubject.id,
        durationDays: 60,
        maxUses: 10,
      });
    expect(voucherRes.status).toBe(201);

    // 2.4 Admin approves course for publication
    const approveRes = await request(app)
      .post(`/api/v1/courses/${createdCourse.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVED' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('PUBLISHED');
    expect(approveRes.body.data.isPublished).toBe(true);
  });

  // STEP 3: Student-only subscription and single-course unlocking
  it('Step 3: Only Students Can Subscribe / Redeem, Accessing Published Content', async () => {
    // 3.1 Verification: Teachers and Admins cannot redeem student voucher/subscribe
    const teacherRedeemRes = await request(app)
      .post('/api/v1/commerce/vouchers/redeem')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ code: generatedVoucherCode });
    expect(teacherRedeemRes.status).toBe(403);

    const adminRedeemRes = await request(app)
      .post('/api/v1/commerce/vouchers/redeem')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: generatedVoucherCode });
    expect(adminRedeemRes.status).toBe(403);

    // 3.2 Student redeems the voucher successfully
    const studentRedeemRes = await request(app)
      .post('/api/v1/commerce/vouchers/redeem')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ code: generatedVoucherCode });

    expect(studentRedeemRes.status).toBe(200);
    expect(studentRedeemRes.body.data.status).toBe('ACTIVE');

    // 3.3 Verify Student course-level entitlement access (unlocks all lessons & materials)
    const checkCourseAccessRes = await request(app)
      .get(`/api/v1/commerce/entitlements/check-course/${createdCourse.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(checkCourseAccessRes.status).toBe(200);
    expect(checkCourseAccessRes.body.data.hasAccess).toBe(true);

    // 3.4 Student fetches published course and consumes lesson
    const courseDetailsRes = await request(app)
      .get(`/api/v1/courses/${createdCourse.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(courseDetailsRes.status).toBe(200);
    const courseData = courseDetailsRes.body.data;
    expect(courseData.isPublished).toBe(true);
    expect(courseData.priceEgp).toBeDefined();
    expect(courseData.teacher.id).toBe(teacherUser.id);
    expect(courseData.modules.length).toBeGreaterThan(0);
    expect(courseData.modules[0].lessons[0].video.videoUrl).toBe('https://cdn.eduplatform.com/videos/physics-sec1-lesson1.mp4');
  });

  // STEP 4: Admin Edit & Delete Powers
  it('Step 4: Admin Can Edit Any Course and Delete Any Course Directly', async () => {
    // 4.1 Admin edits the teacher course (updates title, single price, and description)
    const adminEditRes = await request(app)
      .patch(`/api/v1/courses/${createdCourse.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        titleEn: 'Kinematics and Newton Laws (Admin Verified Edition)',
        priceEgp: 200,
        priceUsd: 15,
        description: 'Updated comprehensive description curated by Administrator.',
      });

    expect(adminEditRes.status).toBe(200);
    expect(adminEditRes.body.success).toBe(true);
    expect(adminEditRes.body.data.titleEn).toBe('Kinematics and Newton Laws (Admin Verified Edition)');

    // 4.2 Create a temporary course and verify Admin can delete it directly
    const tempCourse = await prisma.course.create({
      data: {
        titleEn: 'Temporary Course for Admin Deletion Test',
        titleAr: 'دورة مؤقتة لاختبار الحذف من الإدارة',
        description: 'To be deleted by Admin.',
        teacherId: teacherUser.id,
        subjectId: testSubject.id,
      },
    });

    const adminDeleteRes = await request(app)
      .delete(`/api/v1/courses/${tempCourse.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDeleteRes.status).toBe(200);
    expect(adminDeleteRes.body.success).toBe(true);

    const checkDeleted = await prisma.course.findUnique({
      where: { id: tempCourse.id },
    });
    expect(checkDeleted).toBeNull();
  });
});
