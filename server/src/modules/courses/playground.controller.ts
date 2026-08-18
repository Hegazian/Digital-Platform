import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const executeCode = async (req: Request, res: Response) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ success: false, message: 'Language and code are required' });
  }

  if (language !== 'python') {
    return res.status(400).json({ success: false, message: 'Only python is supported currently' });
  }

  // Create a temporary file
  const tempId = crypto.randomUUID();
  const tempDir = path.join(__dirname, '../../../../tmp_code');
  const filePath = path.join(tempDir, `${tempId}.py`);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(filePath, code);

    // Using a timeout to prevent infinite loops (secure code execution basic principle)
    // In production, this should be a docker run command
    exec(`python "${filePath}"`, { timeout: 5000 }, async (error, stdout, stderr) => {
      // Clean up the file asynchronously
      fs.unlink(filePath).catch(console.error);

      if (error) {
        if (error.killed) {
          return res.status(400).json({
            success: false,
            data: { output: '', error: 'Execution timed out' }
          });
        }
        return res.status(400).json({
          success: false,
          data: { output: stdout, error: stderr || error.message }
        });
      }

      res.status(200).json({
        success: true,
        data: { output: stdout, error: stderr }
      });
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server execution error' });
  }
};
