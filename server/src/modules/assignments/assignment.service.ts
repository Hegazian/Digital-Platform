import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { Role, AssignmentSubmissionStatus } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';

export class AssignmentService {
  /**
   * Create a new assignment attached to a lesson.
   */
  static async createAssignment(
    lessonId: string,
    teacherId: string,
    userRole: Role,
    data: {
      titleEn: string;
      titleAr?: string;
      description?: string;
      instructions?: string;
      maxScore?: number;
      dueDate?: string | Date | null;
      allowLateSubmission?: boolean;
      maxAttempts?: number;
    }
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: true } },
        section: { include: { course: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const courseTeacherId = lesson.module?.course?.teacherId || lesson.section?.course?.teacherId;
    if (userRole !== Role.ADMIN && courseTeacherId !== teacherId) {
      throw new ForbiddenError('Only the course owner or Admin can create assignments for this lesson');
    }

    const maxScore = data.maxScore !== undefined ? Number(data.maxScore) : 100;
    if (isNaN(maxScore) || maxScore <= 0) {
      throw new BadRequestError('Maximum score must be a positive number');
    }

    let parsedDueDate: Date | null = null;
    if (data.dueDate) {
      parsedDueDate = new Date(data.dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        throw new BadRequestError('Invalid due date format');
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        lessonId,
        createdById: teacherId,
        titleEn: data.titleEn,
        titleAr: data.titleAr || data.titleEn,
        description: data.description,
        instructions: data.instructions,
        maxScore,
        dueDate: parsedDueDate,
        allowLateSubmission: data.allowLateSubmission !== undefined ? Boolean(data.allowLateSubmission) : true,
        maxAttempts: data.maxAttempts != null && Number.isFinite(Number(data.maxAttempts))
          ? Math.max(1, Math.floor(Number(data.maxAttempts)))
          : 1,
      },
    });

    return assignment;
  }

  /**
   * Update an existing assignment.
   */
  static async updateAssignment(
    assignmentId: string,
    teacherId: string,
    userRole: Role,
    data: {
      titleEn?: string;
      titleAr?: string;
      description?: string;
      instructions?: string;
      maxScore?: number;
      dueDate?: string | Date | null;
      allowLateSubmission?: boolean;
      maxAttempts?: number;
    }
  ) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (userRole !== Role.ADMIN && assignment.createdById !== teacherId) {
      throw new ForbiddenError('Only the creator or Admin can update this assignment');
    }

    if (data.maxScore !== undefined) {
      const maxScore = Number(data.maxScore);
      if (isNaN(maxScore) || maxScore <= 0) {
        throw new BadRequestError('Maximum score must be a positive number');
      }
    }

    let parsedDueDate: Date | null | undefined = undefined;
    if (data.dueDate !== undefined) {
      if (data.dueDate === null) {
        parsedDueDate = null;
      } else {
        parsedDueDate = new Date(data.dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          throw new BadRequestError('Invalid due date format');
        }
      }
    }

    return await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(data.titleEn && { titleEn: data.titleEn }),
        ...(data.titleAr && { titleAr: data.titleAr }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
        ...(data.maxScore !== undefined && { maxScore: Number(data.maxScore) }),
        ...(parsedDueDate !== undefined && { dueDate: parsedDueDate }),
        ...(data.allowLateSubmission !== undefined && { allowLateSubmission: Boolean(data.allowLateSubmission) }),
        ...(data.maxAttempts !== undefined && {
          maxAttempts: Number.isFinite(Number(data.maxAttempts))
            ? Math.max(1, Math.floor(Number(data.maxAttempts)))
            : 1,
        }),
      },
    });
  }

  /**
   * Delete an assignment.
   */
  static async deleteAssignment(assignmentId: string, teacherId: string, userRole: Role) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (userRole !== Role.ADMIN && assignment.createdById !== teacherId) {
      throw new ForbiddenError('Only the creator or Admin can delete this assignment');
    }

    await prisma.assignment.delete({ where: { id: assignmentId } });
    return { success: true, message: 'Assignment deleted successfully' };
  }

  /**
   * Get assignment by ID.
   */
  static async getAssignmentById(assignmentId: string, userId?: string, userRole?: Role) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: userId && userRole === Role.STUDENT ? {
          where: { studentId: userId },
          include: { files: true },
          orderBy: { submittedAt: 'desc' },
        } : false,
      },
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    return assignment;
  }

  /**
   * Get all assignments for a lesson.
   */
  static async getAssignmentsByLesson(lessonId: string, userId?: string, userRole?: Role) {
    return await prisma.assignment.findMany({
      where: { lessonId },
      include: {
        submissions: userId && userRole === Role.STUDENT ? {
          where: { studentId: userId },
          include: { files: true },
          orderBy: { submittedAt: 'desc' },
        } : false,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Submit an assignment response (student).
   */
  static async submitAssignment(
    assignmentId: string,
    studentId: string,
    data: {
      submissionText?: string;
      files?: Array<{ fileUrl: string; fileName: string; sizeBytes?: number }>;
    }
  ) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (!data.submissionText && (!data.files || data.files.length === 0)) {
      throw new BadRequestError('Submission must contain text or at least one file attachment');
    }

    // Check attempt limit
    const existingSubmissionsCount = await prisma.assignmentSubmission.count({
      where: { assignmentId, studentId },
    });

    if (existingSubmissionsCount >= assignment.maxAttempts) {
      throw new ForbiddenError(`Maximum submission attempts (${assignment.maxAttempts}) reached`);
    }

    // Deadline check
    const now = new Date();
    let status: AssignmentSubmissionStatus = AssignmentSubmissionStatus.SUBMITTED;

    if (assignment.dueDate && now > assignment.dueDate) {
      if (!assignment.allowLateSubmission) {
        throw new BadRequestError('Assignment deadline has passed and late submissions are not allowed');
      }
      status = AssignmentSubmissionStatus.LATE;
    }

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId,
        submissionText: data.submissionText,
        status,
        submittedAt: now,
        files: data.files && data.files.length > 0 ? {
          create: data.files.map((f) => ({
            fileUrl: f.fileUrl,
            fileName: f.fileName,
            sizeBytes: f.sizeBytes || 0,
          })),
        } : undefined,
      },
      include: {
        files: true,
      },
    });

    return submission;
  }

  /**
   * Grade an assignment submission (teacher / admin).
   */
  static async gradeSubmission(
    submissionId: string,
    gradedById: string,
    userRole: Role,
    data: { score: number; feedback?: string }
  ) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
      },
    });

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    // Ownership check: must be admin or the creator of the assignment
    if (userRole !== Role.ADMIN && submission.assignment.createdById !== gradedById) {
      throw new ForbiddenError('Only the assigned course teacher or Admin can grade this submission');
    }

    const score = Number(data.score);
    if (isNaN(score) || score < 0) {
      throw new BadRequestError('Score must be a non-negative number');
    }

    if (score > submission.assignment.maxScore) {
      throw new BadRequestError(`Score cannot exceed maximum score of ${submission.assignment.maxScore}`);
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback: data.feedback || null,
        status: AssignmentSubmissionStatus.GRADED,
        gradedById,
        gradedAt: new Date(),
      },
      include: {
        files: true,
        assignment: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit logging
    await logAuditAction(
      gradedById,
      'ASSIGNMENT_GRADED',
      submissionId,
      'AssignmentSubmission',
      { score, maxScore: submission.assignment.maxScore, studentId: submission.studentId }
    );

    return updated;
  }

  /**
   * Get all submissions for an assignment (teacher review).
   */
  static async getSubmissionsByAssignment(assignmentId: string, teacherId: string, userRole: Role) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (userRole !== Role.ADMIN && assignment.createdById !== teacherId) {
      throw new ForbiddenError('Only the course instructor or Admin can view all submissions');
    }

    return await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        files: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get student's assignment submissions history.
   */
  static async getStudentSubmissionsHistory(studentId: string) {
    return await prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: {
        assignment: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            maxScore: true,
            dueDate: true,
          },
        },
        files: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
