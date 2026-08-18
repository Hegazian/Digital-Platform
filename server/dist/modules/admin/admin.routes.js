"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("./admin.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const adminRouter = (0, express_1.Router)();
// All admin routes require authentication + ADMIN role
adminRouter.use(auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]));
// User management
adminRouter.get('/users', admin_controller_1.AdminController.getUsers);
adminRouter.patch('/users/:id/active', admin_controller_1.AdminController.setUserActive);
// Teacher approval workflow
adminRouter.get('/teachers/pending', admin_controller_1.AdminController.getPendingTeachers);
adminRouter.patch('/teachers/:id/status', admin_controller_1.AdminController.updateTeacherStatus);
// Platform analytics
adminRouter.get('/stats', admin_controller_1.AdminController.getStats);
exports.default = adminRouter;
