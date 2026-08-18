import { Router } from 'express';
import { getBoardState, updateBoardState } from './board.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.get('/:blockId', authenticate, getBoardState);
router.post('/:blockId/state', authenticate, updateBoardState);

export default router;
