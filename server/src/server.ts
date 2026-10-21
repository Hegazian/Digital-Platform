import app from './app';
import dotenv from 'dotenv';
import { StorageService } from './utils/storage';

dotenv.config();

const PORT = process.env.PORT || 5000;

void StorageService.assertPrivateProductionStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 EduPlatform Express API running on http://localhost:${PORT}`);
  });
}).catch(() => {
  console.error('Startup refused: private production storage could not be verified. Check bucket configuration and credentials.');
  process.exitCode = 1;
});
