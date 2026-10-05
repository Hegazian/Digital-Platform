import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';

export const createThread = async (req: AuthRequest, res: Response) => {
  const { courseId, lessonId, title, content } = req.body;
  const authorId = req.user?.userId;

  if (!authorId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!courseId || !title || !content) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const thread = await prisma.discussionThread.create({
    data: {
      courseId,
      lessonId,
      authorId,
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
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ success: true, data: threads });
};

export const postReply = async (req: AuthRequest, res: Response) => {
  const threadId = req.params.id as string;
  const { content } = req.body;
  const authorId = req.user?.userId;

  if (!authorId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!content) {
    return res.status(400).json({ success: false, message: 'Reply content is required' });
  }

  const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
  if (!thread) {
    return res.status(404).json({ success: false, message: 'Discussion thread not found' });
  }

  const reply = await prisma.discussionReply.create({
    data: {
      threadId,
      authorId,
      content,
    },
  });

  return res.status(201).json({ success: true, data: reply });
};
