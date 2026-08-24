import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Role } from '@prisma/client';

const EPISODE_SELECT = {
  id: true,
  titleEn: true,
  titleAr: true,
  audioUrl: true,
  durationSec: true,
  sortOrder: true,
} as const;

export class PodcastsService {
  /** Owner or admin may mutate. */
  private static async assertOwner(userId: string, role: Role, podcastId: string) {
    const podcast = await prisma.podcast.findUnique({
      where: { id: podcastId },
      select: { id: true, authorId: true },
    });
    if (!podcast) throw new NotFoundError('Podcast not found');
    if (podcast.authorId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenError('Only the podcast owner can manage it');
    }
    return podcast;
  }

  static async listPodcasts() {
    return prisma.podcast.findMany({
      include: {
        episodes: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getPodcastById(id: string) {
    const podcast = await prisma.podcast.findUnique({
      where: { id },
      include: {
        episodes: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!podcast) throw new NotFoundError('Podcast not found');
    return podcast;
  }

  static async listMine(userId: string) {
    return prisma.podcast.findMany({
      where: { authorId: userId },
      include: { episodes: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createPodcast(
    userId: string,
    data: {
      titleEn: string;
      titleAr: string;
      description?: string;
      coverImage?: string;
    }
  ) {
    return prisma.podcast.create({
      data: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        description: data.description,
        coverImage: data.coverImage,
        authorId: userId,
      },
      include: { episodes: true },
    });
  }

  static async updatePodcast(
    userId: string,
    role: Role,
    id: string,
    data: {
      titleEn?: string;
      titleAr?: string;
      description?: string;
      coverImage?: string;
    }
  ) {
    await this.assertOwner(userId, role, id);
    return prisma.podcast.update({ where: { id }, data, include: { episodes: true } });
  }

  static async deletePodcast(userId: string, role: Role, id: string) {
    await this.assertOwner(userId, role, id);
    await prisma.podcast.delete({ where: { id } });
    return { deleted: true };
  }

  static async addEpisode(
    userId: string,
    role: Role,
    podcastId: string,
    data: { titleEn: string; titleAr: string; audioUrl: string; durationSec?: number }
  ) {
    await this.assertOwner(userId, role, podcastId);

    const last = await prisma.podcastEpisode.aggregate({
      where: { podcastId },
      _max: { sortOrder: true },
    });

    return prisma.podcastEpisode.create({
      data: {
        podcastId,
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        audioUrl: data.audioUrl,
        durationSec: Math.max(0, Math.floor(data.durationSec ?? 0)),
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  }

  static async deleteEpisode(userId: string, role: Role, podcastId: string, episodeId: string) {
    await this.assertOwner(userId, role, podcastId);

    const episode = await prisma.podcastEpisode.findFirst({
      where: { id: episodeId, podcastId },
    });
    if (!episode) throw new NotFoundError('Episode not found');

    await prisma.podcastEpisode.delete({ where: { id: episodeId } });
    return { deleted: true };
  }

  static toPublicList(podcasts: Awaited<ReturnType<typeof PodcastsService.listPodcasts>>) {
    // Student player contract: episodes carry only playable fields.
    return podcasts.map((p) => ({
      id: p.id,
      titleEn: p.titleEn,
      titleAr: p.titleAr,
      description: p.description,
      coverImage: p.coverImage,
      episodes: p.episodes.map((e) => {
        const { sortOrder: _s, ...rest } = e;
        void _s;
        return rest;
      }),
    }));
  }
}

export { EPISODE_SELECT };
