import net from 'net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireUploadScanner, scanUploadedFile } from '../file-validation';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { completeVideoUpload } from '../file-validation';

afterEach(() => vi.unstubAllEnvs());
describe('fail-closed upload scanning', () => {
  it('rejects production uploads before buffering when no scanner is configured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CLAMAV_HOST', undefined);
    const next = vi.fn();
    requireUploadScanner({} as any, {} as any, next);
    expect(next.mock.calls[0][0].statusCode).toBe(503);
  });

  it.each([['stream: OK\0', undefined], ['stream: Eicar-Test-Signature FOUND\0', 400], ['stream: ERROR\0', 503]])(
    'handles scanner response %j without storing the file', async (response, expectedStatus) => {
      const server = net.createServer((socket) => {
        let bytes = Buffer.alloc(0);
        socket.on('data', (data) => {
          bytes = Buffer.concat([bytes, Buffer.isBuffer(data) ? data : Buffer.from(data)]);
          if (bytes.length > 14 && bytes.subarray(-4).equals(Buffer.alloc(4))) socket.end(response);
        });
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('CLAMAV_HOST', '127.0.0.1');
      vi.stubEnv('CLAMAV_PORT', String((server.address() as net.AddressInfo).port));
      try {
        const error: any = await new Promise((resolve) => {
          void scanUploadedFile({ file: { buffer: Buffer.from('%PDF-1.7 clean test') } } as any, {} as any, resolve);
        });
        if (expectedStatus) expect(error.statusCode).toBe(expectedStatus);
        else expect(error).toBeUndefined();
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    },
  );

  it('sends a staged file to ClamAV in bounded chunks without a Buffer field', async () => {
    const payload = Buffer.from('staged video payload');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-video-scanner-'));
    const filePath = path.join(directory, 'upload');
    fs.writeFileSync(filePath, payload);
    const received: Buffer[] = [];
    const server = net.createServer((socket) => {
      socket.on('data', (chunk) => {
        received.push(Buffer.from(chunk));
        const bytes = Buffer.concat(received);
        if (bytes.subarray(-4).equals(Buffer.alloc(4))) socket.end('stream: OK\0');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CLAMAV_HOST', '127.0.0.1');
    vi.stubEnv('CLAMAV_PORT', String((server.address() as net.AddressInfo).port));
    try {
      const error: any = await new Promise((resolve) => {
        void scanUploadedFile({ file: { path: filePath, size: payload.length } } as any, {} as any, resolve);
      });
      expect(error).toBeUndefined();
      expect(Buffer.concat(received).includes(payload)).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('stops a completed-body scan and closes the staged file before upload cleanup on disconnect', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-video-abort-'));
    const filePath = path.join(directory, 'upload');
    fs.writeFileSync(filePath, Buffer.alloc(256 * 1024, 0x5a));
    const controller = new AbortController();
    const request = new EventEmitter() as EventEmitter & {
      file: Express.Multer.File;
      videoUploadLifecycle: { signal: AbortSignal; complete: () => Promise<void> };
    };
    request.file = { path: filePath, size: 256 * 1024 } as Express.Multer.File;
    request.videoUploadLifecycle = {
      signal: controller.signal,
      complete: async () => fs.promises.unlink(filePath),
    };
    let received = Buffer.alloc(0);
    const server = net.createServer((socket) => {
      socket.on('data', (chunk) => {
        received = Buffer.concat([received, Buffer.from(chunk)]);
        const prefix = Buffer.from('zINSTREAM\0');
        if (!received.subarray(0, prefix.length).equals(prefix)) return;
        let offset = prefix.length;
        while (offset + 4 <= received.length) {
          const size = received.readUInt32BE(offset);
          offset += 4;
          if (size === 0) {
            controller.abort();
            return;
          }
          if (offset + size > received.length) return;
          offset += size;
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CLAMAV_HOST', '127.0.0.1');
    vi.stubEnv('CLAMAV_PORT', String((server.address() as net.AddressInfo).port));
    try {
      const error: any = await new Promise((resolve, reject) => {
        void scanUploadedFile(request as any, {} as any, (scanError) => {
          if (scanError?.statusCode !== 400) return reject(scanError || new Error('Expected interrupted scan error'));
          void completeVideoUpload(request as any).then(resolve, reject);
        });
      });
      expect(error).toBeUndefined();
      expect(received.subarray(0, 9).toString()).toBe('zINSTREAM');
      expect(fs.existsSync(filePath)).toBe(false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
