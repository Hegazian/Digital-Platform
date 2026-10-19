import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import { prisma } from '../src/prisma';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test_jwt_secret_at_least_32_characters_long_12345';
process.env.JWT_REFRESH_SECRET ||= 'test_refresh_secret_at_least_32_characters_12345';

beforeAll(async () => {
  // Session level SET commands are not supported on PgBouncer transaction mode poolers
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (e) {
    // Ignore disconnect errors
  }
});
