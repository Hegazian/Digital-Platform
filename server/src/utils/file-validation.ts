import { NextFunction, Request, Response } from 'express';
import net from 'net';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { getUploadStagingRoot } from './storage';
import { AppError, BadRequestError } from './errors';

const extensionByMime: Record<string, Set<string>> = {
  'application/pdf': new Set(['.pdf']),
  'application/msword': new Set(['.doc']),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': new Set(['.docx']),
  'application/vnd.ms-powerpoint': new Set(['.ppt']),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': new Set(['.pptx']),
  'text/plain': new Set(['.txt']), 'text/markdown': new Set(['.md', '.markdown']), 'text/csv': new Set(['.csv']),
  'image/jpeg': new Set(['.jpg', '.jpeg']), 'image/png': new Set(['.png']), 'image/webp': new Set(['.webp']), 'image/gif': new Set(['.gif']),
  'audio/mpeg': new Set(['.mp3']), 'audio/mp4': new Set(['.m4a', '.mp4']), 'audio/wav': new Set(['.wav']), 'audio/webm': new Set(['.webm']),
  'video/mp4': new Set(['.mp4']), 'video/webm': new Set(['.webm']), 'video/quicktime': new Set(['.mov']), 'video/x-msvideo': new Set(['.avi']),
  'video/x-matroska': new Set(['.mkv']), 'video/mpeg': new Set(['.mpeg', '.mpg']),
};

function hasSignature(mime: string, bytes: Buffer): boolean {
  if (mime === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/gif') return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
  if (mime === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (mime === 'application/msword' || mime === 'application/vnd.ms-powerpoint') return bytes.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
  if (mime.includes('openxml')) return bytes.subarray(0, 4).toString() === 'PK\x03\x04';
  if (mime === 'audio/wav' || mime === 'video/x-msvideo') return bytes.subarray(0,4).toString() === 'RIFF' && (mime !== 'audio/wav' || bytes.subarray(8,12).toString() === 'WAVE') && (mime !== 'video/x-msvideo' || bytes.subarray(8,12).toString() === 'AVI ');
  if (mime === 'audio/webm' || mime === 'video/webm' || mime === 'video/x-matroska') return bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if (mime === 'video/mp4' || mime === 'audio/mp4' || mime === 'video/quicktime') return bytes.length >= 12 && bytes.subarray(4,8).toString() === 'ftyp';
  if (mime === 'audio/mpeg') return bytes.subarray(0,3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  if (mime === 'video/mpeg') return bytes.subarray(0,4).equals(Buffer.from([0,0,1,0xb3]));
  if (mime.startsWith('text/')) {
    const text = bytes.subarray(0, 8192).toString('utf8');
    return !bytes.subarray(0, 8192).includes(0) && !/<\s*(?:!doctype\s+html|html|script|iframe|svg)\b/i.test(text);
  }
  return false;
}

export async function validateUploadedFile(req: Request, _res: Response, next: NextFunction) {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return next();
  try {
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    const allowedExtensions = extensionByMime[file.mimetype];
    const bytes = file.buffer ?? (file.path ? await readSignatureBytes(file.path) : Buffer.alloc(0));
    if (!allowedExtensions || !allowedExtensions.has(extension) || !hasSignature(file.mimetype, bytes)) {
      return next(new BadRequestError('Uploaded file content, extension, and declared type must match a supported format.'));
    }
    next();
  } catch {
    next(new BadRequestError('Uploaded file could not be read for validation.'));
  }
}

async function readSignatureBytes(filePath: string): Promise<Buffer> {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const bytes = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    return bytes.subarray(0, bytesRead);
  } finally { await handle.close(); }
}

/** Create an unpredictable private temporary path for disk-backed large uploads. */
export function stagedUploadStorage() {
  return {
    destination: (_req: Request, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
      try { callback(null, getUploadStagingRoot()); } catch (error) { callback(error as Error, ''); }
    },
    filename: (_req: Request, _file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
      callback(null, `${randomUUID()}.upload`);
    },
  };
}

/** Remove a completed or rejected disk-backed upload after the response closes. */
export function cleanupStagedUpload(req: Request, res: Response, next: NextFunction) {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (file?.path) {
    const cleanup = () => { void fs.promises.unlink(file.path!).catch(() => undefined); };
    res.once('finish', cleanup);
    res.once('close', cleanup);
  }
  next();
}



export function requireUploadScanner(_req: Request, _res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production' && !process.env.CLAMAV_HOST) return next(new AppError(503, 'Upload scanning is not configured'));
  const port = Number(process.env.CLAMAV_PORT || 3310);
  if (process.env.NODE_ENV === 'production' && (!Number.isInteger(port) || port < 1 || port > 65535)) return next(new AppError(503, 'Upload scanning is misconfigured'));
  next();
}

/**
 * Scan uploads with bounded memory before any storage or DB write.
 * Production fails closed unless a scanner is configured and returns a clean result.
 */
export async function scanUploadedFile(req: Request, _res: Response, next: NextFunction) {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return next();
  const host = process.env.CLAMAV_HOST;
  const port = Number(process.env.CLAMAV_PORT || 3310);
  if (!host) {
    if (process.env.NODE_ENV === 'production') return next(new AppError(503, 'Upload scanning is not configured'));
    return next();
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) return next(new AppError(503, 'Upload scanning is misconfigured'));

  const socket = new net.Socket();
  const source = file.path ? fs.createReadStream(file.path, { highWaterMark: 64 * 1024 }) : undefined;
  let response = '';
  let settled = false;
  const finish = (error?: Error) => {
    if (settled) return;
    settled = true;
    source?.destroy();
    socket.destroy();
    next(error);
  };
  socket.setTimeout(15 * 60_000, () => finish(new AppError(503, 'Upload scanner timed out')));
  req.once?.('aborted', () => finish(new AppError(400, 'Upload request was interrupted')));
  socket.on('data', (chunk) => {
    response += chunk.toString('utf8');
    if (!response.includes('\0')) return;
    if (response.includes(' FOUND')) return finish(new BadRequestError('The uploaded file was rejected by malware scanning'));
    if (response.endsWith(' OK\0')) return finish();
    finish(new AppError(503, 'Upload scanner returned an invalid response'));
  });
  socket.on('error', () => finish(new AppError(503, 'Upload scanner is unavailable')));
  socket.on('end', () => {
    if (!settled) finish(response.endsWith(' OK\0') ? undefined : new AppError(503, 'Upload scanner ended without a clean result'));
  });
  socket.connect(port, host, () => {
    const write = (chunk: Buffer) => new Promise<void>((resolve, reject) => {
      if (settled) return reject(new Error('Scanner connection already closed'));
      if (socket.write(chunk)) return resolve();
      socket.once('drain', resolve);
      socket.once('error', reject);
    });
    void (async () => {
      try {
        await write(Buffer.from('zINSTREAM\0'));
        const chunkSize = 64 * 1024;
        if (source) {
          for await (const item of source) {
            const buffer = Buffer.isBuffer(item) ? item : Buffer.from(item);
            for (let offset = 0; offset < buffer.length; offset += chunkSize) {
              const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
              const size = Buffer.alloc(4);
              size.writeUInt32BE(chunk.length, 0);
              await write(size);
              await write(chunk);
            }
          }
        } else {
          for (let offset = 0; offset < file.buffer.length; offset += chunkSize) {
            const chunk = file.buffer.subarray(offset, Math.min(offset + chunkSize, file.buffer.length));
            const size = Buffer.alloc(4);
            size.writeUInt32BE(chunk.length, 0);
            await write(size);
            await write(chunk);
          }
        }
        await write(Buffer.alloc(4));
      } catch {
        finish(new AppError(503, 'Upload scanner is unavailable'));
      }
    })();
  });
}
