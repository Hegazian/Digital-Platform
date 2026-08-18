"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentController = void 0;
const parent_service_1 = require("./parent.service");
const errors_1 = require("../../utils/errors");
class ParentController {
    static async requestLinkOtp(req, res, next) {
        try {
            const { studentEmail } = req.body;
            const parentId = req.user.userId;
            if (!studentEmail) {
                throw new errors_1.BadRequestError('studentEmail is required');
            }
            const result = await parent_service_1.ParentService.requestParentLinkOtp(parentId, studentEmail.trim().toLowerCase());
            res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyLinkOtp(req, res, next) {
        try {
            const { studentEmail, otpCode } = req.body;
            const parentId = req.user.userId;
            if (!studentEmail || !otpCode) {
                throw new errors_1.BadRequestError('studentEmail and otpCode are required');
            }
            const result = await parent_service_1.ParentService.verifyParentLinkOtp(parentId, studentEmail.trim().toLowerCase(), otpCode.trim());
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async linkStudent(req, res, next) {
        try {
            const { studentEmail } = req.body;
            const parentId = req.user.userId;
            if (!studentEmail) {
                throw new errors_1.BadRequestError('studentEmail is required');
            }
            const link = await parent_service_1.ParentService.linkStudent(parentId, studentEmail.trim().toLowerCase());
            res.status(201).json({
                success: true,
                data: link,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getChildren(req, res, next) {
        try {
            const parentId = req.user.userId;
            const children = await parent_service_1.ParentService.getChildrenAnalytics(parentId);
            res.status(200).json({
                success: true,
                data: children,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ParentController = ParentController;
