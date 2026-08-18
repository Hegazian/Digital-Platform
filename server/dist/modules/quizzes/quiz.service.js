"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
class QuizService {
    /**
     * Create a new quiz with its questions.
     */
    static async createQuiz(data) {
        const { titleEn, titleAr, timeLimit, passingScore, questions } = data;
        if (!titleEn || !titleAr || !questions || !Array.isArray(questions)) {
            throw new errors_1.BadRequestError('titleEn, titleAr, and questions array are required');
        }
        const createdQuiz = await prisma_1.prisma.quiz.create({
            data: {
                titleEn,
                titleAr,
                timeLimit: timeLimit || null,
                passingScore: passingScore || 50,
                questions: {
                    create: questions.map((q, index) => ({
                        questionText: q.questionText,
                        options: q.options,
                        explanation: q.explanation || null,
                        orderIndex: index,
                        points: q.points || 1,
                    })),
                },
            },
            include: {
                questions: true,
            },
        });
        return createdQuiz;
    }
    /**
     * Get quiz by ID.
     * If isTeacher is false, the correct answers are stripped from the options.
     */
    static async getQuizById(id, isTeacher = false) {
        const quiz = await prisma_1.prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });
        if (!quiz) {
            throw new errors_1.NotFoundError('Quiz not found');
        }
        if (!isTeacher) {
            // Strip `isCorrect` from options for students
            quiz.questions = quiz.questions.map((q) => {
                const sanitizedOptions = q.options.map((opt) => ({
                    id: opt.id,
                    text: opt.text,
                }));
                return { ...q, options: sanitizedOptions, explanation: null }; // Hide explanation before submission
            });
        }
        return quiz;
    }
    /**
     * Submit a quiz attempt and auto-grade it.
     */
    static async submitAttempt(userId, quizId, data) {
        const { answers } = data; // Array of { questionId, selectedOptionId }
        if (!answers || !Array.isArray(answers)) {
            throw new errors_1.BadRequestError('answers array is required');
        }
        const quiz = await prisma_1.prisma.quiz.findUnique({
            where: { id: quizId },
            include: { questions: true },
        });
        if (!quiz) {
            throw new errors_1.NotFoundError('Quiz not found');
        }
        let totalPoints = 0;
        let earnedPoints = 0;
        // Grade the submission
        for (const question of quiz.questions) {
            totalPoints += question.points;
            const studentAnswer = answers.find((a) => a.questionId === question.id);
            if (studentAnswer) {
                const options = question.options;
                const selectedOption = options.find((opt) => opt.id === studentAnswer.selectedOptionId);
                if (selectedOption && selectedOption.isCorrect) {
                    earnedPoints += question.points;
                }
            }
        }
        const percentageScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const isPassed = percentageScore >= quiz.passingScore;
        const attempt = await prisma_1.prisma.quizAttempt.create({
            data: {
                quizId,
                userId,
                score: percentageScore,
                answers,
                isPassed,
                completedAt: new Date(),
            },
        });
        return {
            attemptId: attempt.id,
            score: percentageScore,
            isPassed,
            earnedPoints,
            totalPoints,
        };
    }
    /**
     * Get all attempts for a specific user and quiz.
     */
    static async getUserAttempts(userId, quizId) {
        return await prisma_1.prisma.quizAttempt.findMany({
            where: {
                userId,
                quizId,
            },
            orderBy: {
                startedAt: 'desc',
            },
        });
    }
}
exports.QuizService = QuizService;
