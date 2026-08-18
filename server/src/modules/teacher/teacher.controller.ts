import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { TeacherService } from './teacher.service';

export class TeacherController {
  static async getEnrolledStudents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const students = await TeacherService.getEnrolledStudents(teacherId);
      res.status(200).json({ success: true, data: students });
    } catch (err) {
      next(err);
    }
  }

  static async getStudentProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const { studentId } = req.params;
      const progress = await TeacherService.getStudentProgress(teacherId, studentId as string);
      res.status(200).json({ success: true, data: progress });
    } catch (err) {
      next(err);
    }
  }

  static async broadcastAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const result = await TeacherService.broadcastAnnouncement({
        teacherId,
        ...req.body,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getRevenueSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const summary = await TeacherService.getRevenueSummary(teacherId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
}
