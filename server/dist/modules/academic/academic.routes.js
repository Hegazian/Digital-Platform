"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const academic_controller_1 = require("./academic.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const academicRouter = (0, express_1.Router)();
// Public read routes
academicRouter.get('/stages', academic_controller_1.AcademicController.getAllEducationalStages);
academicRouter.get('/stages/:stageId/grades', academic_controller_1.AcademicController.getGradesByStage);
academicRouter.get('/years', academic_controller_1.AcademicController.getAllAcademicYears);
academicRouter.get('/grades/:gradeId/subjects', academic_controller_1.AcademicController.getSubjectsByGrade);
// Admin-only creation routes
academicRouter.post('/stages', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), academic_controller_1.AcademicController.createEducationalStage);
academicRouter.post('/grades', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), academic_controller_1.AcademicController.createGrade);
academicRouter.post('/years', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), academic_controller_1.AcademicController.createAcademicYear);
academicRouter.post('/grade-subjects', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), academic_controller_1.AcademicController.createGradeSubject);
exports.default = academicRouter;
