import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { AssignmentService } from './assignment.service';
import { Role } from '@prisma/client';
import { prisma } from '../../prisma';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import path from 'path';
import fs from 'fs';
import { getUploadsRoot, StorageService } from '../../utils/storage';
import { createSubmissionUploadToken } from './submission-upload';

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
          uploadToken: createSubmissionUploadToken(req.user!.userId, fileUrl, file.originalname, file.size),
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

      res.status(200).json({ success: true, data: AssignmentController.protectAssignmentFiles(assignment) });
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
      res.status(200).json({ success: true, data: AssignmentController.protectAssignmentFiles(assignment) });
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
      res.status(200).json({ success: true, data: assignments.map((item: any) => AssignmentController.protectAssignmentFiles(item)) });
    } catch (error) {
      next(error);
    }
  }

  static async submitAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assignmentId = req.params.id as string;
      const studentId = req.user!.userId;

      const submission = await AssignmentService.submitAssignment(assignmentId, studentId, req.body);
      res.status(201).json({ success: true, data: AssignmentController.protectSubmissionFiles(submission) });
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

      res.status(200).json({ success: true, data: AssignmentController.protectSubmissionFiles(graded) });
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

      res.status(200).json({ success: true, data: submissions.map((item: any) => AssignmentController.protectSubmissionFiles(item)) });
    } catch (error) {
      next(error);
    }
  }

  static async getStudentSubmissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const submissions = await AssignmentService.getStudentSubmissionsHistory(studentId);
      res.status(200).json({ success: true, data: submissions.map((item: any) => AssignmentController.protectSubmissionFiles(item)) });
    } catch (error) {
      next(error);
    }
  }

  private static protectAssignmentFiles<T extends object>(assignment: T): T {
    const withSubmissions = assignment as T & { submissions?: Array<any> };
    return { ...withSubmissions, submissions: withSubmissions.submissions?.map((submission) => AssignmentController.protectSubmissionFiles(submission)) } as T;
  }

  private static protectSubmissionFiles<T extends { files?: Array<{ id: string }> }>(submission: T): T {
    return { ...submission, files: submission.files?.map((file) => ({ ...file, fileUrl: `/api/v1/assignments/submission-files/${file.id}/content` })) } as T;
  }

  static async getSubmissionFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = await prisma.assignmentSubmissionFile.findUnique({
        where: { id: req.params.fileId as string },
        include: { submission: { include: { assignment: true } } },
      });
      if (!file) throw new NotFoundError('Submission file not found');
      const allowed = req.user!.role === Role.ADMIN || file.submission.studentId === req.user!.userId || file.submission.assignment.createdById === req.user!.userId;
      if (!allowed) throw new ForbiddenError('You do not have access to this submission file');
      const stored = file.fileUrl;
      if (stored.startsWith('/uploads/')) {
        const root = path.resolve(getUploadsRoot());
        const filePath = path.resolve(root, stored.replace(/^\/uploads\//, ''));
        if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) throw new NotFoundError('Submission file not found');
        const realRoot = fs.realpathSync(root);
        const realFilePath = fs.realpathSync(filePath);
        if (!realFilePath.startsWith(realRoot + path.sep)) throw new NotFoundError('Submission file not found');
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(file.fileName).replace(/["\r\n]/g, '_')}"`);
        return res.sendFile(realFilePath, { dotfiles: 'allow' });
      }
      if (!stored.startsWith('submission-files/')) throw new NotFoundError('Submission file not found');
      res.setHeader('Cache-Control', 'private, no-store');
      return res.redirect(302, await StorageService.getSignedUrl(stored, 120));
    } catch (error) { next(error); }
  }
}
