"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApprovedTeacher = exports.requireRole = exports.authenticate = void 0;
const jwt_1 = require("../../utils/jwt");
const errors_1 = require("../../utils/errors");
const client_1 = require("@prisma/client");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new errors_1.UnauthorizedError('Missing or invalid authorization header'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            teacherStatus: decoded.teacherStatus
        };
        next();
    }
    catch (error) {
        return next(new errors_1.UnauthorizedError('Invalid or expired token'));
    }
};
exports.authenticate = authenticate;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError('Not authenticated'));
        }
        if (req.user.role === client_1.Role.ADMIN) {
            return next(); // Admins bypass role checks
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new errors_1.ForbiddenError('You do not have permission to access this resource'));
        }
        next();
    };
};
exports.requireRole = requireRole;
const requireApprovedTeacher = (req, res, next) => {
    if (!req.user) {
        return next(new errors_1.UnauthorizedError('Not authenticated'));
    }
    if (req.user.role === client_1.Role.ADMIN) {
        return next();
    }
    if (req.user.role !== client_1.Role.TEACHER) {
        return next(new errors_1.ForbiddenError('Only teachers can perform this action'));
    }
    // To check teacherStatus properly, we typically add it to JWT or fetch from DB.
    if (req.user.teacherStatus !== client_1.TeacherStatus.APPROVED) {
        return next(new errors_1.ForbiddenError('Teacher account must be approved to perform this action'));
    }
    next();
};
exports.requireApprovedTeacher = requireApprovedTeacher;
