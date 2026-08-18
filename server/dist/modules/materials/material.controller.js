"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialController = void 0;
const material_service_1 = require("./material.service");
const errors_1 = require("../../utils/errors");
class MaterialController {
    static async uploadMaterial(req, res, next) {
        try {
            if (!req.file) {
                throw new errors_1.BadRequestError('No file uploaded');
            }
            const { lessonId, title } = req.body;
            const { userId, role } = req.user;
            const material = await material_service_1.MaterialService.uploadMaterial({
                lessonId,
                title: title || req.file.originalname,
                fileBuffer: req.file.buffer,
                fileName: req.file.originalname,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                userId,
                userRole: role,
            });
            res.status(201).json({ success: true, data: material });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMaterialsByLesson(req, res, next) {
        try {
            const { lessonId } = req.params;
            const { userId, role } = req.user;
            const materials = await material_service_1.MaterialService.getMaterialsByLesson(lessonId, userId, role);
            res.status(200).json({ success: true, data: materials });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteMaterial(req, res, next) {
        try {
            const { id } = req.params;
            const { userId, role } = req.user;
            const result = await material_service_1.MaterialService.deleteMaterial(id, userId, role);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MaterialController = MaterialController;
