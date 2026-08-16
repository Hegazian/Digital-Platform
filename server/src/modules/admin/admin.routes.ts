import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const adminRouter = Router();

// All admin routes require authentication + ADMIN role
adminRouter.use(authenticate, requireRole([Role.ADMIN]));

// User management
adminRouter.get('/users', AdminController.getUsers);
adminRouter.patch('/users/:id/active', AdminController.setUserActive);

// Teacher approval workflow
adminRouter.get('/teachers/pending', AdminController.getPendingTeachers);
adminRouter.patch('/teachers/:id/status', AdminController.updateTeacherStatus);

// Platform analytics
adminRouter.get('/stats', AdminController.getStats);

export default adminRouter;
