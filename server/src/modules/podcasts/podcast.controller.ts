import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';

export const createPodcast = async (req: AuthRequest, res: Response) => {
  const { titleEn, titleAr, description, coverImage } = req.body;
  const authorId = req.user?.userId;

  if (!titleEn || !titleAr) {
    return res.status(400).json({ success: false, message: 'Titles in English and Arabic are required' });
  }

  const podcast = await prisma.podcast.create({
    data: {
      titleEn,
      titleAr,
      description,
      coverImage,
      authorId: authorId || 'anonymous',
    },
  });

  return res.status(201).json({ success: true, data: podcast });
};

export const getPodcasts = async (req: AuthRequest, res: Response) => {
  const podcasts = await prisma.podcast.findMany({
    include: { episodes: true },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ success: true, data: podcasts });
};

export const addEpisode = async (req: AuthRequest, res: Response) => {
  const podcastId = req.params.id as string;
  const { titleEn, titleAr, audioUrl, durationSec } = req.body;

  if (!titleEn || !titleAr || !audioUrl) {
    return res.status(400).json({ success: false, message: 'Episode titles and audioUrl are required' });
  }

  const episode = await prisma.podcastEpisode.create({
    data: {
      podcastId,
      titleEn,
      titleAr,
      audioUrl,
      durationSec: durationSec || 0,
    },
  });

  return res.status(201).json({ success: true, data: episode });
};
