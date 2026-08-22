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
      // Express 5 exposes req.query via a read-only getter on the prototype,
      // so we merge parsed values into the existing object instead of
      // reassigning the property (which throws -> 500).
      const parsed = schema.parse(req.query) as Record<string, unknown>;
      Object.assign(req.query, parsed);
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
