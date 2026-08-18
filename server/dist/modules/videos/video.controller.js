"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoController = void 0;
const video_service_1 = require("./video.service");
const errors_1 = require("../../utils/errors");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class VideoController {
    /**
     * Handles video upload from teacher.
     */
    static async uploadVideo(req, res, next) {
        try {
            if (!req.file) {
                throw new errors_1.BadRequestError('No video file provided');
            }
            const userId = req.user.userId;
            const video = await video_service_1.VideoService.uploadVideo(userId, req.file.buffer, req.file.originalname, req.file.mimetype, req.file.size);
            res.status(201).json({
                success: true,
                data: video,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Retrieves a secure playback URL for authorized users.
     */
    static async getPlaybackUrl(req, res, next) {
        try {
            const { videoId } = req.params;
            const userId = req.user.userId;
            const secureUrl = await video_service_1.VideoService.getSecurePlaybackUrl(videoId, userId);
            res.status(200).json({
                success: true,
                data: {
                    playbackUrl: secureUrl,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Streams a local video file (chunked) securely using a short-lived token.
     */
    static async streamLocalVideo(req, res, next) {
        try {
            const { videoId } = req.params;
            const { token } = req.query;
            if (!token) {
                throw new errors_1.UnauthorizedError('Stream token is missing');
            }
            const secret = process.env.JWT_SECRET || 'fallback-secret';
            let payload;
            try {
                payload = jsonwebtoken_1.default.verify(token, secret);
            }
            catch (err) {
                throw new errors_1.UnauthorizedError('Invalid or expired stream token');
            }
            if (payload.videoId !== videoId || payload.purpose !== 'stream') {
                throw new errors_1.UnauthorizedError('Invalid token purpose or video mismatch');
            }
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../../prisma')));
            const video = await prisma.video.findUnique({ where: { id: videoId } });
            if (!video || !video.videoUrl || !video.videoUrl.startsWith('/uploads/')) {
                throw new errors_1.BadRequestError('Local video not found');
            }
            // Convert '/uploads/lesson-videos/xxx.mp4' to absolute path
            const filePath = path_1.default.join(process.cwd(), video.videoUrl);
            if (!fs_1.default.existsSync(filePath)) {
                throw new errors_1.BadRequestError('Video file missing from disk');
            }
            const stat = fs_1.default.statSync(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs_1.default.createReadStream(filePath, { start, end });
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                };
                res.writeHead(206, head);
                file.pipe(res);
            }
            else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4',
                };
                res.writeHead(200, head);
                fs_1.default.createReadStream(filePath).pipe(res);
            }
        }
        catch (error) {
            next(error);
        }
    }
}
exports.VideoController = VideoController;
