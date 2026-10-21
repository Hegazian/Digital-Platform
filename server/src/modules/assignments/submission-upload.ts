import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../utils/env';
import { BadRequestError } from '../../utils/errors';

// Only random, server-issued object names are valid; no path traversal or URLs.
export const SUBMISSION_UPLOAD_PATH = /^(?:\/uploads\/)?submission-files\/[a-f0-9-]{36}\.[a-z0-9]+$/;

export function createSubmissionUploadToken(userId: string, fileUrl: string, fileName: string, sizeBytes: number): string {
  return jwt.sign({ purpose: 'submission-upload', userId, fileUrl, fileName, sizeBytes }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifySubmissionUpload(userId: string, file: { fileUrl: string; uploadToken?: string }) {
  try {
    const claim = jwt.verify(file.uploadToken || '', JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (claim.purpose !== 'submission-upload' || claim.userId !== userId || claim.fileUrl !== file.fileUrl || !SUBMISSION_UPLOAD_PATH.test(file.fileUrl)) {
      throw new Error('Upload does not belong to this student');
    }
    return { fileUrl: claim.fileUrl as string, fileName: claim.fileName as string, sizeBytes: claim.sizeBytes as number };
  } catch {
    throw new BadRequestError('Invalid or expired submission upload. Please upload the file again.');
  }
}
