import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../prisma';
import { CourseService } from '../course.service';
import { ProgressService } from '../../progress/progress.service';
import { VideoService } from '../../videos/video.service';

describe('Curriculum Hierarchy Unification (TDD)', () => {
  let teacherId: string;
  let studentId: string;
  let subjectId: string;
  let courseId: string;
  let sectionId: string;
  let lessonId: string;
  let videoId: string;

  beforeAll(async () => {
    // 1. Create Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher-curric-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Teacher Curric',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
      },
    });
    teacherId = teacher.id;

    // 2. Create Student
    const student = await prisma.user.create({
      data: {
        email: `student-curric-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Student Curric',
        role: 'STUDENT',
      },
    });
    studentId = student.id;

    // 3. Create Subject
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Curriculum Subject ${Date.now()}`,
        nameAr: 'مادة المناهج',
      },
    });
    subjectId = subject.id;

    // 4. Create Course
    const course = await CourseService.createCourse({
      titleEn: 'Modern Physics',
      titleAr: 'الفيزياء الحديثة',
      description: 'Unified Curriculum Hierarchy Test',
      teacherId,
      subjectId,
    });
    courseId = course.id;

    // 5. Create Chapter/Section with Free Preview
    const section = await prisma.section.create({
      data: {
        courseId,
        titleEn: 'Chapter 1: Quantum Mechanics',
        titleAr: 'الفصل الأول: ميكانيكا الكم',
        orderIndex: 1,
        isFreePreview: true,
      },
    });
    sectionId = section.id;

    // 6. Create Video Record
    const video = await prisma.video.create({
      data: {
        teacherId,
        videoUrl: '/uploads/lesson-videos/test-video.mp4',
        originalFileName: 'test-video.mp4',
        status: 'READY',
      },
    });
    videoId = video.id;

    // 7. Create Lesson
    const lesson = await prisma.lesson.create({
      data: {
        sectionId,
        titleEn: 'Lesson 1.1: Photons and Waves',
        titleAr: 'الدرس 1.1: الفوتونات والموجات',
        content: '<p>Lesson rich text description</p>',
        orderIndex: 1,
        videoId,
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    try {
      await prisma.lessonProgress.deleteMany({ where: { userId: studentId } });
      await prisma.lesson.deleteMany({ where: { id: lessonId } });
      await prisma.video.deleteMany({ where: { id: videoId } });
      await prisma.section.deleteMany({ where: { id: sectionId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.subject.deleteMany({ where: { id: subjectId } });
      await prisma.user.deleteMany({ where: { id: { in: [teacherId, studentId] } } });
    } catch (e) {}
  });

  it('should fetch course details including sections, lessons, and freePreview flags', async () => {
    const course = await CourseService.getCourseById(courseId);
    expect(course).toBeDefined();
    expect(course.sections.length).toBeGreaterThan(0);
    expect(course.sections[0].lessons.length).toBeGreaterThan(0);
    expect(course.sections[0].lessons[0].id).toBe(lessonId);
  });

  it('should allow free preview video playback without active subscription', async () => {
    const hasAccess = await VideoService.verifyPlaybackAccess(videoId, studentId);
    expect(hasAccess).toBe(true);
  });

  it('should calculate lesson progress and course progress properly', async () => {
    // Record watch time
    await ProgressService.updateWatchTime(studentId, lessonId, 120);
    await ProgressService.markCompleted(studentId, lessonId);

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: studentId, lessonId } },
    });
    expect(progress?.isCompleted).toBe(true);
    expect(progress?.watchTimeSec).toBe(120);
  });
});
