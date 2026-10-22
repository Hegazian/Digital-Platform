import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

describe('Module, Lesson, Video, Material & Quiz Management (TDD)', () => {
  let teacherToken: string;
  let teacherId: string;
  let subjectId: string;
  let courseId: string;
  let moduleId: string;
  let lessonId: string;

  beforeAll(async () => {
    // 1. Create Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher_curriculum_${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Teacher Curriculum',
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

    // 2. Create Subject
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Subject Curriculum ${Date.now()}`,
        nameAr: 'مادة المناهج',
      },
    });
    subjectId = subject.id;

    // 3. Create Course
    const course = await prisma.course.create({
      data: {
        titleEn: 'Physics Masterclass',
        titleAr: 'فيزياء الثانوية',
        description: 'Full course syllabus',
        teacherId,
        subjectId,
        isPublished: true,
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    try {
      if (courseId) {
        await prisma.course.deleteMany({ where: { id: courseId } });
      }
      if (subjectId) {
        await prisma.subject.deleteMany({ where: { id: subjectId } });
      }
      if (teacherId) {
        await prisma.user.deleteMany({ where: { id: teacherId } });
      }
    } catch (e) {}
  });

  it('1. should create a new Module under a course', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Unit 1: Quantum Mechanics',
        titleAr: 'الوحدة الأولى: ميكانيكا الكم',
        description: 'Deep dive into quantum principles',
        sortOrder: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.titleEn).toBe('Unit 1: Quantum Mechanics');
    moduleId = res.body.data.id;
  });

  it('2. should create a Lesson under a Module with optional Video, Material, and Quiz in one request', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/modules/${moduleId}/lessons`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Lesson 1.1: Wave-Particle Duality',
        titleAr: 'الدرس 1.1: ازدواجية الموجة والجسيم',
        content: 'Comprehensive lesson notes on wave-particle experiments.',
        estimatedDuration: 45,
        video: {
          title: 'Wave-Particle Lecture Video',
          videoUrl: 'https://cdn.example.com/videos/wave-particle.mp4',
          duration: 2700,
        },
        materials: [
          {
            title: 'Quantum Duality Summary PDF',
            fileUrl: 'https://cdn.example.com/materials/duality.pdf',
            fileType: 'pdf',
            fileSize: 1048576,
          },
        ],
        quiz: {
          title: 'Duality Self-Check Quiz',
          passingScore: 70,
          questions: [
            {
              questionText: 'Light exhibits both wave and particle properties.',
              questionType: 'MCQ',
              points: 10,
              orderIndex: 1,
              options: [
                { optionText: 'True', isCorrect: true, orderIndex: 1 },
                { optionText: 'False', isCorrect: false, orderIndex: 2 },
              ],
            },
          ],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.titleEn).toBe('Lesson 1.1: Wave-Particle Duality');
    expect(res.body.data.videoId).toBeDefined();
    expect(res.body.data.quizId).toBeDefined();
    expect(res.body.data.materials.length).toBe(1);
    lessonId = res.body.data.id;
  });

  it('3. should attach an additional Material to an existing lesson', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/lessons/${lessonId}/material`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Formula Cheat Sheet',
        fileUrl: 'https://cdn.example.com/materials/cheatsheet.pdf',
        fileType: 'pdf',
        fileSize: 524288,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Formula Cheat Sheet');
  });

  it('4. should retrieve the full course curriculum tree with eager-loaded modules, lessons, videos, materials, and quizzes', async () => {
    // Draft curricula are restricted to the owning teacher (NFR-001).
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.modules.length).toBeGreaterThan(0);

    const fetchedMod = res.body.data.modules.find((m: any) => m.id === moduleId);
    expect(fetchedMod).toBeDefined();
    expect(fetchedMod.lessons.length).toBeGreaterThan(0);

    const fetchedLesson = fetchedMod.lessons.find((l: any) => l.id === lessonId);
    expect(fetchedLesson).toBeDefined();
    expect(fetchedLesson.video).toBeDefined();
    expect(fetchedLesson.quiz).toBeDefined();
    expect(fetchedLesson.quiz.questions.length).toBeGreaterThan(0);
    expect(fetchedLesson.materials.length).toBe(2);
  });

  it('5. should delete a Lesson cleanly', async () => {
    // Create a temporary lesson to delete
    const tempLessonRes = await request(app)
      .post(`/api/v1/courses/modules/${moduleId}/lessons`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Temporary Lesson to Delete',
        titleAr: 'درس مؤقت للحذف',
      });

    const tempId = tempLessonRes.body.data.id;

    const delRes = await request(app)
      .delete(`/api/v1/courses/lessons/${tempId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  it('6. should delete a Module cleanly', async () => {
    const tempModRes = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Temporary Module to Delete',
        titleAr: 'وحدة مؤقتة للحذف',
      });

    const tempModId = tempModRes.body.data.id;

    const delRes = await request(app)
      .delete(`/api/v1/courses/modules/${tempModId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });
});
