import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

describe('Teacher Announcement & Student Notification Lifecycle (Integration)', () => {
  let teacherId: string;
  let teacherToken: string;
  let studentId: string;
  let studentToken: string;
  let stageId: string;
  let gradeId: string;
  let subjectId: string;
  let courseId: string;
  let notificationId: string;

  beforeAll(async () => {
    // 1. Create Stage, Grade, Subject
    const code = `STAGE_${Date.now()}`;
    const stage = await prisma.educationalStage.create({
      data: {
        nameEn: `Notif Stage ${Date.now()}`,
        nameAr: `مرحلة الإشعارات ${Date.now()}`,
        code,
        sortOrder: 99,
      },
    });
    stageId = stage.id;

    const grade = await prisma.grade.create({
      data: {
        nameEn: `Notif Grade ${Date.now()}`,
        nameAr: `صف الإشعارات ${Date.now()}`,
        code: `GRADE_${Date.now()}`,
        stageId,
        sortOrder: 1,
      },
    });
    gradeId = grade.id;

    const subject = await prisma.subject.create({
      data: {
        nameEn: `Notif Subject ${Date.now()}`,
        nameAr: `مادة الإشعارات ${Date.now()}`,
      },
    });
    subjectId = subject.id;

    // 2. Create Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher_notif_${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Teacher Notif',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
      },
    });
    teacherId = teacher.id;
    teacherToken = generateAccessToken({
      userId: teacher.id,
      role: 'TEACHER',
      teacherStatus: 'APPROVED',
    });

    // 3. Create Course
    const course = await prisma.course.create({
      data: {
        titleEn: 'Notif Test Course',
        titleAr: 'دورة اختبار الإشعارات',
        description: 'Notif Course Description',
        subjectId,
        teacherId,
        status: 'PUBLISHED',
      },
    });
    courseId = course.id;

    // 4. Create Student
    const student = await prisma.user.create({
      data: {
        email: `student_notif_${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Student Notif',
        role: 'STUDENT',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({
      userId: student.id,
      role: 'STUDENT',
    });

    // 5. Grant Student Active Entitlement to Course
    await prisma.entitlement.create({
      data: {
        studentId,
        resourceType: 'COURSE',
        resourceId: courseId,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.notification.deleteMany({ where: { userId: studentId } });
      await prisma.entitlement.deleteMany({ where: { studentId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.subject.deleteMany({ where: { id: subjectId } });
      await prisma.grade.deleteMany({ where: { id: gradeId } });
      await prisma.educationalStage.deleteMany({ where: { id: stageId } });
      await prisma.user.deleteMany({ where: { id: { in: [teacherId, studentId] } } });
    } catch (e) {}
  });

  it('teacher broadcasts announcement and student receives notification', async () => {
    const resBroadcast = await request(app)
      .post('/api/v1/teacher/announcements')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        courseId,
        titleEn: 'Midterm Exam Schedule',
        titleAr: 'جدول امتحان منتصف العام',
        messageEn: 'The exam will take place this Thursday at 10 AM.',
        messageAr: 'سيعقد الامتحان هذا الخميس في تمام الساعة 10 صباحا.',
      });

    expect(resBroadcast.status).toBe(201);
    expect(resBroadcast.body.success).toBe(true);
    expect(resBroadcast.body.data.notificationsSent).toBeGreaterThanOrEqual(1);

    // Student fetches notifications
    const resStudent = await request(app)
      .get('/api/v1/notifications/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resStudent.status).toBe(200);
    expect(resStudent.body.success).toBe(true);
    expect(Array.isArray(resStudent.body.data)).toBe(true);

    const found = resStudent.body.data.find(
      (n: any) => n.titleEn === 'Midterm Exam Schedule'
    );
    expect(found).toBeDefined();
    expect(found.isRead).toBe(false);
    expect(found.messageEn).toContain('this Thursday');
    notificationId = found.id;
  });

  it('student can mark the received notification as read', async () => {
    expect(notificationId).toBeDefined();

    const resRead = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resRead.status).toBe(200);
    expect(resRead.body.success).toBe(true);
    expect(resRead.body.data.isRead).toBe(true);

    // Verify list reflects isRead: true
    const resList = await request(app)
      .get('/api/v1/notifications/me')
      .set('Authorization', `Bearer ${studentToken}`);

    const found = resList.body.data.find((n: any) => n.id === notificationId);
    expect(found.isRead).toBe(true);
  });
});
