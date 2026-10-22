import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { CollectionsService } from './collection.service';

const isAdmin = (req: AuthRequest) => req.user?.role === Role.ADMIN;

export const listCollections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const includeUnpublished = isAdmin(req) && req.query.includeUnpublished === 'true';
    const collections = await CollectionsService.listCollections({ includeUnpublished });
    res.status(200).json({ success: true, data: collections });
  } catch (err) {
    next(err);
  }
};

export const getCollectionById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const collection = await CollectionsService.getCollectionById(req.params.id as string, {
      includeUnpublished: isAdmin(req),
    });
    res.status(200).json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
};

export const createCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const collection = await CollectionsService.createCollection(req.body);
    res.status(201).json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
};

export const updateCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const collection = await CollectionsService.updateCollection(
      req.params.id as string,
      req.body
    );
    res.status(200).json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
};

export const deleteCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await CollectionsService.deleteCollection(req.params.id as string);
    res.status(200).json({ success: true, message: 'Collection deleted' });
  } catch (err) {
    next(err);
  }
};

export const setCollectionCourses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseIds = (req.body?.courseIds ?? []) as string[];
    const collection = await CollectionsService.setCollectionCourses(
      req.params.id as string,
      courseIds
    );
    res.status(200).json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
};
