import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { AssignmentService } from './assignment.service';
import { Role } from '@prisma/client';

export class AssignmentController {
  /**
   * POST /api/v1/assignments/uploads — student submission file upload.
   * Returns a hosted fileUrl to attach in POST /:id/submit.
   */
  static async uploadSubmissionFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const { StorageService } = await import('../../utils/storage');
      const fileUrl = await StorageService.uploadFile(
        file.buffer,
        file.originalname || 'submission',
        file.mimetype || 'application/octet-stream',
        'submission-files'
      );

      res.status(201).json({
        success: true,
        data: {
          fileUrl,
          fileName: file.originalname,
          sizeBytes: file.size,
          mimeType: file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const teacherId = req.user!.userId;
      const userRole = req.user!.role as Role;

      const assignment = await AssignmentService.createAssignment(
        lessonId,
        teacherId,
        userRole,
        req.body
      );

      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  static async updateAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assignmentId = req.params.id as string;
      const teacherId = req.user!.userId;
      const userRole = req.user!.role as Role;

      const assignment = await AssignmentService.updateAssignment(
        assignmentId,
        teacherId,
        userRole,
        req.body
      );

      res.status(200).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assignmentId = req.params.id as string;
      const teacherId = req.user!.userId;
      const userRole = req.user!.role as Role;

      const result = await AssignmentService.deleteAssignment(assignmentId, teacherId, userRole);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getAssignmentById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assignmentId = req.params.id as string;
      const userId = req.user?.userId;
      const userRole = req.user?.role as Role;

      const assignment = await AssignmentService.getAssignmentById(assignmentId, userId, userRole);
      res.status(200).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  static async getAssignmentsByLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const userId = req.user?.userId;
      const userRole = req.user?.role as Role;

      const assignments = await AssignmentService.getAssignmentsByLesson(lessonId, userId, userRole);
      res.status(200).json({ success: true, data: assignments });
    } catch (error) {
      next(error);
    }
  }

  static async submitAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assignmentId = req.params.id as string;
      const studentId = req.user!.userId;

      const submission = await AssignmentService.submitAssignment(assignmentId, studentId, req.body);
      res.status(201).json({ success: true, data: submission });
    } catch (error) {
      next(error);
    }
  }

  static async gradeSubmission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const submissionId = req.params.submissionId as string;
      const teacherId = req.user!.userId;
      const userRole = req.user!.role as Role;

      const graded = await AssignmentService.gradeSubmission(
        submissionId,
        teacherId,
        userRole,
        req.body
      );

      res.status(200).json({ success: true, data: graded });
    } catch (error) {
      next(error);
    }
  }

  static async getSubmissionsByAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assignmentId = req.params.id as string;
      const teacherId = req.user!.userId;
      const userRole = req.user!.role as Role;

      const submissions = await AssignmentService.getSubmissionsByAssignment(
        assignmentId,
        teacherId,
        userRole
      );

      res.status(200).json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  }

  static async getStudentSubmissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const submissions = await AssignmentService.getStudentSubmissionsHistory(studentId);
      res.status(200).json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  }
}
