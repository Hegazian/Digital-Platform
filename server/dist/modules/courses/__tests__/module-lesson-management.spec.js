"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../../app"));
const prisma_1 = require("../../../prisma");
const jwt_1 = require("../../../utils/jwt");
(0, vitest_1.describe)('Module, Lesson, Video, Material & Quiz Management (TDD)', () => {
    let teacherToken;
    let teacherId;
    let subjectId;
    let courseId;
    let moduleId;
    let lessonId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Teacher
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher_curriculum_${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Teacher Curriculum',
                role: 'TEACHER',
                teacherStatus: 'APPROVED',
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({
            userId: teacher.id,
            role: 'TEACHER',
            teacherStatus: 'APPROVED',
        });
        // 2. Create Subject
        const subject = await prisma_1.prisma.subject.create({
            data: {
                nameEn: `Subject Curriculum ${Date.now()}`,
                nameAr: 'مادة المناهج',
            },
        });
        subjectId = subject.id;
        // 3. Create Course
        const course = await prisma_1.prisma.course.create({
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
    (0, vitest_1.afterAll)(async () => {
        try {
            if (courseId) {
                await prisma_1.prisma.course.deleteMany({ where: { id: courseId } });
            }
            if (subjectId) {
                await prisma_1.prisma.subject.deleteMany({ where: { id: subjectId } });
            }
            if (teacherId) {
                await prisma_1.prisma.user.deleteMany({ where: { id: teacherId } });
            }
        }
        catch (e) { }
    });
    (0, vitest_1.it)('1. should create a new Module under a course', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/courses/${courseId}/modules`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
            titleEn: 'Unit 1: Quantum Mechanics',
            titleAr: 'الوحدة الأولى: ميكانيكا الكم',
            description: 'Deep dive into quantum principles',
            sortOrder: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.id).toBeDefined();
        (0, vitest_1.expect)(res.body.data.titleEn).toBe('Unit 1: Quantum Mechanics');
        moduleId = res.body.data.id;
    });
    (0, vitest_1.it)('2. should create a Lesson under a Module with optional Video, Material, and Quiz in one request', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
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
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.id).toBeDefined();
        (0, vitest_1.expect)(res.body.data.titleEn).toBe('Lesson 1.1: Wave-Particle Duality');
        (0, vitest_1.expect)(res.body.data.videoId).toBeDefined();
        (0, vitest_1.expect)(res.body.data.quizId).toBeDefined();
        (0, vitest_1.expect)(res.body.data.materials.length).toBe(1);
        lessonId = res.body.data.id;
    });
    (0, vitest_1.it)('3. should attach an additional Material to an existing lesson', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/courses/lessons/${lessonId}/material`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
            title: 'Formula Cheat Sheet',
            fileUrl: 'https://cdn.example.com/materials/cheatsheet.pdf',
            fileType: 'pdf',
            fileSize: 524288,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.title).toBe('Formula Cheat Sheet');
    });
    (0, vitest_1.it)('4. should retrieve the full course curriculum tree with eager-loaded modules, lessons, videos, materials, and quizzes', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`/api/v1/courses/${courseId}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.modules.length).toBeGreaterThan(0);
        const fetchedMod = res.body.data.modules.find((m) => m.id === moduleId);
        (0, vitest_1.expect)(fetchedMod).toBeDefined();
        (0, vitest_1.expect)(fetchedMod.lessons.length).toBeGreaterThan(0);
        const fetchedLesson = fetchedMod.lessons.find((l) => l.id === lessonId);
        (0, vitest_1.expect)(fetchedLesson).toBeDefined();
        (0, vitest_1.expect)(fetchedLesson.video).toBeDefined();
        (0, vitest_1.expect)(fetchedLesson.quiz).toBeDefined();
        (0, vitest_1.expect)(fetchedLesson.quiz.questions.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(fetchedLesson.materials.length).toBe(2);
    });
    (0, vitest_1.it)('5. should delete a Lesson cleanly', async () => {
        // Create a temporary lesson to delete
        const tempLessonRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/courses/modules/${moduleId}/lessons`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
            titleEn: 'Temporary Lesson to Delete',
            titleAr: 'درس مؤقت للحذف',
        });
        const tempId = tempLessonRes.body.data.id;
        const delRes = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/courses/lessons/${tempId}`)
            .set('Authorization', `Bearer ${teacherToken}`);
        (0, vitest_1.expect)(delRes.status).toBe(200);
        (0, vitest_1.expect)(delRes.body.success).toBe(true);
    });
    (0, vitest_1.it)('6. should delete a Module cleanly', async () => {
        const tempModRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/courses/${courseId}/modules`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
            titleEn: 'Temporary Module to Delete',
            titleAr: 'وحدة مؤقتة للحذف',
        });
        const tempModId = tempModRes.body.data.id;
        const delRes = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/courses/modules/${tempModId}`)
            .set('Authorization', `Bearer ${teacherToken}`);
        (0, vitest_1.expect)(delRes.status).toBe(200);
        (0, vitest_1.expect)(delRes.body.success).toBe(true);
    });
});
