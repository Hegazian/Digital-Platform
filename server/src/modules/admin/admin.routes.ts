import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { validateBody, validateQuery } from '../../utils/validate';
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  setUserActiveSchema,
  teacherStatusSchema,
  updateAcademicYearSchema,
  getUsersQuerySchema,
} from '../../utils/schemas';
import { Role } from '@prisma/client';

const adminRouter = Router();

// All admin routes require authentication + ADMIN role
adminRouter.use(authenticate, requireRole([Role.ADMIN]));

// User management
adminRouter.get('/users', validateQuery(getUsersQuerySchema), AdminController.getUsers);
adminRouter.post('/users', validateBody(createAdminUserSchema), AdminController.createUser);
adminRouter.patch('/users/:id', validateBody(updateAdminUserSchema), AdminController.updateUser);
adminRouter.patch('/users/:id/active', validateBody(setUserActiveSchema), AdminController.setUserActive);

// Academic year management
adminRouter.patch(
  '/academic-years/:id',
  validateBody(updateAcademicYearSchema),
  AdminController.updateAcademicYear
);

// Teacher approval workflow
adminRouter.get('/teachers/pending', AdminController.getPendingTeachers);
adminRouter.patch('/teachers/:id/status', validateBody(teacherStatusSchema), AdminController.updateTeacherStatus);

// Platform analytics
adminRouter.get('/stats', AdminController.getStats);

export default adminRouter;
