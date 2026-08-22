import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { VideoStatus } from '@prisma/client';
import { StorageService } from '../../utils/storage';
import jwt from 'jsonwebtoken';

export class VideoService {
  /**
   * Upload a video to Supabase Storage (or local fallback) and create a record.
   */
  static async uploadVideo(teacherId: string, fileBuffer: Buffer, fileName: string, mimeType: string, sizeBytes: number) {
    // 1. Upload to storage bucket "lesson-videos"
    const videoUrl = await StorageService.uploadFile(fileBuffer, fileName, mimeType, 'lesson-videos');

    // 2. Create database record
    return await prisma.video.create({
      data: {
        teacherId,
        videoUrl,
        originalFileName: fileName,
        sizeBytes,
        status: VideoStatus.READY, // MP4s are ready immediately
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
  static async verifyPlaybackAccess(videoId: string, userId: string): Promise<boolean> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundError('Video not found');
    }

    // Owner or admin bypass
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && (user.role === 'ADMIN' || video.teacherId === userId)) {
      return true;
    }

    // If attached to a free preview section
    if (video.lesson?.section?.isFreePreview) {
      return true;
    }

    // Check active entitlement or subscription via EntitlementResolver
    const courseId = video.lesson?.module?.courseId || video.lesson?.section?.courseId;
    const subjectId = video.lesson?.module?.course?.subjectId || video.lesson?.section?.course?.subjectId;

    if (courseId || subjectId) {
      const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
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
  static async getSecurePlaybackUrl(videoId: string, userId: string): Promise<string> {
    const hasAccess = await this.verifyPlaybackAccess(videoId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to play this video. Active subscription required.');
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video || !video.videoUrl) {
      throw new NotFoundError('Video file not found');
    }

    if (video.videoUrl.startsWith('/uploads/')) {
      // Local fallback: generate a short-lived JWT token that the frontend can use to hit our streaming endpoint
      const secret = process.env.JWT_SECRET || 'fallback-secret';
      const token = jwt.sign({ videoId, userId, purpose: 'stream' }, secret, { expiresIn: '2h' });
      return `/api/v1/videos/${video.id}/stream?token=${token}`;
    }

    // Supabase Storage: generate a signed URL
    return await StorageService.getSignedUrl(video.videoUrl, 7200); // 2 hours
  }
}
