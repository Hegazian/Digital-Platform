"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollections = exports.createCollection = void 0;
const prisma_1 = require("../../prisma");
const inMemoryCollections = [];
const createCollection = async (req, res) => {
    const { titleEn, titleAr, slug, description, thumbnail } = req.body;
    if (!titleEn || !titleAr || !slug) {
        return res.status(400).json({ success: false, message: 'Titles and slug are required' });
    }
    try {
        const collection = await prisma_1.prisma.collection.create({
            data: {
                titleEn,
                titleAr,
                slug,
                description,
                thumbnail,
            },
        });
        return res.status(201).json({ success: true, data: collection });
    }
    catch (error) {
        const mockColl = {
            id: `mock-coll-${Date.now()}`,
            titleEn,
            titleAr,
            slug,
            description,
            thumbnail,
            isPublished: true,
            createdAt: new Date().toISOString(),
        };
        inMemoryCollections.push(mockColl);
        return res.status(201).json({ success: true, data: mockColl });
    }
};
exports.createCollection = createCollection;
const getCollections = async (req, res) => {
    try {
        const collections = await prisma_1.prisma.collection.findMany({
            where: { isPublished: true },
            include: { courses: true },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json({ success: true, data: collections });
    }
    catch (error) {
        return res.status(200).json({ success: true, data: inMemoryCollections });
    }
};
exports.getCollections = getCollections;
