"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEpisode = exports.getPodcasts = exports.createPodcast = void 0;
const prisma_1 = require("../../prisma");
const createPodcast = async (req, res) => {
    const { titleEn, titleAr, description, coverImage } = req.body;
    const authorId = req.user?.userId;
    if (!titleEn || !titleAr) {
        return res.status(400).json({ success: false, message: 'Titles in English and Arabic are required' });
    }
    const podcast = await prisma_1.prisma.podcast.create({
        data: {
            titleEn,
            titleAr,
            description,
            coverImage,
            authorId: authorId || 'anonymous',
        },
    });
    return res.status(201).json({ success: true, data: podcast });
};
exports.createPodcast = createPodcast;
const getPodcasts = async (req, res) => {
    const podcasts = await prisma_1.prisma.podcast.findMany({
        include: { episodes: true },
        orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: podcasts });
};
exports.getPodcasts = getPodcasts;
const addEpisode = async (req, res) => {
    const podcastId = req.params.id;
    const { titleEn, titleAr, audioUrl, durationSec } = req.body;
    if (!titleEn || !titleAr || !audioUrl) {
        return res.status(400).json({ success: false, message: 'Episode titles and audioUrl are required' });
    }
    const episode = await prisma_1.prisma.podcastEpisode.create({
        data: {
            podcastId,
            titleEn,
            titleAr,
            audioUrl,
            durationSec: durationSec || 0,
        },
    });
    return res.status(201).json({ success: true, data: episode });
};
exports.addEpisode = addEpisode;
