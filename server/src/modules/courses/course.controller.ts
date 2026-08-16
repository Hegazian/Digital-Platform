import { Request, Response, NextFunction } from 'express';
import { SubjectService } from './subject.service';
import { CourseService } from './course.service';
import { SectionService } from './section.service';

export class CourseController {
  // Subject Handlers
  static async getAllSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const subjects = await SubjectService.getAllSubjects();
      res.status(200).json({ success: true, data: subjects });
    } catch (error) {
      next(error);
    }
  }

  static async createSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const subject = await SubjectService.createSubject(req.body);
      res.status(201).json({ success: true, data: subject });
    } catch (error) {
      next(error);
    }
  }

  // Course Handlers
  static async getAllCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const courses = await CourseService.getAllCourses(req.query);
      res.status(200).json({ success: true, data: courses });
    } catch (error) {
      next(error);
    }
  }

  static async getCourseById(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await CourseService.getCourseById(req.params.id);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = (req as any).user.userId;
      const course = await CourseService.createCourse({ ...req.body, teacherId });
      res.status(201).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async publishCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = (req as any).user.userId;
      const course = await CourseService.publishCourse(req.params.id, teacherId);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  // Section Handlers
  static async createSection(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId;
      const section = await SectionService.createSection({ ...req.body, courseId });
      res.status(201).json({ success: true, data: section });
    } catch (error) {
      next(error);
    }
  }
}
