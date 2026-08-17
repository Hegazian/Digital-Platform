import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import { prisma } from '../src/prisma';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

beforeAll(async () => {
  try {
    await prisma.$executeRawUnsafe('SET default_transaction_read_only = off');
  } catch (e) {
    console.error('Failed to reset read-only status:', e);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
