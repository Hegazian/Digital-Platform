import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { QuizService } from '../quiz.service';
import { NotFoundError, BadRequestError } from '../../../utils/errors';

const prismaMock = vi.hoisted(() => ({
  quiz: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  quizAttempt: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('../../../prisma', () => ({
  prisma: {
    ...prismaMock,
    // Pass-through transaction: run the callback against the same mocks.
    $transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(prismaMock)),
  },
}));

describe('QuizService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create a quiz with questions', async () => {
      const mockQuiz = {
        id: 'q1',
        titleEn: 'Test Quiz',
        titleAr: 'اختبار تجريبي',
        passingScore: 50,
        maxAttempts: 1,
        questions: [{ id: 'qu1', questionText: 'Q1' }],
      };
      (prisma.quiz.create as any).mockResolvedValue(mockQuiz);

      const result = await QuizService.createQuiz({
        titleEn: 'Test Quiz',
        titleAr: 'اختبار تجريبي',
        questions: [
          {
            questionText: 'Q1',
            options: [
              { id: 'opt1', text: 'Option 1', isCorrect: true },
              { id: 'opt2', text: 'Option 2', isCorrect: false },
            ],
            points: 1,
          },
        ],
      });

      expect(result.id).toBe('q1');
      expect(prisma.quiz.create).toHaveBeenCalled();
    });

    it('should throw BadRequestError if a question has no correct option', async () => {
      await expect(
        QuizService.createQuiz({
          titleEn: 'Test Quiz',
          titleAr: 'اختبار تجريبي',
          questions: [
            {
              questionText: 'Q1',
              options: [
                { id: 'opt1', text: 'Option 1', isCorrect: false },
                { id: 'opt2', text: 'Option 2', isCorrect: false },
              ],
            },
          ],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if questions array is missing', async () => {
      await expect(QuizService.createQuiz({ titleEn: 'T', titleAr: 'T' })).rejects.toThrow(BadRequestError);
    });
  });

  describe('getQuizById', () => {
    it('should strip correct answers for students', async () => {
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
      (prisma.quiz.findUnique as any).mockResolvedValue(mockQuiz);

      const result = await QuizService.getQuizById('q1', false);

      expect(result.questions[0].explanation).toBeNull();
      expect((result.questions[0].options as any[])[0].isCorrect).toBeUndefined();
    });

    it('should keep correct answers and explanations for teachers', async () => {
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
      (prisma.quiz.findUnique as any).mockResolvedValue(mockQuiz);

      const result = await QuizService.getQuizById('q1', true);

      expect(result.questions[0].explanation).toBe('Exp');
      expect((result.questions[0].options as any[])[0].isCorrect).toBe(true);
    });
  });

  describe('submitAttempt', () => {
    it('should calculate score and determine passing status', async () => {
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
      (prisma.quiz.findUnique as any).mockResolvedValue(mockQuiz);
      (prisma.quizAttempt.create as any).mockResolvedValue({ id: 'att1' });

      const answers = [{ questionId: 'qu1', selectedOptionId: 'o1' }];
      const result = await QuizService.submitAttempt('u1', 'q1', { answers });

      expect(result.score).toBe(100);
      expect(result.isPassed).toBe(true);
      expect(prisma.quizAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            score: 100,
            isPassed: true,
          }),
        })
      );
    });

    it('should throw BadRequestError if max attempts limit is exceeded', async () => {
      const mockQuiz = {
        id: 'q1',
        maxAttempts: 1,
        questions: [{ id: 'qu1', points: 10, options: [] }],
      };
      (prisma.quiz.findUnique as any).mockResolvedValue(mockQuiz);
      (prisma.quizAttempt.count as any).mockResolvedValue(1);

      await expect(
        QuizService.submitAttempt('u1', 'q1', { answers: [{ questionId: 'qu1', selectedOptionId: 'o1' }] })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
