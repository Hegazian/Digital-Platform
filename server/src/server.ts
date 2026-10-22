import app from './app';
import dotenv from 'dotenv';
import { StorageService } from './utils/storage';
import { prisma } from './prisma';
import { closeGracefully } from './utils/graceful-shutdown';
import { setReadinessDraining } from './modules/health/health.service';

dotenv.config();

const PORT = process.env.PORT || 5000;

void StorageService.assertPrivateProductionStorage().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 EduPlatform Express API running on http://localhost:${PORT}`);
  });
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    setReadinessDraining(true);
    console.log(`Received ${signal}; stopping admission and draining requests.`);
    void closeGracefully(server, () => prisma.$disconnect()).then((drained) => {
      if (!drained) {
        console.error('Graceful shutdown deadline exceeded; open connections were closed.');
        process.exitCode = 1;
      }
    }).catch(() => {
      console.error('Shutdown cleanup failed.');
      process.exitCode = 1;
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}).catch(() => {
  console.error('Startup refused: private production storage could not be verified. Check bucket configuration and credentials.');
  process.exitCode = 1;
});
