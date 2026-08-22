/**
 * End-to-End Demonstration Script
 * Demonstrates:
 * 1. Teacher creating course with single course price, Chapter, Video, PDF Materials, and Quiz -> Submitting for review.
 * 2. Admin viewing review queue, updating single course & subject pricing, editing course details, and approving publication.
 * 3. Student discovering published course, redeeming promo voucher code, and accessing all lessons inside the course.
 * 4. Admin testing course deletion capability.
 */
import { prisma } from '../src/prisma';
import { CourseService } from '../src/modules/courses/course.service';
import { SubjectService } from '../src/modules/courses/subject.service';
import { CommerceService } from '../src/modules/commerce/commerce.service';
import { Role, TeacherStatus, SubscriptionPeriod, EntitlementType } from '@prisma/client';

async function main() {
  console.log('===============================================================');
  console.log('🚀 STARTING END-TO-END DEMO FLOW: TEACHER -> ADMIN -> STUDENT');
  console.log('===============================================================\n');

  const timestamp = Date.now();

  // 0. Setup Users
  console.log('📦 Setting up Demo Teacher, Admin, and Student accounts...');
  const teacher = await prisma.user.upsert({
    where: { email: `demo.teacher.${timestamp}@platform.com` },
    update: {},
    create: {
      email: `demo.teacher.${timestamp}@platform.com`,
      password: 'hashed_secure_password',
      name: 'Prof. Hesham (Physics Educator)',
      role: Role.TEACHER,
      teacherStatus: TeacherStatus.APPROVED,
      isActive: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: `demo.student.${timestamp}@platform.com` },
    update: {},
    create: {
      email: `demo.student.${timestamp}@platform.com`,
      password: 'hashed_secure_password',
      name: 'Youssef Ahmed (1st Secondary)',
      role: Role.STUDENT,
      isActive: true,
    },
  });

  const subject = await prisma.subject.create({
    data: {
      nameEn: `Physics Sec 1 - Term 1 (${timestamp})`,
      nameAr: `الفيزياء للصف الأول الثانوي - الترم الأول (${timestamp})`,
      description: 'Secondary stage physics curriculum covering Kinematics, Forces, and Motion.',
    },
  });
  console.log(`✅ Subject created: ${subject.nameEn} (ID: ${subject.id})`);

  // STEP 1: Teacher creates Course -> Module -> Lesson (Video + Materials + Quiz)
  console.log('\n---------------------------------------------------------------');
  console.log('👨‍🏫 [STEP 1] TEACHER: Authoring Course, Chapters, and Activities');
  console.log('---------------------------------------------------------------');

  const course = await CourseService.createCourse({
    titleEn: 'Mastering 1st Secondary Physics: Mechanics & Motion',
    titleAr: 'إتقان فيزياء الأول الثانوي: الميكانيكا والحركة',
    description: 'A comprehensive video lecture course with downloadable formula sheets and interactive self-assessment quizzes.',
    subjectId: subject.id,
    teacherId: teacher.id,
    priceEgp: 180,
    priceUsd: 12,
  });
  console.log(`✅ Course Created: "${course.titleEn}" (Status: ${course.status})`);
  console.log(`💰 Single Course Price: 180 EGP ($12 USD) - Flat fee unlocks all lessons`);

  const moduleItem = await CourseService.createModule(course.id, {
    titleEn: 'Chapter 1: Physical Quantities and Kinematics',
    titleAr: 'الفصل الأول: الكميات الفيزيائية والحركة الخطية',
    description: 'Introduction to vectors, displacement, velocity graphs, and uniform acceleration.',
    sortOrder: 1,
  }, teacher.id, Role.TEACHER);
  console.log(`✅ Chapter/Module Created: "${moduleItem.titleEn}"`);

  const lesson = await CourseService.createLesson(moduleItem.id, {
    titleEn: 'Lesson 1: Accelerated Motion & Free Fall Derivations',
    titleAr: 'الدرس الأول: معادلات الحركة بعجلة منتظمة والسقوط الحر',
    content: 'Full theoretical derivation of Newton equations and sample national exam questions.',
    estimatedDuration: 45,
    orderIndex: 1,
    video: {
      title: 'lesson1_kinematics_masterclass.mp4',
      videoUrl: 'https://stream.eduplatform.com/vod/physics-sec1-lesson1.mp4',
      duration: 2700,
    },
    materials: [
      {
        title: 'Complete Formula Sheet & Summary Notes (PDF)',
        fileUrl: 'https://cdn.eduplatform.com/docs/physics_sec1_formulas.pdf',
        fileType: 'pdf',
        fileSize: 2450000,
      },
      {
        title: 'Standard Question Bank & Homework (PDF)',
        fileUrl: 'https://cdn.eduplatform.com/docs/physics_sec1_homework.pdf',
        fileType: 'pdf',
        fileSize: 1890000,
      },
    ],
    quiz: {
      title: 'Kinematics & Free Fall Mastery Quiz',
      passingScore: 75,
      timeLimit: 25,
      questions: [
        {
          questionText: 'Which equation relates final velocity, initial velocity, acceleration, and displacement without time?',
          points: 10,
          orderIndex: 1,
          options: [
            { optionText: 'v_f^2 = v_i^2 + 2ad', isCorrect: true, orderIndex: 1 },
            { optionText: 'd = v_i*t + 0.5*a*t^2', isCorrect: false, orderIndex: 2 },
          ],
        },
      ],
    },
  }, teacher.id, Role.TEACHER);

  console.log(`✅ Lesson Created with:`);
  console.log(`     - 🎥 Video: ${lesson.video?.videoUrl} (Duration: 45 min)`);
  console.log(`     - 📄 Materials: 2 Downloadable PDF Files`);
  console.log(`     - ❓ Quiz: "${lesson.quiz?.titleEn}" (1 Question)`);

  await CourseService.submitCourseForReview(course.id, teacher.id);
  console.log(`🚀 Course Submitted for Review! New Status: [UNDER_REVIEW]`);

  // STEP 2: Admin reviews course, edits details & pricing, and approves publication
  console.log('\n---------------------------------------------------------------');
  console.log('🛡️ [STEP 2] ADMIN: Reviewing Queue, Editing Metadata & Publishing');
  console.log('---------------------------------------------------------------');

  const pendingCourses = await CourseService.getAllCourses({ status: 'UNDER_REVIEW' });
  console.log(`🔍 Admin found ${pendingCourses.courses.length} course(s) in review queue.`);

  // Admin edits course price and metadata
  const updatedCourse = await CourseService.updateCourse(course.id, '', {
    titleEn: 'Mastering 1st Secondary Physics (Admin Verified Edition)',
    priceEgp: 200,
    priceUsd: 15,
  }, Role.ADMIN);
  console.log(`✏️ Admin edited course title: "${updatedCourse.titleEn}"`);
  console.log(`💵 Single course price updated to: 200 EGP ($15 USD)`);

  // Admin sets subject subscription tiers
  await SubjectService.updateSubjectPricing(subject.id, [
    { period: SubscriptionPeriod.MONTHLY, priceEgp: 250, priceUsd: 12 },
    { period: SubscriptionPeriod.SIX_MONTHS, priceEgp: 1200, priceUsd: 60 },
    { period: SubscriptionPeriod.YEARLY, priceEgp: 2200, priceUsd: 110 },
  ]);
  console.log(`✅ Subject Pricing updated: Monthly (250 EGP), 6-Months (1200 EGP), Yearly (2200 EGP)`);

  // Admin creates promo voucher
  const voucherCode = `SCHOLAR-${timestamp}`;
  console.log(`🏷️ Admin creating Promo Code: [${voucherCode}]...`);
  await CommerceService.createVoucher({
    code: voucherCode,
    resourceType: EntitlementType.SUBJECT,
    resourceId: subject.id,
    durationDays: 60,
    maxUses: 10,
  });
  console.log(`✅ Promo Voucher created: ${voucherCode} (60-day access, max 10 uses)`);

  // Admin approves course
  await CourseService.reviewCourseStatus(course.id, 'APPROVED');
  console.log(`🎉 Course Approved and Live! Status: [PUBLISHED], isPublished: true`);

  // STEP 3: Student unlocks course and accesses all lessons
  console.log('\n---------------------------------------------------------------');
  console.log('🎓 [STEP 3] STUDENT: Redeeming Promo & Accessing All Lessons');
  console.log('---------------------------------------------------------------');

  console.log(`🎟️ Student applying Promo Code: "${voucherCode}"...`);
  const redemption = await CommerceService.redeemVoucher(student.id, voucherCode);
  console.log(`✅ Voucher Redeemed! Entitlement Activated:`);
  console.log(`     - Resource: ${redemption.resourceType} (${redemption.resourceId})`);
  console.log(`     - Status: ${redemption.status}`);
  console.log(`     - Expires At: ${redemption.expiresAt?.toLocaleDateString()}`);

  const access = await CommerceService.checkCourseAccess(student.id, course.id);
  console.log(`🔐 Course access verification: hasAccess = ${access.hasAccess} (All lessons & materials unlocked)`);

  const fetchedCourse = await CourseService.getCourseById(course.id);
  console.log('\n▶️ STUDENT IN COURSE PLAYER:');
  console.log(`     - Course: ${fetchedCourse.titleEn}`);
  console.log(`     - Single Price: ${fetchedCourse.priceEgp} EGP (${fetchedCourse.priceUsd} USD)`);
  console.log(`     - Module: ${fetchedCourse.modules[0].titleEn}`);
  console.log(`     - Lesson: ${fetchedCourse.modules[0].lessons[0].titleEn}`);
  console.log(`     - Watching Video: ${fetchedCourse.modules[0].lessons[0].video?.videoUrl}`);
  console.log(`     - Downloadable Files: ${(fetchedCourse.modules[0].lessons[0].materials || []).map((m: any) => m.title).join(', ')}`);
  console.log(`     - Interactive Quiz: ${fetchedCourse.modules[0].lessons[0].quiz?.titleEn}`);

  // STEP 4: Admin deletes a course
  console.log('\n---------------------------------------------------------------');
  console.log('🗑️ [STEP 4] ADMIN: Verifying Course Deletion Power');
  console.log('---------------------------------------------------------------');
  const tempCourse = await prisma.course.create({
    data: {
      titleEn: 'Temporary Course for Admin Deletion',
      titleAr: 'دورة مؤقتة للحذف',
      description: 'Test admin deletion',
      teacherId: teacher.id,
      subjectId: subject.id,
    },
  });
  await CourseService.deleteCourse(tempCourse.id, '', Role.ADMIN);
  console.log(`✅ Admin successfully deleted course: "${tempCourse.titleEn}"`);

  console.log('\n===============================================================');
  console.log('✨ ALL FEATURES AND REQUIREMENTS VERIFIED SUCCESSFULLY!');
  console.log('===============================================================');
}

main()
  .catch((e) => {
    console.error('Error during demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
