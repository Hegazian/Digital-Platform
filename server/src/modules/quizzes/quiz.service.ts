import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { Role } from '@prisma/client';

interface QuizQuestionInput {
  questionText: string;
  type?: 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY';
  options?: Array<{ id?: string; optionText?: string; text?: string; isCorrect: boolean; orderIndex?: number }>;
  correctAnswer?: string;
  explanation?: string;
  points?: number;
}

const TEXT_QUESTION_TYPES = ['SHORT_ANSWER', 'ESSAY'];

/** Validates a single question against its declared type rules. */
function validateQuestion(q: QuizQuestionInput, index: number): void {
  const label = `Question ${index + 1}`;
  const type = q.type || 'MCQ';

  if (!q.questionText || !q.questionText.trim()) {
    throw new BadRequestError(`${label}: question text is required`);
  }

  const options = Array.isArray(q.options) ? q.options : [];

  if (TEXT_QUESTION_TYPES.includes(type)) {
    // Free-text questions carry no options.
    if (type === 'SHORT_ANSWER') {
      if (!q.correctAnswer || !q.correctAnswer.trim()) {
        throw new BadRequestError(`${label}: SHORT_ANSWER requires a correctAnswer`);
      }
    }
    return;
  }

  if (options.length < 2) {
    throw new BadRequestError(`${label} (${type}) must have at least 2 options`);
  }

  const normalized = options.map((opt) => ({
    ...opt,
    text: opt.text ?? opt.optionText ?? '',
  }));

  if (normalized.some((opt) => !String(opt.text).trim())) {
    throw new BadRequestError(`${label} (${type}): all options must have text`);
  }

  const correctCount = normalized.filter((opt) => opt.isCorrect === true).length;

  if (type === 'MULTIPLE_SELECT') {
    if (correctCount < 1) {
      throw new BadRequestError(`${label} (MULTIPLE_SELECT) must have at least one correct option`);
    }
    return;
  }

  // MCQ / TRUE_FALSE: exactly one correct answer
  if (correctCount !== 1) {
    throw new BadRequestError(`${label} (${type}) must have exactly one correct option`);
  }
  if (type === 'TRUE_FALSE' && options.length !== 2) {
    throw new BadRequestError(`${label} (TRUE_FALSE) must have exactly 2 options`);
  }
}

/** Normalizes question payloads into Prisma create data. */
function toQuestionData(q: QuizQuestionInput, index: number) {
  const type = q.type || 'MCQ';
  const isText = TEXT_QUESTION_TYPES.includes(type);

  const options = isText
    ? []
    : (Array.isArray(q.options) ? q.options : []).map((opt, i) => ({
        id: opt.id || `opt_${index + 1}_${i + 1}`,
        text: opt.text ?? opt.optionText ?? '',
        isCorrect: opt.isCorrect === true,
      }));

  return {
    questionText: q.questionText.trim(),
    type,
    options,
    correctAnswer: type === 'SHORT_ANSWER' ? q.correctAnswer!.trim().toLowerCase() : null,
    explanation: q.explanation || null,
    orderIndex: index,
    points: q.points && q.points > 0 ? Math.floor(q.points) : 1,
  };
}

export class QuizService {
  /**
   * Create a new quiz with its questions.
   */
  static async createQuiz(data: any) {
    const { titleEn, titleAr, timeLimit, passingScore, maxAttempts, dueDate, questions } = data;

    if (!titleEn || !titleAr || !questions || !Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestError('titleEn, titleAr, and questions array are required');
    }

    for (let i = 0; i < questions.length; i++) {
      validateQuestion(questions[i], i);
    }

    return await prisma.quiz.create({
      data: {
        titleEn,
        titleAr,
        timeLimit: timeLimit || null,
        passingScore: typeof passingScore === 'number' ? passingScore : 50,
        maxAttempts: maxAttempts ? Math.max(1, Number(maxAttempts)) : 1,
        ...(dueDate && { dueDate: new Date(dueDate) }),
        questions: {
          create: questions.map((q: QuizQuestionInput, index: number) =>
            toQuestionData(q, index)
          ),
        },
      },
      include: {
        questions: true,
      },
    });
  }

  /**
   * Replace a quiz's definition and questions wholesale.
   * Allowed only for the owning teacher (via lesson -> course) or an admin.
   */
  static async updateQuiz(
    quizId: string,
    data: Partial<{ titleEn: string; titleAr: string; timeLimit: number | null; passingScore: number; maxAttempts: number; dueDate: string | null; questions: QuizQuestionInput[] }>,
    userId?: string,
    userRole?: Role
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        lesson: { include: { module: { select: { course: true } }, section: { select: { course: true } } } },
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    const ownerTeacherId =
      quiz.lesson?.module?.course?.teacherId || quiz.lesson?.section?.course?.teacherId;

    const canManage =
      userRole === Role.ADMIN ||
      (userId && ownerTeacherId === undefined) || // standalone quizzes are editable by any approved teacher
      (userId && ownerTeacherId === userId);

    if (!canManage) {
      throw new ForbiddenError('Only the course owner can edit this quiz');
    }

    if (data.questions !== undefined) {
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new BadRequestError('questions array cannot be empty');
      }
      for (let i = 0; i < data.questions.length; i++) {
        validateQuestion(data.questions[i], i);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.questions !== undefined) {
        await tx.question.deleteMany({ where: { quizId } });
        await tx.question.createMany({
          data: data.questions.map((q, index) => ({
            ...toQuestionData(q, index),
            quizId,
          })),
        });
      }

      return tx.quiz.update({
        where: { id: quizId },
        data: {
          ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
          ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
          ...(data.timeLimit !== undefined && { timeLimit: data.timeLimit }),
          ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
          ...(data.maxAttempts !== undefined && { maxAttempts: Math.max(1, data.maxAttempts) }),
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          }),
        },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
    });

    return updated;
  }

  /**
   * Resolve the owning teacher of a quiz through its lesson -> course chain.
   */
  private static async getQuizOwnerTeacherId(quizId: string): Promise<string | null> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        lesson: {
          select: {
            module: { select: { course: { select: { teacherId: true } } } },
            section: { select: { course: { select: { teacherId: true } } } },
          },
        },
      },
    });
    if (!quiz) return null;
    return (
      quiz.lesson?.module?.course?.teacherId ||
      quiz.lesson?.section?.course?.teacherId ||
      null
    );
  }

  /**
   * Get quiz by ID.
   * If isTeacher is false, the correct answers are stripped from the options.
   */
  static async getQuizById(id: string, isTeacher: boolean = false) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    if (!isTeacher) {
      // Strip `isCorrect` / accepted answers for students
      quiz.questions = quiz.questions.map((q) => {
        const rawOptions = (q.options as any[]) || [];
        const sanitizedOptions = rawOptions.map((opt) => ({
          id: opt.id,
          text: opt.text,
        }));
        return {
          ...q,
          options: sanitizedOptions,
          correctAnswer: q.type === 'ESSAY' || q.type === 'SHORT_ANSWER' ? null : q.correctAnswer,
          explanation: null, // Hide explanation before submission
        };
      });
    }

    return quiz;
  }

  /**
   * Starts an IN_PROGRESS attempt (required for timed quizzes).
   */
  static async startAttempt(userId: string, quizId: string) {
    return prisma.$transaction(
      async (tx) => {
        const quiz = await tx.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) {
          throw new NotFoundError('Quiz not found');
        }

        const attemptCount = await tx.quizAttempt.count({
          where: { quizId, userId, status: { not: 'IN_PROGRESS' } },
        });
        if (attemptCount >= quiz.maxAttempts) {
          throw new BadRequestError(`Maximum quiz attempts (${quiz.maxAttempts}) exceeded`);
        }

        // Close stale timed-out attempts instead of failing them here; expiry
        // is enforced at submit-time so students always receive a graded result.
        const openAttempt = await tx.quizAttempt.findFirst({
          where: { quizId, userId, status: 'IN_PROGRESS', completedAt: null },
        });
        if (openAttempt && quiz.timeLimit) {
          const deadlineMs = new Date(openAttempt.startedAt).getTime() + quiz.timeLimit * 60_000;
          if (deadlineMs <= Date.now()) {
            await tx.quizAttempt.update({
              where: { id: openAttempt.id },
              data: { status: 'COMPLETED', score: 0, isPassed: false, completedAt: new Date(), answers: [] },
            });
            throw new BadRequestError('Previous attempt expired. This counts as one of your attempts.');
          }
          return openAttempt; // Resume existing in-progress attempt
        }
        if (openAttempt) {
          return openAttempt; // Untimed quiz: resume
        }

        return tx.quizAttempt.create({
          data: {
            quizId,
            userId,
            status: 'IN_PROGRESS',
            answers: [],
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );
  }

  /** Grades one answer against its question. Returns earned points or null when manual review is required. */
  private static gradeAnswer(question: any, answer: any): number | null {
    const options = (question.options as any[]) || [];
    const type = question.type || 'MCQ';

    switch (type) {
      case 'MCQ':
      case 'TRUE_FALSE': {
        const selected = options.find((opt) => opt.id === answer.selectedOptionId);
        return selected?.isCorrect ? question.points : 0;
      }
      case 'MULTIPLE_SELECT': {
        const chosen: string[] = Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds : [];
        const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id);
        const fullMatch =
          correctIds.length > 0 &&
          correctIds.every((id) => chosen.includes(id)) &&
          chosen.every((id) => correctIds.includes(id));
        return fullMatch ? question.points : 0;
      }
      case 'SHORT_ANSWER': {
        const given = String(answer.textAnswer ?? '').trim().toLowerCase();
        return given && given === question.correctAnswer ? question.points : 0;
      }
      case 'ESSAY':
      default:
        return null; // requires instructor review
    }
  }

  /**
   * Submit a quiz attempt and auto-grade it.
   * - Timed quizzes must reference an open IN_PROGRESS attempt started within the limit.
   * - Untimed quizzes keep the legacy single-shot flow (attempt-limit checked transactionally).
   */
  static async submitAttempt(userId: string, quizId: string, data: any) {
    const { answers } = data; // Array of { questionId, selectedOptionId? , selectedOptionIds?, textAnswer? }

    if (!answers || !Array.isArray(answers)) {
      throw new BadRequestError('answers array is required');
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    let needsReview = false;

    for (const question of quiz.questions) {
      totalPoints += question.points;
      const studentAnswer = answers.find((a: any) => a.questionId === question.id);
      if (!studentAnswer) continue;

      const earned = this.gradeAnswer(question, studentAnswer);
      if (earned === null) {
        needsReview = true;
      } else {
        earnedPoints += earned;
      }
    }

    const percentageScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const finalStatus = needsReview ? 'AWAITING_REVIEW' : 'COMPLETED';
    // Passing cannot be granted while essay/short answers await review.
    const isPassed = !needsReview && percentageScore >= quiz.passingScore;

    const result = await prisma.$transaction(
      async (tx) => {
        const openAttempt = await tx.quizAttempt.findFirst({
          where: { quizId, userId, status: 'IN_PROGRESS' },
          orderBy: { startedAt: 'desc' },
        });

        if (openAttempt) {
          if (quiz.timeLimit) {
            const elapsedSec = Math.floor((Date.now() - new Date(openAttempt.startedAt).getTime()) / 1000);
            const limitSec = quiz.timeLimit * 60;
            if (elapsedSec > limitSec + 5) {
              // Grace of 5s for network latency; beyond that the attempt expires unscored.
              await tx.quizAttempt.update({
                where: { id: openAttempt.id },
                data: {
                  status: 'COMPLETED',
                  score: 0,
                  isPassed: false,
                  completedAt: new Date(),
                  timeSpentSec: elapsedSec,
                  answers,
                },
              });
              throw new BadRequestError(`Time limit of ${quiz.timeLimit} minutes exceeded. Attempt recorded as expired.`);
            }
          }

          return tx.quizAttempt.update({
            where: { id: openAttempt.id },
            data: {
              status: finalStatus as any,
              score: percentageScore,
              isPassed,
              completedAt: new Date(),
              timeSpentSec: Math.floor((Date.now() - new Date(openAttempt.startedAt).getTime()) / 1000),
              answers,
            },
          });
        }

        if (quiz.timeLimit) {
          throw new BadRequestError('No active attempt found. Start the quiz before submitting.');
        }

        // Legacy untimed flow — attempt limit enforced inside the transaction.
        const attemptCount = await tx.quizAttempt.count({
          where: { quizId, userId, status: { not: 'IN_PROGRESS' } },
        });
        if (attemptCount >= quiz.maxAttempts) {
          throw new BadRequestError(`Maximum quiz attempts (${quiz.maxAttempts}) exceeded`);
        }

        return tx.quizAttempt.create({
          data: {
            quizId,
            userId,
            score: percentageScore,
            answers,
            isPassed,
            status: finalStatus as any,
            completedAt: new Date(),
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return {
      attemptId: result.id,
      score: percentageScore,
      isPassed,
      needsReview,
      earnedPoints,
      totalPoints,
    };
  }

  /**
   * Get all attempts for a specific user and quiz.
   */
  static async getUserAttempts(userId: string, quizId: string) {
    return await prisma.quizAttempt.findMany({
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
