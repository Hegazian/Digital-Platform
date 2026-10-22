import { Response } from 'express';
import { prisma } from '../../prisma';
import { Role } from '@prisma/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { AuthRequest } from '../auth/auth.middleware';
import { EntitlementResolver } from '../commerce/entitlement-resolver.service';

/**
 * ACL for collaborative boards. A board belongs to a lesson block, which
 * belongs to a course:
 * - READ  : the owning teacher, admins, or students with learning access
 *           (enrollment / entitlement) to the course.
 * - WRITE : the owning teacher and admins only.
 * Unknown block IDs are 404 — never auto-created (a GET must not have
 * write side effects, and invalid IDs previously crashed on the FK).
 */
async function authorizeBoard(req: AuthRequest, blockId: string, write: boolean): Promise<void> {
  const resolved = await EntitlementResolver.resolveLessonBlockCourse(blockId);
  if (!resolved) {
    throw new NotFoundError('Board not found');
  }

  const user = req.user!;
  const isManager = user.role === Role.ADMIN || resolved.teacherId === user.userId;
  if (isManager) return;

  if (write) {
    throw new ForbiddenError('Only the course teacher can modify this board');
  }

  await EntitlementResolver.assertLearningAccess(user.userId, user.role, resolved);
}

export const getBoardState = async (req: AuthRequest, res: Response) => {
  const blockId = req.params.blockId as string;
  await authorizeBoard(req, blockId, false);

  const board = await prisma.board.findUnique({
    where: { lessonBlockId: blockId },
  });

  // No row yet: hand back an empty board WITHOUT persisting (reads stay pure).
  return res.status(200).json({
    success: true,
    data: board ?? { lessonBlockId: blockId, elementsJson: '[]' },
  });
};

export const updateBoardState = async (req: AuthRequest, res: Response) => {
  const blockId = req.params.blockId as string;
  await authorizeBoard(req, blockId, true);

  const { elementsJson } = req.body ?? {};
  if (typeof elementsJson !== 'string') {
    throw new BadRequestError('elementsJson must be a string');
  }

  // The authorize step guarantees the lesson block exists, so this upsert
  // cannot hit an FK violation.
  const board = await prisma.board.upsert({
    where: { lessonBlockId: blockId },
    update: { elementsJson },
    create: {
      lessonBlockId: blockId,
      elementsJson,
    },
  });

  return res.status(200).json({
    success: true,
    data: board,
  });
};
