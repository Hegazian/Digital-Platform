import { Request, Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const EXECUTION_TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 512 * 1024;
const MAX_CODE_LENGTH = 50_000;

/**
 * SECURITY: executing untrusted code on the API host is remote code execution
 * by design. This endpoint is therefore DISABLED unless the server itself
 * runs inside an OS-level sandbox (dedicated container/gVisor/firejail with
 * no network access and no secrets). Opt in per environment with:
 *   CODE_EXECUTION_ENABLED=true
 */
const executionEnabled = process.env.CODE_EXECUTION_ENABLED === 'true';

/** Windows installs usually ship `python`, Linux distros expose `python3`. */
const PYTHON_BIN = process.env.CODE_EXECUTION_BINARY || (process.platform === 'win32' ? 'python' : 'python3');

export const executeCode = async (req: Request, res: Response) => {
  if (!executionEnabled) {
    return res.status(503).json({
      success: false,
      message: 'Code execution is disabled on this server.',
    });
  }

  const { language, code } = req.body ?? {};

  if (typeof code !== 'string' || code.length === 0 || code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Code must be a string of 1 to ${MAX_CODE_LENGTH} characters`,
    });
  }

  if (language !== 'python') {
    return res.status(400).json({ success: false, message: 'Only python is supported currently' });
  }

  const workDir = path.join(os.tmpdir(), `playground-${crypto.randomUUID()}`);
  const filePath = path.join(workDir, 'main.py');

  try {
    await fs.mkdir(workDir, { recursive: true });
    await fs.writeFile(filePath, code);
  } catch {
    return res.status(500).json({ success: false, message: 'Server execution error' });
  }

  // Hardened invocation:
  // - spawn without a shell -> nothing is interpolated into a command line
  // - python -I (isolated mode): ignores PYTHON* env vars and user site-packages
  // - scrubbed environment, isolated cwd, hard timeout, capped output
  // True isolation still requires running this service inside a container.
  const child = spawn(PYTHON_BIN, ['-I', filePath], {
    cwd: workDir,
    timeout: EXECUTION_TIMEOUT_MS,
    killSignal: 'SIGKILL',
    env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: workDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let outputCapped = false;
  let responded = false;

  const cleanup = () => fs.rm(workDir, { recursive: true, force: true }).catch(() => {});

  const capReached = () => {
    if (!outputCapped) {
      outputCapped = true;
      child.kill('SIGKILL');
    }
  };

  const collectChunk = (target: 'stdout' | 'stderr', chunk: Buffer) => {
    if (outputCapped) return;
    let sink = target === 'stdout' ? stdout : stderr;
    sink += chunk.toString('utf8');
    if (sink.length > MAX_OUTPUT_BYTES) {
      sink = sink.slice(0, MAX_OUTPUT_BYTES);
      if (target === 'stdout') stdout = sink;
      else stderr = sink;
      capReached();
      return;
    }
    if (target === 'stdout') stdout = sink;
    else stderr = sink;
  };

  child.stdout.on('data', (chunk: Buffer) => collectChunk('stdout', chunk));
  child.stderr.on('data', (chunk: Buffer) => collectChunk('stderr', chunk));

  child.on('error', (err) => {
    console.error('[playground] spawn error:', err.message);
    cleanup();
    if (responded) return;
    responded = true;
    res.status(500).json({ success: false, message: 'Failed to start code execution' });
  });

  child.on('close', (exitCode, signal) => {
    cleanup();
    if (responded) return;
    responded = true;

    if (signal === 'SIGKILL') {
      const reason = outputCapped ? 'Output limit exceeded' : 'Execution timed out';
      return res.status(400).json({
        success: false,
        data: { output: stdout, error: reason },
      });
    }

    if (exitCode !== 0) {
      return res.status(400).json({
        success: false,
        data: { output: stdout, error: stderr || 'Execution finished with errors' },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        output: outputCapped ? `${stdout}\n[output truncated]` : stdout,
        error: stderr,
      },
    });
  });
};
