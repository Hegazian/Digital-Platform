"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("./admin.service");
const errors_1 = require("../../utils/errors");
class AdminController {
    /**
     * GET /api/v1/admin/users
     * Query params: role, teacherStatus, search, page, limit
     */
    static async getUsers(req, res, next) {
        try {
            const { role, teacherStatus, search, page, limit } = req.query;
            const result = await admin_service_1.AdminService.getAllUsers({
                role: role,
                teacherStatus: teacherStatus,
                search: search,
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 20,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/admin/teachers/pending
     */
    static async getPendingTeachers(req, res, next) {
        try {
            const teachers = await admin_service_1.AdminService.getPendingTeachers();
            res.status(200).json({ success: true, data: teachers });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /api/v1/admin/teachers/:id/status
     * Body: { status: "APPROVED" | "REJECTED" }
     */
    static async updateTeacherStatus(req, res, next) {
        try {
            const { id } = req.params;
            console.log('updateTeacherStatus req.body:', req.body);
            const { status } = req.body;
            if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
                throw new errors_1.BadRequestError('status must be "APPROVED" or "REJECTED"');
            }
            const updated = await admin_service_1.AdminService.updateTeacherStatus(id, status);
            res.status(200).json({
                success: true,
                message: `Teacher ${status.toLowerCase()} successfully`,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /api/v1/admin/users/:id/active
     * Body: { isActive: boolean }
     */
    static async setUserActive(req, res, next) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            if (typeof isActive !== 'boolean') {
                throw new errors_1.BadRequestError('isActive must be a boolean');
            }
            const updated = await admin_service_1.AdminService.setUserActiveStatus(id, isActive);
            res.status(200).json({
                success: true,
                message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/admin/stats
     */
    static async getStats(req, res, next) {
        try {
            const stats = await admin_service_1.AdminService.getPlatformStats();
            res.status(200).json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AdminController = AdminController;
