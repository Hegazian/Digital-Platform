import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from './errors';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues ? error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') : (error as any).message;
        return next(new BadRequestError(`Validation error: ${issues}`));
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues ? error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') : (error as any).message;
        return next(new BadRequestError(`Validation error: ${issues}`));
      }
      next(error);
    }
  };
};
