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
   * Fetches the overall progress summary for all courses the student is enrolled in.
   * Based on active subscriptions.
   */
  static async getStudentProgressSummary(userId: string) {
    const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
    const { subjectIds, courseIds } = await EntitlementResolver.getAccessibleResources(userId);

    // Fetch all courses accessible via subjects OR direct course access
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { subjectId: { in: Array.from(subjectIds) } },
          { id: { in: Array.from(courseIds) } },
        ],
      },
      include: {
        subject: true,
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

    const courseProgressList: any[] = [];

    // Calculate progress per course
    courses.forEach((course) => {
      let totalLessons = 0;
      let completedLessons = 0;
      let lastLessonTitle = 'Get Started';
      let lastWatchedDate = new Date(0);

      course.sections.forEach((sec) => {
        sec.lessons.forEach((les) => {
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
      });

      if (totalLessons > 0) {
        courseProgressList.push({
          id: course.id,
          titleEn: course.titleEn,
          titleAr: course.titleAr,
          subject: course.subject?.nameEn || 'General',
          totalLessons,
          completedLessons,
          progress: Math.round((completedLessons / totalLessons) * 100),
          lastLesson: lastLessonTitle,
        });
      }
    });

    return {
      totalWatchTimeSec,
      avgQuizScore,
      courses: courseProgressList,
    };
  }
}
