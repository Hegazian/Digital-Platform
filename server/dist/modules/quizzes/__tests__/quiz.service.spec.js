"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const quiz_service_1 = require("../quiz.service");
const errors_1 = require("../../../utils/errors");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        quiz: {
            create: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
        },
        quizAttempt: {
            create: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('QuizService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('createQuiz', () => {
        (0, vitest_1.it)('should create a quiz with questions', async () => {
            const mockQuiz = {
                id: 'q1',
                titleEn: 'Test Quiz',
                titleAr: 'اختبار تجريبي',
                passingScore: 50,
                questions: [{ id: 'qu1', questionText: 'Q1' }],
            };
            prisma_1.prisma.quiz.create.mockResolvedValue(mockQuiz);
            const result = await quiz_service_1.QuizService.createQuiz({
                titleEn: 'Test Quiz',
                titleAr: 'اختبار تجريبي',
                questions: [{ questionText: 'Q1', options: [], points: 1 }],
            });
            (0, vitest_1.expect)(result.id).toBe('q1');
            (0, vitest_1.expect)(prisma_1.prisma.quiz.create).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should throw BadRequestError if questions array is missing', async () => {
            await (0, vitest_1.expect)(quiz_service_1.QuizService.createQuiz({ titleEn: 'T', titleAr: 'T' })).rejects.toThrow(errors_1.BadRequestError);
        });
    });
    (0, vitest_1.describe)('getQuizById', () => {
        (0, vitest_1.it)('should strip correct answers for students', async () => {
            const mockQuiz = {
                id: 'q1',
                questions: [
                    {
                        id: 'qu1',
                        options: [
                            { id: 'o1', text: 'Opt1', isCorrect: true },
                            { id: 'o2', text: 'Opt2', isCorrect: false },
                        ],
                        explanation: 'Exp',
                    },
                ],
            };
            prisma_1.prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
            const result = await quiz_service_1.QuizService.getQuizById('q1', false);
            (0, vitest_1.expect)(result.questions[0].explanation).toBeNull();
            (0, vitest_1.expect)(result.questions[0].options[0].isCorrect).toBeUndefined();
        });
        (0, vitest_1.it)('should keep correct answers and explanations for teachers', async () => {
            const mockQuiz = {
                id: 'q1',
                questions: [
                    {
                        id: 'qu1',
                        options: [
                            { id: 'o1', text: 'Opt1', isCorrect: true },
                            { id: 'o2', text: 'Opt2', isCorrect: false },
                        ],
                        explanation: 'Exp',
                    },
                ],
            };
            prisma_1.prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
            const result = await quiz_service_1.QuizService.getQuizById('q1', true);
            (0, vitest_1.expect)(result.questions[0].explanation).toBe('Exp');
            (0, vitest_1.expect)(result.questions[0].options[0].isCorrect).toBe(true);
        });
    });
    (0, vitest_1.describe)('submitAttempt', () => {
        (0, vitest_1.it)('should calculate score and determine passing status', async () => {
            const mockQuiz = {
                id: 'q1',
                passingScore: 50,
                questions: [
                    {
                        id: 'qu1',
                        points: 10,
                        options: [
                            { id: 'o1', text: 'Right', isCorrect: true },
                            { id: 'o2', text: 'Wrong', isCorrect: false },
                        ],
                    },
                ],
            };
            prisma_1.prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
            prisma_1.prisma.quizAttempt.create.mockResolvedValue({ id: 'att1' });
            const answers = [{ questionId: 'qu1', selectedOptionId: 'o1' }];
            const result = await quiz_service_1.QuizService.submitAttempt('u1', 'q1', { answers });
            (0, vitest_1.expect)(result.score).toBe(100);
            (0, vitest_1.expect)(result.isPassed).toBe(true);
            (0, vitest_1.expect)(prisma_1.prisma.quizAttempt.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    score: 100,
                    isPassed: true,
                }),
            }));
        });
    });
});
