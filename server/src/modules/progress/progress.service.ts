import { prisma } from '../../prisma';
import { NotFoundError } from '../../utils/errors';

export class ProgressService {
  /**
   * Updates the watch time and completion status for a lesson video.
   */
  static async updateWatchTime(userId: string, lessonId: string, watchTimeDeltaSec: number) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundError('Lesson not found');

    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {
        watchTimeSec: { increment: watchTimeDeltaSec },
        lastWatched: new Date(),
      },
      create: {
        userId,
        lessonId,
        watchTimeSec: watchTimeDeltaSec,
        isCompleted: false,
      },
    });

    return progress;
  }

  /**
   * Marks a lesson as fully completed.
   */
  static async markCompleted(userId: string, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) throw new NotFoundError('Lesson not found');

    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {
        isCompleted: true,
        lastWatched: new Date(),
      },
      create: {
        userId,
        lessonId,
        watchTimeSec: 0,
        isCompleted: true,
      },
    });

    return progress;
  }

  /**
   * Completed lesson IDs for one course — used by the player to hydrate
   * prior completion state (TC-STUDENT-060).
   */
  static async getCourseLessonProgress(userId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        modules: { select: { lessons: { select: { id: true } } } },
        sections: { select: { lessons: { select: { id: true } } } },
      },
    });
    if (!course) throw new NotFoundError('Course not found');

    const lessonIds = [
      ...(course.modules || []).flatMap((m) => m.lessons.map((l) => l.id)),
      ...(course.sections || []).flatMap((s) => s.lessons.map((l) => l.id)),
    ];

    if (lessonIds.length === 0) return { completedLessonIds: [], totalLessons: 0 };

    const records = await prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds }, isCompleted: true },
      select: { lessonId: true },
    });

    return { completedLessonIds: records.map((r) => r.lessonId), totalLessons: lessonIds.length };
  }

  /**
   * Fetches the overall progress summary for all courses the student is enrolled in.
   * Based on active subscriptions.
   */
  static async getStudentProgressSummary(userId: string) {
    const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
    const { subjectIds, courseIds, gradeBundleIds } = await EntitlementResolver.getAccessibleResources(userId);

    // Fetch all courses accessible via subjects OR direct course access OR grade bundles
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { subjectId: { in: Array.from(subjectIds) } },
          { id: { in: Array.from(courseIds) } },
          ...(gradeBundleIds.size > 0 ? [{ gradeId: { in: Array.from(gradeBundleIds) } }] : []),
        ],
      },
      include: {
        subject: true,
        modules: {
          include: {
            lessons: true,
          },
        },
        sections: {
          include: {
            lessons: true,
          },
        },
      },
    });

    // 2. Get all progress records for this user
    const progressRecords = await prisma.lessonProgress.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, typeof progressRecords[0]>();
    let totalWatchTimeSec = 0;
    
    progressRecords.forEach((p) => {
      progressMap.set(p.lessonId, p);
      totalWatchTimeSec += p.watchTimeSec;
    });

    // 3. Get all quiz scores for the average
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
    });
    
    let totalScore = 0;
    quizAttempts.forEach((q) => (totalScore += q.score));
    const avgQuizScore = quizAttempts.length > 0 ? Math.round(totalScore / quizAttempts.length) : 0;

    // 4. Recent assignment grades for grade history (TC-STUDENT-063)
    const gradedSubmissions = await prisma.assignmentSubmission.findMany({
      where: { studentId: userId, status: 'GRADED' },
      orderBy: { gradedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        score: true,
        feedback: true,
        gradedAt: true,
        assignment: { select: { titleEn: true, maxScore: true } },
      },
    });

    const recentGrades = gradedSubmissions.map((s) => ({
      submissionId: s.id,
      assignmentTitle: s.assignment?.titleEn ?? 'Assignment',
      score: s.score,
      maxScore: s.assignment?.maxScore ?? null,
      feedback: s.feedback,
      gradedAt: s.gradedAt,
    }));

    const courseProgressList: any[] = [];

    // Calculate progress per course
    courses.forEach((course: any) => {
      let totalLessons = 0;
      let completedLessons = 0;
      let lastLessonTitle = 'Get Started';
      let lastWatchedDate = new Date(0);

      const allLessons = [
        ...(course.modules || []).flatMap((m: any) => m.lessons || []),
        ...(course.sections || []).flatMap((s: any) => s.lessons || []),
      ];

      allLessons.forEach((les: any) => {
        totalLessons++;
        const p = progressMap.get(les.id);
        if (p) {
          if (p.isCompleted) completedLessons++;
          if (p.lastWatched > lastWatchedDate) {
            lastWatchedDate = p.lastWatched;
            lastLessonTitle = les.titleEn;
          }
        }
      });

      courseProgressList.push({
        id: course.id,
        titleEn: course.titleEn,
        titleAr: course.titleAr,
        subject: course.subject?.nameEn || 'General',
        totalLessons,
        completedLessons,
        progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        lastLesson: lastLessonTitle,
      });
    });

    return {
      totalWatchTimeSec,
      avgQuizScore,
      recentGrades,
      courses: courseProgressList,
    };
  }
}
