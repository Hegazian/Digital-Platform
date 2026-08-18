"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const video_controller_1 = require("./video.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Configure multer for memory storage (we upload to Supabase or handle local storage inside the service)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB limit
    },
});
// Upload endpoint (Approved Teachers Only)
router.post('/upload', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, upload.single('file'), video_controller_1.VideoController.uploadVideo);
// Playback & Security endpoints (Authenticated Users with Entitlement Check)
router.get('/:videoId/playback-url', auth_middleware_1.authenticate, video_controller_1.VideoController.getPlaybackUrl);
router.get('/:videoId/stream', video_controller_1.VideoController.streamLocalVideo); // Token is passed in query for this one
exports.default = router;
