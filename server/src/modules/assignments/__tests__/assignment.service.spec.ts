import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { AssignmentService } from '../assignment.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../utils/errors';
import { Role, AssignmentSubmissionStatus } from '@prisma/client';

vi.mock('../../../prisma', () => ({
  prisma: {
    lesson: {
      findUnique: vi.fn(),
    },
    assignment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    assignmentSubmission: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  },
}));

describe('AssignmentService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAssignment', () => {
    it('should create an assignment when user is course owner', async () => {
      const mockLesson = {
        id: 'lesson-1',
        module: { course: { teacherId: 'teacher-1' } },
      };
      const mockCreated = {
        id: 'assign-1',
        lessonId: 'lesson-1',
        createdById: 'teacher-1',
        titleEn: 'Math Homework 1',
        maxScore: 100,
      };

      (prisma.lesson.findUnique as any).mockResolvedValue(mockLesson);
      (prisma.assignment.create as any).mockResolvedValue(mockCreated);

      const result = await AssignmentService.createAssignment(
        'lesson-1',
        'teacher-1',
        Role.TEACHER,
        { titleEn: 'Math Homework 1', maxScore: 100 }
      );

      expect(result).toEqual(mockCreated);
      expect(prisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            titleEn: 'Math Homework 1',
            maxScore: 100,
          }),
        })
      );
    });

    it('should throw ForbiddenError if teacher does not own the course', async () => {
      const mockLesson = {
        id: 'lesson-1',
        module: { course: { teacherId: 'other-teacher' } },
      };
      (prisma.lesson.findUnique as any).mockResolvedValue(mockLesson);

      await expect(
        AssignmentService.createAssignment('lesson-1', 'teacher-1', Role.TEACHER, {
          titleEn: 'Math Homework 1',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError if maxScore is 0 or negative', async () => {
      const mockLesson = {
        id: 'lesson-1',
        module: { course: { teacherId: 'teacher-1' } },
      };
      (prisma.lesson.findUnique as any).mockResolvedValue(mockLesson);

      await expect(
        AssignmentService.createAssignment('lesson-1', 'teacher-1', Role.TEACHER, {
          titleEn: 'Math Homework 1',
          maxScore: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('submitAssignment', () => {
    it('should submit on time with status SUBMITTED', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockAssignment = {
        id: 'assign-1',
        dueDate: futureDate,
        allowLateSubmission: true,
        maxAttempts: 1,
      };

      (prisma.assignment.findUnique as any).mockResolvedValue(mockAssignment);
      (prisma.assignmentSubmission.count as any).mockResolvedValue(0);
      (prisma.assignmentSubmission.create as any).mockResolvedValue({
        id: 'sub-1',
        status: AssignmentSubmissionStatus.SUBMITTED,
      });

      const result = await AssignmentService.submitAssignment('assign-1', 'student-1', {
        submissionText: 'My answers here',
      });

      expect(result.status).toBe(AssignmentSubmissionStatus.SUBMITTED);
      expect(prisma.assignmentSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssignmentSubmissionStatus.SUBMITTED,
          }),
        })
      );
    });

    it('should submit late with status LATE when allowLateSubmission is true', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      const mockAssignment = {
        id: 'assign-1',
        dueDate: pastDate,
        allowLateSubmission: true,
        maxAttempts: 1,
      };

      (prisma.assignment.findUnique as any).mockResolvedValue(mockAssignment);
      (prisma.assignmentSubmission.count as any).mockResolvedValue(0);
      (prisma.assignmentSubmission.create as any).mockResolvedValue({
        id: 'sub-1',
        status: AssignmentSubmissionStatus.LATE,
      });

      const result = await AssignmentService.submitAssignment('assign-1', 'student-1', {
        submissionText: 'Late submission',
      });

      expect(result.status).toBe(AssignmentSubmissionStatus.LATE);
    });

    it('should throw BadRequestError if deadline passed and allowLateSubmission is false', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      const mockAssignment = {
        id: 'assign-1',
        dueDate: pastDate,
        allowLateSubmission: false,
        maxAttempts: 1,
      };

      (prisma.assignment.findUnique as any).mockResolvedValue(mockAssignment);
      (prisma.assignmentSubmission.count as any).mockResolvedValue(0);

      await expect(
        AssignmentService.submitAssignment('assign-1', 'student-1', {
          submissionText: 'Late submission',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ForbiddenError if max attempts exceeded', async () => {
      const mockAssignment = {
        id: 'assign-1',
        dueDate: null,
        maxAttempts: 1,
      };

      (prisma.assignment.findUnique as any).mockResolvedValue(mockAssignment);
      (prisma.assignmentSubmission.count as any).mockResolvedValue(1);

      await expect(
        AssignmentService.submitAssignment('assign-1', 'student-1', {
          submissionText: 'Second attempt',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('gradeSubmission', () => {
    it('should grade submission when user is assignment creator', async () => {
      const mockSubmission = {
        id: 'sub-1',
        studentId: 'student-1',
        assignment: {
          id: 'assign-1',
          createdById: 'teacher-1',
          maxScore: 100,
        },
      };

      (prisma.assignmentSubmission.findUnique as any).mockResolvedValue(mockSubmission);
      (prisma.assignmentSubmission.update as any).mockResolvedValue({
        id: 'sub-1',
        score: 95,
        feedback: 'Excellent work!',
        status: AssignmentSubmissionStatus.GRADED,
      });

      const result = await AssignmentService.gradeSubmission(
        'sub-1',
        'teacher-1',
        Role.TEACHER,
        { score: 95, feedback: 'Excellent work!' }
      );

      expect(result.score).toBe(95);
      expect(result.status).toBe(AssignmentSubmissionStatus.GRADED);
    });

    it('should throw BadRequestError if score exceeds maxScore', async () => {
      const mockSubmission = {
        id: 'sub-1',
        assignment: {
          id: 'assign-1',
          createdById: 'teacher-1',
          maxScore: 100,
        },
      };

      (prisma.assignmentSubmission.findUnique as any).mockResolvedValue(mockSubmission);

      await expect(
        AssignmentService.gradeSubmission('sub-1', 'teacher-1', Role.TEACHER, {
          score: 105,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ForbiddenError if another teacher attempts to grade', async () => {
      const mockSubmission = {
        id: 'sub-1',
        assignment: {
          id: 'assign-1',
          createdById: 'teacher-1',
          maxScore: 100,
        },
      };

      (prisma.assignmentSubmission.findUnique as any).mockResolvedValue(mockSubmission);

      await expect(
        AssignmentService.gradeSubmission('sub-1', 'teacher-2', Role.TEACHER, {
          score: 80,
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
