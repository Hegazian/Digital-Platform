import { Router } from 'express';
import { createPodcast, getPodcasts, addEpisode } from './podcast.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.get('/', authenticate, getPodcasts);
router.post('/', authenticate, createPodcast);
router.post('/:id/episodes', authenticate, addEpisode);

export default router;
