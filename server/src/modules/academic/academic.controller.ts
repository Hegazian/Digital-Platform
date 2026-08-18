import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { AcademicService } from './academic.service';

export class AcademicController {
  // Educational Stages
  static async createEducationalStage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stage = await AcademicService.createEducationalStage(req.body);
      res.status(201).json({ success: true, data: stage });
    } catch (err) {
      next(err);
    }
  }

  static async getAllEducationalStages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stages = await AcademicService.getAllEducationalStages();
      res.status(200).json({ success: true, data: stages });
    } catch (err) {
      next(err);
    }
  }

  // Grades
  static async createGrade(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const grade = await AcademicService.createGrade(req.body);
      res.status(201).json({ success: true, data: grade });
    } catch (err) {
      next(err);
    }
  }

  static async getGradesByStage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { stageId } = req.params;
      const grades = await AcademicService.getGradesByStage(stageId as string);
      res.status(200).json({ success: true, data: grades });
    } catch (err) {
      next(err);
    }
  }

  // Academic Years
  static async createAcademicYear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = await AcademicService.createAcademicYear(req.body);
      res.status(201).json({ success: true, data: year });
    } catch (err) {
      next(err);
    }
  }

  static async getAllAcademicYears(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const years = await AcademicService.getAllAcademicYears();
      res.status(200).json({ success: true, data: years });
    } catch (err) {
      next(err);
    }
  }

  // Grade - Subject Association
  static async createGradeSubject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const gradeSubject = await AcademicService.createGradeSubject(req.body);
      res.status(201).json({ success: true, data: gradeSubject });
    } catch (err) {
      next(err);
    }
  }

  static async getSubjectsByGrade(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { gradeId } = req.params;
      const subjects = await AcademicService.getSubjectsByGrade(gradeId as string);
      res.status(200).json({ success: true, data: subjects });
    } catch (err) {
      next(err);
    }
  }
}
