import { Router } from 'express';
import { getBoardState, updateBoardState } from './board.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireCapability } from '../../utils/capabilities';

const router = Router();

router.use(requireCapability('COLLABORATIVE_BOARDS'));

router.get('/:blockId', authenticate, getBoardState);
router.post('/:blockId/state', authenticate, updateBoardState);

export default router;
