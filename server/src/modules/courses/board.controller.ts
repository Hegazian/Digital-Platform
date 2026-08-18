import { Request, Response } from 'express';
import { prisma } from '../../prisma';

export const getBoardState = async (req: Request, res: Response) => {
  const blockId = req.params.blockId as string;

  let board = await prisma.board.findUnique({
    where: { lessonBlockId: blockId },
  });

  if (!board) {
    board = await prisma.board.create({
      data: {
        lessonBlockId: blockId,
        elementsJson: '[]',
      },
    });
  }

  return res.status(200).json({
    success: true,
    data: board,
  });
};

export const updateBoardState = async (req: Request, res: Response) => {
  const blockId = req.params.blockId as string;
  const { elementsJson } = req.body;

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
