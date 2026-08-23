import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import {
  QuestionType,
  QuestionDifficulty,
  AssessmentAttemptStatus,
} from '@prisma/client';

export class AssessmentService {
  // Question Pools
  static async createQuestionPool(data: {
    titleEn: string;
    titleAr: string;
    description?: string;
  }) {
    return await prisma.questionPool.create({
      data: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        description: data.description,
      },
    });
  }

  static async addQuestionItem(
    poolId: string,
    data: {
      textEn: string;
      textAr: string;
      questionType: QuestionType;
      difficulty: QuestionDifficulty;
      optionsJson: string;
      correctAnswerJson: string;
      explanation?: string;
      points?: number;
    }
  ) {
    const pool = await prisma.questionPool.findUnique({
      where: { id: poolId },
    });
    if (!pool) {
      throw new NotFoundError('Question pool not found');
    }

    return await prisma.questionItem.create({
      data: {
        pool: { connect: { id: poolId } },
        textEn: data.textEn,
        textAr: data.textAr,
        questionType: data.questionType,
        difficulty: data.difficulty,
        optionsJson: data.optionsJson,
        correctAnswerJson: data.correctAnswerJson,
        explanation: data.explanation,
        points: data.points ?? 10,
      },
    });
  }

  // Assessments
  /** Teacher listing: pools with their items for authoring UIs. */
  static async listQuestionPools() {
    return prisma.questionPool.findMany({
      include: {
        questions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Exam catalog for students & teachers. */
  static async listAssessments() {
    return prisma.assessment.findMany({
      include: {
        pool: { select: { id: true, titleEn: true, titleAr: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  static async createAssessment(data: {
    poolId: string;
    titleEn: string;
    titleAr: string;
    durationMinutes?: number;
    passingScore?: number;
    totalQuestions?: number;
  }) {
    const pool = await prisma.questionPool.findUnique({
      where: { id: data.poolId },
    });
    if (!pool) {
      throw new NotFoundError('Question pool not found');
    }

    return await prisma.assessment.create({
      data: {
        pool: { connect: { id: data.poolId } },
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        durationMinutes: data.durationMinutes ?? 30,
        passingScore: data.passingScore ?? 60,
        totalQuestions: data.totalQuestions ?? 10,
      },
    });
  }

  // Exam Assembly & Attempt Session Lock
  static async startAssessmentAttempt(studentId: string, assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        pool: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment template not found');
    }

    const availableQuestions = assessment.pool.questions;
    if (availableQuestions.length === 0) {
      throw new BadRequestError('No questions available in question pool');
    }

    // Shuffle and pick questions up to totalQuestions limit
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, assessment.totalQuestions);

    // Save frozen snapshot with full data (internal DB record)
    const questionsSnapshotJson = JSON.stringify(selectedQuestions);

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + assessment.durationMinutes * 60 * 1000);

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessment: { connect: { id: assessmentId } },
        student: { connect: { id: studentId } },
        startedAt,
        expiresAt,
        status: AssessmentAttemptStatus.IN_PROGRESS,
        questionsSnapshotJson,
      },
    });

    // Sanitize questions snapshot for student (strip correct answers & explanations)
    const sanitizedSnapshot = selectedQuestions.map((q) => {
      let options: any[] = [];
      try {
        options = JSON.parse(q.optionsJson);
      } catch (e) {
        options = [];
      }
      return {
        id: q.id,
        textEn: q.textEn,
        textAr: q.textAr,
        type: q.questionType,
        points: q.points,
        options,
      };
    });

    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      status: attempt.status,
      questionsSnapshot: sanitizedSnapshot,
    };
  }

  static async getAttempt(studentId: string, attemptId: string) {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found');
    }

    if (attempt.studentId !== studentId) {
      throw new BadRequestError('Unauthorized access to attempt');
    }

    // Check expiration
    if (attempt.status === AssessmentAttemptStatus.IN_PROGRESS && new Date() > attempt.expiresAt) {
      await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { status: AssessmentAttemptStatus.EXPIRED },
      });
      attempt.status = AssessmentAttemptStatus.EXPIRED;
    }

    let questionsRaw: any[] = [];
    try {
      questionsRaw = JSON.parse(attempt.questionsSnapshotJson);
    } catch (e) {
      questionsRaw = [];
    }

    const sanitizedSnapshot = questionsRaw.map((q) => {
      let options: any[] = [];
      try {
        options = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.optionsJson;
      } catch (e) {
        options = [];
      }
      return {
        id: q.id,
        textEn: q.textEn,
        textAr: q.textAr,
        type: q.questionType,
        points: q.points,
        options,
      };
    });

    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      status: attempt.status,
      score: attempt.score,
      isPassed: attempt.isPassed,
      questionsSnapshot: sanitizedSnapshot,
    };
  }

  // Time-Bounded Auto-Grading Pipeline
  static async submitAttempt(
    studentId: string,
    attemptId: string,
    studentAnswers: Array<{ questionId: string; answer: any }>
  ) {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });

    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found');
    }

    if (attempt.studentId !== studentId) {
      throw new BadRequestError('Unauthorized access to attempt');
    }

    if (attempt.status === AssessmentAttemptStatus.SUBMITTED) {
      throw new BadRequestError('Assessment attempt already submitted');
    }

    // Enforce time-bound expiration
    if (new Date() > attempt.expiresAt || attempt.status === AssessmentAttemptStatus.EXPIRED) {
      const expiredAttempt = await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: AssessmentAttemptStatus.EXPIRED,
          submittedAt: new Date(),
          score: 0,
          isPassed: false,
        },
      });
      return { message: 'Exam session expired', status: AssessmentAttemptStatus.EXPIRED, attempt: expiredAttempt };
    }

    let questionsRaw: any[] = [];
    try {
      questionsRaw = JSON.parse(attempt.questionsSnapshotJson);
    } catch (e) {
      questionsRaw = [];
    }

    let earnedPoints = 0;
    let totalMaxPoints = 0;

    const answerMap = new Map<string, any>();
    (studentAnswers || []).forEach((sa) => {
      answerMap.set(sa.questionId, sa.answer);
    });

    questionsRaw.forEach((q) => {
      const qPoints = q.points ?? 10;
      totalMaxPoints += qPoints;

      let correctVal: any = null;
      try {
        correctVal = typeof q.correctAnswerJson === 'string' ? JSON.parse(q.correctAnswerJson) : q.correctAnswerJson;
      } catch (e) {
        correctVal = q.correctAnswerJson;
      }

      const studentVal = answerMap.get(q.id);
      if (studentVal !== undefined && String(studentVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase()) {
        earnedPoints += qPoints;
      }
    });

    const scorePercentage = totalMaxPoints > 0 ? (earnedPoints / totalMaxPoints) * 100 : 0;
    const isPassed = scorePercentage >= attempt.assessment.passingScore;

    const updatedAttempt = await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: AssessmentAttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        score: scorePercentage,
        isPassed,
        studentAnswersJson: JSON.stringify(studentAnswers),
      },
    });

    return {
      message: 'Exam submitted and auto-graded successfully',
      status: AssessmentAttemptStatus.SUBMITTED,
      score: scorePercentage,
      isPassed,
      attempt: updatedAttempt,
    };
  }
}
