import { Router } from 'express';
import { z } from 'zod';
import {
  listPodcasts,
  getPodcastById,
  listMine,
  createPodcast,
  updatePodcast,
  deletePodcast,
  addEpisode,
  deleteEpisode,
} from './podcast.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';

const router = Router();

const AUDIO_URL = z
  .string()
  .min(5)
  .max(500)
  .refine(
    (v) => /^https?:\/\//i.test(v) || v.startsWith('/uploads/'),
    'audioUrl must be an http(s) URL or a local /uploads/ path'
  );

export const createPodcastSchema = z.object({
  titleEn: z.string().min(2),
  titleAr: z.string().min(1),
  description: z.string().max(1000).optional(),
  coverImage: z.string().max(500).optional(),
});

export const updatePodcastSchema = createPodcastSchema.partial();

export const addEpisodeSchema = z.object({
  titleEn: z.string().min(2),
  titleAr: z.string().min(1),
  audioUrl: AUDIO_URL,
  durationSec: z.number().int().min(0).max(36000).default(0),
});

// Student player + public browsing (auth kept for parity with old contract)
router.get('/', authenticate, listPodcasts);
router.get('/mine', authenticate, requireApprovedTeacher, listMine);
router.get('/:id', getPodcastById);

// Creator surfaces. Ownership (owner-or-admin) is enforced in the service.
router.post('/', authenticate, requireApprovedTeacher, validateBody(createPodcastSchema), createPodcast);
router.patch('/:id', authenticate, validateBody(updatePodcastSchema), updatePodcast);
router.delete('/:id', authenticate, deletePodcast);
router.post('/:id/episodes', authenticate, validateBody(addEpisodeSchema), addEpisode);
router.delete('/:id/episodes/:episodeId', authenticate, deleteEpisode);

export default router;
