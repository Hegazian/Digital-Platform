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
exports.VideoService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
const client_1 = require("@prisma/client");
const storage_1 = require("../../utils/storage");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class VideoService {
    /**
     * Upload a video to Supabase Storage (or local fallback) and create a record.
     */
    static async uploadVideo(teacherId, fileBuffer, fileName, mimeType, sizeBytes) {
        // 1. Upload to storage bucket "lesson-videos"
        const videoUrl = await storage_1.StorageService.uploadFile(fileBuffer, fileName, mimeType, 'lesson-videos');
        // 2. Create database record
        return await prisma_1.prisma.video.create({
            data: {
                teacherId,
                videoUrl,
                originalFileName: fileName,
                sizeBytes,
                status: client_1.VideoStatus.READY, // MP4s are ready immediately
            },
        });
    }
    /**
     * Verifies if a given user has legitimate entitlement to play this video.
     * Entitlement is granted if:
     * 1. The user is an ADMIN or the TEACHER who owns the course.
     * 2. The video is attached to a lesson in a section flagged as `isFreePreview = true`.
     * 3. The user is a STUDENT with an active `Subscription` for the course's subject.
     */
    static async verifyPlaybackAccess(videoId, userId) {
        const video = await prisma_1.prisma.video.findUnique({
            where: { id: videoId },
            include: {
                lesson: {
                    include: {
                        section: {
                            include: {
                                course: true,
                            },
                        },
                    },
                },
            },
        });
        if (!video) {
            throw new errors_1.NotFoundError('Video not found');
        }
        // Owner or admin bypass
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (user && (user.role === 'ADMIN' || video.teacherId === userId)) {
            return true;
        }
        // If attached to a free preview section
        if (video.lesson?.section?.isFreePreview) {
            return true;
        }
        // Check active entitlement or subscription via EntitlementResolver
        const courseId = video.lesson?.section?.courseId;
        const subjectId = video.lesson?.section?.course?.subjectId;
        if (courseId || subjectId) {
            const { EntitlementResolver } = await Promise.resolve().then(() => __importStar(require('../commerce/entitlement-resolver.service')));
            if (courseId && (await EntitlementResolver.hasCourseAccess(userId, courseId))) {
                return true;
            }
            if (subjectId && (await EntitlementResolver.hasSubjectAccess(userId, subjectId))) {
                return true;
            }
        }
        return false;
    }
    /**
     * Returns a secure, short-lived playback URL for the video.
     */
    static async getSecurePlaybackUrl(videoId, userId) {
        const hasAccess = await this.verifyPlaybackAccess(videoId, userId);
        if (!hasAccess) {
            throw new errors_1.ForbiddenError('You do not have access to play this video. Active subscription required.');
        }
        const video = await prisma_1.prisma.video.findUnique({ where: { id: videoId } });
        if (!video || !video.videoUrl) {
            throw new errors_1.NotFoundError('Video file not found');
        }
        if (video.videoUrl.startsWith('/uploads/')) {
            // Local fallback: generate a short-lived JWT token that the frontend can use to hit our streaming endpoint
            const secret = process.env.JWT_SECRET || 'fallback-secret';
            const token = jsonwebtoken_1.default.sign({ videoId, userId, purpose: 'stream' }, secret, { expiresIn: '2h' });
            return `/api/v1/videos/${video.id}/stream?token=${token}`;
        }
        // Supabase Storage: generate a signed URL
        return await storage_1.StorageService.getSignedUrl(video.videoUrl, 7200); // 2 hours
    }
}
exports.VideoService = VideoService;
