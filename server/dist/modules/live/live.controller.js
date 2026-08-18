"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveController = void 0;
const live_service_1 = require("./live.service");
class LiveController {
    static async createLiveSession(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const session = await live_service_1.LiveService.createLiveSession({
                teacherId,
                ...req.body,
            });
            res.status(201).json({ success: true, data: session });
        }
        catch (err) {
            next(err);
        }
    }
    static async getSubjectLiveSessions(req, res, next) {
        try {
            const studentId = req.user.userId;
            const { subjectId } = req.params;
            const sessions = await live_service_1.LiveService.getSubjectLiveSessions(studentId, subjectId);
            res.status(200).json({ success: true, data: sessions });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.LiveController = LiveController;
