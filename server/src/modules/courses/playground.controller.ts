import { Request, Response } from 'express';

/** Stable API tombstone: code is never executed by the application host. */
export const executeCode = async (_req: Request, res: Response) =>
  res.status(503).json({ success: false, code: 'FEATURE_DISABLED', message: 'Code execution is not available.' });
