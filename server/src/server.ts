import app from './app';
import dotenv from 'dotenv';
import { cleanupStaleUploadStaging, StorageService } from './utils/storage';
import { prisma } from './prisma';
import { closeGracefully } from './utils/graceful-shutdown';
import { setReadinessDraining } from './modules/health/health.service';

dotenv.config();

const PORT = process.env.PORT || 5000;

const STAGING_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

void cleanupStaleUploadStaging().catch(() => {
  console.error('Startup could not clean abandoned upload staging files.');
}).then(() => StorageService.assertPrivateProductionStorage()).then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 EduPlatform Express API running on http://localhost:${PORT}`);
  });
  const stagingCleanup = setInterval(() => {
    void cleanupStaleUploadStaging().catch(() => {
      console.error('Periodic upload staging cleanup failed.');
    });
  }, STAGING_CLEANUP_INTERVAL_MS);
  stagingCleanup.unref();
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(stagingCleanup);
    setReadinessDraining(true);
    console.log(`Received ${signal}; stopping admission and draining requests.`);
    void closeGracefully(server, () => prisma.$disconnect()).then((drained) => {
      if (!drained) {
        console.error('Graceful shutdown deadline exceeded; forcing process exit.');
        process.exit(1);
      }
    }).catch(() => {
      console.error('Shutdown cleanup failed.');
      process.exit(1);
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}).catch(() => {
  console.error('Startup refused: private production storage could not be verified. Check bucket configuration and credentials.');
  process.exitCode = 1;
});
