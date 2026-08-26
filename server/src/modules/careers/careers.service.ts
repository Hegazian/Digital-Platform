import { prisma } from '../../prisma';
import { NotFoundError } from '../../utils/errors';

/**
 * Default aspirational tracks. The platform serves ONE audience: Egyptian
 * Thanaweya Amma — Scientific Math track, targeting Engineering and
 * Computer/Programming faculties. Subjects are linked by keyword matching so
 * the feature works with dynamically teacher-created subjects (name-based).
 */
const DEFAULT_TRACKS = [
  {
    slug: 'engineering',
    nameEn: 'Engineering Faculties',
    nameAr: 'كليات الهندسة',
    iconKey: 'cpu',
    sortOrder: 1,
    keywords: ['physics', 'math', 'mechanics', 'engineering', 'فيزياء', 'رياضيات'],
  },
  {
    slug: 'development',
    nameEn: 'Computers & AI Faculties',
    nameAr: 'حاسبات وذكاء اصطناعي',
    iconKey: 'code',
    sortOrder: 2,
    keywords: [
      'programming',
      'computer',
      'code',
      'software',
      'ai',
      'برمجة',
      'حاسوب',
      'ذكاء اصطناعي',
    ],
  },
];

/** Legacy tracks from the old generic positioning — hidden, not deleted. */
const DEPRECATED_TRACK_SLUGS = ['medicine', 'science'];

export class CareersService {
  /** Idempotently creates default tracks and links matching existing subjects. */
  static async ensureDefaultTracksExist(): Promise<void> {
    // Hide legacy off-positioning tracks (old DBs) without deleting them —
    // student selections reference them (onDelete: SetNull keeps history).
    await prisma.careerTrack.updateMany({
      where: { slug: { in: DEPRECATED_TRACK_SLUGS } },
      data: { isActive: false },
    });

    // Keep the on-position defaults present and named correctly, even in
    // databases that already had tracks seeded under the old copy.
    for (const track of DEFAULT_TRACKS) {
      await prisma.careerTrack.upsert({
        where: { slug: track.slug },
        update: { nameEn: track.nameEn, nameAr: track.nameAr, isActive: true },
        create: {
          slug: track.slug,
          nameEn: track.nameEn,
          nameAr: track.nameAr,
          iconKey: track.iconKey,
          sortOrder: track.sortOrder,
        },
      });
    }

    await CareersService.linkMatchingSubjects();
  }

  private static async linkMatchingSubjects(): Promise<void> {
    const tracks = await prisma.careerTrack.findMany();
    const subjects = await prisma.subject.findMany({
      select: { id: true, nameEn: true, nameAr: true },
    });

    for (const track of tracks) {
      const def = DEFAULT_TRACKS.find((d) => d.slug === track.slug);
      if (!def) continue;

      const matches = subjects.filter((s) => {
        const hay = `${s.nameEn} ${s.nameAr}`.toLowerCase();
        return def.keywords.some((kw) => hay.includes(kw.toLowerCase()));
      });

      if (matches.length === 0) continue;

      await prisma.careerTrackSubject.createMany({
        data: matches.map((m) => ({ trackId: track.id, subjectId: m.id })),
        skipDuplicates: true,
      });
    }
  }

  static async listTracks() {
    await this.ensureDefaultTracksExist();

    return prisma.careerTrack.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        subjects: {
          include: {
            subject: { select: { id: true, nameEn: true, nameAr: true } },
          },
        },
        _count: { select: { subjects: true } },
      },
    });
  }

  static async getMyTrack(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        interestedTrackId: true,
        interestedTrack: {
          include: {
            _count: { select: { subjects: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundError('User not found');
    return user.interestedTrack;
  }

  static async setMyTrack(userId: string, slug: string | null) {
    if (slug === null) {
      await prisma.user.update({
        where: { id: userId },
        data: { interestedTrackId: null },
      });
      return null;
    }

    const track = await prisma.careerTrack.findUnique({ where: { slug } });
    if (!track || !track.isActive) {
      throw new NotFoundError('Career track not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { interestedTrackId: track.id },
    });

    return track;
  }

  /**
   * Progress framing for the chosen track:
   * - published courses inside the track's subjects
   * - completion derived from LessonProgress (course = completed when every
   *   lesson is completed; started when at least one is)
   * - suggests the next unfinished course
   */
  static async getMyTrackProgress(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        interestedTrackId: true,
        interestedTrack: {
          include: { subjects: { select: { subjectId: true } } },
        },
      },
    });

    if (!user || !user.interestedTrack || !user.interestedTrackId) {
      return { track: null, totalCourses: 0, startedCourses: 0, completedCourses: 0, totalLessons: 0, completedLessons: 0, nextCourse: null };
    }

    const track = user.interestedTrack;
    const subjectIds = track.subjects.map((s) => s.subjectId);

    const courses =
      subjectIds.length === 0
        ? []
        : await prisma.course.findMany({
            where: {
              subjectId: { in: subjectIds },
              status: 'PUBLISHED',
              isPublished: true,
            },
            select: {
              id: true,
              titleEn: true,
              titleAr: true,
              createdAt: true,
              // Lessons live under modules and sections, not on Course directly.
              modules: { select: { lessons: { select: { id: true } } } },
              sections: { select: { lessons: { select: { id: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          });

    const courseLessonIds = courses.map((c) => ({
      courseId: c.id,
      titleEn: c.titleEn,
      titleAr: c.titleAr,
      lessonIds: [
        ...c.modules.flatMap((m) => m.lessons.map((l) => l.id)),
        ...c.sections.flatMap((s) => s.lessons.map((l) => l.id)),
      ],
    }));

    const lessonIds = courseLessonIds.flatMap((c) => c.lessonIds);
    const completed = new Set<string>();
    if (lessonIds.length > 0) {
      const rows = await prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: lessonIds }, isCompleted: true },
        select: { lessonId: true },
      });
      rows.forEach((r) => completed.add(r.lessonId));
    }

    let startedCourses = 0;
    let completedCourses = 0;
    let totalLessons = 0;
    let nextCourse: { id: string; titleEn: string; titleAr: string } | null = null;

    // Per-course breakdown: deterministic surface for tests & widgets
    const courseBreakdown = courseLessonIds.map((c) => {
      const count = c.lessonIds.length;
      const done = c.lessonIds.filter((id) => completed.has(id)).length;
      return {
        courseId: c.courseId,
        titleEn: c.titleEn,
        titleAr: c.titleAr,
        totalLessons: count,
        completedLessons: done,
        isCompleted: count > 0 && done === count,
      };
    });

    for (const c of courseLessonIds) {
      const count = c.lessonIds.length;
      totalLessons += count;
      const done = c.lessonIds.filter((id) => completed.has(id)).length;

      if (done > 0 && done < count) startedCourses += 1;
      if (count > 0 && done === count) completedCourses += 1;
      else if (!nextCourse && count > 0 && done < count) {
        nextCourse = { id: c.courseId, titleEn: c.titleEn, titleAr: c.titleAr };
      }
    }
    void startedCourses; // exposed for future widgets

    return {
      track: {
        slug: track.slug,
        nameEn: track.nameEn,
        nameAr: track.nameAr,
        iconKey: track.iconKey,
      },
      totalCourses: courses.length,
      startedCourses,
      completedCourses,
      totalLessons,
      completedLessons: completed.size,
      nextCourse,
      courseBreakdown,
    };
  }
}
