"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postReply = exports.getCourseThreads = exports.createThread = void 0;
const prisma_1 = require("../../prisma");
const createThread = async (req, res) => {
    const { courseId, lessonId, title, content } = req.body;
    const authorId = req.user?.userId;
    if (!courseId || !title || !content) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const thread = await prisma_1.prisma.discussionThread.create({
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
exports.createThread = createThread;
const getCourseThreads = async (req, res) => {
    const courseId = req.params.courseId;
    const threads = await prisma_1.prisma.discussionThread.findMany({
        where: { courseId },
        include: { replies: true },
        orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: threads });
};
exports.getCourseThreads = getCourseThreads;
const postReply = async (req, res) => {
    const threadId = req.params.id;
    const { content } = req.body;
    const authorId = req.user?.userId;
    if (!content) {
        return res.status(400).json({ success: false, message: 'Reply content is required' });
    }
    const reply = await prisma_1.prisma.discussionReply.create({
        data: {
            threadId,
            authorId: authorId || 'anonymous',
            content,
        },
    });
    return res.status(201).json({ success: true, data: reply });
};
exports.postReply = postReply;
