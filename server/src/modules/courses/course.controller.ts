import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
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
      const course = await CourseService.getCourseById(req.params.id as string);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async createCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const course = await CourseService.createCourse({ ...req.body, teacherId });
      res.status(201).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async publishCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const course = await CourseService.publishCourse(req.params.id as string, teacherId);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  // Section Handlers
  static async createSection(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const section = await SectionService.createSection({ ...req.body, courseId });
      res.status(201).json({ success: true, data: section });
    } catch (error) {
      next(error);
    }
  }

  static async getSectionsByCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const sections = await SectionService.getSectionsByCourse(req.params.courseId as string);
      res.status(200).json({ success: true, data: sections });
    } catch (error) {
      next(error);
    }
  }

  static async getSubjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const subject = await SubjectService.getSubjectById(req.params.id as string);
      res.status(200).json({ success: true, data: subject });
    } catch (error) {
      next(error);
    }
  }

  static async updateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const subject = await SubjectService.updateSubject(req.params.id as string, req.body);
      res.status(200).json({ success: true, data: subject });
    } catch (error) {
      next(error);
    }
  }

  // Teacher Studio & Lifecycle Handlers
  static async submitCourseForReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const course = await CourseService.submitCourseForReview(req.params.id as string, teacherId);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async reviewCourseStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { decision } = req.body;
      const course = await CourseService.reviewCourseStatus(req.params.id as string, decision);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async createModule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const module = await CourseService.createModule(courseId, req.body);
      res.status(201).json({ success: true, data: module });
    } catch (error) {
      next(error);
    }
  }

  static async deleteModule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      await CourseService.deleteModule(moduleId);
      res.status(200).json({ success: true, message: 'Module deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async createLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const moduleId = req.params.moduleId as string;
      const lesson = await CourseService.createLesson(moduleId, req.body, teacherId);
      res.status(201).json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }

  static async attachVideoToLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const lessonId = req.params.lessonId as string;
      const video = await CourseService.attachVideoToLesson(lessonId, req.body, teacherId);
      res.status(201).json({ success: true, data: video });
    } catch (error) {
      next(error);
    }
  }

  static async attachMaterialToLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const material = await CourseService.attachMaterialToLesson(lessonId, req.body);
      res.status(201).json({ success: true, data: material });
    } catch (error) {
      next(error);
    }
  }

  static async attachQuizToLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const quiz = await CourseService.attachQuizToLesson(lessonId, req.body);
      res.status(201).json({ success: true, data: quiz });
    } catch (error) {
      next(error);
    }
  }

  static async deleteLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      await CourseService.deleteLesson(lessonId);
      res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async addLessonBlock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const block = await CourseService.addLessonBlock(lessonId, req.body);
      res.status(201).json({ success: true, data: block });
    } catch (error) {
      next(error);
    }
  }

  static async reorderModules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const { modules } = req.body;
      await CourseService.reorderModules(courseId, modules);
      res.status(200).json({ success: true, message: 'Modules reordered successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async gradeAssignmentSubmission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const submissionId = req.params.submissionId as string;
      const graded = await CourseService.gradeAssignmentSubmission(submissionId, teacherId, req.body);
      res.status(200).json({ success: true, data: graded });
    } catch (error) {
      next(error);
    }
  }

  static async getTeacherDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const stats = await CourseService.getTeacherDashboardStats(teacherId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

