"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const course_service_1 = require("../course.service");
const progress_service_1 = require("../../progress/progress.service");
const video_service_1 = require("../../videos/video.service");
(0, vitest_1.describe)('Curriculum Hierarchy Unification (TDD)', () => {
    let teacherId;
    let studentId;
    let subjectId;
    let courseId;
    let sectionId;
    let lessonId;
    let videoId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Teacher
        const teacher = await prisma_1.prisma.user.create({
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
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-curric-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Student Curric',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        // 3. Create Subject
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Curriculum Subject ${Date.now()}`,
                nameAr: 'مادة المناهج',
            },
        });
        subjectId = subject.id;
        // 4. Create Course
        const course = await course_service_1.CourseService.createCourse({
            titleEn: 'Modern Physics',
            titleAr: 'الفيزياء الحديثة',
            description: 'Unified Curriculum Hierarchy Test',
            teacherId,
            subjectId,
        });
        courseId = course.id;
        // 5. Create Chapter/Section with Free Preview
        const section = await prisma_1.prisma.section.create({
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
        const video = await prisma_1.prisma.video.create({
            data: {
                teacherId,
                videoUrl: '/uploads/lesson-videos/test-video.mp4',
                originalFileName: 'test-video.mp4',
                status: 'READY',
            },
        });
        videoId = video.id;
        // 7. Create Lesson
        const lesson = await prisma_1.prisma.lesson.create({
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
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.lessonProgress.deleteMany({ where: { userId: studentId } });
            await prisma_1.prisma.lesson.deleteMany({ where: { id: lessonId } });
            await prisma_1.prisma.video.deleteMany({ where: { id: videoId } });
            await prisma_1.prisma.section.deleteMany({ where: { id: sectionId } });
            await prisma_1.prisma.course.deleteMany({ where: { id: courseId } });
            await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
            await prisma_1.prisma.user.deleteMany({ where: { id: { in: [teacherId, studentId] } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('should fetch course details including sections, lessons, and freePreview flags', async () => {
        const course = await course_service_1.CourseService.getCourseById(courseId);
        (0, vitest_1.expect)(course).toBeDefined();
        (0, vitest_1.expect)(course.sections.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(course.sections[0].lessons.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(course.sections[0].lessons[0].id).toBe(lessonId);
    });
    (0, vitest_1.it)('should allow free preview video playback without active subscription', async () => {
        const hasAccess = await video_service_1.VideoService.verifyPlaybackAccess(videoId, studentId);
        (0, vitest_1.expect)(hasAccess).toBe(true);
    });
    (0, vitest_1.it)('should calculate lesson progress and course progress properly', async () => {
        // Record watch time
        await progress_service_1.ProgressService.updateWatchTime(studentId, lessonId, 120);
        await progress_service_1.ProgressService.markCompleted(studentId, lessonId);
        const progress = await prisma_1.prisma.lessonProgress.findUnique({
            where: { userId_lessonId: { userId: studentId, lessonId } },
        });
        (0, vitest_1.expect)(progress?.isCompleted).toBe(true);
        (0, vitest_1.expect)(progress?.watchTimeSec).toBe(120);
    });
});
