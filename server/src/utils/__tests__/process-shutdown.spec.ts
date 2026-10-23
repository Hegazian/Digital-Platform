import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const serverEntry = path.resolve(process.cwd(), 'src/server.ts');
const serverRoot = process.cwd();

function listen(server: net.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('Expected an IPv4 TCP address.'));
      resolve(address.port);
    });
  });
}

async function freePort(): Promise<number> {
  const server = net.createServer();
  const port = await listen(server);
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => boolean, timeoutMs: number, description: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await delay(25);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function waitForApi(url: string, child: ChildProcess, getOutput: () => string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`API exited before becoming ready (code=${child.exitCode}, signal=${child.signalCode}). ${getOutput()}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (response.status === 200) return;
    } catch {}
    await delay(50);
  }
  throw new Error(`API did not become ready at ${url}. ${getOutput()}`);
}

async function runShutdownScenario(settleDatabase: boolean): Promise<void> {
    const databaseSockets = new Set<net.Socket>();
    const fakeDatabase = net.createServer((socket) => {
      databaseSockets.add(socket);
      socket.on('error', () => {});
      socket.once('close', () => databaseSockets.delete(socket));
      // Deliberately do not complete the PostgreSQL handshake; the readiness
      // deadline must resolve the HTTP request while the dependency is down.
    });
    const databasePort = await listen(fakeDatabase);
    const apiPort = await freePort();
    const uploadsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eng06-process-'));
    const stalledDatabaseUrl = `postgresql://test:test@127.0.0.1:${databasePort}/eduplatform_test?schema=public&connect_timeout=30&pool_timeout=30&connection_limit=1`;
    let child: ChildProcess | undefined;
    let closed: Promise<{ code: number | null; signal: NodeJS.Signals | null }> | undefined;
    let output = '';

    try {
      const entryArgs = process.platform === 'win32'
        ? ['--eval', `require(${JSON.stringify(serverEntry)}); process.on('message', (message) => { if (message === 'eng06-sigterm') { process.emit('SIGTERM', 'SIGTERM'); process.disconnect(); } });`]
        : [serverEntry];
      child = spawn(process.execPath, ['--import', 'tsx', ...entryArgs], {
        cwd: serverRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          STORAGE_DRIVER: 'filesystem',
          DATABASE_URL: stalledDatabaseUrl,
          DIRECT_URL: stalledDatabaseUrl,
          UPLOADS_DIR: uploadsRoot,
          PORT: String(apiPort),
        },
        stdio: process.platform === 'win32' ? ['ignore', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      child.stdout?.setEncoding('utf8').on('data', (chunk: string) => { output += chunk; });
      child.stderr?.setEncoding('utf8').on('data', (chunk: string) => { output += chunk; });
      closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
        child?.once('close', (code, signal) => resolve({ code, signal }));
      });

      await waitForApi(`http://127.0.0.1:${apiPort}/health/live`, child, () => output);
      const inFlightReadiness = fetch(`http://127.0.0.1:${apiPort}/health/ready`, {
        signal: AbortSignal.timeout(10_000),
      });
      await waitFor(() => databaseSockets.size > 0, 2_000, 'the stalled database readiness probe');
      if (process.platform === 'win32') {
        await new Promise<void>((resolve, reject) => child!.send('eng06-sigterm', (error) => error ? reject(error) : resolve()));
      } else {
        expect(child.kill('SIGTERM')).toBe(true);
      }

      const response = await inFlightReadiness;
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        status: 'NOT_READY',
        draining: true,
        dependencies: { database: 'unavailable', storage: 'ready' },
      });
      if (settleDatabase) {
        // Settle Prisma's fake dependency so this case checks clean shutdown.
        for (const socket of databaseSockets) socket.destroy();
      }
      const exit = await withTimeout(closed, settleDatabase ? 8_000 : 20_000);
      expect(exit).toEqual({ code: settleDatabase ? 0 : 1, signal: null });
      expect(output).toContain('Received SIGTERM; stopping admission and draining requests.');
      expect(output.includes('Graceful shutdown deadline exceeded')).toBe(!settleDatabase);
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
        if (closed) await withTimeout(closed, 2_000);
      }
      for (const socket of databaseSockets) socket.destroy();
      await new Promise<void>((resolve) => fakeDatabase.close(() => resolve()));
      if (path.dirname(uploadsRoot) !== path.resolve(os.tmpdir()) || !path.basename(uploadsRoot).startsWith('eng06-process-')) {
        throw new Error('Refusing cleanup of an unowned process-test directory.');
      }
      fs.rmSync(uploadsRoot, { recursive: true, force: true });
    }
}

describe('API process-level graceful shutdown', () => {
  // Windows child.kill('SIGTERM') terminates immediately. Its test-only
  // bootstrap emits the same signal event; POSIX runners deliver native SIGTERM.
  it('returns the in-flight readiness result and exits cleanly after dependency recovery', async () => {
    await runShutdownScenario(true);
  }, 20_000);

  it('forces a nonzero process exit when dependency cleanup exceeds the total deadline', async () => {
    await runShutdownScenario(false);
  }, 30_000);
});
