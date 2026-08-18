import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { VideoStatus } from '@prisma/client';

export class CourseService {
  static async getAllCourses(query: any = {}) {
    const { subjectId, isPublished, page, limit } = query;
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(subjectId && { subjectId }),
      ...(isPublished !== undefined && { isPublished: isPublished === 'true' }),
    };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
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
      prisma.course.count({ where }),
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

  static async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
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
      throw new NotFoundError('Course not found');
    }

    return course;
  }

  static async createCourse(data: any) {
    let subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
    });

    if (!subject) {
      const { SubjectService } = await import('./subject.service');
      await SubjectService.ensureDefaultSubjectsExist();
      subject = await prisma.subject.findUnique({
        where: { id: data.subjectId },
      });
    }

    if (!subject) {
      throw new NotFoundError('Selected subject does not exist. Please select a valid subject.');
    }

    return await prisma.course.create({
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

  static async publishCourse(id: string, teacherId: string) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenError('You do not have permission to publish this course');
    }

    return await prisma.course.update({
      where: { id },
      data: { isPublished: true, status: 'PUBLISHED' },
    });
  }

  static async submitCourseForReview(courseId: string, teacherId: string) {
    const course = await prisma.course.findUnique({
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
      throw new NotFoundError('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenError('You do not have permission to submit this course');
    }

    const hasUnits = (course.modules && course.modules.length > 0) || (course.sections && course.sections.length > 0);
    const hasLessons =
      (course.modules && course.modules.some((m) => m.lessons && m.lessons.length > 0)) ||
      (course.sections && course.sections.some((s) => s.lessons && s.lessons.length > 0));

    if (!hasUnits || !hasLessons) {
      throw new Error('Course must contain at least one module and lesson before submitting for review');
    }

    return await prisma.course.update({
      where: { id: courseId },
      data: { status: 'UNDER_REVIEW' },
    });
  }

  static async reviewCourseStatus(courseId: string, decision: 'APPROVED' | 'REJECTED') {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const newStatus = decision === 'APPROVED' ? 'PUBLISHED' : 'REJECTED';
    const isPublished = decision === 'APPROVED';

    return await prisma.course.update({
      where: { id: courseId },
      data: {
        status: newStatus as any,
        isPublished,
      },
    });
  }

  // Module Management
  static async createModule(courseId: string, data: { titleEn: string; titleAr: string; description?: string; sortOrder?: number }) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return await prisma.courseModule.create({
      data: {
        courseId,
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  static async deleteModule(moduleId: string) {
    const module = await prisma.courseModule.findUnique({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    await prisma.courseModule.delete({ where: { id: moduleId } });
    return true;
  }

  static async reorderModules(courseId: string, items: Array<{ id: string; sortOrder: number }>) {
    await prisma.$transaction(
      items.map((item) =>
        prisma.courseModule.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
    return true;
  }

  // Lesson & Resource Management
  static async createLesson(
    moduleId: string,
    data: {
      titleEn: string;
      titleAr?: string;
      content?: string;
      orderIndex?: number;
      estimatedDuration?: number;
      video?: { title?: string; videoUrl: string; duration?: number };
      materials?: Array<{ title: string; fileUrl: string; fileType?: string; fileSize?: number }>;
      quiz?: { title: string; passingScore?: number; timeLimit?: number; questions: Array<{ questionText: string; points?: number; orderIndex?: number; options: Array<{ optionText: string; isCorrect: boolean; orderIndex?: number }> }> };
    },
    teacherId: string
  ) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    let videoId: string | undefined;
    if (data.video && data.video.videoUrl) {
      const video = await prisma.video.create({
        data: {
          teacherId,
          status: VideoStatus.READY,
          videoUrl: data.video.videoUrl,
          durationSec: data.video.duration || 0,
          originalFileName: data.video.title || 'lesson-video.mp4',
        },
      });
      videoId = video.id;
    }

    let quizId: string | undefined;
    if (data.quiz && data.quiz.title) {
      const quiz = await prisma.quiz.create({
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

    const lesson = await prisma.lesson.create({
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

  static async attachVideoToLesson(lessonId: string, data: { videoUrl: string; duration?: number; title?: string }, teacherId: string) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const video = await prisma.video.create({
      data: {
        teacherId,
        status: VideoStatus.READY,
        videoUrl: data.videoUrl,
        durationSec: data.duration || 0,
        originalFileName: data.title || 'lesson-video.mp4',
      },
    });

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { videoId: video.id },
    });

    return video;
  }

  static async attachMaterialToLesson(lessonId: string, data: { title: string; fileUrl: string; fileType?: string; fileSize?: number }) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    return await prisma.material.create({
      data: {
        lessonId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileType: data.fileType || 'pdf',
        sizeBytes: data.fileSize || 1024,
      },
    });
  }

  static async attachQuizToLesson(
    lessonId: string,
    data: { title: string; passingScore?: number; timeLimit?: number; questions?: Array<{ questionText: string; points?: number; orderIndex?: number; options: Array<{ optionText: string; isCorrect: boolean; orderIndex?: number }> }> }
  ) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const quiz = await prisma.quiz.create({
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

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { quizId: quiz.id },
    });

    return quiz;
  }

  static async deleteLesson(lessonId: string) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    await prisma.lesson.delete({ where: { id: lessonId } });
    return true;
  }

  static async addLessonBlock(
    lessonId: string,
    data: { blockType: string; configuration: any; sortOrder?: number; isRequired?: boolean }
  ) {
    return await prisma.lessonBlock.create({
      data: {
        lessonId,
        blockType: data.blockType as any,
        configurationJson: JSON.stringify(data.configuration || {}),
        sortOrder: data.sortOrder ?? 0,
        isRequired: data.isRequired ?? true,
      },
    });
  }

  static async gradeAssignmentSubmission(
    submissionId: string,
    gradedById: string,
    data: { score: number; feedback?: string }
  ) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.assignment && data.score > submission.assignment.maxScore) {
      throw new Error(`Score cannot exceed maximum score of ${submission.assignment.maxScore}`);
    }

    return await prisma.assignmentSubmission.update({
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

  static async getTeacherDashboardStats(teacherId: string) {
    const activeCourses = await prisma.course.count({
      where: { teacherId, status: 'PUBLISHED' },
    });

    const totalStudents = await prisma.entitlement.count({
      where: { status: 'ACTIVE' },
    });

    const pendingAssignments = await prisma.assignmentSubmission.count({
      where: { status: 'SUBMITTED' },
    });

    return {
      activeCourses,
      totalStudents,
      pendingAssignments,
    };
  }
}
