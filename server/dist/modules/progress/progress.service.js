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
exports.ProgressService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
class ProgressService {
    /**
     * Updates the watch time and completion status for a lesson video.
     */
    static async updateWatchTime(userId, lessonId, watchTimeDeltaSec) {
        const lesson = await prisma_1.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new errors_1.NotFoundError('Lesson not found');
        const progress = await prisma_1.prisma.lessonProgress.upsert({
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
    static async markCompleted(userId, lessonId) {
        const progress = await prisma_1.prisma.lessonProgress.upsert({
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
    static async getStudentProgressSummary(userId) {
        const { EntitlementResolver } = await Promise.resolve().then(() => __importStar(require('../commerce/entitlement-resolver.service')));
        const { subjectIds, courseIds } = await EntitlementResolver.getAccessibleResources(userId);
        // Fetch all courses accessible via subjects OR direct course access
        const courses = await prisma_1.prisma.course.findMany({
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
        const progressRecords = await prisma_1.prisma.lessonProgress.findMany({
            where: { userId },
        });
        const progressMap = new Map();
        let totalWatchTimeSec = 0;
        progressRecords.forEach((p) => {
            progressMap.set(p.lessonId, p);
            totalWatchTimeSec += p.watchTimeSec;
        });
        // 3. Get all quiz scores for the average
        const quizAttempts = await prisma_1.prisma.quizAttempt.findMany({
            where: { userId },
        });
        let totalScore = 0;
        quizAttempts.forEach((q) => (totalScore += q.score));
        const avgQuizScore = quizAttempts.length > 0 ? Math.round(totalScore / quizAttempts.length) : 0;
        const courseProgressList = [];
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
                        if (p.isCompleted)
                            completedLessons++;
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
exports.ProgressService = ProgressService;
