import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';

export const createThread = async (req: AuthRequest, res: Response) => {
  const { courseId, lessonId, title, content } = req.body;
  const authorId = req.user?.userId;

  if (!courseId || !title || !content) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const thread = await prisma.discussionThread.create({
    data: {
      courseId,
      lessonId,
      authorId: authorId || 'anonymous',
      title,
      content,
    },
  });

  return res.status(201).json({ success: true, data: thread });
};

export const getCourseThreads = async (req: AuthRequest, res: Response) => {
  const courseId = req.params.courseId as string;

  const threads = await prisma.discussionThread.findMany({
    where: { courseId },
    include: { replies: true },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ success: true, data: threads });
};

export const postReply = async (req: AuthRequest, res: Response) => {
  const threadId = req.params.id as string;
  const { content } = req.body;
  const authorId = req.user?.userId;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Reply content is required' });
  }

  const reply = await prisma.discussionReply.create({
    data: {
      threadId,
      authorId: authorId || 'anonymous',
      content,
    },
  });

  return res.status(201).json({ success: true, data: reply });
};
