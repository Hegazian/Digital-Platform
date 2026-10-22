import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { PodcastsService } from './podcast.service';

const toPublic = (p: any) => PodcastsService.toPublicList([p])[0];

export const listPodcasts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const podcasts = await PodcastsService.listPodcasts();
    res.status(200).json({ success: true, data: PodcastsService.toPublicList(podcasts) });
  } catch (err) {
    next(err);
  }
};

export const getPodcastById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const podcast = await PodcastsService.getPodcastById(req.params.id as string);
    res.status(200).json({ success: true, data: toPublic(podcast) });
  } catch (err) {
    next(err);
  }
};

export const listMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const podcasts = await PodcastsService.listMine(req.user!.userId);
    res.status(200).json({ success: true, data: podcasts });
  } catch (err) {
    next(err);
  }
};

export const createPodcast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const podcast = await PodcastsService.createPodcast(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: podcast });
  } catch (err) {
    next(err);
  }
};

export const updatePodcast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const podcast = await PodcastsService.updatePodcast(
      req.user!.userId,
      req.user!.role as Role,
      req.params.id as string,
      req.body
    );
    res.status(200).json({ success: true, data: podcast });
  } catch (err) {
    next(err);
  }
};

export const deletePodcast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await PodcastsService.deletePodcast(
      req.user!.userId,
      req.user!.role as Role,
      req.params.id as string
    );
    res.status(200).json({ success: true, message: 'Podcast deleted' });
  } catch (err) {
    next(err);
  }
};

export const addEpisode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const episode = await PodcastsService.addEpisode(
      req.user!.userId,
      req.user!.role as Role,
      req.params.id as string,
      req.body
    );
    res.status(201).json({ success: true, data: episode });
  } catch (err) {
    next(err);
  }
};

export const deleteEpisode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await PodcastsService.deleteEpisode(
      req.user!.userId,
      req.user!.role as Role,
      req.params.id as string,
      req.params.episodeId as string
    );
    res.status(200).json({ success: true, message: 'Episode deleted' });
  } catch (err) {
    next(err);
  }
};
