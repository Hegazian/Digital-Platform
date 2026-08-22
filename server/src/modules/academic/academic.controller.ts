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

  static async updateEducationalStage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stage = await AcademicService.updateEducationalStage(req.params.stageId as string, req.body);
      res.status(200).json({ success: true, data: stage });
    } catch (err) {
      next(err);
    }
  }

  static async deleteEducationalStage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await AcademicService.deleteEducationalStage(req.params.stageId as string);
      res.status(200).json({ success: true, message: 'Educational stage deleted' });
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

  static async updateGrade(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const grade = await AcademicService.updateGrade(req.params.gradeId as string, req.body);
      res.status(200).json({ success: true, data: grade });
    } catch (err) {
      next(err);
    }
  }

  static async deleteGrade(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await AcademicService.deleteGrade(req.params.gradeId as string);
      res.status(200).json({ success: true, message: 'Grade deleted' });
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

  static async updateAcademicYear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = await AcademicService.updateAcademicYear(req.params.yearId as string, req.body);
      res.status(200).json({ success: true, data: year });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAcademicYear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await AcademicService.deleteAcademicYear(req.params.yearId as string);
      res.status(200).json({ success: true, message: 'Academic year deleted' });
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

  static async getGradeSubjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { gradeId, academicYearId } = req.query;
      const associations = await AcademicService.getGradeSubjects({
        gradeId: gradeId as string | undefined,
        academicYearId: academicYearId as string | undefined,
      });
      res.status(200).json({ success: true, data: associations });
    } catch (err) {
      next(err);
    }
  }

  static async updateGradeSubject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const association = await AcademicService.updateGradeSubject(req.params.id as string, req.body);
      res.status(200).json({ success: true, data: association });
    } catch (err) {
      next(err);
    }
  }

  static async deleteGradeSubject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await AcademicService.deleteGradeSubject(req.params.id as string);
      res.status(200).json({ success: true, message: 'Grade-subject association removed' });
    } catch (err) {
      next(err);
    }
  }
}
