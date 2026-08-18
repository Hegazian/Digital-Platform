import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { CommerceService } from '../commerce/commerce.service';

export class LiveService {
  static async createLiveSession(data: {
    teacherId: string;
    subjectId: string;
    titleEn: string;
    titleAr: string;
    startTime: string | Date;
    durationMinutes: number;
  }) {
    const subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
    });

    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    const meetingId = `zoom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const zoomJoinUrl = `https://zoom.us/j/${meetingId}`;
    const zoomStartUrl = `https://zoom.us/s/${meetingId}?role=host`;

    return await prisma.liveSession.create({
      data: {
        teacher: { connect: { id: data.teacherId } },
        subject: { connect: { id: data.subjectId } },
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        startTime: new Date(data.startTime),
        durationMinutes: data.durationMinutes,
        zoomMeetingId: meetingId,
        zoomJoinUrl,
        zoomStartUrl,
      },
    });
  }

  static async getSubjectLiveSessions(studentId: string, subjectId: string) {
    // Check unified entitlement access (Subscription or Entitlement)
    const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
    const hasAccess = await EntitlementResolver.hasSubjectAccess(studentId, subjectId);

    if (!hasAccess) {
      throw new ForbiddenError('Active subject entitlement required to access live sessions');
    }

    const sessions = await prisma.liveSession.findMany({
      where: { subjectId },
      orderBy: { startTime: 'asc' },
    });

    // Strip host start URL for students
    return sessions.map((s) => ({
      id: s.id,
      subjectId: s.subjectId,
      titleEn: s.titleEn,
      titleAr: s.titleAr,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
      zoomJoinUrl: s.zoomJoinUrl,
    }));
  }
}
