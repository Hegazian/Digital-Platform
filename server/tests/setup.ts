import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: false });

import { prisma } from '../src/prisma';
import { assertDedicatedTestDatabase } from '../src/utils/test-database';

process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

beforeAll(async () => {
  assertDedicatedTestDatabase();
  await prisma.$connect();
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (e) {
    // Ignore disconnect errors
  }
});
