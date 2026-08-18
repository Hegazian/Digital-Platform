import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../prisma';

describe('Podcast and Board Database Persistence (TDD)', () => {
  let authorId: string;
  let subjectId: string;
  let courseId: string;
  let sectionId: string;
  let lessonId: string;
  let podcastId: string;
  let lessonBlockId: string;

  beforeAll(async () => {
    // 1. Create Teacher
    const author = await prisma.user.create({
      data: {
        email: `podcast-author-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Podcast Host',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
      },
    });
    authorId = author.id;

    // 2. Create Subject & Course hierarchy for LessonBlock
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Board Subject ${Date.now()}`,
        nameAr: 'مادة السبورة',
      },
    });
    subjectId = subject.id;

    const course = await prisma.course.create({
      data: {
        titleEn: 'Board Course',
        titleAr: 'دورة السبورة',
        description: 'Testing Board persistence',
        teacherId: authorId,
        subjectId,
      },
    });
    courseId = course.id;

    const section = await prisma.section.create({
      data: {
        courseId,
        titleEn: 'Section 1',
        titleAr: 'الفصل 1',
        orderIndex: 1,
      },
    });
    sectionId = section.id;

    const lesson = await prisma.lesson.create({
      data: {
        sectionId,
        titleEn: 'Lesson 1',
        titleAr: 'الدرس 1',
        orderIndex: 1,
      },
    });
    lessonId = lesson.id;

    const block = await prisma.lessonBlock.create({
      data: {
        lessonId,
        blockType: 'BOARD',
        configurationJson: '{}',
        sortOrder: 1,
      },
    });
    lessonBlockId = block.id;
  });

  afterAll(async () => {
    try {
      if (podcastId) {
        await prisma.podcastEpisode.deleteMany({ where: { podcastId } });
        await prisma.podcast.deleteMany({ where: { id: podcastId } });
      }
      if (authorId) {
        await prisma.user.deleteMany({ where: { id: authorId } });
      }
      if (subjectId) {
        await prisma.subject.deleteMany({ where: { id: subjectId } });
      }
    } catch (e) {}
  }, 60000);

  it('should persist podcast and episodes directly in Prisma database', async () => {
    const podcast = await prisma.podcast.create({
      data: {
        titleEn: 'Physics Bites',
        titleAr: 'مقتطفات الفيزياء',
        description: 'Short audio summaries for students',
        authorId,
      },
    });
    podcastId = podcast.id;
    expect(podcast.id).toBeDefined();

    const episode = await prisma.podcastEpisode.create({
      data: {
        podcastId: podcast.id,
        titleEn: 'Episode 1: Newton Laws',
        titleAr: 'الحلقة 1: قوانين نيوتن',
        audioUrl: 'https://cdn.platform.com/podcasts/ep1.mp3',
        durationSec: 360,
      },
    });
    expect(episode.id).toBeDefined();
    expect(episode.podcastId).toBe(podcast.id);

    // Retrieve with relations
    const foundPodcast = await prisma.podcast.findUnique({
      where: { id: podcast.id },
      include: { episodes: true },
    });
    expect(foundPodcast?.episodes.length).toBe(1);
    expect(foundPodcast?.episodes[0].durationSec).toBe(360);
  });

  it('should persist and upsert whiteboard drawings directly in Prisma database', async () => {
    const board = await prisma.board.upsert({
      where: { lessonBlockId },
      update: { elementsJson: JSON.stringify([{ type: 'rect', x: 10, y: 20 }]) },
      create: {
        lessonBlockId,
        elementsJson: JSON.stringify([{ type: 'rect', x: 10, y: 20 }]),
      },
    });

    expect(board.lessonBlockId).toBe(lessonBlockId);
    expect(board.elementsJson).toContain('"type":"rect"');

    // Update board state
    const updatedBoard = await prisma.board.upsert({
      where: { lessonBlockId },
      update: { elementsJson: JSON.stringify([{ type: 'circle', radius: 50 }]) },
      create: {
        lessonBlockId,
        elementsJson: JSON.stringify([{ type: 'circle', radius: 50 }]),
      },
    });

    expect(updatedBoard.elementsJson).toContain('"type":"circle"');
  });
});
