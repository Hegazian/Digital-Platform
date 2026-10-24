/* Explicit local benchmark, outside the routine unit suite. Uses only the
 * guarded fixture database, loopback HTTP/scanner and a private owned root. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

async function main() {
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    const target = new URL(process.env[key] || '');
    if (!['postgres:', 'postgresql:'].includes(target.protocol) || !['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/eduplatform_test') throw new Error(`Refusing unsafe ${key}`);
  }
  const runId = crypto.randomUUID();
  const ownedBase = path.resolve(__dirname, '../../.cache/m1-load');
  const uploadRoot = path.resolve(ownedBase, runId);
  if (!uploadRoot.startsWith(ownedBase + path.sep)) throw new Error('Unsafe benchmark directory');
  Object.assign(process.env, { NODE_ENV: 'test', STORAGE_DRIVER: 'filesystem', UPLOADS_DIR: uploadRoot,
    JWT_SECRET: crypto.randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('hex'),
    SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', CLAMAV_HOST: '127.0.0.1' });
  await fs.mkdir(uploadRoot, { recursive: true });
  const waitingScans: net.Socket[] = [];
  const sockets = new Set<net.Socket>();
  let releaseScans!: () => void;
  const bothScanned = new Promise<void>(resolve => { releaseScans = resolve; });
  const scanner = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    let prefix = false, remaining = 0, pending = Buffer.alloc(0);
    socket.on('data', bytes => {
      pending = Buffer.concat([pending, bytes]);
      if (!prefix) {
        if (pending.length < 10) return;
        if (pending.subarray(0, 10).toString() !== 'zINSTREAM\0') return socket.destroy();
        pending = pending.subarray(10); prefix = true;
      }
      while (pending.length) {
        if (!remaining) {
          if (pending.length < 4) break;
          remaining = pending.readUInt32BE(); pending = pending.subarray(4);
          if (!remaining) {
            waitingScans.push(socket);
            if (waitingScans.length === 2) releaseScans();
            else if (waitingScans.length > 2) socket.end('stream: OK\0');
            return;
          }
        }
        const consumed = Math.min(remaining, pending.length);
        remaining -= consumed; pending = pending.subarray(consumed);
      }
    });
  });
  await new Promise<void>(resolve => scanner.listen(0, '127.0.0.1', resolve));
  process.env.CLAMAV_PORT = String((scanner.address() as net.AddressInfo).port);
  const { default: app } = await import('../src/app');
  const { prisma } = await import('../src/prisma');
  const { generateAccessToken } = await import('../src/utils/jwt');
  const api = http.createServer(app);
  await new Promise<void>(resolve => api.listen(0, '127.0.0.1', resolve));
  const teacher = await prisma.user.create({ data: { email: `load-${runId}@fixture.test`, name: 'Load fixture', password: 'fixture-only', role: 'TEACHER', teacherStatus: 'APPROVED' } });
  const token = generateAccessToken({ userId: teacher.id, role: 'TEACHER', teacherStatus: 'APPROVED', authVersion: teacher.authVersion });
  const acceptedBytes = 500 * 1024 * 1024;
  let peakRss = process.memoryUsage().rss, peakStagedBytes = 0;
  const baselineRss = peakRss;
  const sample = async () => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    const entries = await fs.readdir(path.join(uploadRoot, '.staging')).catch(() => []);
    const sizes = await Promise.all(entries.map(async name => (await fs.stat(path.join(uploadRoot, '.staging', name)).catch(() => ({ size: 0 }))).size));
    peakStagedBytes = Math.max(peakStagedBytes, sizes.reduce((a, b) => a + b, 0));
  };
  const sampler = setInterval(() => { void sample(); }, 50);
  const upload = (bytes: number) => new Promise<{ status: number; body: any }>((resolve, reject) => {
    const boundary = `fixture-${crypto.randomUUID()}`;
    const start = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="load.mp4"\r\nContent-Type: video/mp4\r\n\r\n`);
    const end = Buffer.from(`\r\n--${boundary}--\r\n`);
    const req = http.request({ host: '127.0.0.1', port: (api.address() as net.AddressInfo).port, path: '/api/v1/videos/upload', method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': String(start.length + bytes + end.length) } }, response => {
      let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode || 0, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    const chunk = Buffer.alloc(64 * 1024); chunk.write('0000ftypisom');
    const body = Readable.from((async function* () { yield start; for (let sent = 0; sent < bytes; sent += chunk.length) yield chunk.subarray(0, Math.min(chunk.length, bytes - sent)); yield end; })());
    void pipeline(body, req).catch(reject);
  });
  let watchdog: NodeJS.Timeout | undefined;
  try {
    const uploads = [upload(acceptedBytes), upload(acceptedBytes)];
    watchdog = setTimeout(() => { for (const socket of sockets) socket.destroy(); releaseScans(); }, 120_000);
    await bothScanned;
    await sample();
    const rejected = await upload(1024);
    for (const socket of waitingScans) socket.end('stream: OK\0');
    const responses = await Promise.all(uploads);
    let stagedAfter: string[] = [];
    for (let attempt = 0; attempt < 100; attempt += 1) {
      stagedAfter = await fs.readdir(path.join(uploadRoot, '.staging')).catch(() => []);
      if (!stagedAfter.length) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    // A completed response may precede cleanup/admission release. Probe size
    // only after the owned staged files have gone, so capacity cannot mask it.
    await new Promise(resolve => setTimeout(resolve, 10));
    const tooLarge = await upload(acceptedBytes + 1);
    clearTimeout(watchdog);
    stagedAfter = await fs.readdir(path.join(uploadRoot, '.staging')).catch(() => []);
    if (responses.some(response => response.status !== 201 || response.body.data.status !== 'PROCESSING') || rejected.status !== 503 || tooLarge.status !== 413 || stagedAfter.length) throw new Error('Upload transport/cleanup assertion failed');
    if (peakRss - baselineRss >= 256 * 1024 * 1024) throw new Error('Upload memory increased by 256 MiB or more');
    const evidence = { date: new Date().toISOString(), environment: 'Windows/local loopback fixture scanner and filesystem; simulated clean verdict, not malware detection',
      concurrentUploads: 2, bytesPerUpload: acceptedBytes, totalUploadedBytes: 2 * acceptedBytes,
      baselineRss, peakRss, rssIncreaseBytes: peakRss - baselineRss, peakStagedBytes,
      thirdRequestStatus: rejected.status, overLimitRequestStatus: tooLarge.status, uploadStatuses: responses.map(response => response.status), stagedFilesAfter: stagedAfter.length };
    const output = path.resolve(__dirname, '../../audit/m1-closure/video-load.json');
    await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    clearTimeout(watchdog);
    clearInterval(sampler);
    for (const socket of sockets) socket.destroy();
    api.closeAllConnections(); await new Promise<void>(resolve => api.close(() => resolve()));
    await new Promise<void>(resolve => scanner.close(() => resolve()));
    await prisma.video.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.user.delete({ where: { id: teacher.id } }); await prisma.$disconnect();
    await fs.rm(uploadRoot, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
