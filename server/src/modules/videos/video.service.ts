import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../../utils/errors';
import { VideoStatus } from '@prisma/client';
import { StorageService } from '../../utils/storage';
import { VIDEO_STREAM_SECRET } from '../../utils/env';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { boundObjectKey, externalContentUrl } from '../../utils/media-references';

export class VideoService {
  /**
   * Upload a video to Supabase Storage (or local fallback) and create a record.
   */
  static async uploadVideo(teacherId: string, filePath: string, fileName: string, mimeType: string, sizeBytes: number, signal?: AbortSignal) {
    // 1. Upload to storage bucket "lesson-videos"
    const videoId = randomUUID();
    const videoUrl = await StorageService.uploadFileFromPath(filePath, fileName, mimeType, sizeBytes, 'lesson-videos', videoId, signal);

    // 2. Create database record
    try {
      return await prisma.video.create({
        data: {
          id: videoId,
          teacherId,
          videoUrl,
          originalFileName: fileName,
          sizeBytes,
          // Signature and MIME validation cannot verify codecs/duration. Keep every new upload
          // non-playable until the managed media probe/processing worker marks it READY.
          status: VideoStatus.PROCESSING,
        },
      });
    } catch (error) {
      await StorageService.deleteFile(videoUrl).catch(() => undefined);
      throw error;
    }
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
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true, teacherStatus: true } });
    if (!user?.isActive) return false;
    if (user.role === 'TEACHER' && user.teacherStatus !== 'APPROVED') return false;
    if (user.role === 'ADMIN' || (user.role === 'TEACHER' && video.teacherId === userId)) {
      return true;
    }
    // The acting uploader can be an admin. Content ownership follows the
    // attached course, so its approved teacher can still inspect the video.
    const attachedCourse = video.lesson?.module?.course || video.lesson?.section?.course;
    if (user.role === 'TEACHER' && attachedCourse?.teacherId === userId) return true;

    const courseId = video.lesson?.module?.courseId || video.lesson?.section?.courseId;
    const subjectId = video.lesson?.module?.course?.subjectId || video.lesson?.section?.course?.subjectId;

    // Preview access must still respect course publication and retraction.
    if (video.lesson?.section?.isFreePreview && courseId) {
      const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
      return EntitlementResolver.hasCoursePreviewAccess(courseId, userId);
    }

    // Check active entitlement or subscription via EntitlementResolver

    if (courseId || subjectId) {
      const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
      if (courseId && (await EntitlementResolver.hasCourseAccess(userId, courseId))) {
        return true;
      }
      if (!courseId && subjectId && (await EntitlementResolver.hasSubjectAccess(userId, subjectId))) {
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
    if (video.status !== VideoStatus.READY) throw new ConflictError('Video is still processing and cannot be played yet.');

    if (/^https?:\/\//i.test(video.videoUrl)) return externalContentUrl(video.videoUrl);
    const internalPath = boundObjectKey(video.videoUrl, 'lesson-videos', video.id);
    if (video.videoUrl.startsWith('/uploads/')) {
      // Local fallback: generate a short-lived JWT token that the frontend can use to hit our streaming endpoint
      const token = jwt.sign({ videoId, userId, purpose: 'stream' }, VIDEO_STREAM_SECRET, { expiresIn: '120s', jwtid: randomUUID() });
      return `/api/v1/videos/${video.id}/stream?token=${token}`;
    }

    // Supabase Storage: generate a signed URL
    return await StorageService.getSignedUrl(internalPath, 120);
  }
}
