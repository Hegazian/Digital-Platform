import net from 'net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireUploadScanner, scanUploadedFile } from '../file-validation';

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
});
