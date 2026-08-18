"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const material_controller_1 = require("./material.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});
const materialRouter = (0, express_1.Router)();
// Teacher routes
materialRouter.post('/upload', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, upload.single('file'), material_controller_1.MaterialController.uploadMaterial);
materialRouter.delete('/:id', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, material_controller_1.MaterialController.deleteMaterial);
// Student / Access route
materialRouter.get('/lesson/:lessonId', auth_middleware_1.authenticate, material_controller_1.MaterialController.getMaterialsByLesson);
exports.default = materialRouter;
