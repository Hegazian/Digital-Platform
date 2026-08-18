"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
const client_1 = require("@prisma/client");
class CourseService {
    static async getAllCourses(query = {}) {
        const { subjectId, isPublished, page, limit } = query;
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const skip = (pageNum - 1) * limitNum;
        const where = {
            ...(subjectId && { subjectId }),
            ...(isPublished !== undefined && { isPublished: isPublished === 'true' }),
        };
        const [courses, total] = await Promise.all([
            prisma_1.prisma.course.findMany({
                where,
                include: {
                    teacher: {
                        select: { id: true, name: true, avatar: true },
                    },
                    subject: {
                        select: { id: true, nameEn: true, nameAr: true },
                    },
                    modules: {
                        orderBy: { sortOrder: 'asc' },
                        include: {
                            lessons: {
                                orderBy: { orderIndex: 'asc' },
                                include: {
                                    video: true,
                                    quiz: {
                                        include: { questions: true },
                                    },
                                    materials: true,
                                    blocks: true,
                                },
                            },
                        },
                    },
                    sections: {
                        orderBy: { orderIndex: 'asc' },
                        include: {
                            lessons: {
                                orderBy: { orderIndex: 'asc' },
                                include: {
                                    video: true,
                                    quiz: {
                                        include: { questions: true },
                                    },
                                    materials: true,
                                    blocks: true,
                                },
                            },
                        },
                    },
                },
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.course.count({ where }),
        ]);
        return {
            courses,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }
    static async getCourseById(id) {
        const course = await prisma_1.prisma.course.findUnique({
            where: { id },
            include: {
                teacher: {
                    select: { id: true, name: true, avatar: true },
                },
                subject: true,
                modules: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { orderIndex: 'asc' },
                            include: {
                                video: true,
                                quiz: {
                                    include: { questions: true },
                                },
                                materials: true,
                                blocks: true,
                            },
                        },
                    },
                },
                sections: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { orderIndex: 'asc' },
                            include: {
                                video: true,
                                quiz: {
                                    include: { questions: true },
                                },
                                materials: true,
                                blocks: true,
                            },
                        },
                    },
                },
            },
        });
        if (!course) {
            throw new errors_1.NotFoundError('Course not found');
        }
        return course;
    }
    static async createCourse(data) {
        let subject = await prisma_1.prisma.subject.findUnique({
            where: { id: data.subjectId },
        });
        if (!subject) {
            const { SubjectService } = await Promise.resolve().then(() => __importStar(require('./subject.service')));
            await SubjectService.ensureDefaultSubjectsExist();
            subject = await prisma_1.prisma.subject.findUnique({
                where: { id: data.subjectId },
            });
        }
        if (!subject) {
            throw new errors_1.NotFoundError('Selected subject does not exist. Please select a valid subject.');
        }
        return await prisma_1.prisma.course.create({
            data: {
                titleEn: data.titleEn,
                titleAr: data.titleAr,
                description: data.description,
                thumbnail: data.thumbnail,
                teacherId: data.teacherId,
                subjectId: data.subjectId,
            },
        });
    }
    static async publishCourse(id, teacherId) {
        const course = await prisma_1.prisma.course.findUnique({ where: { id } });
        if (!course) {
            throw new errors_1.NotFoundError('Course not found');
        }
        if (course.teacherId !== teacherId) {
            throw new errors_1.ForbiddenError('You do not have permission to publish this course');
        }
        return await prisma_1.prisma.course.update({
            where: { id },
            data: { isPublished: true, status: 'PUBLISHED' },
        });
    }
    static async submitCourseForReview(courseId, teacherId) {
        const course = await prisma_1.prisma.course.findUnique({
            where: { id: courseId },
            include: {
                modules: {
                    include: {
                        lessons: {
                            include: {
                                blocks: true,
                            },
                        },
                    },
                },
                sections: {
                    include: {
                        lessons: true,
                    },
                },
            },
        });
        if (!course) {
            throw new errors_1.NotFoundError('Course not found');
        }
        if (course.teacherId !== teacherId) {
            throw new errors_1.ForbiddenError('You do not have permission to submit this course');
        }
        const hasUnits = (course.modules && course.modules.length > 0) || (course.sections && course.sections.length > 0);
        const hasLessons = (course.modules && course.modules.some((m) => m.lessons && m.lessons.length > 0)) ||
            (course.sections && course.sections.some((s) => s.lessons && s.lessons.length > 0));
        if (!hasUnits || !hasLessons) {
            throw new Error('Course must contain at least one module and lesson before submitting for review');
        }
        return await prisma_1.prisma.course.update({
            where: { id: courseId },
            data: { status: 'UNDER_REVIEW' },
        });
    }
    static async reviewCourseStatus(courseId, decision) {
        const course = await prisma_1.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            throw new errors_1.NotFoundError('Course not found');
        }
        const newStatus = decision === 'APPROVED' ? 'PUBLISHED' : 'REJECTED';
        const isPublished = decision === 'APPROVED';
        return await prisma_1.prisma.course.update({
            where: { id: courseId },
            data: {
                status: newStatus,
                isPublished,
            },
        });
    }
    // Module Management
    static async createModule(courseId, data) {
        const course = await prisma_1.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            throw new errors_1.NotFoundError('Course not found');
        }
        return await prisma_1.prisma.courseModule.create({
            data: {
                courseId,
                titleEn: data.titleEn,
                titleAr: data.titleAr,
                description: data.description,
                sortOrder: data.sortOrder ?? 0,
            },
        });
    }
    static async deleteModule(moduleId) {
        const module = await prisma_1.prisma.courseModule.findUnique({ where: { id: moduleId } });
        if (!module) {
            throw new errors_1.NotFoundError('Module not found');
        }
        await prisma_1.prisma.courseModule.delete({ where: { id: moduleId } });
        return true;
    }
    static async reorderModules(courseId, items) {
        await prisma_1.prisma.$transaction(items.map((item) => prisma_1.prisma.courseModule.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
        })));
        return true;
    }
    // Lesson & Resource Management
    static async createLesson(moduleId, data, teacherId) {
        const module = await prisma_1.prisma.courseModule.findUnique({
            where: { id: moduleId },
            include: { course: true },
        });
        if (!module) {
            throw new errors_1.NotFoundError('Module not found');
        }
        let videoId;
        if (data.video && data.video.videoUrl) {
            const video = await prisma_1.prisma.video.create({
                data: {
                    teacherId,
                    status: client_1.VideoStatus.READY,
                    videoUrl: data.video.videoUrl,
                    durationSec: data.video.duration || 0,
                    originalFileName: data.video.title || 'lesson-video.mp4',
                },
            });
            videoId = video.id;
        }
        let quizId;
        if (data.quiz && data.quiz.title) {
            const quiz = await prisma_1.prisma.quiz.create({
                data: {
                    titleEn: data.quiz.title,
                    titleAr: data.quiz.title,
                    passingScore: data.quiz.passingScore ?? 50,
                    timeLimit: data.quiz.timeLimit,
                    questions: {
                        create: (data.quiz.questions || []).map((q, idx) => ({
                            questionText: q.questionText,
                            points: q.points ?? 1,
                            orderIndex: q.orderIndex ?? idx + 1,
                            options: q.options || [],
                        })),
                    },
                },
            });
            quizId = quiz.id;
        }
        const lesson = await prisma_1.prisma.lesson.create({
            data: {
                moduleId,
                titleEn: data.titleEn,
                titleAr: data.titleAr || data.titleEn,
                content: data.content,
                orderIndex: data.orderIndex ?? 0,
                estimatedDuration: data.estimatedDuration,
                videoId,
                quizId,
                materials: data.materials && data.materials.length > 0 ? {
                    create: data.materials.map((m) => ({
                        title: m.title,
                        fileUrl: m.fileUrl,
                        fileType: m.fileType || 'pdf',
                        sizeBytes: m.fileSize || 1024,
                    })),
                } : undefined,
            },
            include: {
                video: true,
                quiz: { include: { questions: true } },
                materials: true,
                blocks: true,
            },
        });
        return lesson;
    }
    static async attachVideoToLesson(lessonId, data, teacherId) {
        const lesson = await prisma_1.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson) {
            throw new errors_1.NotFoundError('Lesson not found');
        }
        const video = await prisma_1.prisma.video.create({
            data: {
                teacherId,
                status: client_1.VideoStatus.READY,
                videoUrl: data.videoUrl,
                durationSec: data.duration || 0,
                originalFileName: data.title || 'lesson-video.mp4',
            },
        });
        await prisma_1.prisma.lesson.update({
            where: { id: lessonId },
            data: { videoId: video.id },
        });
        return video;
    }
    static async attachMaterialToLesson(lessonId, data) {
        const lesson = await prisma_1.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson) {
            throw new errors_1.NotFoundError('Lesson not found');
        }
        return await prisma_1.prisma.material.create({
            data: {
                lessonId,
                title: data.title,
                fileUrl: data.fileUrl,
                fileType: data.fileType || 'pdf',
                sizeBytes: data.fileSize || 1024,
            },
        });
    }
    static async attachQuizToLesson(lessonId, data) {
        const lesson = await prisma_1.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson) {
            throw new errors_1.NotFoundError('Lesson not found');
        }
        const quiz = await prisma_1.prisma.quiz.create({
            data: {
                titleEn: data.title,
                titleAr: data.title,
                passingScore: data.passingScore ?? 50,
                timeLimit: data.timeLimit,
                questions: {
                    create: (data.questions || []).map((q, idx) => ({
                        questionText: q.questionText,
                        points: q.points ?? 1,
                        orderIndex: q.orderIndex ?? idx + 1,
                        options: q.options || [],
                    })),
                },
            },
            include: { questions: true },
        });
        await prisma_1.prisma.lesson.update({
            where: { id: lessonId },
            data: { quizId: quiz.id },
        });
        return quiz;
    }
    static async deleteLesson(lessonId) {
        const lesson = await prisma_1.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson) {
            throw new errors_1.NotFoundError('Lesson not found');
        }
        await prisma_1.prisma.lesson.delete({ where: { id: lessonId } });
        return true;
    }
    static async addLessonBlock(lessonId, data) {
        return await prisma_1.prisma.lessonBlock.create({
            data: {
                lessonId,
                blockType: data.blockType,
                configurationJson: JSON.stringify(data.configuration || {}),
                sortOrder: data.sortOrder ?? 0,
                isRequired: data.isRequired ?? true,
            },
        });
    }
    static async gradeAssignmentSubmission(submissionId, gradedById, data) {
        const submission = await prisma_1.prisma.assignmentSubmission.findUnique({
            where: { id: submissionId },
            include: { assignment: true },
        });
        if (!submission) {
            throw new errors_1.NotFoundError('Submission not found');
        }
        if (submission.assignment && data.score > submission.assignment.maxScore) {
            throw new Error(`Score cannot exceed maximum score of ${submission.assignment.maxScore}`);
        }
        return await prisma_1.prisma.assignmentSubmission.update({
            where: { id: submissionId },
            data: {
                score: data.score,
                feedback: data.feedback,
                status: 'GRADED',
                gradedById,
                gradedAt: new Date(),
            },
        });
    }
    static async getTeacherDashboardStats(teacherId) {
        const activeCourses = await prisma_1.prisma.course.count({
            where: { teacherId, status: 'PUBLISHED' },
        });
        const totalStudents = await prisma_1.prisma.entitlement.count({
            where: { status: 'ACTIVE' },
        });
        const pendingAssignments = await prisma_1.prisma.assignmentSubmission.count({
            where: { status: 'SUBMITTED' },
        });
        return {
            activeCourses,
            totalStudents,
            pendingAssignments,
        };
    }
}
exports.CourseService = CourseService;
