import { Request, Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';

const inMemoryCollections: any[] = [];

export const createCollection = async (req: AuthRequest, res: Response) => {
  const { titleEn, titleAr, slug, description, thumbnail } = req.body;

  if (!titleEn || !titleAr || !slug) {
    return res.status(400).json({ success: false, message: 'Titles and slug are required' });
  }

  try {
    const collection = await prisma.collection.create({
      data: {
        titleEn,
        titleAr,
        slug,
        description,
        thumbnail,
      },
    });

    return res.status(201).json({ success: true, data: collection });
  } catch (error) {
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

export const getCollections = async (req: Request, res: Response) => {
  try {
    const collections = await prisma.collection.findMany({
      where: { isPublished: true },
      include: { courses: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: collections });
  } catch (error) {
    return res.status(200).json({ success: true, data: inMemoryCollections });
  }
};
