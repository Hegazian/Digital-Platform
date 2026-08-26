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

  static async updateSubjectPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const { pricing } = req.body;
      const updatedPricing = await SubjectService.updateSubjectPricing(req.params.id as string, pricing);
      res.status(200).json({ success: true, data: updatedPricing });
    } catch (error) {
      next(error);
    }
  }

  // Course Handlers
  static async getAllCourses(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courses = await CourseService.getAllCourses(req.query, req.user ?? null);
      res.status(200).json({ success: true, data: courses });
    } catch (error) {
      next(error);
    }
  }

  static async getCourseById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const course = await CourseService.getCourseById(req.params.id as string, req.user ?? null);
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

  static async updateCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const role = req.user!.role;
      const course = await CourseService.updateCourse(req.params.id as string, teacherId, req.body, role);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const role = req.user!.role;
      await CourseService.deleteCourse(req.params.id as string, teacherId, role);
      res.status(200).json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async publishCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.userId;
      const role = req.user?.role;
      const course = await CourseService.publishCourse(req.params.id as string, actorId, role);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  // Section Handlers
  static async createSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const section = await SectionService.createSection({ ...req.body, courseId }, req.user ?? null);
      res.status(201).json({ success: true, data: section });
    } catch (error) {
      next(error);
    }
  }

  static async updateSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sectionId = req.params.sectionId as string;
      const section = await SectionService.updateSection(sectionId, req.body, req.user ?? null);
      res.status(200).json({ success: true, data: section });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sectionId = req.params.sectionId as string;
      const result = await SectionService.deleteSection(sectionId, req.user ?? null);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async reorderSections(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const { sections } = req.body;
      const result = await SectionService.reorderSections(courseId, sections || [], req.user ?? null);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getSectionsByCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sections = await SectionService.getSectionsByCourse(
        req.params.courseId as string,
        req.user ?? null
      );
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

  static async deleteSubject(req: Request, res: Response, next: NextFunction) {
    try {
      await SubjectService.deleteSubject(req.params.id as string);
      res.status(200).json({ success: true, message: 'Subject deleted' });
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
      const { decision, rejectionReason } = req.body;
      const course = await CourseService.reviewCourseStatus(req.params.id as string, decision, rejectionReason);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async archiveCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const userRole = req.user!.role;
      const course = await CourseService.archiveCourse(req.params.id as string, teacherId, userRole);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }

  static async enrollCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const result = await CourseService.enrollStudentFree(req.params.id as string, studentId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async createModule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const module = await CourseService.createModule(courseId, req.body, teacherId, role);
      res.status(201).json({ success: true, data: module });
    } catch (error) {
      next(error);
    }
  }

  static async deleteModule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      await CourseService.deleteModule(moduleId, teacherId, role);
      res.status(200).json({ success: true, message: 'Module deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async updateModule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const module = await CourseService.updateModule(moduleId, req.body, teacherId, role);
      res.status(200).json({ success: true, data: module });
    } catch (error) {
      next(error);
    }
  }

  static async createLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const role = req.user?.role;
      const moduleId = req.params.moduleId as string;
      const lesson = await CourseService.createLesson(moduleId, req.body, teacherId, role);
      res.status(201).json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }

  /** Lessons can also hang directly off a section (dual curriculum layout). */
  static async createSectionLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const role = req.user?.role;
      const sectionId = req.params.sectionId as string;
      const lesson = await CourseService.createLesson(null, req.body, teacherId, role, sectionId);
      res.status(201).json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }

  static async attachVideoToLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const role = req.user?.role;
      const lessonId = req.params.lessonId as string;
      const video = await CourseService.attachVideoToLesson(lessonId, req.body, teacherId, role);
      res.status(201).json({ success: true, data: video });
    } catch (error) {
      next(error);
    }
  }

  static async attachMaterialToLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const lessonId = req.params.lessonId as string;
      const material = await CourseService.attachMaterialToLesson(lessonId, req.body, teacherId, role);
      res.status(201).json({ success: true, data: material });
    } catch (error) {
      next(error);
    }
  }

  static async attachQuizToLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const lessonId = req.params.lessonId as string;
      const quiz = await CourseService.attachQuizToLesson(lessonId, req.body, teacherId, role);
      res.status(201).json({ success: true, data: quiz });
    } catch (error) {
      next(error);
    }
  }

  static async deleteLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const lessonId = req.params.lessonId as string;
      await CourseService.deleteLesson(lessonId, teacherId, role);
      res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async updateLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const role = req.user?.role;
      const lessonId = req.params.lessonId as string;
      const lesson = await CourseService.updateLesson(lessonId, req.body, teacherId, role);
      res.status(200).json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }

  static async detachQuizFromLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const lessonId = req.params.lessonId as string;
      const result = await CourseService.detachQuizFromLesson(lessonId, teacherId, role);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async detachVideoFromLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const lessonId = req.params.lessonId as string;
      const result = await CourseService.detachVideoFromLesson(lessonId, teacherId, role);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateLessonBlock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const blockId = req.params.blockId as string;
      const block = await CourseService.updateLessonBlock(blockId, req.body, teacherId, role);
      res.status(200).json({ success: true, data: block });
    } catch (error) {
      next(error);
    }
  }

  static async deleteLessonBlock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const blockId = req.params.blockId as string;
      const result = await CourseService.deleteLessonBlock(blockId, teacherId, role);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async reorderLessons(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const { lessons } = req.body;
      await CourseService.reorderLessons(lessons, teacherId, role);
      res.status(200).json({ success: true, message: 'Lessons reordered successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getTeacherCourses(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // MUST forward the authenticated user: role-scoped visibility in
      // getAllCourses lets teachers see their own drafts/rejected courses.
      // Omitting it made every unpublished course invisible to its owner.
      const result = await CourseService.getAllCourses({}, req.user);
      res.status(200).json({ success: true, data: result.courses || result });
    } catch (error) {
      next(error);
    }
  }

  static async addLessonBlock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const block = await CourseService.addLessonBlock(lessonId, req.body, teacherId, role);
      res.status(201).json({ success: true, data: block });
    } catch (error) {
      next(error);
    }
  }

  static async reorderModules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const { modules } = req.body;
      await CourseService.reorderModules(courseId, modules, teacherId, role);
      res.status(200).json({ success: true, message: 'Modules reordered successfully' });
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

