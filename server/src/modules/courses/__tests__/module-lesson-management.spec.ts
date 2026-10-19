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
  let sectionId: string;
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

  it('1. should create a new Section under a course', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Unit 1: Quantum Mechanics',
        titleAr: 'الوحدة الأولى: ميكانيكا الكم',
        description: 'Deep dive into quantum principles',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.titleEn).toBe('Unit 1: Quantum Mechanics');
    sectionId = res.body.data.id;
  });

  it('2. should create a Lesson under a Section with optional Video, Material, and Quiz in one request', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/sections/${sectionId}/lessons`)
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

  it('4. should retrieve the full course curriculum tree with eager-loaded sections, lessons, videos, materials, and quizzes', async () => {
    // Draft curricula are restricted to the owning teacher (NFR-001).
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sections.length).toBeGreaterThan(0);

    const fetchedSec = res.body.data.sections.find((s: any) => s.id === sectionId);
    expect(fetchedSec).toBeDefined();
    expect(fetchedSec.lessons.length).toBeGreaterThan(0);

    const fetchedLesson = fetchedSec.lessons.find((l: any) => l.id === lessonId);
    expect(fetchedLesson).toBeDefined();
    expect(fetchedLesson.video).toBeDefined();
    expect(fetchedLesson.quiz).toBeDefined();
    expect(fetchedLesson.quiz.questions.length).toBeGreaterThan(0);
    expect(fetchedLesson.materials.length).toBe(2);
  });

  it('5. should delete a Lesson cleanly', async () => {
    // Create a temporary lesson to delete
    const tempLessonRes = await request(app)
      .post(`/api/v1/courses/sections/${sectionId}/lessons`)
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

  it('6. should delete a Section cleanly', async () => {
    const tempSecRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Temporary Section to Delete',
        titleAr: 'قسم مؤقت للحذف',
      });

    const tempSecId = tempSecRes.body.data.id;

    const delRes = await request(app)
      .delete(`/api/v1/courses/sections/${tempSecId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  it('7. should reject CODE_PLAYGROUND and BOARD block types with 400 Bad Request (P0-3 / TASK-04)', async () => {
    const playgroundRes = await request(app)
      .post(`/api/v1/courses/lessons/${lessonId}/blocks`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        blockType: 'CODE_PLAYGROUND',
        configuration: { starterCode: 'print(1)' },
      });

    expect(playgroundRes.status).toBe(400);

    const boardRes = await request(app)
      .post(`/api/v1/courses/lessons/${lessonId}/blocks`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        blockType: 'BOARD',
        configuration: {},
      });

    expect(boardRes.status).toBe(400);
  });

  it('8. should return 404 Not Found for removed /api/v1/playgrounds and /api/v1/boards routes (TASK-04)', async () => {
    const execRes = await request(app)
      .post('/api/v1/playgrounds/execute')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ code: 'print(1)' });

    expect(execRes.status).toBe(404);

    const boardGetRes = await request(app)
      .get('/api/v1/boards/some-block-id')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(boardGetRes.status).toBe(404);
  });

  it('9. should return 404 Not Found for removed peripheral routes (TASK-05)', async () => {
    const careersRes = await request(app).get('/api/v1/careers');
    expect(careersRes.status).toBe(404);

    const collectionsRes = await request(app).get('/api/v1/collections');
    expect(collectionsRes.status).toBe(404);

    const podcastsRes = await request(app).get('/api/v1/podcasts');
    expect(podcastsRes.status).toBe(404);

    const developerRes = await request(app).get('/api/v1/developer/tokens');
    expect(developerRes.status).toBe(404);
  });

  it('10. should return 404 Not Found for removed CourseModule routes (TASK-06)', async () => {
    const createModuleRes = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ titleEn: 'Retired Module', titleAr: 'وحدة ملغاة' });
    expect(createModuleRes.status).toBe(404);

    const moduleLessonRes = await request(app)
      .post(`/api/v1/courses/modules/some-mod-id/lessons`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ titleEn: 'Retired Lesson', titleAr: 'درس ملغى' });
    expect(moduleLessonRes.status).toBe(404);

    const reorderModuleRes = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/reorder`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ modules: [] });
    expect(reorderModuleRes.status).toBe(404);
  });
});

