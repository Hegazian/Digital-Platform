"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressController = void 0;
const progress_service_1 = require("./progress.service");
const errors_1 = require("../../utils/errors");
class ProgressController {
    static async updateWatchTime(req, res, next) {
        try {
            const { lessonId } = req.params;
            const { watchTimeDeltaSec } = req.body;
            const userId = req.user.userId;
            if (typeof watchTimeDeltaSec !== 'number') {
                throw new errors_1.BadRequestError('watchTimeDeltaSec must be a number');
            }
            const progress = await progress_service_1.ProgressService.updateWatchTime(userId, lessonId, watchTimeDeltaSec);
            res.status(200).json({
                success: true,
                data: progress,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async markCompleted(req, res, next) {
        try {
            const { lessonId } = req.params;
            const userId = req.user.userId;
            const progress = await progress_service_1.ProgressService.markCompleted(userId, lessonId);
            res.status(200).json({
                success: true,
                data: progress,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSummary(req, res, next) {
        try {
            const userId = req.user.userId;
            const summary = await progress_service_1.ProgressService.getStudentProgressSummary(userId);
            res.status(200).json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProgressController = ProgressController;
